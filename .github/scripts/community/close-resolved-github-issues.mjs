#!/usr/bin/env node
/**
 * Close community GitHub issues whose linked Linear issue has been resolved.
 *
 * Community bug reports get mirrored into Linear (the mirrored issue keeps a
 * `GH Link: https://github.com/n8n-io/n8n/issues/<n>` line in its description
 * and/or a GitHub attachment). When the Linear issue is completed, nothing
 * closes the GitHub side, so reporters never hear that their bug was fixed and
 * the public backlog goes stale. This script walks the Linear issues completed
 * in the lookback window, resolves the GitHub issues they point at, and closes
 * the ones still open with a comment.
 *
 * Dry-run is the DEFAULT — nothing is commented or closed unless `--execute`.
 *
 * Only closes when *all* of these hold:
 *   - the Linear issue's state is of type `completed` (canceled/duplicate never closes),
 *   - it was completed within the lookback window,
 *   - the link is an issue (not a PR) in this repository,
 *   - the GitHub issue is still open.
 *
 * Auth: LINEAR_API_KEY (Linear personal API key) + GH_TOKEN / GITHUB_TOKEN.
 * Repo: GITHUB_REPOSITORY env, defaults to n8n-io/n8n.
 *
 * Usage:
 *   node .github/scripts/community/close-resolved-github-issues.mjs             # dry run
 *   node .github/scripts/community/close-resolved-github-issues.mjs --days=30
 *   node .github/scripts/community/close-resolved-github-issues.mjs --execute   # actually close
 *
 * Requires Node 18+ (global fetch).
 */

import { parseArgs } from 'node:util';

const GITHUB_API = 'https://api.github.com';
const LINEAR_API = 'https://api.linear.app/graphql';
const DAY_MS = 86_400_000;
const DEFAULT_REPO = 'n8n-io/n8n';

// --- pure logic (exported for tests) ---------------------------------------

/**
 * Collect the GitHub issue numbers a Linear issue points at, from its
 * description ("GH Link: …") and its attachment URLs. PR links, links to other
 * repositories and `#123` shorthands are ignored: only fully-qualified issue
 * URLs in this repo count, so a stray reference can never close the wrong thing.
 *
 * @param {{ description?: string | null, attachments?: Array<{ url?: string | null }> }} linearIssue
 * @param {{ owner: string, repo: string }} target
 * @returns {number[]} unique issue numbers, ascending
 */
export function extractGithubIssueNumbers(linearIssue, { owner, repo }) {
	const haystack = [
		linearIssue.description ?? '',
		...(linearIssue.attachments ?? []).map((attachment) => attachment?.url ?? ''),
	].join('\n');

	const pattern = new RegExp(
		`github\\.com/${escapeForRegExp(owner)}/${escapeForRegExp(repo)}/issues/(\\d+)`,
		'gi',
	);

	const numbers = new Set();
	for (const match of haystack.matchAll(pattern)) {
		numbers.add(Number(match[1]));
	}

	return [...numbers].sort((a, b) => a - b);
}

function escapeForRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Pull request URLs attached to a Linear issue, used to point reporters at the fix.
 *
 * @param {{ attachments?: Array<{ url?: string | null }> }} linearIssue
 * @param {{ owner: string, repo: string }} target
 * @returns {number[]} unique PR numbers, ascending
 */
export function extractFixPullRequests(linearIssue, { owner, repo }) {
	const pattern = new RegExp(
		`^https?://github\\.com/${escapeForRegExp(owner)}/${escapeForRegExp(repo)}/pull/(\\d+)`,
		'i',
	);

	const numbers = new Set();
	for (const attachment of linearIssue.attachments ?? []) {
		const match = (attachment?.url ?? '').match(pattern);
		if (match) {
			numbers.add(Number(match[1]));
		}
	}

	return [...numbers].sort((a, b) => a - b);
}

/**
 * Turn resolved Linear issues into GitHub-issue closure candidates.
 * Pure: no network, no clock — `now` is injected so tests are deterministic.
 *
 * When several Linear issues point at the same GitHub issue, the first
 * candidate wins and the rest are reported as duplicates: one GitHub issue is
 * only ever closed (and commented on) once per run.
 *
 * @param {{
 *   linearIssues: Array<{
 *     identifier: string,
 *     url?: string,
 *     completedAt?: string | null,
 *     state?: { name?: string, type?: string } | null,
 *     description?: string | null,
 *     attachments?: Array<{ url?: string | null }>,
 *   }>,
 *   owner: string,
 *   repo: string,
 *   lookbackDays: number,
 *   now: number,
 * }} input
 * @returns {{
 *   candidates: Array<{ number: number, linear: { identifier: string, url?: string, state: string, completedAt: string }, fixPullRequests: number[] }>,
 *   skipped: Array<{ linear: string, reason: string }>,
 * }}
 */
