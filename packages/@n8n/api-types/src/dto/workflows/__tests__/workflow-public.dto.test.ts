import assert from 'node:assert';

import {
	CreatedWorkflowPublicDto,
	WorkflowPublicDto,
	WorkflowPublishPublicDto,
} from '../workflow-public.dto';

const baseWorkflow = {
	id: '1',
	name: 'My workflow',
	description: null,
	active: false,
	activeVersionId: null,
	createdAt: '2024-01-01T00:00:00.000Z',
	updatedAt: '2024-01-01T00:00:00.000Z',
	isArchived: false,
	versionId: 'version-1',
	versionCounter: 3,
	sourceWorkflowId: null,
	triggerCount: 0,
	nodes: [],
	connections: {},
	nodeGroups: [],
	settings: null,
	staticData: null,
	meta: null,
	shared: [
		{
			role: 'workflow:owner',
			workflowId: '1',
			projectId: 'project-1',
			project: {
				id: 'project-1',
				name: 'My project',
				type: 'personal',
				icon: null,
				description: null,
				customTelemetryTags: [],
				creatorId: 'user-1',
				createdAt: '2024-01-01T00:00:00.000Z',
				updatedAt: '2024-01-01T00:00:00.000Z',
			},
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
		},
	],
	activeVersion: null,
};

describe('WorkflowPublicDto', () => {
	test('accepts a full workflow shape', () => {
		const result = WorkflowPublicDto.safeParse(baseWorkflow);
		expect(result.success).toBe(true);
	});

	test('accepts an active workflow with pinData, tags, and activeVersion populated', () => {
		const result = WorkflowPublicDto.safeParse({
			...baseWorkflow,
			active: true,
			activeVersionId: 'version-1',
			pinData: { Webhook1: [{ json: { first: 'first' } }] },
			tags: [
				{
					id: 't1',
					name: 'prod',
					createdAt: baseWorkflow.createdAt,
					updatedAt: baseWorkflow.updatedAt,
				},
			],
			activeVersion: {
				versionId: 'version-1',
				workflowId: '1',
				nodes: [],
				connections: {},
				nodeGroups: [],
				authors: 'Nathan Nathaniel',
				name: null,
				description: null,
				autosaved: false,
				createdAt: baseWorkflow.createdAt,
				updatedAt: baseWorkflow.updatedAt,
				workflowPublishHistory: [
					{
						id: 1,
						workflowId: '1',
						versionId: 'version-1',
						event: 'activated',
						userId: 'user-1',
						createdAt: baseWorkflow.createdAt,
					},
				],
			},
		});

		expect(result.success).toBe(true);
	});

	test('omits pinData when the field is absent (excludePinnedData)', () => {
		const result = WorkflowPublicDto.safeParse(baseWorkflow);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).not.toHaveProperty('pinData');
		}
	});

	test('strips fields not part of the public contract', () => {
		const result = WorkflowPublicDto.safeParse({
			...baseWorkflow,
			tagMappings: [{ workflowId: '1', tagId: 't1' }],
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).not.toHaveProperty('tagMappings');
		}
	});

	test('passes through fields mirrored from the raw entity (versionCounter, sourceWorkflowId, project details, publish history)', () => {
		const result = WorkflowPublicDto.safeParse(baseWorkflow);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.versionCounter).toBe(3);
			expect(result.data.sourceWorkflowId).toBeNull();
			expect(result.data.shared[0].project.creatorId).toBe('user-1');
			expect(result.data.shared[0].project.customTelemetryTags).toEqual([]);
		}
	});

	test('rejects a missing required field', () => {
		const { id: _id, ...withoutId } = baseWorkflow;
		const result = WorkflowPublicDto.safeParse(withoutId);
		expect(result.success).toBe(false);
	});
});

describe('CreatedWorkflowPublicDto', () => {
	test('accepts a null parent folder', () => {
		const result = CreatedWorkflowPublicDto.safeParse({ ...baseWorkflow, parentFolder: null });

		expect(result.success).toBe(true);
	});

	test('accepts a populated parent folder', () => {
		const parentFolder = {
			id: 'folder-1',
			name: 'Target Folder',
			parentFolderId: null,
			createdAt: '2024-01-01T00:00:00.000Z',
			updatedAt: '2024-01-01T00:00:00.000Z',
		};

		const result = CreatedWorkflowPublicDto.safeParse({ ...baseWorkflow, parentFolder });

		assert(result.success, 'Expected safeParse to succeed');

		expect(result.data.parentFolder).toEqual(parentFolder);
	});

	test('rejects a body with no parentFolder key', () => {
		const result = CreatedWorkflowPublicDto.safeParse(baseWorkflow);

		expect(result.success).toBe(false);
	});
});

describe('WorkflowPublishPublicDto', () => {
	const { shared: _shared, ...workflowWithoutShared } = baseWorkflow;

	test('accepts a workflow with no shared field', () => {
		const result = WorkflowPublishPublicDto.safeParse(workflowWithoutShared);
		expect(result.success).toBe(true);
	});
});
