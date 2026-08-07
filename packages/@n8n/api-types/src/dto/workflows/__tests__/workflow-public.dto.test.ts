import { WorkflowPublicDto } from '../workflow-public.dto';

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
			project: { id: 'project-1', name: 'My project', type: 'personal' },
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
			versionCounter: 3,
			sourceWorkflowId: 'source-1',
			tagMappings: [{ workflowId: '1', tagId: 't1' }],
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).not.toHaveProperty('versionCounter');
			expect(result.data).not.toHaveProperty('sourceWorkflowId');
			expect(result.data).not.toHaveProperty('tagMappings');
		}
	});

	test('rejects a missing required field', () => {
		const { id: _id, ...withoutId } = baseWorkflow;
		const result = WorkflowPublicDto.safeParse(withoutId);
		expect(result.success).toBe(false);
	});
});
