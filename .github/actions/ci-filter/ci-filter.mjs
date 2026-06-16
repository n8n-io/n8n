import { execSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
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
 * Inside a multi-line filter, an indented `events: [event1, event2]` directive
 * restricts the filter to those GitHub event names. Default (no directive) =
 * all events.
 *
 * Lines starting with # and blank lines are ignored.
 *
 * Returns Map<name, { events?: string[], patterns: string[] }>.
 */
export function parseFilters(input) {
	const filters = new Map();
	const lines = input.split('\n');
	let currentFilter = null;

	for (const rawLine of lines) {
		const line = rawLine.trim();

		if (!line || line.startsWith('#')) continue;

		// Inside an indented filter context, check for `events:` directive
		// before the general header match — otherwise it'd open a new filter
		// named "events".
		if (currentFilter && rawLine.match(/^\s/)) {
			const eventsMatch = line.match(/^events:\s*\[([^\]]*)\]\s*$/);
			if (eventsMatch) {
				const events = eventsMatch[1]
					.split(',')
					.map((s) => s.trim())
					.filter(Boolean);
				const entry = filters.get(currentFilter);
				if (entry.events !== undefined) {
					throw new Error(`Filter "${currentFilter}" has duplicate events: directive`);
				}
				entry.events = events;
				continue;
			}
		}

		const headerMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)?$/);
		if (headerMatch) {
			const name = headerMatch[1];
			const rest = (headerMatch[2] || '').trim();
			const entry = { patterns: [] };
			currentFilter = name;
			filters.set(name, entry);

			if (rest) {
				entry.patterns.push(...rest.split(/\s+/));
				currentFilter = null;
			}
			continue;
		}

		if (currentFilter && rawLine.match(/^\s/)) {
			const entry = filters.get(currentFilter);
			const pattern = line.startsWith('- ') ? line.slice(2).trim() : line;
			if (entry && pattern) entry.patterns.push(pattern);
			continue;
		}

		throw new Error(`Malformed filter input at: "${rawLine}"`);
	}

	for (const [name, entry] of filters) {
		if (entry.patterns.length === 0) {
			throw new Error(`Filter "${name}" has no patterns`);
		}
	}

	return filters;
}

/**
 * A filter passes the event gate if it has no `events:` directive (default =
 * all events) or if the current event is listed.
 */
export function shouldRunOnEvent(filterEvents, currentEvent) {
	if (!filterEvents) return true;
	return filterEvents.includes(currentEvent);
}

// --- Git operations ---

const SAFE_REF = /^[a-zA-Z0-9_./-]+$/;

export function getChangedFiles(baseRef) {
	if (!SAFE_REF.test(baseRef)) {
		throw new Error(`Unsafe base ref: "${baseRef}"`);
	}
	// Deepen the fetch so the merge base is reachable from this shallow clone.
	// A 2-dot diff (FETCH_HEAD HEAD) reports anything that differs in either
	// direction, so files added to base-branch after the PR diverged show up as
	// "changed" — spuriously triggering path-filtered jobs. The merge base
	// scopes the diff to PR-only changes.
	execSync(`git fetch --no-tags --prune --deepen=200 origin ${baseRef}`, { stdio: 'pipe' });
	const output = execSync('git diff --name-only --merge-base FETCH_HEAD HEAD', {
		encoding: 'utf-8',
	});
	return output
		.split('\n')
		.map((f) => f.trim())
		.filter(Boolean);
}

/**
 * Resolve the merge-base SHA between FETCH_HEAD and HEAD.
 * Used to give downstream tools (e.g. janitor's AST diff) a stable, PR-only
 * comparison point that doesn't drift when the base branch moves forward.
 */
export function getMergeBase() {
	return execSync('git merge-base FETCH_HEAD HEAD', { encoding: 'utf-8' }).trim();
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
	const changedFiles = getChangedFiles(baseRef);
	const mergeBase = getMergeBase();
	const eventName = process.env.GITHUB_EVENT_NAME || '';

	console.log(`Event: ${eventName || '<unknown>'}`);
	console.log(`Merge base: ${mergeBase}`);
	console.log(`Changed files (${changedFiles.length}):`);
	for (const f of changedFiles) {
		console.log(`  ${f}`);
	}

	const results = {};

	for (const [name, entry] of filters) {
		const eventOk = shouldRunOnEvent(entry.events, eventName);
		const matched = eventOk && evaluateFilter(changedFiles, entry.patterns);
		results[name] = matched;
		if (!eventOk) {
			console.log(
				`Filter "${name}": false (event "${eventName}" not in events: [${(entry.events ?? []).join(', ')}])`,
			);
		} else {
			console.log(`Filter "${name}": ${matched}`);
		}
	}

	setOutput('results', JSON.stringify(results));
	setOutput('changed-files', changedFiles.join('\n'));
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
