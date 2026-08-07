import { CreateWorkflowPublicDto } from '../create-workflow-public.dto';

const minimalWorkflow = {
	name: 'My Workflow',
	nodes: [],
	connections: {},
	settings: {},
};

describe('CreateWorkflowPublicDto', () => {
	test('accepts the minimal required shape', () => {
		const result = CreateWorkflowPublicDto.safeParse(minimalWorkflow);
		expect(result.success).toBe(true);
	});

	test('accepts every writable optional field', () => {
		const result = CreateWorkflowPublicDto.safeParse({
			...minimalWorkflow,
			description: 'A test workflow',
			staticData: { key: 'value' },
			pinData: { Start: [{ json: {} }] },
			nodeGroups: [{ id: 'g1', name: 'Group', nodeIds: [] }],
			parentFolderId: 'folder123',
			projectId: 'proj123',
		});

		expect(result.success).toBe(true);
	});

	test('accepts staticData as a raw JSON string', () => {
		const result = CreateWorkflowPublicDto.safeParse({
			...minimalWorkflow,
			staticData: '{"id":1}',
		});

		expect(result.success).toBe(true);
		expect(result.data?.staticData).toBe('{"id":1}');
	});

	test('accepts a null parentFolderId', () => {
		const result = CreateWorkflowPublicDto.safeParse({
			...minimalWorkflow,
			parentFolderId: null,
		});

		expect(result.success).toBe(true);
	});

	describe('required fields', () => {
		test.each(['name', 'nodes', 'connections', 'settings'])('rejects a missing %s', (field) => {
			const { [field]: _omitted, ...rest } = minimalWorkflow as Record<string, unknown>;
			const result = CreateWorkflowPublicDto.safeParse(rest);
			expect(result.success).toBe(false);
		});

		test('rejects connections as an array', () => {
			const result = CreateWorkflowPublicDto.safeParse({ ...minimalWorkflow, connections: [] });
			expect(result.success).toBe(false);
		});

		test('rejects settings as an array', () => {
			const result = CreateWorkflowPublicDto.safeParse({ ...minimalWorkflow, settings: [] });
			expect(result.success).toBe(false);
		});

		test('rejects nodes as a non-array', () => {
			const result = CreateWorkflowPublicDto.safeParse({ ...minimalWorkflow, nodes: {} });
			expect(result.success).toBe(false);
		});
	});

	describe('server-managed fields', () => {
		test.each([
			['id', '123'],
			['active', true],
			['createdAt', new Date().toISOString()],
			['updatedAt', new Date().toISOString()],
			['isArchived', true],
			['versionId', 'v1'],
			['triggerCount', 3],
			['meta', { templateId: 't1' }],
			['tags', [{ id: 't1', name: 'prod' }]],
			['shared', [{ role: 'workflow:owner' }]],
			['activeVersion', { versionId: 'v1' }],
		])('rejects a supplied %s with a read-only error', (field, value) => {
			const result = CreateWorkflowPublicDto.safeParse({ ...minimalWorkflow, [field]: value });

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('read-only');
				expect(result.error.issues[0].message).toContain(field);
			}
		});
	});
});
