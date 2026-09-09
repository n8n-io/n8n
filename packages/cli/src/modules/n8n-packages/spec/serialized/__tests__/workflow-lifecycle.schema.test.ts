import { serializedWorkflowLifecycleSchema } from '../workflow-lifecycle.schema';

describe('serializedWorkflowLifecycleSchema', () => {
	it('accepts a published version id', () => {
		const lifecycle = { publishedVersionId: 'version-1', isArchived: false };

		expect(() => serializedWorkflowLifecycleSchema.parse(lifecycle)).not.toThrow();
	});

	it('accepts a null published version id, which states the source publishes nothing', () => {
		const lifecycle = { publishedVersionId: null, isArchived: true };

		expect(() => serializedWorkflowLifecycleSchema.parse(lifecycle)).not.toThrow();
	});

	it('rejects an empty published version id', () => {
		const lifecycle = { publishedVersionId: '', isArchived: false };

		expect(() => serializedWorkflowLifecycleSchema.parse(lifecycle)).toThrow();
	});

	it('rejects a missing publishedVersionId, which is not the same as null', () => {
		const lifecycle = { isArchived: false };

		expect(() => serializedWorkflowLifecycleSchema.parse(lifecycle)).toThrow();
	});

	it('rejects a missing isArchived', () => {
		const lifecycle = { publishedVersionId: null };

		expect(() => serializedWorkflowLifecycleSchema.parse(lifecycle)).toThrow();
	});
});
