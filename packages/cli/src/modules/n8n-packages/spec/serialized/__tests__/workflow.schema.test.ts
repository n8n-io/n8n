import { serializedWorkflowSchema } from '../workflow.schema';

describe('serializedWorkflowSchema', () => {
	const workflow = (typeVersion: number) => ({
		id: 'wf-1',
		name: 'Workflow',
		nodes: [
			{
				id: 'n1',
				name: 'Manual Trigger',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion,
				position: [0, 0],
				parameters: {},
			},
		],
		connections: {},
		versionId: 'v1',
		parentFolderId: null,
		isPublished: false,
		isArchived: false,
	});

	it('accepts a finite node typeVersion', () => {
		expect(() => serializedWorkflowSchema.parse(workflow(1.2))).not.toThrow();
	});

	it('rejects a non-finite node typeVersion (JSON `1e999` parses to Infinity)', () => {
		expect(() => serializedWorkflowSchema.parse(workflow(Infinity))).toThrow();
	});

	it('accepts a non-empty tagIds array', () => {
		expect(() =>
			serializedWorkflowSchema.parse({ ...workflow(1), tagIds: ['tag-1', 'tag-2'] }),
		).not.toThrow();
	});

	it('accepts an empty tagIds array (an untagged workflow exported with tags)', () => {
		expect(() => serializedWorkflowSchema.parse({ ...workflow(1), tagIds: [] })).not.toThrow();
	});

	it('rejects an empty-string tag id', () => {
		expect(() => serializedWorkflowSchema.parse({ ...workflow(1), tagIds: [''] })).toThrow();
	});
});
