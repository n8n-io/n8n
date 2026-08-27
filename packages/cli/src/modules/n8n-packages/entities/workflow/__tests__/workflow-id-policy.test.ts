import { decideWorkflowId } from '../workflow-id-policy';

describe('decideWorkflowId', () => {
	describe('source', () => {
		it('keeps the source workflow id', () => {
			expect(decideWorkflowId('source', 'STILTON')).toBe('STILTON');
		});
	});

	describe('new', () => {
		it('mints a fresh id, discarding the source id', () => {
			const id = decideWorkflowId('new', 'STILTON');

			expect(id).toEqual(expect.any(String));
			expect(id).not.toBe('STILTON');
			expect(id.length).toBeGreaterThan(0);
		});

		it('mints a different id on each call', () => {
			expect(decideWorkflowId('new', 'STILTON')).not.toBe(decideWorkflowId('new', 'STILTON'));
		});
	});
});
