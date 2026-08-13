#!/usr/bin/env node
/**
 * Attributes a master→3.x sync conflict to the authors of the breaking commits.
 *
 * Since 3.x = master + breaking commits, the commits that diverged 3.x are exactly
 * `<base>..<tip>` (where <base> is the fetched master SHA and <tip> the pre-rebase 3.x
 * tip). Scoped to the conflicted files, those are the commits responsible for the
 * conflict; their GitHub authors are who to nudge. `conflictedFiles` must run while the
 * rebase is stopped, i.e. with unmerged paths present in the index.
 *
 * git log gives only the author name/email, and ~2/3 of n8n authors commit with a
 * non-noreply email that carries no GitHub username. So the conflicted files → breaking
 * SHAs analysis is done locally, and a SINGLE GraphQL call maps those few SHAs to GitHub
 * logins. Bot- and unlinked-account commits resolve to a null user and are skipped.
 *
 * Emits a JSON object to stdout: { ownersCsv, slack, body }.
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

// Resolve commit SHAs to GitHub logins in one GraphQL call. Commits whose author has
// no linked account (unverified email, bots) resolve to a null user and are dropped.
export async function resolveLogins(repo, shas, token, fetchFn = fetch) {
	if (shas.length === 0) return [];
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
	const logins = new Set();
	for (const node of Object.values(repository)) {
		const login = node?.author?.user?.login;
		if (login) logins.add(login);
	}
	return [...logins].sort();
}

// Build the conflict-PR body, reviewer CSV, and Slack owner line.
export function buildOutputs({
	syncBranch,
	targetBranch = '3.x',
	files,
	owners,
	preResolved = [],
	lockfileDeferred = false,
	abandoned = [],
}) {
	const filesMd = files.map((f) => `- \`${f}\``).join('\n') || '_none detected_';
	const ownersMd = owners.length
		? owners.map((o) => `- @${o}`).join('\n')
		: '_Could not auto-attribute — review the conflicted files manually._';
	const abandonedWarning = abandoned.length
		? `A previous PR for this recurring conflict (${abandoned.map((pr) => `#${pr.number}`).join(', ')}) was closed without being merged. Closing resolves nothing — the conflict comes back on the next sync. **Merge, don't close.**`
		: '';
	const slack = [
		owners.length
			? `Likely owners (GitHub): ${owners.map((o) => `@${o}`).join(' ')}`
			: 'Could not auto-attribute owners.',
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
		`**\`${targetBranch}\` was not touched.** This branch is \`master\` merged into \`${targetBranch}\` with the **conflict markers committed**, so you can see exactly what clashed. The required checks stay red until they are resolved, so this PR cannot be merged half-done.`,
		'',
		'### How to resolve',
		`1. \`git fetch origin ${syncBranch} && git switch ${syncBranch}\``,
		'2. Fix the conflict markers and commit them **in one commit of your own** (rather than amending the merge).',
		`3. \`git push origin ${syncBranch}\``,
		`4. **Merge this PR with the normal merge button.** \`master\`'s commits come in as-is and your fix stays its own commit — nothing is squashed. Never close this PR unmerged: closing resolves nothing and the same conflict reopens on the next sync.`,
		'',
		`**Daily syncs are paused until this PR is merged.** The next sync then replays \`${targetBranch}\` onto master linearly again — which also drops this merge commit and its markers out of \`${targetBranch}\`'s history — and verifies the result is exactly what a merge would produce.`,
		'',
		'### Conflicted files',
		filesMd,
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
		`Authors of the ${targetBranch} commits behind the conflicted files, requested as reviewers:`,
		ownersMd,
	].join('\n');
	return { ownersCsv: owners.join(','), slack, body };
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
	const shas = breakingShas(base, files);

	// Degrade gracefully: a transient API failure should still open the PR
	// (unattributed) rather than fail the whole sync.
	let owners = [];
	try {
		owners = await resolveLogins(repo, shas, token);
	} catch (error) {
		console.error(`warning: could not resolve owners: ${error.message}`);
	}

	process.stdout.write(
		JSON.stringify(
			buildOutputs({
				syncBranch,
				targetBranch: values['target-branch'],
				files,
				owners,
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
