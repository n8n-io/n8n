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
	// The legacy spec marked these read-only, and express-openapi-validator turned their mere
	// presence into a 400. Keeping them out of the shape preserves that; a case here fails if
	// someone adds one back.
	test.each([
		['id', '2tUt1wbLX592XDdX'],
		['active', false],
		['createdAt', '2026-01-01T00:00:00.000Z'],
		['updatedAt', '2026-01-01T00:00:00.000Z'],
		['isArchived', false],
		['versionId', 'a-version-id'],
		['triggerCount', 0],
		['meta', {}],
		['tags', []],
		['activeVersion', null],
	])('rejects the read-only field %s', (key, value) => {
		const result = CreateWorkflowPublicDto.safeParse({ ...validPayload, [key]: value });

		expect(result.success).toBe(false);
	});

	test('accepts a supplied shared list', () => {
		const result = CreateWorkflowPublicDto.safeParse({ ...validPayload, shared: [] });

		expect(result.success).toBe(true);
	});

	test('drops the derived binaryMode and credentialResolverId settings', () => {
		const result = CreateWorkflowPublicDto.safeParse({
			...validPayload,
			settings: {
				executionOrder: 'v1',
				binaryMode: 'combined',
				credentialResolverId: 'some-resolver-id',
			},
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.settings).toEqual({ executionOrder: 'v1' });
		}
	});

	test('keeps the redaction policy, which the controller needs after parsing', () => {
		const result = CreateWorkflowPublicDto.safeParse({
			...validPayload,
			settings: { redactionPolicy: 'all' },
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.settings.redactionPolicy).toBe('all');
		}
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

	// 155 is the public limit, not the internal `GROUP_DESCRIPTION_MAX_LENGTH` of 145, which
	// truncates instead of rejecting.
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

	test('rejects an unknown key nested in a node', () => {
		const result = CreateWorkflowPublicDto.safeParse({
			...validPayload,
			nodes: [{ ...validPayload.nodes[0], notANodeField: 'x' }],
		});

		expect(result.success).toBe(false);
	});

	test('rejects a read-only key nested in a node', () => {
		const result = CreateWorkflowPublicDto.safeParse({
			...validPayload,
			nodes: [{ ...validPayload.nodes[0], createdAt: '2026-01-01T00:00:00.000Z' }],
		});

		expect(result.success).toBe(false);
	});

	test('rejects an unknown settings key', () => {
		const result = CreateWorkflowPublicDto.safeParse({
			...validPayload,
			settings: { executionOrder: 'v1', notASetting: true },
		});

		expect(result.success).toBe(false);
	});
});
