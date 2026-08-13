import { CreateWorkflowPublicDto } from '../create-workflow-public.dto';

const minimalWorkflow = {
	name: 'Parity Workflow',
	nodes: [],
	connections: {},
	settings: {},
};

const node = {
	id: '0f5532f9-36ba-4bef-86c7-30d607400b15',
	name: 'Start',
	type: 'n8n-nodes-base.start',
	typeVersion: 1,
	position: [100, 200],
	parameters: {},
};

function messageFor(body: unknown): string {
	const result = CreateWorkflowPublicDto.safeParse(body);
	if (result.success) throw new Error('expected the body to be rejected');
	return result.error.issues[0].message;
}

/**
 * Every expectation is the message express-openapi-validator answered with for the same body
 * before `POST /workflows` moved off the hand-written spec, captured by replaying each one against
 * both implementations.
 */
describe('CreateWorkflowPublicDto rejection messages', () => {
	test.each([
		[{ ...minimalWorkflow, name: undefined }, "request/body must have required property 'name'"],
		[{ ...minimalWorkflow, nodes: undefined }, "request/body must have required property 'nodes'"],
		[
			{ ...minimalWorkflow, connections: undefined },
			"request/body must have required property 'connections'",
		],
		[
			{ ...minimalWorkflow, settings: undefined },
			"request/body must have required property 'settings'",
		],
	])('names a missing required property', (body, expected) => {
		expect(messageFor(body)).toBe(expected);
	});

	test.each([
		[[], 'request/body must be object'],
		['x', 'request/body must be object'],
		[7, 'request/body must be object'],
	])('reports a non-object body', (body, expected) => {
		expect(messageFor(body)).toBe(expected);
	});

	test.each([
		[{ ...minimalWorkflow, name: 7 }, 'request/body/name must be string'],
		[{ ...minimalWorkflow, name: null }, 'request/body/name must be string'],
		[{ ...minimalWorkflow, nodes: {} }, 'request/body/nodes must be array'],
		[{ ...minimalWorkflow, nodes: null }, 'request/body/nodes must be array'],
		[{ ...minimalWorkflow, connections: [] }, 'request/body/connections must be object'],
		[{ ...minimalWorkflow, connections: null }, 'request/body/connections must be object'],
		[{ ...minimalWorkflow, settings: [] }, 'request/body/settings must be object'],
		[{ ...minimalWorkflow, settings: null }, 'request/body/settings must be object'],
		[{ ...minimalWorkflow, pinData: [] }, 'request/body/pinData must be object'],
		[{ ...minimalWorkflow, pinData: 'x' }, 'request/body/pinData must be object'],
		[{ ...minimalWorkflow, projectId: 7 }, 'request/body/projectId must be string'],
		[{ ...minimalWorkflow, projectId: null }, 'request/body/projectId must be string'],
		[{ ...minimalWorkflow, parentFolderId: 7 }, 'request/body/parentFolderId must be string'],
		[{ ...minimalWorkflow, nodeGroups: {} }, 'request/body/nodeGroups must be array'],
		[{ ...minimalWorkflow, nodeGroups: null }, 'request/body/nodeGroups must be array'],
		[
			{ ...minimalWorkflow, settings: { timeSavedPerExecution: 'x' } },
			'request/body/settings/timeSavedPerExecution must be number',
		],
		[
			{ ...minimalWorkflow, settings: { saveExecutionProgress: 'true' } },
			'request/body/settings/saveExecutionProgress must be boolean',
		],
	])('reports a wrongly typed property', (body, expected) => {
		expect(messageFor(body)).toBe(expected);
	});

	test.each([
		[{ ...minimalWorkflow, bogus: 1 }, 'request/body must NOT have additional properties'],
		[
			{ ...minimalWorkflow, bogus: 1, alsoBogus: 2 },
			'request/body must NOT have additional properties',
		],
		[
			{ ...minimalWorkflow, description: 'only update accepts this' },
			'request/body must NOT have additional properties',
		],
		[
			{ ...minimalWorkflow, settings: { bogusSetting: true } },
			'request/body/settings must NOT have additional properties',
		],
		[
			{ ...minimalWorkflow, nodeGroups: [{ id: 'g', name: 'G', nodeIds: [], bogus: 1 }] },
			'request/body/nodeGroups/0 must NOT have additional properties',
		],
		[
			{ ...minimalWorkflow, nodes: [{ ...node, bogusProp: 1 }] },
			'request/body/nodes/0 must NOT have additional properties',
		],
	])('reports an unknown property', (body, expected) => {
		expect(messageFor(body)).toBe(expected);
	});

	test.each([
		[{ ...minimalWorkflow, id: 'aaaaaaaaaaaaaaaa' }, 'request/body/id is read-only'],
		[{ ...minimalWorkflow, active: true }, 'request/body/active is read-only'],
		[{ ...minimalWorkflow, triggerCount: 3 }, 'request/body/triggerCount is read-only'],
		[{ ...minimalWorkflow, id: 'aaaaaaaaaaaaaaaa', active: true }, 'request/body/id is read-only'],
		[
			{ ...minimalWorkflow, nodes: [{ ...node, createdAt: '2024-01-01T00:00:00.000Z' }] },
			'request/body/nodes/0/createdAt is read-only',
		],
		[
			{ ...minimalWorkflow, shared: [{ createdAt: '2024-01-01T00:00:00.000Z' }] },
			'request/body/shared/0/createdAt is read-only',
		],
	])('names a read-only property instead of calling it unknown', (body, expected) => {
		expect(messageFor(body)).toBe(expected);
	});

	test('does not call an unknown property on a node read-only', () => {
		expect(messageFor({ ...minimalWorkflow, nodes: [{ ...node, isArchived: true }] })).toBe(
			'request/body/nodes/0 must NOT have additional properties',
		);
	});

	test('lists the allowed values of an enum', () => {
		expect(messageFor({ ...minimalWorkflow, settings: { callerPolicy: 'bogus' } })).toBe(
			'request/body/settings/callerPolicy must be equal to one of the allowed values: any, none, workflowsFromAList, workflowsFromSameOwner',
		);
	});

	test('reports a string over its maximum length', () => {
		expect(
			messageFor({
				...minimalWorkflow,
				nodeGroups: [{ id: 'g', name: 'G', nodeIds: [], description: 'x'.repeat(156) }],
			}),
		).toBe('request/body/nodeGroups/0/description must NOT have more than 155 characters');
	});

	test.each([
		[
			{ ...minimalWorkflow, staticData: 7 },
			'request/body/staticData must be string, request/body/staticData must be object, request/body/staticData must match a schema in anyOf',
		],
		[
			{ ...minimalWorkflow, staticData: 'not json' },
			'request/body/staticData must match format "jsonString", request/body/staticData must be object, request/body/staticData must match a schema in anyOf',
		],
	])('spells out every branch of an anyOf', (body, expected) => {
		expect(messageFor(body)).toBe(expected);
	});

	test.each([
		[{ ...minimalWorkflow, nodes: ['x'] }, 'request/body/nodes/0 must be object'],
		[{ ...minimalWorkflow, nodes: [null] }, 'request/body/nodes/0 must be object'],
		[
			{ ...minimalWorkflow, nodes: [{ ...node, name: 7 }] },
			'request/body/nodes/0/name must be string',
		],
		[
			{ ...minimalWorkflow, nodes: [{ ...node, typeVersion: '1' }] },
			'request/body/nodes/0/typeVersion must be number',
		],
		[
			{ ...minimalWorkflow, nodes: [{ ...node, position: ['a', 'b'] }] },
			'request/body/nodes/0/position/0 must be number',
		],
		[
			{ ...minimalWorkflow, nodes: [{ ...node, credentials: 'x' }] },
			'request/body/nodes/0/credentials must be object',
		],
		[
			{ ...minimalWorkflow, nodes: [{ ...node, customTelemetryTags: { tag: [{ key: 'a' }] } }] },
			"request/body/nodes/0/customTelemetryTags/tag/0 must have required property 'value'",
		],
		[
			{ ...minimalWorkflow, nodeGroups: [{ id: 'g', name: 'G', nodeIds: [1] }] },
			'request/body/nodeGroups/0/nodeIds/0 must be string',
		],
		[
			{ ...minimalWorkflow, settings: { customTelemetryTags: [{ key: 'a' }] } },
			"request/body/settings/customTelemetryTags/0 must have required property 'value'",
		],
	])('walks into arrays and nested objects', (body, expected) => {
		expect(messageFor(body)).toBe(expected);
	});
});