export function selectClosureCandidates({ linearIssues, owner, repo, lookbackDays, now }) {
	const cutoff = now - lookbackDays * DAY_MS;
	const candidates = [];
	const skipped = [];
	const claimedBy = new Map();

	for (const issue of linearIssues) {
		if (issue.state?.type !== 'completed') {
			skipped.push({
				linear: issue.identifier,
				reason: `state "${issue.state?.name ?? '?'}" is not completed`,
			});
			continue;
		}

		const completedAt = issue.completedAt ? new Date(issue.completedAt).getTime() : NaN;
		if (!Number.isFinite(completedAt)) {
			skipped.push({ linear: issue.identifier, reason: 'missing completedAt' });
			continue;
		}
		if (completedAt < cutoff) {
			skipped.push({
				linear: issue.identifier,
				reason: `completed outside the ${lookbackDays}d lookback window`,
			});
			continue;
		}

		const numbers = extractGithubIssueNumbers(issue, { owner, repo });
		if (numbers.length === 0) {
			skipped.push({ linear: issue.identifier, reason: `no ${owner}/${repo} issue link` });
			continue;
		}

		const fixPullRequests = extractFixPullRequests(issue, { owner, repo });
		for (const number of numbers) {
			const claimer = claimedBy.get(number);
			if (claimer) {
				skipped.push({
					linear: issue.identifier,
					reason: `#${number} already claimed by ${claimer}`,
				});
				continue;
			}
			claimedBy.set(number, issue.identifier);
			candidates.push({
				number,
				linear: {
					identifier: issue.identifier,
					url: issue.url,
					state: issue.state?.name ?? 'completed',
					completedAt: issue.completedAt,
				},
				fixPullRequests,
			});
		}
	}

	candidates.sort((a, b) => a.number - b.number);

	return { candidates, skipped };
}

/**
 * Comment posted on the GitHub issue before closing it. Deliberately free of
 * internal references (Linear identifiers and URLs stay in the run log) — the
 * reporter only needs to know the fix landed and how to get the issue reopened.
 *
 * @param {{ fixPullRequests: number[] }} candidate
 */
export function buildCloseComment({ fixPullRequests }) {
	const fixReference =
		fixPullRequests.length > 0
			? `The fix landed in ${fixPullRequests.map((number) => `#${number}`).join(', ')}.`
			: 'The fix has been implemented and is on its way out with an upcoming release.';

	return [
		`Good news — this has been resolved, so we're closing the issue. 🎉`,
		'',
		fixReference,
		'',
		"If you still run into this on the latest version of n8n, please comment here and we'll take another look — closed issues can always be reopened. Thanks for reporting it! 🙏",
	].join('\n');
}

// --- environment / auth -----------------------------------------------------

function resolveGithubToken() {
	const token = process.env.GH_TOKEN?.trim() || process.env.GITHUB_TOKEN?.trim();
	if (!token) {
		throw new Error('No GitHub token found. Set GH_TOKEN or GITHUB_TOKEN.');
	}
	return token;
}

function resolveLinearApiKey() {
	const key = process.env.LINEAR_API_KEY?.trim();
	if (!key) {
		throw new Error('No Linear API key found. Set the LINEAR_API_KEY secret.');
	}
	return key;
}

function resolveRepo() {
	const [owner, repo] = (process.env.GITHUB_REPOSITORY || DEFAULT_REPO).split('/');
	if (!owner || !repo) {
		throw new Error(
			`Cannot resolve repo from GITHUB_REPOSITORY="${process.env.GITHUB_REPOSITORY}".`,
		);
	}
	return { owner, repo };
}

function resolveDryRun(values) {
	// Dry run is the default; --execute (or DRY_RUN=false) opts into writes.
	let dryRun = true;
	if (values.execute) {
		dryRun = false;
	}
	if (process.env.DRY_RUN === 'false' || process.env.DRY_RUN === '0') {
		dryRun = false;
	}
	if (process.env.DRY_RUN === 'true' || process.env.DRY_RUN === '1') {
		dryRun = true;
	}
	if (values['dry-run']) {
		dryRun = true; // explicit override always wins toward safety
	}
	return dryRun;
}

// --- data fetching ----------------------------------------------------------

const RESOLVED_ISSUES_QUERY = `
	query ResolvedIssues($after: String, $since: DateTimeOrDuration!) {
		issues(first: 100, after: $after, filter: { completedAt: { gt: $since } }) {
			pageInfo { hasNextPage endCursor }
			nodes {
				identifier
				url
				completedAt
				description
				state { name type }
				attachments(first: 25) { nodes { url } }
			}
		}
	}`;

async function fetchResolvedLinearIssues(ctx, since) {
	console.log(`Fetching Linear issues completed since ${since}...`);

	const issues = [];
	let cursor = null;
	do {
		const res = await fetch(LINEAR_API, {
			method: 'POST',
			headers: {
				Authorization: ctx.linearApiKey,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ query: RESOLVED_ISSUES_QUERY, variables: { after: cursor, since } }),
		});
		if (!res.ok) {
			throw new Error(`Linear API -> ${res.status} ${await res.text()}`);
		}
		const json = await res.json();
		if (json.errors) {
			throw new Error(`Linear GraphQL error: ${JSON.stringify(json.errors)}`);
		}

		const page = json.data.issues;
		for (const node of page.nodes) {
			issues.push({ ...node, attachments: node.attachments?.nodes ?? [] });
		}
		cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
	} while (cursor);

	console.log(`Found ${issues.length} completed Linear issue(s).`);

	return issues;
}

