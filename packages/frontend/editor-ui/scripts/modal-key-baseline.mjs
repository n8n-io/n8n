#!/usr/bin/env node
/**
 * Entry point for the shell modal-key baseline
 * (`src/app/__tests__/modal-key-baseline.json`).
 *
 *     pnpm --filter n8n-editor-ui modal-baseline            # check
 *     pnpm --filter n8n-editor-ui modal-baseline --update    # regenerate
 *
 * Both modes run one gate: `src/app/__tests__/modal-key-ratchet.test.ts`. The two
 * lists exist only as runtime exports of `@/app/constants/modals` and
 * `@/app/stores/defaults/modals`, so vitest is what can read them, with the
 * package's aliases and its jsdom environment. A generator that parsed the source
 * text instead could count an entry differently from the gate, and then the
 * regenerated baseline would not be the one the gate wants.
 *
 * `--update` only sets the environment variable that switches the gate into its
 * write branch. The write itself, and the decrease-only rule that guards it, live
 * in `src/app/__tests__/modal-key-baseline.ts`.
 *
 * ponytail: a run costs a whole vitest startup (~12s), because the gate has to boot
 * the package's module graph to read the lists. Too slow for a pre-commit hook; CI
 * gets it for free inside the frontend unit job.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATCHET_TEST = 'src/app/__tests__/modal-key-ratchet.test.ts';

const args = process.argv.slice(2);
const unknown = args.filter((arg) => arg !== '--update');
if (unknown.length > 0) {
	console.error(`Unknown argument: ${unknown.join(' ')}\nUsage: modal-baseline [--update]`);
	process.exit(2);
}

const update = args.includes('--update');
const packageDir = join(dirname(fileURLToPath(import.meta.url)), '..');

const { status } = spawnSync('vitest', ['run', RATCHET_TEST], {
	cwd: packageDir,
	stdio: 'inherit',
	env: update ? { ...process.env, UPDATE_MODAL_BASELINE: '1' } : process.env,
	shell: process.platform === 'win32',
});

if (status !== 0) {
	console.error(
		update
			? '\nThe baseline was not written. The shell reacquired a modal key — fix the code, then re-run.'
			: '\nThe modal-key baseline check failed. If a modal moved to its feature, run this command with --update.',
	);
}

process.exit(status ?? 1);
