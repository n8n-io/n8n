#!/usr/bin/env node
/**
 * Attributes a master→3.x sync conflict to BOTH sides: the authors of the breaking commits
 * that diverged 3.x, and the master commits that touched the same files.
 *
 * Since 3.x = master + breaking commits, the commits that diverged 3.x are exactly
 * `<base>..<tip>` (where <base> is the fetched master SHA and <tip> the pre-rebase 3.x
 * tip). Scoped to the conflicted files, those are the commits responsible for the
 * conflict; their GitHub authors are who to nudge. `conflictedFiles` must run while the
 * rebase is stopped, i.e. with unmerged paths present in the index.
 *
 * The master half is the other end of the same conflict, and knowing which master commit
 * touched the file is usually what makes it resolvable (a fixture re-recorded by a
 * dependency bump reads as an unexplained clash without it). Nobody is requested as a
 * reviewer: the PR body and the Slack post name both sides, and the resolver picks
 * themselves.
 *
 * git log gives only the author name/email, and ~2/3 of n8n authors commit with a
 * non-noreply email that carries no GitHub username. So the conflicted files → commit
 * analysis is done locally, and a SINGLE GraphQL call maps those few SHAs to GitHub
 * logins. Bot- and unlinked-account commits resolve to a null user and are skipped.
 *
 * Emits a JSON object to stdout: { slack, body }.
 *
 * Usage:
 *   node .github/scripts/sync-conflict-owners.mjs --base <masterSha> --sync-branch <name>
 *
 * Env: GITHUB_REPOSITORY (owner/repo), GH_TOKEN or GITHUB_TOKEN (for the GraphQL API).
 * Requires Node 18+ (global fetch).
 */

import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';

export function runGit(args) {
	return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

// Files with unresolved conflicts at the current (stopped) rebase step.
export function conflictedFiles(git = runGit) {
	const out = git(['diff', '--name-only', '--diff-filter=U']);
	return out ? out.split('\n').filter(Boolean) : [];
}

// Unique SHAs of the 3.x-only (breaking) commits that touched the given files. `tip`
// defaults to HEAD but must be the PRE-rebase tip when called after a rebase, since HEAD
// is by then a replay whose commits carry different SHAs.
export function breakingShas(base, files, git = runGit, tip = 'HEAD') {
	const shas = new Set();
	for (const file of files) {
		const out = git(['log', `${base}..${tip}`, '--format=%H', '--', file]);
		for (const sha of out.split('\n').filter(Boolean)) shas.add(sha);
	}
	return [...shas];
}

// Master commits that touched the given files since the branches diverged — the other end
// of the conflict. Capped per file: the point is naming the change, not a full log.
export function masterCommitsByFile(base, files, git = runGit, tip = 'FETCH_HEAD', limit = 3) {
	const byFile = new Map();
	for (const file of files) {
		const out = git([
			'log',
			`${base}..${tip}`,
			`--max-count=${limit}`,
			'--format=%H %h %s',
			'--',
			file,
		]);
		const commits = out
			.split('\n')
			.filter(Boolean)
			.map((line) => {
				const [sha, short, ...rest] = line.split(' ');
				return { sha, short, subject: rest.join(' ') };
			});
		byFile.set(file, commits);
	}
	return byFile;
}

/**
 * Resolve commit SHAs to GitHub logins in one GraphQL call. Commits whose author has no
 * linked account (unverified email, bots) resolve to a null user and are left out.
 *
 * @returns {Promise<Map<string, string>>} SHA → login, for the SHAs that resolved.
 */
export async function resolveCommitAuthors(repo, shas, token, fetchFn = fetch) {
	if (shas.length === 0) return new Map();
	const [owner, name] = repo.split('/');
	const aliases = shas
		.map((sha, i) => `c${i}: object(oid: "${sha}") { ... on Commit { author { user { login } } } }`)
		.join('\n');
	const query = `query($owner: String!, $name: String!) { repository(owner: $owner, name: $name) { ${aliases} } }`;

	const res = await fetchFn('https://api.github.com/graphql', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
			'User-Agent': 'n8n-sync-conflict-owners',
		},
		body: JSON.stringify({ query, variables: { owner, name } }),
	});
	if (!res.ok) throw new Error(`GitHub GraphQL request failed: ${res.status}`);
	const json = await res.json();
	if (json.errors) throw new Error(`GitHub GraphQL error: ${JSON.stringify(json.errors)}`);

	const repository = json.data?.repository ?? {};
	const authors = new Map();
	shas.forEach((sha, i) => {
		const login = repository[`c${i}`]?.author?.user?.login;
		if (login) authors.set(sha, login);
	});
	return authors;
}

