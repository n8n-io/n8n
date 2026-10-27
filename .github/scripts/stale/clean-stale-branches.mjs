#!/usr/bin/env node
/**
 * Stale-branch cleanup for n8n-io/n8n.
 *
 * Decides, per branch, whether to KEEP or DELETE and prints the reasoning
 * (age, ruleset protection, default branch). Dry-run is the DEFAULT — nothing
 * is deleted unless you pass `--execute`.
 *
 * How protection is decided:
 *   We fetch the repo's rulesets, keep the ones that (a) target branches,
 *   (b) are actively enforced, and (c) contain a `deletion` rule, then match
 *   each branch ref against their ref-name include/exclude glob patterns.
 *   This mirrors what the GitHub UI shows as "affected branches" for a ruleset.
 *   GitHub's server-side ruleset enforcement remains the hard backstop: even in
 *   --execute mode a delete of a protected branch is rejected unless the token
 *   is a bypass actor.
 *
 * Auth: uses GH_TOKEN / GITHUB_TOKEN if set (CI), otherwise falls back to
 *   `gh auth token` (local). Repo: GITHUB_REPOSITORY env, else `gh repo view`.
 *
 * Usage:
 *   node .github/scripts/stale/clean-stale-branches.mjs            # dry run (default)
 *   node .github/scripts/stale/clean-stale-branches.mjs --days=120
 *   node .github/scripts/stale/clean-stale-branches.mjs --execute  # actually delete
 *
 * Requires Node 18+ (global fetch).
 */

import { execFileSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { minimatch } from 'minimatch';

const API = 'https://api.github.com';
const DAY_MS = 86_400_000; // 24 hours in millis

// --- pure logic (exported for tests) ---------------------------------------

// GitHub ruleset ref globs use fnmatch semantics: `*` matches within a path
// segment, `**` matches across `/`, `?` matches a single char. minimatch (the
// same glob matcher used by our other workflow scripts) implements exactly
// these rules — `dot` so leading-dot segments aren't skipped, `noext` to keep
// GitHub's plain fnmatch behaviour (no `+(...)` extglobs).
const GLOB_OPTIONS = { dot: true, noext: true };

export function refMatches(ref, pattern, defaultBranch) {
	if (pattern === '~ALL') {
		return true;
	}
	if (pattern === '~DEFAULT_BRANCH') {
		return ref === `refs/heads/${defaultBranch}`;
	}
	return minimatch(ref, pattern, GLOB_OPTIONS);
}

// Returns the first keep-pattern that matches the branch name, else null.
// These are operator-supplied globs matched against the bare branch name
// (e.g. `release/*`, `1.x`) — an explicit safety net independent of rulesets,
// so stale cleanup stays safe even if a protecting ruleset is ever removed.
export function matchingExcludePattern(branchName, excludePatterns) {
	return excludePatterns.find((pattern) => minimatch(branchName, pattern, GLOB_OPTIONS)) ?? null;
}

// Returns the protecting ruleset's name if `ref` is protected from deletion, else null.
export function protectingRuleset(ref, rulesets, defaultBranch) {
	for (const rs of rulesets) {
		const included = rs.include.some((p) => refMatches(ref, p, defaultBranch));
		if (!included) {
			continue;
		}
		const excluded = rs.exclude.some((p) => refMatches(ref, p, defaultBranch));
		if (excluded) {
			continue;
		}

		return rs.name;
	}
	return null;
}

/**
 * Classify branches into keep/delete buckets with a reason for each.
 * Pure: no network, no clock — `now` is injected so tests are deterministic.
 *
 * @param {{
 *   branches: Array<{ name: string, committedDate: string | null }>,
 *   rulesets: Array<{ name: string, include: string[], exclude: string[] }>,
 *   defaultBranch: string,
 *   staleDays: number,
 *   now: number,
 *   openPrRefs?: Map<string, number[]>,
 *   excludePatterns?: string[],
 * }} input
 * @returns {{ keep: Array<{name:string,ageDays:number|null,reason:string}>, remove: Array<{name:string,ageDays:number|null,reason:string}> }}
 */
export function classifyBranches({
	branches,
	rulesets,
	defaultBranch,
	staleDays,
	now,
	openPrRefs = new Map(),
	excludePatterns = [],
}) {
	const keep = [];
	const remove = [];

	for (const branch of branches) {
		const ref = `refs/heads/${branch.name}`;
		const ageDays =
			branch.committedDate === null
				? null
				: Math.floor((now - new Date(branch.committedDate).getTime()) / DAY_MS);

		const rulesetName = protectingRuleset(ref, rulesets, defaultBranch);
		if (rulesetName) {
			keep.push({ name: branch.name, ageDays, reason: `protected: ruleset "${rulesetName}" (deletion)` });
			continue;
		}
		const excludePattern = matchingExcludePattern(branch.name, excludePatterns);
		if (excludePattern) {
			keep.push({ name: branch.name, ageDays, reason: `excluded: matches keep-pattern "${excludePattern}"` });
			continue;
		}
		if (branch.name === defaultBranch) {
			keep.push({ name: branch.name, ageDays, reason: 'protected: default branch' });
			continue;
		}
		const prNumbers = openPrRefs.get(branch.name);
		if (prNumbers && prNumbers.length > 0) {
			const refs = prNumbers
				.slice()
				.sort((a, b) => a - b)
				.map((n) => `#${n}`)
				.join(', ');
			keep.push({ name: branch.name, ageDays, reason: `open PR ${refs} (head or base)` });
			continue;
		}
		if (ageDays === null) {
			keep.push({ name: branch.name, ageDays, reason: 'kept: unknown last-commit date' });
			continue;
		}
		if (ageDays < staleDays) {
			keep.push({ name: branch.name, ageDays, reason: `active: last commit ${ageDays}d ago (< ${staleDays}d)` });
			continue;
		}
		remove.push({
			name: branch.name,
			ageDays,
			reason: `stale: last commit ${ageDays}d ago (>= ${staleDays}d), no deletion-protection ruleset`,
		});
	}

	keep.sort((a, b) => a.name.localeCompare(b.name));
	remove.sort((a, b) => (b.ageDays ?? 0) - (a.ageDays ?? 0)); // oldest first

	return { keep, remove };
}

// --- environment / auth -----------------------------------------------------

function resolveToken() {
	if (process.env.GH_TOKEN) return process.env.GH_TOKEN.trim();
	if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN.trim();
	try {
		return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim();
	} catch {
		throw new Error('No token found. Set GH_TOKEN/GITHUB_TOKEN or run `gh auth login`.');
	}
}

function resolveRepo() {
	if (process.env.GITHUB_REPOSITORY) {
		const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
		return { owner, repo };
	}
	try {
		const slug = execFileSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'], {
			encoding: 'utf8',
		}).trim();
		const [owner, repo] = slug.split('/');
		return { owner, repo };
	} catch {
		throw new Error('Cannot resolve repo. Set GITHUB_REPOSITORY or run inside a gh-authenticated repo.');
	}
}

function resolveDryRun(values) {
	// Dry run is the default. --execute (or DRY_RUN=false) opts into real deletes.
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

// Glob patterns of branch names to always keep. Sourced from repeated
// `--exclude` flags and/or the comma-separated EXCLUDE_BRANCHES env var; both
// accept comma-separated lists. Blank entries are dropped.
function resolveExcludePatterns(values) {
	const raw = [...(values.exclude ?? []), process.env.EXCLUDE_BRANCHES ?? ''];
	return raw
		.flatMap((entry) => entry.split(','))
		.map((pattern) => pattern.trim())
		.filter(Boolean);
}

// --- data fetching ----------------------------------------------------------

async function rest(ctx, path) {
	const res = await fetch(`${API}${path}`, { headers: ctx.headers });
	if (!res.ok) {
		throw new Error(`GET ${path} -> ${res.status} ${await res.text()}`);
	}
	return res.json();
}

async function graphql(ctx, query, variables) {
	const res = await fetch(`${API}/graphql`, {
		method: 'POST',
		headers: { ...ctx.headers, 'Content-Type': 'application/json' },
		body: JSON.stringify({ query, variables }),
	});
	const json = await res.json();
	if (json.errors) {
		throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);
	}
	return json.data;
}

