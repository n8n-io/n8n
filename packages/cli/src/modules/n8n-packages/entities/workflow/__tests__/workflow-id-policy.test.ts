import { decideWorkflowId, decideWorkflowVersionId } from '../workflow-id-policy';

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

describe('decideWorkflowVersionId', () => {
	it('keeps the packaged version for the packaged workflow', () => {
		expect(decideWorkflowVersionId('source', 'version-1')).toBe('version-1');
	});

	it('leaves a copy to be versioned on its own', () => {
		expect(decideWorkflowVersionId('new', 'version-1')).toBeNull();
	});
});
