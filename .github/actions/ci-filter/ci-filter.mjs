import { execSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// --- Glob matching (dotfile-safe) ---

/**
 * Match a file path against a glob pattern.
 * Unlike path.matchesGlob / standard POSIX globs, `**` matches dotfiles.
 */
export function matchGlob(filePath, pattern) {
	let regex = '';
	let i = 0;
	while (i < pattern.length) {
		const ch = pattern[i];
		if (ch === '*' && pattern[i + 1] === '*') {
			if (pattern[i + 2] === '/') {
				regex += '(?:.+/)?';
				i += 3;
			} else {
				regex += '.*';
				i += 2;
			}
		} else if (ch === '*') {
			regex += '[^/]*';
			i++;
		} else if (ch === '?') {
			regex += '[^/]';
			i++;
		} else {
			regex += ch.replace(/[.+^${}()|[\]\\]/g, '\\$&');
			i++;
		}
	}
	return new RegExp(`^${regex}$`).test(filePath);
}

// --- Filter DSL parser ---

/**
 * Parse filter definitions from the input DSL.
 *
 * Supports two formats:
 *   Single-line:  `name: pattern1 pattern2`
 *   Multi-line:   `name:` followed by indented patterns (one per line)
 *
 * Lines starting with # and blank lines are ignored.
 */
export function parseFilters(input) {
	const filters = new Map();
	const lines = input.split('\n');
	let currentFilter = null;

	for (const rawLine of lines) {
		const line = rawLine.trim();

		if (!line || line.startsWith('#')) continue;

		const headerMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)?$/);
		if (headerMatch) {
			const name = headerMatch[1];
			const rest = (headerMatch[2] || '').trim();
			const patterns = [];
			currentFilter = name;
			filters.set(name, patterns);

			if (rest) {
				patterns.push(...rest.split(/\s+/));
				currentFilter = null;
			}
			continue;
		}

		if (currentFilter && rawLine.match(/^\s/)) {
			const patterns = filters.get(currentFilter);
			const pattern = line.startsWith('- ') ? line.slice(2).trim() : line;
			if (patterns && pattern) patterns.push(pattern);
			continue;
		}

		throw new Error(`Malformed filter input at: "${rawLine}"`);
	}

	for (const [name, patterns] of filters) {
		if (patterns.length === 0) {
			throw new Error(`Filter "${name}" has no patterns`);
		}
	}

	return filters;
}

// --- Git operations ---

const SAFE_REF = /^[a-zA-Z0-9_./-]+$/;

/**
 * Ref to diff against the base branch.
 *
 * On pull_request events checkout lands on GitHub's test-merge commit. For a
 * stacked PR its first parent is the parent PR's test merge, which already
 * carries every base-branch commit the stack lacks, so a diff against HEAD
 * reports that drift as changed. The second parent is the PR head itself.
 */
export function resolveHeadRef(eventName = process.env.GITHUB_EVENT_NAME) {
	return eventName === 'pull_request' || eventName === 'pull_request_review' ? 'HEAD^2' : 'HEAD';
}

export function getChangedFiles(baseRef, headRef = 'HEAD') {
	if (!SAFE_REF.test(baseRef)) {
		throw new Error(`Unsafe base ref: "${baseRef}"`);
	}
	// Deepen the fetch so the merge base is reachable from this shallow clone.
	// A 2-dot diff (FETCH_HEAD HEAD) reports anything that differs in either
	// direction, so files added to base-branch after the PR diverged show up as
	// "changed" — spuriously triggering path-filtered jobs. The merge base
	// scopes the diff to PR-only changes.
	fetchUntilMergeBase(baseRef, headRef);
	const output = execSync(`git diff --name-only --no-renames --merge-base FETCH_HEAD ${headRef}`, {
		encoding: 'utf-8',
	});
	return output
		.split('\n')
		.map((f) => f.trim())
		.filter(Boolean);
}

// Files added (not merely modified) in this PR. Same merge-base scoping as
// getChangedFiles; assumes the fetch it performs has already run.
export function getAddedFiles(baseRef, headRef = 'HEAD') {
	if (!SAFE_REF.test(baseRef)) {
		throw new Error(`Unsafe base ref: "${baseRef}"`);
	}
	const output = execSync(
		`git diff --name-only --no-renames --diff-filter=A --merge-base FETCH_HEAD ${headRef}`,
		{ encoding: 'utf-8' },
	);
	return output
		.split('\n')
		.map((f) => f.trim())
		.filter(Boolean);
}

