import type { WorkflowEntity } from '@n8n/db';

import { WorkflowSerializer } from '../workflow.serializer';

describe('WorkflowSerializer', () => {
	const serializer = new WorkflowSerializer();

	const baseWorkflow = {
		id: 'abc12300-0000-0000-0000-000000000000',
		name: 'daily-sync',
		nodes: [
			{
				id: 'node-1',
				name: 'Start',
				type: 'n8n-nodes-base.start',
				typeVersion: 1,
				position: [250, 300],
				parameters: {},
			},
		],
		connections: {},
		settings: { executionOrder: 'v1' },
		versionId: 'version-1',
		isArchived: false,
		parentFolder: null,
		active: true,
		staticData: { lastId: '123' },
		pinData: { Start: [{ json: { test: true } }] },
		meta: { templateId: 'tmpl-1' },
		triggerCount: 1,
		createdAt: new Date('2024-01-01'),
		updatedAt: new Date('2024-01-02'),
		shared: [],
		tags: [],
	} as unknown as WorkflowEntity;

	it('should serialize a workflow with all required fields', () => {
		const result = serializer.serialize(baseWorkflow);

		expect(result).toEqual({
			id: 'abc12300-0000-0000-0000-000000000000',
			name: 'daily-sync',
			nodes: baseWorkflow.nodes,
			connections: {},
			settings: { executionOrder: 'v1' },
			versionId: 'version-1',
			parentFolderId: null,
			isArchived: false,
		});
	});

	it('should set parentFolderId from parentFolder relation', () => {
		const workflow = {
			...baseWorkflow,
			parentFolder: { id: 'folder-1' },
		} as unknown as WorkflowEntity;

		const result = serializer.serialize(workflow);

		expect(result.parentFolderId).toBe('folder-1');
	});

	it('should omit settings when undefined', () => {
		const workflow = { ...baseWorkflow, settings: undefined } as unknown as WorkflowEntity;
		const result = serializer.serialize(workflow);

		expect(result).not.toHaveProperty('settings');
	});

	it('should omit runtime and frontend-only fields', () => {
		const result = serializer.serialize(baseWorkflow);

		expect(result).not.toHaveProperty('active');
		expect(result).not.toHaveProperty('staticData');
		expect(result).not.toHaveProperty('pinData');
		expect(result).not.toHaveProperty('meta');
		expect(result).not.toHaveProperty('triggerCount');
		expect(result).not.toHaveProperty('createdAt');
		expect(result).not.toHaveProperty('updatedAt');
		expect(result).not.toHaveProperty('shared');
		expect(result).not.toHaveProperty('tags');
	});

	it('should serialize an archived workflow', () => {
		const workflow = { ...baseWorkflow, isArchived: true } as unknown as WorkflowEntity;
		const result = serializer.serialize(workflow);

		expect(result.isArchived).toBe(true);
	});
});
