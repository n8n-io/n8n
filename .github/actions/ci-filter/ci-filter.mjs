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
			if (patterns) patterns.push(line);
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

export function getChangedFiles(baseRef) {
	if (!SAFE_REF.test(baseRef)) {
		throw new Error(`Unsafe base ref: "${baseRef}"`);
	}
	execSync(`git fetch --depth=1 origin ${baseRef}`, { stdio: 'pipe' });
	const output = execSync('git diff --name-only FETCH_HEAD HEAD', { encoding: 'utf-8' });
	return output
		.split('\n')
		.map((f) => f.trim())
		.filter(Boolean);
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