/**
 * Fetch the base ref, then deepen only if its merge base with headRef is not
 * reliably reachable from the checkout.
 *
 * A single fixed deepen is not enough for stale PRs whose divergence point is
 * older than the shallow boundary. We fetch with an exponentially growing
 * window (doubling each round) until the merge base resolves, or until the full
 * history has been fetched — at which point no common ancestor means the
 * histories are unrelated.
 *
 * Once the doubled step grows past the repo's history (capped well under
 * git's signed int32 `--deepen` limit), switch to `--unshallow` instead of
 * passing an ever-larger integer that git would reject.
 */
function fetchUntilMergeBase(baseRef, headRef) {
	let step = Number(process.env.CI_FILTER_DEEPEN_STEP) || 200;
	const maxDeepen = Number(process.env.CI_FILTER_MAX_DEEPEN) || 20_000;
	// A PR merge checkout already has the base commit as its first parent.
	const hasBaseCommit = headRef === 'HEAD^2' && hasCommit('HEAD^1');
	const depth = isShallow() && !hasBaseCommit ? `--depth=${step} ` : '';
	execSync(`git fetch --no-tags --prune --filter=blob:none ${depth}origin ${baseRef}`, {
		stdio: 'pipe',
	});

	while (!hasReliableMergeBase(headRef)) {
		if (!isShallow()) {
			throw new Error(
				`No merge base between FETCH_HEAD and ${headRef} after fetching the full history of "${baseRef}" (unrelated histories).`,
			);
		}
		deepenFetch(baseRef, step, maxDeepen);
		step *= 2;
	}
}

function hasCommit(ref) {
	try {
		execSync(`git cat-file -e ${ref}^{commit}`, { stdio: 'pipe' });
		return true;
	} catch {
		return false;
	}
}

function deepenFetch(baseRef, step, maxDeepen) {
	const flag = step > maxDeepen ? '--unshallow' : `--deepen=${step}`;
	execSync(`git fetch --no-tags --prune --filter=blob:none ${flag} origin ${baseRef}`, {
		stdio: 'pipe',
	});
}

function isShallow() {
	return execSync('git rev-parse --is-shallow-repository', { encoding: 'utf-8' }).trim() === 'true';
}

/**
 * True when a merge base exists AND does not sit on the shallow boundary.
 * In a shallow repo `git merge-base` can return a grafted boundary commit whose
 * sub-history is truncated; that result is unreliable, so we must deepen further
 * before trusting it.
 */
function hasReliableMergeBase(headRef) {
	let base;
	try {
		base = execSync(`git merge-base FETCH_HEAD ${headRef}`, { encoding: 'utf-8' }).trim();
	} catch {
		return false; // no common ancestor reachable yet, or headRef still hidden by the shallow graft
	}
	if (!base) return false;
	return !readShallowBoundaries().has(base);
}

function readShallowBoundaries() {
	try {
		const shallowPath = execSync('git rev-parse --git-path shallow', {
			encoding: 'utf-8',
		}).trim();
		const content = readFileSync(shallowPath, 'utf-8');
		return new Set(
			content
				.split('\n')
				.map((l) => l.trim())
				.filter(Boolean),
		);
	} catch {
		return new Set(); // no shallow file => complete repo
	}
}

/**
 * Resolve the merge-base SHA between FETCH_HEAD and headRef.
 * Used to give downstream tools (e.g. janitor's AST diff) a stable, PR-only
 * comparison point that doesn't drift when the base branch moves forward.
 */
export function getMergeBase(headRef = 'HEAD') {
	return execSync(`git merge-base FETCH_HEAD ${headRef}`, { encoding: 'utf-8' }).trim();
}

// --- Filter evaluation ---

/**
 * Evaluate a single filter against changed files using gitignore semantics.
 * Patterns evaluated in order, last match wins. ! prefix excludes.
 * Filter triggers if ANY changed file passes.
 */
