import { serializedWorkflowMetadataSchema } from '../workflow-metadata.schema';

describe('serializedWorkflowMetadataSchema', () => {
	it('accepts a published version id', () => {
		const metadata = { publishedVersionId: 'version-1' };

		expect(() => serializedWorkflowMetadataSchema.parse(metadata)).not.toThrow();
	});

	it('accepts a null published version id, which states the source publishes nothing', () => {
		const metadata = { publishedVersionId: null };

		expect(() => serializedWorkflowMetadataSchema.parse(metadata)).not.toThrow();
	});

	it('rejects an empty published version id', () => {
		const metadata = { publishedVersionId: '' };

		expect(() => serializedWorkflowMetadataSchema.parse(metadata)).toThrow();
	});

	it('rejects a missing publishedVersionId, which is not the same as null', () => {
		expect(() => serializedWorkflowMetadataSchema.parse({})).toThrow();
	});
});
