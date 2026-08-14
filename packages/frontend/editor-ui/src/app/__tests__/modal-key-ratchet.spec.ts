import { describe, it, expect } from 'vitest';

// eslint-disable-next-line import-x/extensions
import shellConstantsSource from '@/app/constants/modals.ts?raw';
// eslint-disable-next-line import-x/extensions
import shellCatalogueSource from '@/app/stores/defaults/modals.ts?raw';

/**
 * The decrease-only half of the modal-key ratchet (CAT-3688 Seam E).
 *
 * `eslint.config.mjs` bans the same two shapes at `warn`, which is the signal an
 * author gets while typing. A warn does not fail anything, and it cannot until
 * the pre-existing entries are gone (CAT-3973), so this is what actually holds
 * the line in between: the shell's two modal-key surfaces may shrink, never grow.
 *
 * Counted to match the lint selectors shape-for-shape, so the numbers below and
 * the warning count track each other — an author who fixes N warnings subtracts N
 * here. Keep the two in step when either changes: they drifted once (the lint saw
 * `[camelCase]` entries the counter's UPPER_SNAKE regex did not, and the counter
 * saw `export { X }` lists the lint's `[source]` selector did not), and a silent
 * disagreement is how an entry slips past both.
 *
 * ## Why exact-match rather than fail-on-increase
 *
 * `scripts/check-boundaries.mjs` — the repo's other ratchet — only fails when its
 * count grows, and nudges when it shrinks. That fits a backlog nobody owns. This
 * one has an owner and a deadline, and a baseline left stale above the real count
 * silently buys back room for new entries. So a decrease fails too, and the fix
 * is to write the smaller number down. The one-line conflict that creates between
 * concurrent extraction PRs is deliberate: it forces the count to be re-read after
 * merging master, which is exactly the check #36147 skipped.
 */

/**
 * These two cover the shell's **unregistered** modals — a key the shell declares
 * and a definition the shell holds. They are not every way a modal can reach the
 * screen: `modalRegistry.register()` called from a shell file is a third path, and
 * no gate here sees it. That path is sanctioned for shell-owned modals and governed
 * by convention only; constraining it (e.g. `eagerModals` may spread only fragments
 * imported from `src/features/**`) belongs to CAT-3973, which is where inline
 * registrations would appear.
 *
 * Update on the way down only. Both surfaces are done at 0.
 */
const BASELINE = {
	/** `export const <KEY>` + re-export statements in `app/constants/modals.ts`. */
	shellModalKeyExports: 36,
	/** Computed entries in `SHELL_MODAL_INITIAL_STATE`. */
	shellCatalogueEntries: 56,
};

/** Dialog *result* sentinels, not modal keys — out of scope, and what remains at the end. */
const RESULT_SENTINELS = ['MODAL_CANCEL', 'MODAL_CONFIRM', 'MODAL_CLOSE'];

const EXPORT_CONST_REGEX = /^export const ([A-Za-z_0-9]+)/gm;
const REEXPORT_REGEX = /^export \{/gm;
/**
 * A catalogue entry in any form the object literal accepts — computed key, quoted
 * string, or bare identifier. All three resolve and open identically at runtime,
 * so counting only the computed UPPER_SNAKE form left two ways in.
 */
const CATALOGUE_ENTRY_REGEX = /^\t(?:\[[^\]]+\]|'[^']*'|"[^"]*"|[A-Za-z_$][\w$]*)\s*:/gm;

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
		return `\n\n❌ The shell reacquired ${current - baseline} modal key(s): ${surface} is ${current}, baseline ${baseline}.\n\n${hint}\n\nIf you are certain the shell must own this, say so on CAT-3688 before raising the baseline — it only moves down.\n`;
	}

	return `\n\n📉 Baseline is stale: ${surface} is ${current}, baseline still ${baseline}. Good news — ${baseline - current} fewer than before. Set ${surface} to ${current} in BASELINE (this file) to lock the win in.\n`;
}

describe('modal-key ratchet', () => {
	it('reads both shell surfaces — the shapes it counts still exist', () => {
		// Guards the two `?raw` imports and the three regexes: if a path breaks or a
		// file is rewritten so nothing matches, the count collapses to 0 and would
		// otherwise read as a completed migration.
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
