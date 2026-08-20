import { CreateWorkflowPublicDto } from '../create-workflow-public.dto';

const validPayload = {
	name: 'testing',
	nodes: [
		{
			id: 'uuid-1234',
			name: 'Start',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [240, 300],
			parameters: {},
		},
	],
	connections: {},
	settings: { executionOrder: 'v1' },
};

describe('CreateWorkflowPublicDto', () => {
	test('rejects an unknown key through parse as well as safeParse', () => {
		const payload = { ...validPayload, notAWorkflowField: 'x' };

		expect(() => CreateWorkflowPublicDto.parse(payload)).toThrow();
		expect(CreateWorkflowPublicDto.safeParse(payload).success).toBe(false);
		expect(CreateWorkflowPublicDto.schema.safeParse(payload).success).toBe(false);
	});

	// The controller reads `body.settings.redactionPolicy` unguarded, so optional would be a 500.
	test('rejects a payload with no settings', () => {
		const { settings: _settings, ...withoutSettings } = validPayload;

		const result = CreateWorkflowPublicDto.safeParse(withoutSettings);

		expect(result.success).toBe(false);
	});

	test('accepts the writable fields of a shared entry', () => {
		const result = CreateWorkflowPublicDto.safeParse({
			...validPayload,
			shared: [{ role: 'workflow:owner', workflowId: 'w1', projectId: 'p1' }],
		});

		expect(result.success).toBe(true);
	});

	test.each([
		['createdAt', { createdAt: '2026-01-01T00:00:00.000Z' }],
		['updatedAt', { updatedAt: '2026-01-01T00:00:00.000Z' }],
		['an unknown key', { notASharedField: 'x' }],
		['project.id', { project: { id: 'p1' } }],
		['project.type', { project: { type: 'personal' } }],
	])('rejects %s in a shared entry', (_label, entry) => {
		const result = CreateWorkflowPublicDto.safeParse({ ...validPayload, shared: [entry] });

		expect(result.success).toBe(false);
	});

	test('allows an unknown key inside a shared project', () => {
		const result = CreateWorkflowPublicDto.safeParse({
			...validPayload,
			shared: [{ project: { name: 'My project', somethingElse: 1 } }],
		});

		expect(result.success).toBe(true);
	});

	test.each([
		['a JSON string', '{"lastId":1}', true],
		['a string that is not JSON', 'not json', false],
		['an object', { lastId: 1 }, true],
		['null', null, true],
	])('handles staticData as %s', (_label, staticData, expected) => {
		const result = CreateWorkflowPublicDto.safeParse({ ...validPayload, staticData });

		expect(result.success).toBe(expected);
	});

	test.each([
		['accepts', 155, true],
		['rejects', 156, false],
	])('%s a node group description of %i characters', (_label, length, expected) => {
		const result = CreateWorkflowPublicDto.safeParse({
			...validPayload,
			nodeGroups: [
				{
					id: 'group-1',
					name: 'Processing',
					nodeIds: ['uuid-1234'],
					description: 'x'.repeat(length),
				},
			],
		});

		expect(result.success).toBe(expected);
	});
});
