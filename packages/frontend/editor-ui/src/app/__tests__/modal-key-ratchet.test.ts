import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import * as shellConstants from '@/app/constants/modals';
import { SHELL_MODAL_INITIAL_STATE } from '@/app/stores/defaults/modals';

import baselineFile from './modal-key-baseline.json';
import {
	MODAL_BASELINE_PATH,
	MODAL_BASELINE_UPDATE_COMMAND,
	MODAL_BASELINE_UPDATE_ENV,
	MODAL_BASELINE_VERSION,
	baselineDrift,
	nextBaseline,
	serializeBaseline,
	type ModalKeyBaseline,
	type ModalKeySurface,
	type ModalKeySurfaces,
} from './modal-key-baseline';

/**
 * The two modal-key surfaces of the shell can become smaller, but never larger
 * (CAT-3688).
 *
 * `eslint.config.mjs` bans the same shapes, but only at level `warn` until
 * CAT-3973 removes the remaining entries. So this test is the gate that fails.
 *
 * This test reads both lists from the modules at runtime. It does not parse the
 * source text. So it counts an entry in the same way as the application.
 *
 * `modal-key-baseline.json` is the CAT-3973 backlog. Both lists are empty at the
 * end. An extraction records itself with `pnpm --filter n8n-editor-ui
 * modal-baseline --update` — see `modal-key-baseline.ts` for the rules.
 */

/** These are dialog result sentinels, not modal keys. They stay after the migration. */
const RESULT_SENTINELS: string[] = ['MODAL_CANCEL', 'MODAL_CONFIRM', 'MODAL_CLOSE'];

/**
 * Keep this a static import. CI runs `vitest related <changed files>`, so the gate
 * runs only for a file in this test's module graph. A `readFileSync` of the same
 * path would drop the baseline out of that graph, and a PR that edited the baseline
 * alone would then not run the gate that guards it.
 */
const baseline: ModalKeyBaseline = baselineFile;

const baselinePath = resolve(process.cwd(), MODAL_BASELINE_PATH);

const shellSurfaces = (): ModalKeySurfaces => ({
	keyExports: Object.keys(shellConstants)
		.filter((name) => !RESULT_SENTINELS.includes(name))
		.sort(),
	catalogueKeys: Object.keys(SHELL_MODAL_INITIAL_STATE).sort(),
});

/**
 * A removal is an extraction that only has to be recorded; an addition is a
 * reacquisition that has to be fixed in the code. The two need different advice,
 * so the hint is built from the drift rather than written once for both.
 */
const hintFor = (surface: ModalKeySurface, fixAdvice: string): string => {
	const { added, removed } = baselineDrift(baseline, shellSurfaces())[surface];
	if (added.length === 0 && removed.length > 0) {
		return `${removed.join(', ')} left the shell. Record it: \`${MODAL_BASELINE_UPDATE_COMMAND}\`.`;
	}
	return `${fixAdvice} The baseline can only become smaller, so do not add ${added.join(', ')} to it. After a modal moves to its feature, record it with \`${MODAL_BASELINE_UPDATE_COMMAND}\`.`;
};

describe('modal-key ratchet', () => {
	if (process.env[MODAL_BASELINE_UPDATE_ENV] === '1') {
		it('regenerates the baseline', () => {
			const shell = shellSurfaces();
			const { keyExports, catalogueKeys } = baselineDrift(baseline, shell);

			// Throws on a reacquisition, so `--update` cannot bless one.
			writeFileSync(baselinePath, serializeBaseline(nextBaseline(baseline, shell)), 'utf8');

			const removed = [...keyExports.removed, ...catalogueKeys.removed];
			console.info(
				removed.length > 0
					? `Removed from the modal-key baseline: ${removed.join(', ')}.`
					: 'The modal-key baseline was already current.',
			);
		});

		return;
	}

	it('reads a baseline of the version it understands', () => {
		expect(baseline.version).toBe(MODAL_BASELINE_VERSION);
	});

	it('does not let the shell reacquire a modal key constant', () => {
		expect(
			shellSurfaces().keyExports,
			hintFor(
				'keyExports',
				'Declare the key in the constants file of the feature that owns it. Then register the modal from the modals.ts fragment of that feature.',
			),
		).toEqual(baseline.keyExports);
	});

	it('does not let the shell reacquire a modal definition', () => {
		expect(
			shellSurfaces().catalogueKeys,
			hintFor(
				'catalogueKeys',
				'Write a ModalDefinition for the modal in the fragment of its feature. Then modalRegistry registers the modal. In the same change, delete the <ModalRoot> of the modal from Modals.vue.',
			),
		).toEqual(baseline.catalogueKeys);
	});
});