async function fetchDeletionRulesets(ctx) {
	const list = await rest(ctx, `/repos/${ctx.owner}/${ctx.repo}/rulesets?per_page=100`);
	const detailed = [];
	for (const summary of list) {
		const rs = await rest(ctx, `/repos/${ctx.owner}/${ctx.repo}/rulesets/${summary.id}`);
		if (rs.target !== 'branch') {
			continue;
		}
		if (rs.enforcement !== 'active') {
			continue;
		}
		const hasDeletionRule = (rs.rules ?? []).some((r) => r.type === 'deletion');
		if (!hasDeletionRule) {
			continue;
		}

		detailed.push({
			name: rs.name,
			include: rs.conditions?.ref_name?.include ?? [],
			exclude: rs.conditions?.ref_name?.exclude ?? [],
		});
	}
	return detailed;
}

async function fetchBranches(ctx) {
	console.log('Fetching branches...');

	const branches = [];
	let cursor = null;
	const query = `
		query($owner:String!,$repo:String!,$cursor:String){
			repository(owner:$owner,name:$repo){
				defaultBranchRef{ name }
				refs(refPrefix:"refs/heads/",first:100,after:$cursor){
					pageInfo{ hasNextPage endCursor }
					nodes{
						name
						target{ ... on Commit { committedDate } }
					}
				}
			}
		}`;
	let defaultBranch = '';
	do {
		const data = await graphql(ctx, query, { owner: ctx.owner, repo: ctx.repo, cursor });
		const repository = data.repository;
		defaultBranch = repository.defaultBranchRef?.name ?? '';
		for (const node of repository.refs.nodes) {
			branches.push({
				name: node.name,
				committedDate: node.target?.committedDate ?? null,
			});
		}
		cursor = repository.refs.pageInfo.hasNextPage ? repository.refs.pageInfo.endCursor : null;
	} while (cursor);
	return { branches, defaultBranch };
}

// Map of branch name -> open PR numbers that reference it as head or base.
// A branch in this map must never be deleted: deleting a PR's head closes the
// PR, and deleting a base orphans/closes PRs targeting it. Fork PR head refs
// live in the fork, so only count head refs from same-repo PRs; base refs are
// always in this repo.
async function fetchOpenPrRefs(ctx) {
	console.log('Fetching open pull requests...');

	const refs = new Map();
	const sameRepo = `${ctx.owner}/${ctx.repo}`.toLowerCase();
	const addRef = (ref, prNumber) => {
		if (!ref) {
			return;
		}
		if (!refs.has(ref)) {
			refs.set(ref, []);
		}
		const arr = refs.get(ref);
		if (!arr.includes(prNumber)) {
			arr.push(prNumber);
		}
	};

	let page = 1;
	for (;;) {
		const prs = await rest(ctx, `/repos/${ctx.owner}/${ctx.repo}/pulls?state=open&per_page=100&page=${page}`);
		for (const pr of prs) {
			if (pr.head?.repo?.full_name?.toLowerCase() === sameRepo) {
				addRef(pr.head?.ref, pr.number);
			}
			addRef(pr.base?.ref, pr.number);
		}
		if (prs.length < 100) {
			break;
		}
		page++;
	}
	return refs;
}

async function deleteBranch(ctx, name) {
	const res = await fetch(`${API}/repos/${ctx.owner}/${ctx.repo}/git/refs/heads/${encodeURIComponent(name)}`, {
		method: 'DELETE',
		headers: ctx.headers,
	});
	return res;
}

// --- reporting --------------------------------------------------------------

