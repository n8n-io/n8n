import { WorkflowEntity } from '@n8n/db';

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

	it('includes settings when present in the wire', () => {
		const result = serializer.deserialize(wire({ settings: { executionOrder: 'v1' } }));

		expect(result.settings).toEqual({ executionOrder: 'v1' });
	});

	it('omits settings when absent in the wire', () => {
		const result = serializer.deserialize(wire({ settings: undefined }));

		expect(result.settings).toBeUndefined();
	});

	it('restores node groups from the wire', () => {
		const result = serializer.deserialize(
			wire({
				nodeGroups: [
					{ id: 'group-1', name: 'Ingest', nodeIds: ['node-1'], description: 'Pulls data in' },
				],
			}),
		);

		expect(result.nodeGroups).toEqual([
			{ id: 'group-1', name: 'Ingest', nodeIds: ['node-1'], description: 'Pulls data in' },
		]);
	});

	it('defaults node groups to empty when the wire has none', () => {
		expect(serializer.deserialize(wire()).nodeGroups).toEqual([]);
	});

	it('does not carry instance-owned fields from the wire', () => {
		const partial = serializer.deserialize(wire());

		expect(partial).not.toHaveProperty('id');
		expect(partial).not.toHaveProperty('versionId');
		expect(partial).not.toHaveProperty('parentFolder');
		expect(partial).not.toHaveProperty('parentFolderId');
		expect(partial).not.toHaveProperty('activeVersionId');
	});

	it('does not carry lifecycle state, which lives in its own file', () => {
		const partial = serializer.deserialize(wire());

		expect(partial).not.toHaveProperty('publishedVersionId');
		expect(partial).not.toHaveProperty('isArchived');
	});
});

describe('WorkflowSerializer.serializeLifecycle', () => {
	const serializer = new WorkflowSerializer();

	const workflow = (overrides: Partial<WorkflowEntity> = {}) =>
		Object.assign(new WorkflowEntity(), {
			versionId: 'version-2',
			activeVersionId: 'version-2',
			isArchived: false,
			...overrides,
		});

	it('names the exported version when it is the live one', () => {
		expect(serializer.serializeLifecycle(workflow()).publishedVersionId).toBe('version-2');
	});

	it('names the live version when the export carries a later draft', () => {
		const draft = workflow({ versionId: 'version-3', activeVersionId: 'version-2' });

		expect(serializer.serializeLifecycle(draft).publishedVersionId).toBe('version-2');
	});

	it('names no version when the workflow has no live one', () => {
		const neverPublished = workflow({ activeVersionId: null });

		expect(serializer.serializeLifecycle(neverPublished).publishedVersionId).toBeNull();
	});

	it('carries the archived flag', () => {
		expect(serializer.serializeLifecycle(workflow({ isArchived: true })).isArchived).toBe(true);
		expect(serializer.serializeLifecycle(workflow({ isArchived: false })).isArchived).toBe(false);
	});
});
