import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import baselineFile from './modal-key-baseline.json';
import {
	MODAL_BASELINE_NOTICE,
	MODAL_BASELINE_PATH,
	MODAL_BASELINE_VERSION,
	ModalKeyReacquisitionError,
	baselineDrift,
	nextBaseline,
	serializeBaseline,
	type ModalKeyBaseline,
} from './modal-key-baseline';

/**
 * The rules of the baseline that `modal-key-ratchet.test.ts` gates on. The gate
 * itself asserts against the real shell; these cases assert the regeneration is
 * decrease-only, whatever the shell holds.
 */
describe('modal-key baseline', () => {
	const baseline = { keyExports: ['A_MODAL_KEY', 'B_MODAL_KEY'], catalogueKeys: ['a', 'b'] };

	describe('baselineDrift', () => {
		it('reports an extracted entry as removed', () => {
			const drift = baselineDrift(baseline, { keyExports: ['A_MODAL_KEY'], catalogueKeys: ['a'] });

			expect(drift.keyExports).toEqual({ added: [], removed: ['B_MODAL_KEY'] });
			expect(drift.catalogueKeys).toEqual({ added: [], removed: ['b'] });
		});

		it('reports a reacquired entry as added', () => {
			const drift = baselineDrift(baseline, {
				keyExports: ['A_MODAL_KEY', 'B_MODAL_KEY', 'C_MODAL_KEY'],
				catalogueKeys: ['a', 'b', 'c'],
			});

			expect(drift.keyExports).toEqual({ added: ['C_MODAL_KEY'], removed: [] });
			expect(drift.catalogueKeys).toEqual({ added: ['c'], removed: [] });
		});

		it('reports a swap at an unchanged count', () => {
			const drift = baselineDrift(baseline, {
				keyExports: ['A_MODAL_KEY', 'C_MODAL_KEY'],
				catalogueKeys: ['a', 'c'],
			});

			expect(drift.keyExports).toEqual({ added: ['C_MODAL_KEY'], removed: ['B_MODAL_KEY'] });
		});
	});

	describe('nextBaseline', () => {
		it('records an extraction', () => {
			const next = nextBaseline(baseline, { keyExports: ['A_MODAL_KEY'], catalogueKeys: ['a'] });

			expect(next).toEqual({
				'//': MODAL_BASELINE_NOTICE,
				version: MODAL_BASELINE_VERSION,
				keyExports: ['A_MODAL_KEY'],
				catalogueKeys: ['a'],
			});
		});

		it('sorts both lists, so two extraction PRs cannot reorder the file', () => {
			const next = nextBaseline(
				{ keyExports: ['A_MODAL_KEY', 'B_MODAL_KEY', 'C_MODAL_KEY'], catalogueKeys: ['a', 'b'] },
				{ keyExports: ['C_MODAL_KEY', 'A_MODAL_KEY'], catalogueKeys: ['b', 'a'] },
			);

			expect(next.keyExports).toEqual(['A_MODAL_KEY', 'C_MODAL_KEY']);
			expect(next.catalogueKeys).toEqual(['a', 'b']);
		});

		it('refuses to record a reacquired key constant', () => {
			expect(() =>
				nextBaseline(baseline, {
					keyExports: ['A_MODAL_KEY', 'B_MODAL_KEY', 'C_MODAL_KEY'],
					catalogueKeys: ['a', 'b'],
				}),
			).toThrow(ModalKeyReacquisitionError);
		});

		it('refuses to record a reacquired modal definition', () => {
			expect(() =>
				nextBaseline(baseline, {
					keyExports: ['A_MODAL_KEY', 'B_MODAL_KEY'],
					catalogueKeys: ['a', 'b', 'c'],
				}),
			).toThrow(/New entries in SHELL_MODAL_INITIAL_STATE: c/);
		});

		it('refuses a swap, which a count-only ratchet would pass', () => {
			expect(() =>
				nextBaseline(baseline, {
					keyExports: ['A_MODAL_KEY', 'C_MODAL_KEY'],
					catalogueKeys: ['a'],
				}),
			).toThrow(/New key constants in @\/app\/constants\/modals: C_MODAL_KEY/);
		});

		it('is a no-op when the shell already matches', () => {
			const { keyExports, catalogueKeys } = nextBaseline(baseline, baseline);

			expect({ keyExports, catalogueKeys }).toEqual(baseline);
		});
	});

	describe('serializeBaseline', () => {
		it('round-trips the committed baseline byte for byte', () => {
			// The committed file must be exactly what `--update` writes, or the next
			// regeneration would carry an unrelated formatting diff into an extraction PR.
			const path = resolve(process.cwd(), MODAL_BASELINE_PATH);

			expect(serializeBaseline(baselineFile as ModalKeyBaseline)).toBe(readFileSync(path, 'utf8'));
		});
	});
});
