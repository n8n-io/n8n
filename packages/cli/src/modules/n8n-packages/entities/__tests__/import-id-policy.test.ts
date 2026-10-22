import { decideImportId } from '../import-id-policy';

describe('decideImportId', () => {
	describe('source', () => {
		it('keeps the source id', () => {
			expect(decideImportId('source', 'STILTON')).toBe('STILTON');
		});
	});

	describe('new', () => {
		it('mints a fresh id, discarding the source id', () => {
			const id = decideImportId('new', 'STILTON');

			expect(id).toEqual(expect.any(String));
			expect(id).not.toBe('STILTON');
			expect(id.length).toBeGreaterThan(0);
		});

		it('mints a different id on each call', () => {
			expect(decideImportId('new', 'STILTON')).not.toBe(decideImportId('new', 'STILTON'));
		});
	});
});
