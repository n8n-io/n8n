import { UpdateWorkflowPublicDto } from '../update-workflow-public.dto';

const minimalWorkflow = {
	name: 'My Workflow',
	nodes: [],
	connections: {},
	settings: {},
};

describe('UpdateWorkflowPublicDto', () => {
	test('accepts the minimal required shape', () => {
		const result = UpdateWorkflowPublicDto.safeParse(minimalWorkflow);
		expect(result.success).toBe(true);
	});

	test('rejects projectId, which only create accepts', () => {
		const result = UpdateWorkflowPublicDto.safeParse({
			...minimalWorkflow,
			projectId: 'proj123',
		});

		expect(result.success).toBe(false);
	});

	describe('required fields', () => {
		test.each(['name', 'nodes', 'connections', 'settings'])('rejects a missing %s', (field) => {
			const { [field]: _omitted, ...rest } = minimalWorkflow as Record<string, unknown>;
			const result = UpdateWorkflowPublicDto.safeParse(rest);
			expect(result.success).toBe(false);
		});
	});

	describe('server-managed fields', () => {
		test('rejects a supplied active field with a read-only error, matching the message a caller sees', () => {
			const result = UpdateWorkflowPublicDto.safeParse({ ...minimalWorkflow, active: true });

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('active');
				expect(result.error.issues[0].message).toContain('read-only');
			}
		});

		test.each([
			['id', '123'],
			['createdAt', new Date().toISOString()],
			['updatedAt', new Date().toISOString()],
			['isArchived', true],
			['versionId', 'v1'],
			['triggerCount', 3],
			['meta', { templateId: 't1' }],
			['tags', [{ id: 't1', name: 'prod' }]],
			['shared', [{ role: 'workflow:owner' }]],
			['activeVersion', { versionId: 'v1' }],
		])('rejects a supplied %s', (field, value) => {
			const result = UpdateWorkflowPublicDto.safeParse({ ...minimalWorkflow, [field]: value });
			expect(result.success).toBe(false);
		});
	});
});
