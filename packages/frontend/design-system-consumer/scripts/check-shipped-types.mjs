#!/usr/bin/env node
/**
 * Typechecks the declarations `@n8n/design-system` ships, and fails only on the
 * ones that package owns.
 *
 * `skipLibCheck: false` checks every `.d.ts` in the program, so it also reports
 * declarations we do not write and cannot fix from here: element-plus 2.4.3
 * against a newer vue and csstype, `@vueuse/core` needing
 * `@types/web-bluetooth`, and a stale `@types/markdown-it-link-attributes`.
 * Those are dependency-upgrade work, not a broken package contract, and gating
 * on them would make this probe unpassable and therefore ignored.
 *
 * So the gate is scoped: an error inside `@n8n/design-system` or inside this
 * app's own sources fails the run; anything else is counted and listed under
 * `--verbose`. Third-party noise going up or down never changes the verdict.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const owned = [
	resolve(appDir, '../@n8n/design-system') + '/',
	resolve(appDir, 'src') + '/',
];

// The local bin rather than `vue-tsc` on PATH, so the script also runs directly
// (`node scripts/check-shipped-types.mjs`), not only through a pnpm script.
const localBin = resolve(appDir, 'node_modules/.bin/vue-tsc');
const { stdout = '', status } = spawnSync(
	existsSync(localBin) ? localBin : 'vue-tsc',
	['--noEmit', '-p', 'tsconfig.libcheck.json'],
	{ cwd: appDir, encoding: 'utf8' },
);

/** `path(line,col): error TSxxxx: message`, plus its indented continuation lines. */
const diagnostics = [];
for (const line of stdout.split('\n')) {
	const head = /^(?<file>[^(]+)\((?<line>\d+),(?<col>\d+)\): error (?<code>TS\d+): /.exec(line);
	if (head) {
		diagnostics.push({ file: resolve(appDir, head.groups.file), text: line });
	} else if (line.trim() && diagnostics.length) {
		diagnostics.at(-1).text += `\n${line}`;
	}
}

const isOwned = (file) => owned.some((prefix) => file.startsWith(prefix));
const ours = diagnostics.filter((d) => isOwned(d.file));
const theirs = diagnostics.filter((d) => !isOwned(d.file));

if (process.argv.includes('--verbose')) {
	for (const d of theirs) console.log(d.text);
}

if (ours.length) {
	for (const d of ours) console.error(d.text);
	console.error(
		`\n${ours.length} error(s) in the declarations @n8n/design-system ships. ` +
			'Fix the source, or add a rewrite in its vite.config.mts.',
	);
	process.exit(1);
}

console.log(
	'@n8n/design-system ships no declaration errors of its own ' +
		`(${theirs.length} in third-party declarations, ignored — pass --verbose to list them).`,
);

// vue-tsc exits non-zero for the ignored errors, and 0 means it ran; anything
// else is a crash we must not swallow.
if (status !== 0 && !diagnostics.length) {
	console.error(stdout);
	console.error(`vue-tsc exited ${status} without reporting a diagnostic.`);
	process.exit(1);
}