/**
 * Both ends of a conflict, in one GraphQL call: the logins behind the target-side
 * (breaking) commits, and the master commits that touched each conflicted path with their
 * authors. Degrades to empty attribution — a transient API failure must still let the
 * conflict PR open.
 *
 * `base` is the fetched master SHA (= the target branch's base, since 3.x = master + N),
 * `tip` the pre-merge target tip, and the master half is read from where the two diverged.
 */
export async function gatherAttribution({
	repo,
	token,
	files,
	base,
	tip = 'HEAD',
	git = runGit,
	fetchFn = fetch,
	log = console.error,
}) {
	const targetShas = breakingShas(base, files, git, tip);

	let byFile = new Map();
	try {
		byFile = masterCommitsByFile(git(['merge-base', tip, base]), files, git, base);
	} catch (error) {
		log(`warning: could not read the master side of the conflict: ${error.message}`);
	}

	const masterShas = [...byFile.values()].flat().map((c) => c.sha);
	let authors = new Map();
	try {
		authors = await resolveCommitAuthors(repo, [...targetShas, ...masterShas], token, fetchFn);
	} catch (error) {
		log(`warning: could not resolve owners: ${error.message}`);
	}

	return {
		owners: [...new Set(targetShas.map((sha) => authors.get(sha)).filter(Boolean))].sort(),
		masterCommits: new Map(
			[...byFile].map(([file, commits]) => [
				file,
				commits.map((c) => ({ ...c, login: authors.get(c.sha) })),
			]),
		),
	};
}

/**
 * Build the conflict-PR body and the Slack owner line.
 *
 * `files` are the marker-carrying conflicts. `deleteConflicts` are the ones git left
 * WITHOUT markers ({ path, deletedBy: 'target' | 'master' }) — they need their own section
 * or a resolver reads the branch as "nothing to fix here". `masterCommits` maps a
 * conflicted path to the master commits that touched it, so each entry names both ends of
 * the clash. Nobody is requested as a reviewer.
 */