export function evaluateFilter(changedFiles, patterns) {
	for (const file of changedFiles) {
		let included = false;
		for (const pattern of patterns) {
			if (pattern.startsWith('!')) {
				if (matchGlob(file, pattern.slice(1))) {
					included = false;
				}
			} else {
				if (matchGlob(file, pattern)) {
					included = true;
				}
			}
		}
		if (included) return true;
	}
	return false;
}

// --- Mode: filter ---

function setOutput(name, value) {
	const outputFile = process.env.GITHUB_OUTPUT;
	if (outputFile) {
		const delimiter = `ghadelimiter_${Date.now()}`;
		appendFileSync(outputFile, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
	}
}

/**
 * Cap the changed-files list before it leaves the action.
 *
 * The list is consumed downstream as a step `env:` value and as a CLI argument
 * (`--files=...`). On a PR that touches thousands of files the joined string
 * blows past the kernel's argv/env size limit, so the runner can't even spawn
 * the step's shell ("Argument list too long" on execve). A change set that
 * large affects essentially every package anyway, so the per-file test scoping
 * is moot: emit an empty list, which every consumer already reads as "no
 * signal → run the full suite / all packages" — the safe, correct fallback.
 */
export function formatChangedFilesOutput(
	changedFiles,
	maxCount = Number(process.env.CI_FILTER_MAX_CHANGED_FILES) || 1000,
) {
	if (changedFiles.length > maxCount) {
		console.log(
			`Changed file count (${changedFiles.length}) exceeds CI_FILTER_MAX_CHANGED_FILES (${maxCount}); ` +
				'emitting an empty changed-files output so downstream test scoping falls back to the full suite. ' +
				'This keeps the value small enough to pass through the step environment and CLI args.',
		);
		return '';
	}
	return changedFiles.join('\n');
}

export function runFilter() {
	const filtersInput = process.env.INPUT_FILTERS;
	const baseRef = process.env.INPUT_BASE_REF;

	if (!filtersInput) {
		throw new Error('INPUT_FILTERS is required in filter mode');
	}
	if (!baseRef) {
		throw new Error('INPUT_BASE_REF is required in filter mode');
	}

	const filters = parseFilters(filtersInput);
	const headRef = resolveHeadRef();
	const changedFiles = getChangedFiles(baseRef, headRef);
	const addedFiles = getAddedFiles(baseRef, headRef);
	const mergeBase = getMergeBase(headRef);

	console.log(`Diffing ${headRef} against ${baseRef}`);
	console.log(`Merge base: ${mergeBase}`);
	console.log(`Changed files (${changedFiles.length}):`);
	for (const f of changedFiles) {
		console.log(`  ${f}`);
	}

	const results = {};

	for (const [name, patterns] of filters) {
		const matched = evaluateFilter(changedFiles, patterns);
		results[name] = matched;
		console.log(`Filter "${name}": ${matched}`);
	}

	setOutput('results', JSON.stringify(results));
	setOutput('changed-files', formatChangedFilesOutput(changedFiles));
	setOutput('added-files', formatChangedFilesOutput(addedFiles));
	setOutput('base-ref', baseRef);
	setOutput('merge-base', mergeBase);
}

// --- Mode: validate ---

export function runValidate() {
	const raw = process.env.INPUT_JOB_RESULTS;
	if (!raw) {
		throw new Error('INPUT_JOB_RESULTS is required in validate mode');
	}

	const jobResults = JSON.parse(raw);
	const problems = [];

	for (const [job, data] of Object.entries(jobResults)) {
		if (data.result === 'failure') problems.push(`${job}: failed`);
		if (data.result === 'cancelled') problems.push(`${job}: cancelled`);
	}

	if (problems.length > 0) {
		console.error('Required checks failed:');
		for (const p of problems) {
			console.error(`  - ${p}`);
		}
		process.exit(1);
	}

	console.log('All required checks passed:');
	for (const [job, data] of Object.entries(jobResults)) {
		console.log(`  ${job}: ${data.result}`);
	}
}

// --- Main (only when run directly, not when imported by tests) ---

if (resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1])) {
	const mode = process.env.INPUT_MODE;
	if (mode === 'filter') {
		runFilter();
	} else if (mode === 'validate') {
		runValidate();
	} else {
		throw new Error(`Unknown mode: "${mode}". Expected "filter" or "validate".`);
	}
}