function printReport({ owner, repo, defaultBranch, staleDays, dryRun, rulesets, excludePatterns, openPrCount, keep, remove }) {
	console.log(`Repository:        ${owner}/${repo}`);
	console.log(`Default branch:    ${defaultBranch}`);
	console.log(`Stale threshold:   ${staleDays} days`);
	console.log(`Mode:              ${dryRun ? 'DRY RUN (no deletions)' : 'EXECUTE (will delete)'}`);
	console.log(`Deletion rulesets: ${rulesets.length ? rulesets.map((r) => `"${r.name}"`).join(', ') : '(none)'}`);
	console.log(
		`Keep patterns:     ${excludePatterns?.length ? excludePatterns.map((p) => `"${p}"`).join(', ') : '(none)'}`,
	);
	console.log(`Open-PR refs kept: ${openPrCount ?? 0}`);
	console.log('');

	console.log(`Branches to keep (${keep.length}):`);
	for (const b of keep) console.log(`  KEEP   ${b.name} — ${b.reason}`);
	console.log('');

	console.log(`Branches to delete (${remove.length}):`);
	for (const b of remove) console.log(`  DELETE ${b.name} — ${b.reason}`);
	console.log('');
}

// --- main -------------------------------------------------------------------

async function main() {
	const { values } = parseArgs({
		options: {
			execute: { type: 'boolean', default: false },
			'dry-run': { type: 'boolean' },
			days: { type: 'string' },
			exclude: { type: 'string', multiple: true },
			help: { type: 'boolean', default: false },
		},
	});

	if (values.help) {
		console.log(
			'Usage: clean-stale-branches.mjs [--days=N] [--exclude=GLOB]... [--execute]\n' +
				'  --days=N        Days of inactivity before a branch is stale (default 100, or STALE_DAYS env)\n' +
				'  --exclude=GLOB  Branch-name glob to always keep; repeatable or comma-separated\n' +
				'                  (e.g. --exclude="release/*,1.x", or EXCLUDE_BRANCHES env)\n' +
				'  --execute       Actually delete stale branches (default is dry run)\n' +
				'Auth via GH_TOKEN/GITHUB_TOKEN or `gh auth token`. Repo via GITHUB_REPOSITORY or `gh repo view`.',
		);
		return;
	}

	const dryRun = resolveDryRun(values);
	const excludePatterns = resolveExcludePatterns(values);

	const staleDays = Number(values.days ?? process.env.STALE_DAYS ?? 100);
	if (!Number.isFinite(staleDays) || staleDays <= 0) {
		throw new Error(`Invalid --days value: ${values.days ?? process.env.STALE_DAYS}`);
	}

	const token = resolveToken();
	const { owner, repo } = resolveRepo();
	const ctx = {
		owner,
		repo,
		headers: {
			Authorization: `Bearer ${token}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			'User-Agent': 'n8n-stale-branches',
		},
	};

	const rulesets = await fetchDeletionRulesets(ctx);
	const { branches, defaultBranch } = await fetchBranches(ctx);
	const openPrRefs = await fetchOpenPrRefs(ctx);

	const { keep, remove } = classifyBranches({
		branches,
		rulesets,
		defaultBranch,
		staleDays,
		now: Date.now(),
		openPrRefs,
		excludePatterns,
	});

	printReport({
		owner,
		repo,
		defaultBranch,
		staleDays,
		dryRun,
		rulesets,
		excludePatterns,
		openPrCount: openPrRefs.size,
		keep,
		remove,
	});

	if (dryRun) {
		console.log(`Dry run complete. ${remove.length} branch(es) would be deleted. Re-run with --execute to delete.`);
		return;
	}

	let deleted = 0;
	let blocked = 0;
	for (const b of remove) {
		const res = await deleteBranch(ctx, b.name);
		if (res.status === 204) {
			deleted++;
			console.log(`  deleted ${b.name}`);
		} else {
			blocked++;
			const body = await res.text();
			console.log(`  SKIPPED ${b.name} — ${res.status} ${body}`);
		}
	}
	console.log('');
	console.log(`Done. Deleted ${deleted}, skipped/blocked ${blocked}.`);
}

// only run when executed directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	await main();
}
