import { describe, it, expect } from 'vitest';

// eslint-disable-next-line import-x/extensions
import shellConstantsSource from '@/app/constants/modals.ts?raw';
// eslint-disable-next-line import-x/extensions
import shellCatalogueSource from '@/app/stores/defaults/modals.ts?raw';

/**
 * The shell's two modal-key surfaces may shrink, never grow (CAT-3688).
 * `eslint.config.mjs` bans the same shapes, but only at `warn` until CAT-3973
 * clears the backlog, so this test is what fails.
 *
 * A decrease fails too. A baseline above the real count buys back room for new
 * entries in silence.
 *
 * Keep these regexes in step with the lint selectors. They disagreed twice, and
 * each disagreement let one shape through.
 */

/** Update on the way down only. Both surfaces are done at 0. */
const BASELINE = {
	shellModalKeyExports: 36,
	shellCatalogueEntries: 56,
};

/** Dialog result sentinels, not modal keys. They stay when the migration ends. */
const RESULT_SENTINELS = ['MODAL_CANCEL', 'MODAL_CONFIRM', 'MODAL_CLOSE'];

const EXPORT_CONST_REGEX = /^export const ([A-Za-z_0-9]+)/gm;
const REEXPORT_REGEX = /^export \{/gm;
/**
 * Computed, quoted, bare and spread members all resolve the same at runtime.
 * A spread counts as one, so `...TEN_MODALS` reads nine too low — safe, because
 * a low count fails the exact match instead of hiding an increase.
 */
const CATALOGUE_ENTRY_REGEX = /^\t(?:\.\.\.|(?:\[[^\]]+\]|'[^']*'|"[^"]*"|[A-Za-z_$][\w$]*)\s*:)/gm;

function countShellModalKeyExports(): number {
	const declared = [...shellConstantsSource.matchAll(EXPORT_CONST_REGEX)]
		.map(([, name]) => name)
		.filter((name) => !RESULT_SENTINELS.includes(name));
	const reexported = [...shellConstantsSource.matchAll(REEXPORT_REGEX)];

	return declared.length + reexported.length;
}

function countShellCatalogueEntries(): number {
	return [...shellCatalogueSource.matchAll(CATALOGUE_ENTRY_REGEX)].length;
}

function ratchetMessage(surface: string, current: number, baseline: number, hint: string): string {
	if (current > baseline) {
		return `\n\n❌ The shell reacquired ${current - baseline} modal key(s): ${surface} is ${current}, baseline ${baseline}.\n\n${hint}\n\nIf you are certain the shell must own this, say so on CAT-3688 before you raise the baseline — it only moves down.\n`;
	}

	return `\n\n📉 Baseline is stale: ${surface} is ${current}, baseline still ${baseline}. Good news — ${baseline - current} fewer than before. Set ${surface} to ${current} in BASELINE (this file) to lock the win in.\n`;
}

describe('modal-key ratchet', () => {
	it('reads both shell surfaces — the shapes it counts still exist', () => {
		// A broken path or regex counts 0, which reads as a finished migration.
		expect(shellConstantsSource, 'app/constants/modals.ts read empty').toContain('MODAL_CONFIRM');
		expect(shellCatalogueSource, 'defaults/modals.ts read empty').toContain(
			'SHELL_MODAL_INITIAL_STATE',
		);
	});

	it('does not let the shell reacquire a modal key constant', () => {
		const current = countShellModalKeyExports();

		expect(
			current,
			ratchetMessage(
				'shellModalKeyExports',
				current,
				BASELINE.shellModalKeyExports,
				"Declare the key in its owning feature's constants file and register the modal from that feature's modals.ts fragment — see src/features/core/auth/modals.ts.",
			),
		).toBe(BASELINE.shellModalKeyExports);
	});

	it('does not let the shell reacquire a modal definition', () => {
		const current = countShellCatalogueEntries();

		expect(
			current,
			ratchetMessage(
				'shellCatalogueEntries',
				current,
				BASELINE.shellCatalogueEntries,
				'Give the modal a ModalDefinition in its feature fragment so it registers through modalRegistry, and delete its <ModalRoot> from Modals.vue in the same change.',
			),
		).toBe(BASELINE.shellCatalogueEntries);
	});
});
