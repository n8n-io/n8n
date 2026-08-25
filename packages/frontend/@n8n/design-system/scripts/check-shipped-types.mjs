#!/usr/bin/env node
/**
 * Typechecks the declarations this package emits, and fails on the ones it owns.
 *
 * Consumers compile with `skipLibCheck: true`, so a broken `.d.ts` here is
 * invisible to them until they turn it off — at which point it is unfixable from
 * their side. This runs as part of `build`, so a regression fails in the only
 * place that can still fix it.
 *
 * `skipLibCheck: false` checks every `.d.ts` in the program, so it also reports
 * declarations this repo does not write: element-plus 2.4.3 against a newer vue
 * and csstype, `@vueuse/core` wanting `@types/web-bluetooth`, and a stale
 * `@types/markdown-it-link-attributes`. Those are dependency-upgrade work, not a
 * broken package contract, and gating on them would leave the check permanently
 * red — which is how a check stops being read.
 *
 * So the gate is scoped: an error in a file inside this package fails the build;
 * anything else is counted, and listed under `--verbose`. Third-party noise
 * going up or down never changes the verdict.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = resolve(packageDir, 'dist');

if (!existsSync(distDir)) {
	console.error(`No dist at ${distDir}. Run the build first.`);
	process.exit(1);
}

// The local bin rather than `vue-tsc` on PATH, so the script also runs directly
// (`node scripts/check-shipped-types.mjs`), not only through a pnpm script.
// vue-tsc rather than tsc: the emitted declarations import each other through
// `./Foo.vue` specifiers, which plain tsc does not resolve.
const localBin = resolve(packageDir, 'node_modules/.bin/vue-tsc');
const { stdout = '', status } = spawnSync(
	existsSync(localBin) ? localBin : 'vue-tsc',
	['--noEmit', '-p', 'tsconfig.libcheck.json'],
	{ cwd: packageDir, encoding: 'utf8' },
);

/** `path(line,col): error TSxxxx: message`, plus its indented continuation lines. */
const diagnostics = [];
for (const line of stdout.split('\n')) {
	const head = /^(?<file>[^(]+)\((?<line>\d+),(?<col>\d+)\): error (?<code>TS\d+): /.exec(line);
	if (head) {
		diagnostics.push({ file: resolve(packageDir, head.groups.file), text: line });
	} else if (line.trim() && diagnostics.length) {
		diagnostics.at(-1).text += `\n${line}`;
	}
}

const isOurs = (file) => file.startsWith(`${packageDir}/`) && !file.includes('/node_modules/');
const ours = diagnostics.filter((d) => isOurs(d.file));
const theirs = diagnostics.filter((d) => !isOurs(d.file));

if (process.argv.includes('--verbose')) {
	for (const d of theirs) console.log(d.text);
}

if (ours.length) {
	for (const d of ours) console.error(d.text);
	console.error(
		`\n${ours.length} error(s) in the declarations this package ships. ` +
			'Fix the source, or add a rewrite in vite.config.mts.',
	);
	process.exit(1);
}

console.log(
	'Shipped declarations: no errors of our own ' +
		`(${theirs.length} in third-party declarations, ignored — pass --verbose to list them).`,
);

// vue-tsc exits non-zero for the ignored errors, and 0 means it ran clean;
// anything else is a crash we must not swallow.
if (status !== 0 && !diagnostics.length) {
	console.error(stdout);
	console.error(`vue-tsc exited ${status} without reporting a diagnostic.`);
	process.exit(1);
}
