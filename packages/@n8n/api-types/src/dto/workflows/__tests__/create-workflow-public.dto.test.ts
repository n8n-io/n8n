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
			staticData: { key: 'value' },
			pinData: { Start: [{ json: {} }] },
			nodeGroups: [{ id: 'g1', name: 'Group', nodeIds: [] }],
			parentFolderId: 'folder123',
			projectId: 'proj123',
		});

		expect(result.success).toBe(true);
	});

	test('rejects description, which only update accepts', () => {
		const result = CreateWorkflowPublicDto.safeParse({
			...minimalWorkflow,
			description: 'A test workflow',
		});

		expect(result.success).toBe(false);
	});

	test('accepts staticData as a raw JSON string', () => {
		const result = CreateWorkflowPublicDto.safeParse({
			...minimalWorkflow,
			staticData: '{"id":1}',
		});

		expect(result.success).toBe(true);
		expect(result.data?.staticData).toBe('{"id":1}');
	});

	test('rejects staticData as a string that is not JSON', () => {
		const result = CreateWorkflowPublicDto.safeParse({
			...minimalWorkflow,
			staticData: 'not json',
		});

		expect(result.success).toBe(false);
	});

	test('accepts shared, which the old spec never marked read-only', () => {
		const result = CreateWorkflowPublicDto.safeParse({
			...minimalWorkflow,
			shared: [{ role: 'workflow:owner' }],
		});

		expect(result.success).toBe(true);
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

	describe('nodeGroups', () => {
		const group = { id: 'g1', name: 'Data processing', nodeIds: ['n1'] };

		test('accepts a fully specified group', () => {
			const result = CreateWorkflowPublicDto.safeParse({
				...minimalWorkflow,
				nodeGroups: [{ ...group, description: 'Cleans incoming records' }],
			});

			expect(result.success).toBe(true);
		});

		test.each(['id', 'name', 'nodeIds'])('rejects a group missing %s', (field) => {
			const { [field]: _omitted, ...rest } = group as Record<string, unknown>;
			const result = CreateWorkflowPublicDto.safeParse({
				...minimalWorkflow,
				nodeGroups: [rest],
			});

			expect(result.success).toBe(false);
		});

		test('rejects a group carrying an unknown field', () => {
			const result = CreateWorkflowPublicDto.safeParse({
				...minimalWorkflow,
				nodeGroups: [{ ...group, bogus: 1 }],
			});

			expect(result.success).toBe(false);
		});

		test('rejects a description over the length limit', () => {
			const result = CreateWorkflowPublicDto.safeParse({
				...minimalWorkflow,
				nodeGroups: [{ ...group, description: 'x'.repeat(156) }],
			});

			expect(result.success).toBe(false);
		});

		test('rejects groups that are not objects', () => {
			const result = CreateWorkflowPublicDto.safeParse({
				...minimalWorkflow,
				nodeGroups: [1, 2, 3],
			});

			expect(result.success).toBe(false);
		});
	});

	describe('nodes', () => {
		const node = {
			id: '0f5532f9-36ba-4bef-86c7-30d607400b15',
			name: 'Start',
			type: 'n8n-nodes-base.start',
			typeVersion: 1,
			position: [100, 200],
			parameters: {},
		};

		test('accepts a fully specified node', () => {
			const result = CreateWorkflowPublicDto.safeParse({
				...minimalWorkflow,
				nodes: [
					{
						...node,
						webhookId: 'wh1',
						disabled: false,
						notes: 'hello',
						notesInFlow: true,
						executeOnce: true,
						alwaysOutputData: true,
						retryOnFail: true,
						maxTries: 3,
						waitBetweenTries: 1000,
						continueOnFail: false,
						onError: 'continueRegularOutput',
						credentials: { jiraSoftwareCloudApi: { id: '35', name: 'jiraApi' } },
						customTelemetryTags: { tag: [{ key: 'a', value: 'b' }] },
					},
				],
			});

			expect(result.success).toBe(true);
		});

		test('accepts an empty node object, which the old spec required nothing of', () => {
			const result = CreateWorkflowPublicDto.safeParse({ ...minimalWorkflow, nodes: [{}] });
			expect(result.success).toBe(true);
		});

		test.each([
			['an unknown property', { ...node, bogusProp: 1 }],
			['extendsCredential', { ...node, extendsCredential: 'x' }],
			['rewireOutputLogTo', { ...node, rewireOutputLogTo: 'main' }],
			[
				'forceCustomOperation',
				{ ...node, forceCustomOperation: { resource: 'a', operation: 'b' } },
			],
			['the read-only createdAt', { ...node, createdAt: '2024-01-01T00:00:00.000Z' }],
			['the read-only updatedAt', { ...node, updatedAt: '2024-01-01T00:00:00.000Z' }],
		])('rejects a node carrying %s', (_label, value) => {
			const result = CreateWorkflowPublicDto.safeParse({ ...minimalWorkflow, nodes: [value] });
			expect(result.success).toBe(false);
		});

		test.each([
			['name', 7],
			['type', 7],
			['typeVersion', '1'],
			['disabled', 'yes'],
			['position', { x: 1 }],
			['parameters', []],
			['credentials', 'x'],
		])('rejects a wrongly typed node %s', (field, value) => {
			const result = CreateWorkflowPublicDto.safeParse({
				...minimalWorkflow,
				nodes: [{ ...node, [field]: value }],
			});

			expect(result.success).toBe(false);
		});

		test('rejects a non-numeric position entry', () => {
			const result = CreateWorkflowPublicDto.safeParse({
				...minimalWorkflow,
				nodes: [{ ...node, position: ['a', 'b'] }],
			});

			expect(result.success).toBe(false);
		});

		test('rejects a customTelemetryTags entry missing value', () => {
			const result = CreateWorkflowPublicDto.safeParse({
				...minimalWorkflow,
				nodes: [{ ...node, customTelemetryTags: { tag: [{ key: 'a' }] } }],
			});

			expect(result.success).toBe(false);
		});

		test.each([
			['a scalar', 'x'],
			['null', null],
		])('rejects %s in place of a node object', (_label, value) => {
			const result = CreateWorkflowPublicDto.safeParse({ ...minimalWorkflow, nodes: [value] });
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
			['activeVersion', { versionId: 'v1' }],
		])('rejects a supplied %s with a read-only error', (field, value) => {
			const result = CreateWorkflowPublicDto.safeParse({ ...minimalWorkflow, [field]: value });

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).toContain('read-only');
				expect(result.error.issues[0].message).toContain(field);
			}
		});

		test('does not call an unrecognised field read-only', () => {
			const result = CreateWorkflowPublicDto.safeParse({ ...minimalWorkflow, nam: 'typo' });

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.issues[0].message).not.toContain('read-only');
				expect(result.error.issues[0].message).toContain('nam');
			}
		});
	});
});
