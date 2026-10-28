import { decideImportId } from '../import-id-policy';

describe('decideImportId', () => {
	describe('source', () => {
		it('keeps the source id', () => {
			expect(decideImportId('source', 'STILTON')).toBe('STILTON');
		});
	});
});