async function githubRequest(ctx, method, path, body) {
	const res = await fetch(`${GITHUB_API}${path}`, {
		method,
		headers: {
			Authorization: `Bearer ${ctx.githubToken}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			...(body ? { 'Content-Type': 'application/json' } : {}),
		},
		...(body ? { body: JSON.stringify(body) } : {}),
	});
	if (!res.ok) {
		throw new Error(`${method} ${path} -> ${res.status} ${await res.text()}`);
	}
	return res.json();
}

const issuePath = (ctx, number) => `/repos/${ctx.owner}/${ctx.repo}/issues/${number}`;

const fetchGithubIssue = (ctx, number) => githubRequest(ctx, 'GET', issuePath(ctx, number));

const commentOnGithubIssue = (ctx, number, body) =>
	githubRequest(ctx, 'POST', `${issuePath(ctx, number)}/comments`, { body });

const closeGithubIssue = (ctx, number) =>
	githubRequest(ctx, 'PATCH', issuePath(ctx, number), {
		state: 'closed',
		state_reason: 'completed',
	});

// --- main -------------------------------------------------------------------

async function main() {
	const { values } = parseArgs({
		options: {
			execute: { type: 'boolean', default: false },
			'dry-run': { type: 'boolean' },
			days: { type: 'string' },
			max: { type: 'string' },
			help: { type: 'boolean', default: false },
		},
	});

	if (values.help) {
		console.log(
			'Usage: close-resolved-github-issues.mjs [--days=N] [--max=N] [--execute]\n' +
				'  --days=N   Look back N days over Linear completions (default 7, or LOOKBACK_DAYS env)\n' +
				'  --max=N    Cap how many GitHub issues a single run closes (default 50, or MAX_CLOSURES env)\n' +
				'  --execute  Actually comment and close (default is dry run)\n' +
				'Auth via LINEAR_API_KEY + GH_TOKEN/GITHUB_TOKEN. Repo via GITHUB_REPOSITORY.',
		);
		return;
	}

	const dryRun = resolveDryRun(values);
	const lookbackDays = Number(values.days ?? process.env.LOOKBACK_DAYS ?? 7);
	if (!Number.isFinite(lookbackDays) || lookbackDays <= 0) {
		throw new Error(`Invalid --days value: ${values.days ?? process.env.LOOKBACK_DAYS}`);
	}
	// Blast-radius guard: a mistyped lookback shouldn't comment on hundreds of issues.
	const maxClosures = Number(values.max ?? process.env.MAX_CLOSURES ?? 50);
	if (!Number.isFinite(maxClosures) || maxClosures <= 0) {
		throw new Error(`Invalid --max value: ${values.max ?? process.env.MAX_CLOSURES}`);
	}

	const { owner, repo } = resolveRepo();
	const ctx = {
		owner,
		repo,
		githubToken: resolveGithubToken(),
		linearApiKey: resolveLinearApiKey(),
	};

	const now = Date.now();
	const since = new Date(now - lookbackDays * DAY_MS).toISOString();

	console.log(`Repository:  ${owner}/${repo}`);
	console.log(`Lookback:    ${lookbackDays} days (since ${since})`);
	console.log(`Max closes:  ${maxClosures}`);
	console.log(
		`Mode:        ${dryRun ? 'DRY RUN (no comments, no closes)' : 'EXECUTE (will close issues)'}`,
	);
	console.log('');

	const linearIssues = await fetchResolvedLinearIssues(ctx, since);
	const { candidates, skipped } = selectClosureCandidates({
		linearIssues,
		owner,
		repo,
		lookbackDays,
		now,
	});

	console.log(`Skipped ${skipped.length} Linear issue(s) without an actionable link.`);
	console.log(`Candidate GitHub issues: ${candidates.length}`);
	console.log('');

	let closed = 0;
	for (const candidate of candidates) {
		const label = `#${candidate.number} (${candidate.linear.identifier}, ${candidate.linear.state})`;

		const githubIssue = await fetchGithubIssue(ctx, candidate.number);
		if (githubIssue.pull_request) {
			console.log(`  SKIP   ${label} — link points at a pull request`);
			continue;
		}
		if (githubIssue.state !== 'open') {
			console.log(`  SKIP   ${label} — already closed`);
			continue;
		}
		if (closed >= maxClosures) {
			console.log(`  SKIP   ${label} — reached the --max=${maxClosures} cap for this run`);
			continue;
		}

		if (dryRun) {
			console.log(`  WOULD CLOSE ${label}`);
			closed++;
			continue;
		}

		await commentOnGithubIssue(ctx, candidate.number, buildCloseComment(candidate));
		await closeGithubIssue(ctx, candidate.number);
		closed++;
		console.log(`  CLOSED ${label}`);
	}

	console.log('');
	console.log(`${dryRun ? 'Would close' : 'Closed'} ${closed} GitHub issue(s).`);
}

// only run when executed directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	await main();
}
