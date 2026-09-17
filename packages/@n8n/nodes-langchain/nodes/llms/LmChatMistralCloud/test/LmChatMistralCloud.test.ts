import { referenceChunkFromJSON } from '@mistralai/mistralai/models/components';

describe('Mistral reference chunks', () => {
	it('should accept string reference IDs returned by the API', () => {
		const result = referenceChunkFromJSON(
			JSON.stringify({ type: 'reference', reference_ids: ['document-1', 2] }),
		);

		expect(result).toEqual({
			ok: true,
			value: { type: 'reference', referenceIds: ['document-1', 2] },
		});
	});
});
