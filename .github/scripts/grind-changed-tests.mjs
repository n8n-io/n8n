#!/usr/bin/env node
/**
 * Resolves test files changed in a PR and runs `scripts/grind.mjs` against
 * each, respecting a wall-time budget. Emits a markdown comment body to
 * the path given by --out (default: grind-comment.md).
 *
 * Used by .github/workflows/grind-changed-tests.yml. Designed to stand
 * alone — invokable locally:
 *
 *   node .github/scripts/grind-changed-tests.mjs \
 *     --base origin/master --glob 'packages/frontend/editor-ui/**\/*.test.ts'
 *
 * Env:
 *   GITHUB_OUTPUT - if set, writes "comment-file=<path>" for downstream steps.
 *
 * Exit code is always 0 unless arguments are malformed — flaky/broken
 * results are reported via the markdown table, not the exit code, so a
 * single bad file doesn't abort the workflow.
 */
import { spawnSync } from 'node:child_process';
import { writeFileSync, appendFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { minimatch } from 'minimatch';

const { values } = parseArgs({
	options: {
		base: { type: 'string' },
		glob: { type: 'string' },
		files: { type: 'string' },
		n: { type: 'string', default: '10' },
		'budget-seconds': { type: 'string', default: '300' },
		out: { type: 'string', default: 'grind-comment.md' },
	},
	strict: true,
});

const n = Number(values.n);
const budgetSeconds = Number(values['budget-seconds']);
const deadline = Date.now() + budgetSeconds * 1000;

// --- Resolve files ---

let files = [];

if (values.files) {
	files = values.files.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
	console.log(`Using explicit file list (${files.length} files):`);
	for (const f of files) console.log(`  ${f}`);
} else {
	if (!values.base || !values.glob) {
		console.error('Provide either --files or both --base and --glob');
		process.exit(2);
	}

	const baseRef = values.base;
	const baseRemote = baseRef.startsWith('origin/') ? baseRef.slice('origin/'.length) : baseRef;

	const fetchRes = spawnSync('git', ['fetch', '--no-tags', '--depth=1', 'origin', baseRemote], {
		stdio: ['ignore', 'inherit', 'inherit'],
	});
	if (fetchRes.status !== 0) {
		console.warn(
			`git fetch origin ${baseRemote} failed (status ${fetchRes.status}); proceeding with local refs.`,
		);
	}

	const diff = spawnSync(
		'git',
		['diff', '--name-only', '--diff-filter=ACMR', `${baseRef}...HEAD`],
		{ encoding: 'utf8' },
	);
	if (diff.status !== 0) {
		console.error(`git diff failed: ${diff.stderr}`);
		process.exit(1);
	}

	const allChanged = diff.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
	files = allChanged.filter((p) => minimatch(p, values.glob));

	console.log(`Changed files matching ${values.glob}:`);
	for (const f of files) console.log(`  ${f}`);
}

// --- Grind each file ---

const rows = [];

for (const file of files) {
	if (Date.now() >= deadline) {
		rows.push({ file, status: 'skipped' });
		continue;
	}

	console.log(`::group::grind ${file}`);
	const res = spawnSync(
		'node',
		['scripts/grind.mjs', '--file', file, '--n', String(n), '--json'],
		{ encoding: 'utf8' },
	);
	console.log(res.stderr);
	console.log(res.stdout);
	console.log('::endgroup::');

	let parsed = null;
	for (const line of (res.stdout ?? '').split('\n').reverse()) {
		if (!line.trim()) continue;
		try {
			parsed = JSON.parse(line);
			break;
		} catch {
			// Keep scanning for a JSON line.
		}
	}

	if (!parsed) {
		rows.push({ file, status: 'no-result' });
		continue;
	}

	rows.push({ file, status: 'ran', passed: parsed.passed, total: parsed.total });
}

// --- Render markdown ---

const renderRow = ({ file, status, passed, total }) => {
	if (status === 'skipped') return `| \`${file}\` | _skipped due to time budget_ |`;
	if (status === 'no-result') return `| \`${file}\` | _no result captured_ ❌ |`;
	const fraction = `${passed}/${total}`;
	if (passed === total) return `| \`${file}\` | ${fraction} ✅ |`;
	if (passed === 0) return `| \`${file}\` | ${fraction} ❌ broken |`;
	return `| \`${file}\` | ${fraction} ⚠️ flaky |`;
};

const body = [
	'<!-- grind-results -->',
	'## Grind results — pre-merge flake detection (N=' + n + ')',
	'',
	'| File | Passes |',
	'|---|---|',
	...rows.map(renderRow),
	'',
	'_Spawn-per-iteration mode. Catches post-teardown async flakes that `vitest --repeat` misses. See [DEVP-198](https://linear.app/n8n/issue/DEVP-198) for design notes._',
	'',
].join('\n');

writeFileSync(values.out, body);
console.log(`Wrote ${values.out} (${rows.length} rows)`);

if (process.env.GITHUB_OUTPUT) {
	appendFileSync(process.env.GITHUB_OUTPUT, `comment-file=${values.out}\n`);
	appendFileSync(process.env.GITHUB_OUTPUT, `files-count=${rows.length}\n`);
}
