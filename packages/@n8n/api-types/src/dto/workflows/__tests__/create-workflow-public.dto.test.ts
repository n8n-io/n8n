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

	describe('settings', () => {
		test('accepts every documented setting', () => {
			const result = CreateWorkflowPublicDto.safeParse({
				...minimalWorkflow,
				settings: {
					saveExecutionProgress: true,
					saveManualExecutions: false,
					saveDataErrorExecution: 'all',
					saveDataSuccessExecution: 'none',
					executionTimeout: 3600,
					errorWorkflow: 'VzqKEW0ShTXA5vPj',
					timezone: 'America/New_York',
					executionOrder: 'v1',
					callerPolicy: 'workflowsFromAList',
					callerIds: '14, 18, 23',
					timeSavedMode: 'fixed',
					timeSavedPerExecution: 5,
					redactionPolicy: 'non-manual',
					availableInMCP: false,
					customTelemetryTags: [{ key: 'team', value: 'platform' }],
				},
			});

			expect(result.success).toBe(true);
		});

		test.each(['binaryMode', 'credentialResolverId'])(
			'accepts the derived setting %s, which the controller strips',
			(field) => {
				const value = field === 'binaryMode' ? 'separate' : 'resolver-1';
				const result = CreateWorkflowPublicDto.safeParse({
					...minimalWorkflow,
					settings: { [field]: value },
				});

				expect(result.success).toBe(true);
			},
		);

		test('rejects an unknown setting', () => {
			const result = CreateWorkflowPublicDto.safeParse({
				...minimalWorkflow,
				settings: { bogusSetting: true },
			});

			expect(result.success).toBe(false);
		});

		test.each([
			['saveDataErrorExecution', 'bogus'],
			['callerPolicy', 'bogus'],
			['timeSavedMode', 'bogus'],
			['redactionPolicy', 'bogus'],
			['binaryMode', 'bogus'],
		])('rejects an out-of-enum %s', (field, value) => {
			const result = CreateWorkflowPublicDto.safeParse({
				...minimalWorkflow,
				settings: { [field]: value },
			});

			expect(result.success).toBe(false);
		});

		test.each([
			['executionTimeout', 'not-a-number'],
			['timeSavedPerExecution', 'not-a-number'],
			['availableInMCP', 'not-a-boolean'],
			['timezone', 42],
		])('rejects a wrongly typed %s', (field, value) => {
			const result = CreateWorkflowPublicDto.safeParse({
				...minimalWorkflow,
				settings: { [field]: value },
			});

			expect(result.success).toBe(false);
		});

		test('rejects a customTelemetryTags entry missing value', () => {
			const result = CreateWorkflowPublicDto.safeParse({
				...minimalWorkflow,
				settings: { customTelemetryTags: [{ key: 'team' }] },
			});

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