export function buildOutputs({
	syncBranch,
	targetBranch = '3.x',
	files,
	owners,
	deleteConflicts = [],
	masterCommits = new Map(),
	preResolved = [],
	lockfileDeferred = false,
	abandoned = [],
}) {
	// `- \`path\`` plus a nested line per master commit that touched it.
	const fileMd = (path, suffix = '') => {
		const commits = masterCommits.get(path) ?? [];
		return [
			`- \`${path}\`${suffix}`,
			...commits.map(
				({ short, subject, login }) =>
					`  - master: \`${short}\` ${subject}${login ? ` — @${login}` : ''}`,
			),
		].join('\n');
	};
	const filesMd = files.map((f) => fileMd(f)).join('\n') || '_none detected_';
	const deleteMd = deleteConflicts
		.map(({ path, deletedBy }) =>
			fileMd(
				path,
				deletedBy === 'master'
					? ` — deleted on master, changed on \`${targetBranch}\`; the merge kept \`${targetBranch}\`'s file`
					: ` — deleted on \`${targetBranch}\`, changed on master; the merge kept \`${targetBranch}\`'s deletion`,
			),
		)
		.join('\n');
	const ownersMd = owners.length
		? owners.map((o) => `- @${o}`).join('\n')
		: '_Could not auto-attribute — review the conflicted files manually._';
	const abandonedWarning = abandoned.length
		? `A previous PR for this recurring conflict (${abandoned.map((pr) => `#${pr.number}`).join(', ')}) was closed without being merged. Closing resolves nothing — the conflict comes back on the next sync. **Merge, don't close.**`
		: '';
	const masterOwners = [
		...new Set([...masterCommits.values()].flat().flatMap((c) => (c.login ? [c.login] : []))),
	].sort();
	const slack = [
		owners.length
			? `Likely owners (GitHub): ${owners.map((o) => `@${o}`).join(' ')}`
			: 'Could not auto-attribute owners.',
		masterOwners.length ? `· master side: ${masterOwners.map((o) => `@${o}`).join(' ')}` : '',
		abandoned.length
			? `⚠️ ${abandoned.map((pr) => `<${pr.url}|#${pr.number}>`).join(', ')} was closed without merging and the conflict is back — merge this one, don't close it.`
			: '',
	]
		.filter(Boolean)
		.join(' ');
	const body = [
		`Automated \`master\`→\`${targetBranch}\` sync hit a conflict.`,
		...(abandonedWarning ? ['', '> [!WARNING]', `> ${abandonedWarning}`] : []),
		'',
		files.length
			? `**\`${targetBranch}\` was not touched.** This branch is \`master\` merged into \`${targetBranch}\` with the conflicts committed exactly as git left them — **conflict markers included** — so you can see what clashed. The required checks stay red until they are resolved, so this PR cannot be merged half-done.`
			: `**\`${targetBranch}\` was not touched.** This branch is \`master\` merged into \`${targetBranch}\` exactly as git left it. Nothing here carries conflict markers, so the checks can go green on a merge that was resolved by default — read the decision below before merging.`,
		'',
		'### How to resolve',
		`1. \`git fetch origin ${syncBranch} && git switch ${syncBranch}\``,
		'2. Resolve everything listed below and commit it **in one commit of your own** (rather than amending the merge).',
		`3. \`git push origin ${syncBranch}\``,
		`4. **Merge this PR with the normal merge button.** \`master\`'s commits come in as-is and your fix stays its own commit — nothing is squashed. Never close this PR unmerged: closing resolves nothing and the same conflict reopens on the next sync.`,
		'',
		`**Daily syncs are paused until this PR is merged.** The next sync then replays \`${targetBranch}\` onto master linearly again — which also drops this merge commit and its markers out of \`${targetBranch}\`'s history — and verifies the result is exactly what a merge would produce.`,
		// An empty file list is only worth printing when there is no other section either:
		// "_none detected_" is then the signal that detection itself came up short.
		...(files.length || !deleteConflicts.length ? ['', '### Conflicted files', filesMd] : []),
		...(deleteConflicts.length
			? [
					'',
					'### Deleted on one side, changed on the other',
					`Git leaves **no conflict markers** for these, so the branch looks clean where it is not — the merge kept \`${targetBranch}\`'s side. Decide whether that is right, and whether the other side's change has to be carried over (onto a re-recorded or renamed replacement file, typically):`,
					deleteMd,
				]
			: []),
		...(preResolved.length
			? [
					'',
					'### Auto-resolved for you',
					'These tool-generated files also conflicted and were resolved mechanically — no action needed:',
					preResolved.map((f) => `- \`${f}\``).join('\n'),
				]
			: []),
		...(lockfileDeferred
			? [
					'',
					'> [!NOTE]',
					'> `pnpm-lock.yaml` still carries its conflict markers because a manifest (`package.json` / `pnpm-workspace.yaml`) is conflicted too, or its regeneration failed. After resolving the manifests, regenerate it with `pnpm install --lockfile-only` and commit the result.',
				]
			: []),
		'',
		'### Likely owners',
		`Authors of the ${targetBranch} commits behind the conflicted files — nobody is requested as a reviewer, so pick this up between yourselves:`,
		ownersMd,
	].join('\n');
	return { slack, body };
}

async function main() {
	const { values } = parseArgs({
		options: {
			base: { type: 'string' },
			'sync-branch': { type: 'string', default: 'sync/master-to-3x' },
			'target-branch': { type: 'string', default: '3.x' },
		},
	});

	const base = values.base;
	const syncBranch = values['sync-branch'];
	const repo = process.env.GITHUB_REPOSITORY;
	const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

	if (!base) throw new Error('--base <masterSha> is required');
	if (!repo) throw new Error('GITHUB_REPOSITORY env var is required');
	if (!token) throw new Error('GH_TOKEN / GITHUB_TOKEN env var is required');

	const files = conflictedFiles();
	const { owners, masterCommits } = await gatherAttribution({ repo, token, files, base });

	process.stdout.write(
		JSON.stringify(
			buildOutputs({
				syncBranch,
				targetBranch: values['target-branch'],
				files,
				owners,
				masterCommits,
			}),
		),
	);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((error) => {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	});
}
