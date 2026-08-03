import type { SerializedWorkflow } from '../../../spec/serialized/workflow.schema';
import { WorkflowSerializer } from '../workflow.serializer';

const wire = (overrides: Partial<SerializedWorkflow> = {}): SerializedWorkflow => ({
	id: 'wf-source-id',
	name: 'Workflow from package',
	nodes: [
		{
			id: 'node-1',
			name: 'Start',
			type: 'n8n-nodes-base.start',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
	],
	connections: {},
	versionId: 'version-from-source',
	parentFolderId: 'folder-from-source',
	isPublished: true,
	isArchived: false,
	...overrides,
});

describe('WorkflowSerializer.deserialize', () => {
	const serializer = new WorkflowSerializer();

	it('returns a partial WorkflowEntity preserving content fields', () => {
		const result = serializer.deserialize(wire());

		expect(result.name).toBe('Workflow from package');
		expect(result.nodes).toEqual([
			{
				id: 'node-1',
				name: 'Start',
				type: 'n8n-nodes-base.start',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
		]);
		expect(result.connections).toEqual({});
	});

	it('preserves the wire isArchived flag', () => {
		const archived = serializer.deserialize(wire({ isArchived: true }));
		const live = serializer.deserialize(wire({ isArchived: false }));

		expect(archived.isArchived).toBe(true);
		expect(live.isArchived).toBe(false);
	});

	it('includes settings when present in the wire', () => {
		const result = serializer.deserialize(wire({ settings: { executionOrder: 'v1' } }));

		expect(result.settings).toEqual({ executionOrder: 'v1' });
	});

	it('omits settings when absent in the wire', () => {
		const result = serializer.deserialize(wire({ settings: undefined }));

		expect(result.settings).toBeUndefined();
	});

	it('does not carry instance-owned fields from the wire', () => {
		const partial = serializer.deserialize(wire());

		expect(partial).not.toHaveProperty('id');
		expect(partial).not.toHaveProperty('versionId');
		expect(partial).not.toHaveProperty('parentFolder');
		expect(partial).not.toHaveProperty('parentFolderId');
		expect(partial).not.toHaveProperty('isPublished');
		expect(partial).not.toHaveProperty('activeVersionId');
	});
});
