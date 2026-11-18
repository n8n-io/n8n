import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	NodeHelpers,
	type INode,
	type INodeParameters,
	type INodeTypeDescription,
} from 'n8n-workflow';

import type { WorkflowJsonIssue } from './workflowJson.types';
import { validateWorkflowJson, type WorkflowJsonValidationDeps } from './workflowJsonValidation';

const NODES_JSON = join(process.cwd(), '..', '..', 'nodes-base', 'dist', 'types', 'nodes.json');

const TRIGGER = 'When clicking ‘Execute workflow’';

const POSITION = [880, 0];

type JsonNode = Record<string, unknown>;

function createDeps(): WorkflowJsonValidationDeps {
	const descriptions = JSON.parse(readFileSync(NODES_JSON, 'utf8')) as INodeTypeDescription[];
	const byType = new Map<string, Map<number, INodeTypeDescription>>();
	for (const description of descriptions) {
		const type = `n8n-nodes-base.${description.name}`;
		const versions = Array.isArray(description.version)
			? description.version
			: [description.version];
		const byVersion = byType.get(type) ?? new Map<number, INodeTypeDescription>();
		for (const version of versions) byVersion.set(version, { ...description, name: type });
		byType.set(type, byVersion);
	}
	return {
		getNodeType: (type, version) => {
			const byVersion = byType.get(type);
			if (!byVersion) return null;
			return byVersion.get(version ?? Math.max(...byVersion.keys())) ?? null;
		},
		getNodeVersions: (type) => [...(byType.get(type)?.keys() ?? [])],
		credentialExists: (id, type) => id === 'cred-1' && type === 'httpHeaderAuth',
	};
}

function demoWorkflow() {
	return {
		name: 'Demo',
		nodes: [
			{
				name: TRIGGER,
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				id: 'id-trigger',
				parameters: {},
			},
			{
				name: 'Get orders',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [220, 0],
				id: 'id-http',
				parameters: {
					url: 'https://example.com/orders',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					options: {},
				} as Record<string, unknown>,
				credentials: { httpHeaderAuth: { id: 'cred-1', name: 'Header Auth' } } as Record<
					string,
					unknown
				>,
			},
			{
				name: 'Is active',
				type: 'n8n-nodes-base.if',
				typeVersion: 2.2,
				position: [440, 0],
				id: 'id-if',
				parameters: {
					conditions: {
						options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
						conditions: [
							{
								id: 'c1',
								leftValue: '={{ $json.status }}',
								rightValue: 'active',
								operator: { type: 'string', operation: 'equals' },
							},
						],
						combinator: 'and',
					},
					options: {},
				},
			},
			{
				name: 'Set fields',
				type: 'n8n-nodes-base.set',
				typeVersion: 3.4,
				position: [660, 0],
				id: 'id-set',
				parameters: {
					assignments: {
						assignments: [{ id: 'a1', name: 'total', value: '={{ $json.total }}', type: 'number' }],
					},
					options: {},
				},
			},
		] as JsonNode[],
		connections: {
			[TRIGGER]: { main: [[{ node: 'Get orders', type: 'main', index: 0 }]] },
			'Get orders': { main: [[{ node: 'Is active', type: 'main', index: 0 }]] },
			'Is active': { main: [[{ node: 'Set fields', type: 'main', index: 0 }], []] },
		} as Record<string, Record<string, unknown[][]>>,
		pinData: {} as Record<string, unknown>,
		settings: { executionOrder: 'v1' } as Record<string, unknown>,
	};
}

const baseNodes = demoWorkflow().nodes.map((node) => ({
	id: String(node.id),
	name: String(node.name),
}));

const canvasOf = (nodes: JsonNode[]) => (id: string) =>
	nodes.find((node) => node.id === id) as INode | undefined;

const at = (issues: WorkflowJsonIssue[], path: Array<string | number>) =>
	issues.filter((issue) => JSON.stringify(issue.path) === JSON.stringify(path));

const errorsOf = (issues: WorkflowJsonIssue[]) =>
	issues.filter((issue) => issue.severity === 'error');

describe.skipIf(!existsSync(NODES_JSON))('validateWorkflowJson with real node types', () => {
	let deps: WorkflowJsonValidationDeps;
	// The canvas holds the demo workflow unless a test passes other nodes
	const validate = (
		json: unknown,
		canvas: JsonNode[] = demoWorkflow().nodes,
		overrides: Partial<WorkflowJsonValidationDeps> = {},
	) =>
		validateWorkflowJson(
			json,
			{ ...deps, getCurrentNode: canvasOf(canvas), ...overrides },
			{ baseNodes },
		);

	beforeAll(() => {
		deps = createDeps();
	});

	it('finds no issues in a valid workflow', () => {
		expect(validate(demoWorkflow())).toEqual([]);
	});

	it('works without the nodes on the canvas', () => {
		expect(validateWorkflowJson(demoWorkflow(), deps, { baseNodes })).toEqual([]);
	});

	it('warns about a parameter name with a typo, and about the required parameter it replaced', () => {
		const json = demoWorkflow();
		const parameters = json.nodes[1].parameters as Record<string, unknown>;
		parameters.urll = parameters.url;
		delete parameters.url;

		const issues = validate(json);

		expect(errorsOf(issues)).toEqual([]);
		expect(at(issues, ['nodes', 1, 'parameters', 'urll'])).toEqual([
			{
				severity: 'warning',
				path: ['nodes', 1, 'parameters', 'urll'],
				message: '"urll" is not a parameter of HTTP Request. Apply removes it.',
			},
		]);
		expect(at(issues, ['nodes', 1, 'parameters', 'url'])).toEqual([
			{
				severity: 'warning',
				path: ['nodes', 1, 'parameters', 'url'],
				message: 'Parameter "URL" is required.',
			},
		]);
	});

	it('warns about a typo inside a collection', () => {
		const json = demoWorkflow();
		json.nodes[1].parameters = {
			...(json.nodes[1].parameters as object),
			options: { timeoutt: 5 },
		};

		expect(at(validate(json), ['nodes', 1, 'parameters', 'options', 'timeoutt'])).toEqual([
			expect.objectContaining({ severity: 'warning' }),
		]);
	});

	it('rejects an option value that does not exist', () => {
		const json = demoWorkflow();
		(json.nodes[1].parameters as Record<string, unknown>).method = 'PATCHH';

		const [issue, ...rest] = errorsOf(validate(json));

		expect(rest).toEqual([]);
		expect(issue.path).toEqual(['nodes', 1, 'parameters', 'method']);
		expect(issue.message).toContain('"PATCHH" is not a valid value');
		expect(issue.message).toContain('"PATCH"');
	});

	it('only warns about an option value that did not change, like the legacy Python of a Code node', () => {
		const json = demoWorkflow();
		json.nodes.push({
			name: 'Code',
			type: 'n8n-nodes-base.code',
			typeVersion: 2,
			position: POSITION,
			id: 'id-code',
			parameters: { language: 'python', pythonCode: 'return items' },
		});
		const issue = {
			path: ['nodes', 4, 'parameters', 'language'],
			message:
				'"python" is not a valid value. Use one of these values: "javaScript", "pythonNative".',
		};

		expect(validate(json, json.nodes)).toEqual([{ severity: 'warning', ...issue }]);
		expect(validate(json)).toEqual([{ severity: 'error', ...issue }]);
	});

	it('treats an empty option value and the default as not set', () => {
		const keap = deps.getNodeType('n8n-nodes-base.keap', 1) as INodeTypeDescription;
		const resolve = (values: INodeParameters | null, returnDefaults: boolean) =>
			NodeHelpers.getNodeParameters(
				keap.properties,
				values,
				returnDefaults,
				false,
				{ typeVersion: 1 },
				keap,
			);
		// An empty single-value fixedCollection keeps every default in the saved form
		const saved = resolve(
			resolve({ resource: 'ecommerceOrder', operation: 'create' }, true),
			false,
		);
		const json = demoWorkflow();
		json.nodes.push(
			{
				name: 'Keap',
				type: 'n8n-nodes-base.keap',
				typeVersion: 1,
				position: POSITION,
				id: 'id-keap',
				parameters: saved,
			},
			{
				name: 'Calendar',
				type: 'n8n-nodes-base.googleCalendar',
				typeVersion: 1.3,
				position: POSITION,
				id: 'id-calendar',
				// "Add option" in the NDV stores the default of the option
				parameters: {
					calendar: { __rl: true, mode: 'id', value: 'primary' },
					additionalFields: { sendUpdates: '' },
				},
			},
		);

		expect(saved).toMatchObject({ addressUi: {}, orderType: '' });
		expect(errorsOf(validate(json))).toEqual([]);
	});

	it('accepts an expression as an option value', () => {
		const json = demoWorkflow();
		(json.nodes[1].parameters as Record<string, unknown>).method = '={{ $json.method }}';

		expect(validate(json)).toEqual([]);
	});

	it('rejects an expression in an option that takes none, but not a lone $fromAI()', () => {
		const slack = (operation: string) => ({
			name: 'Slack',
			type: 'n8n-nodes-base.slack',
			typeVersion: 2.3,
			position: POSITION,
			id: 'id-slack',
			parameters: {
				resource: 'message',
				operation,
				select: 'channel',
				channelId: { __rl: true, mode: 'id', value: 'C1' },
				text: 'hi',
				otherOptions: {},
			},
		});
		const json = demoWorkflow();
		json.nodes.push(slack("={{ 'post' }}"));

		const [issue, ...rest] = errorsOf(validate(json));

		expect(rest).toEqual([]);
		expect(issue.path).toEqual(['nodes', 4, 'parameters', 'operation']);
		expect(issue.message).toContain('"operation" cannot be an expression.');
		expect(issue.message).toContain('"post"');

		json.nodes[4] = slack("={{ $fromAI('operation') }}");
		expect(at(validate(json), ['nodes', 4, 'parameters', 'operation'])).toEqual([]);
	});

	it('warns about a parameter that the current settings hide, and about the unused credential', () => {
		const json = demoWorkflow();
		(json.nodes[1].parameters as Record<string, unknown>).authentication = 'none';

		const issues = validate(json);

		expect(errorsOf(issues)).toEqual([]);
		expect(at(issues, ['nodes', 1, 'parameters', 'genericAuthType'])[0].message).toBe(
			'"genericAuthType" is hidden with the current settings. Apply removes it.',
		);
		expect(at(issues, ['nodes', 1, 'credentials', 'httpHeaderAuth'])).toEqual([
			expect.objectContaining({ severity: 'warning' }),
		]);
	});

	it('warns about a credential ID that does not exist', () => {
		const json = demoWorkflow();
		json.nodes[1].credentials = { httpHeaderAuth: { id: 'missing', name: 'Header Auth' } };

		expect(validate(json)).toEqual([
			expect.objectContaining({
				severity: 'warning',
				path: ['nodes', 1, 'credentials', 'httpHeaderAuth', 'id'],
			}),
		]);
	});

	it('points at the malformed group when getNodeParameters throws', () => {
		const json = demoWorkflow();
		json.nodes[1].parameters = {
			...(json.nodes[1].parameters as object),
			sendHeaders: true,
			headerParameters: { parameters: { name: 'x-key', value: '1' } },
		};

		expect(errorsOf(validate(json))).toEqual([
			{
				severity: 'error',
				path: ['nodes', 1, 'parameters', 'headerParameters', 'parameters'],
				message: '"parameters" must be an array.',
			},
		]);
	});

	it('rejects a filter value with a malformed shape', () => {
		const json = demoWorkflow();
		json.nodes[2].parameters = { conditions: { conditions: {}, combinator: 'and' } };

		expect(errorsOf(validate(json))).toEqual([
			{
				severity: 'error',
				path: ['nodes', 2, 'parameters', 'conditions'],
				message: '"conditions" has a value that n8n cannot store.',
			},
		]);
	});

	it('rejects an unknown node type, but only warns about a community node', () => {
		const json = demoWorkflow();
		json.nodes[2].type = 'n8n-nodes-base.iff';
		json.nodes[3].type = '@acme/n8n-nodes-acme.thing';

		const issues = validate(json);

		expect(at(issues, ['nodes', 2, 'type'])).toEqual([
			{
				severity: 'error',
				path: ['nodes', 2, 'type'],
				message: 'The node type "n8n-nodes-base.iff" is not installed.',
			},
		]);
		expect(at(issues, ['nodes', 3, 'type'])).toEqual([
			expect.objectContaining({ severity: 'warning' }),
		]);
	});

	it('rejects a version that does not exist and lists the valid ones', () => {
		const json = demoWorkflow();
		json.nodes[3].typeVersion = 9;

		expect(validate(json)).toEqual([
			{
				severity: 'error',
				path: ['nodes', 3, 'typeVersion'],
				message:
					'"n8n-nodes-base.set" has no version 9. Use one of these versions: 1, 2, 3, 3.1, 3.2, 3.3, 3.4, 3.5.',
			},
		]);
	});

	it('only warns about a type or version that n8n does not know when the node keeps it', () => {
		// n8n leaves out the Execute Command node by default
		const isExcluded = (type: string) => type === 'n8n-nodes-base.executeCommand';
		const withoutExecuteCommand: Partial<WorkflowJsonValidationDeps> = {
			getNodeType: (type, version) => (isExcluded(type) ? null : deps.getNodeType(type, version)),
			getNodeVersions: (type) => (isExcluded(type) ? [] : deps.getNodeVersions(type)),
		};
		const json = demoWorkflow();
		json.nodes[3].typeVersion = 9;
		json.nodes.push({
			name: 'Run',
			type: 'n8n-nodes-base.executeCommand',
			typeVersion: 1,
			position: POSITION,
			id: 'id-run',
			parameters: { command: 'ls' },
		});
		const severities = (canvas: JsonNode[]) =>
			validate(json, canvas, withoutExecuteCommand).map(({ severity, path }) => [severity, path]);

		expect(severities(json.nodes)).toEqual([
			['warning', ['nodes', 3, 'typeVersion']],
			['warning', ['nodes', 4, 'type']],
		]);
		expect(severities(demoWorkflow().nodes)).toEqual([
			['error', ['nodes', 3, 'typeVersion']],
			['error', ['nodes', 4, 'type']],
		]);
	});

	it('rejects duplicate names and IDs on each node that has them', () => {
		const json = demoWorkflow();
		json.nodes[3].name = 'Is active';
		json.nodes[3].id = 'id-if';

		const issues = validate(json);

		for (const index of [2, 3]) {
			expect(at(issues, ['nodes', index, 'name'])).toEqual([
				expect.objectContaining({ severity: 'error' }),
			]);
			expect(at(issues, ['nodes', index, 'id'])).toEqual([
				expect.objectContaining({ severity: 'error' }),
			]);
		}
	});

	it('rejects a connection to a node that does not exist', () => {
		const json = demoWorkflow();
		json.connections['Get orders'].main[0][0] = { node: 'Nowhere', type: 'main', index: 0 };

		expect(validate(json)).toEqual([
			{
				severity: 'error',
				path: ['connections', 'Get orders', 'main', 0, 0, 'node'],
				message: 'No node has the name "Nowhere".',
			},
		]);
	});

	it('rejects connection types and indexes that do not exist', () => {
		const json = demoWorkflow();
		json.connections['Get orders'] = {
			mian: [[]],
			main: [[{ node: 'Is active', type: 'mian', index: -1 }]],
		};

		expect(validate(json).map(({ path }) => path)).toEqual([
			['connections', 'Get orders', 'mian'],
			['connections', 'Get orders', 'main', 0, 0, 'type'],
			['connections', 'Get orders', 'main', 0, 0, 'index'],
		]);
	});

	it('warns when a connection uses the old name of a renamed node', () => {
		const json = demoWorkflow();
		json.nodes[1].name = 'Fetch orders';

		const issues = validate(json);

		expect(errorsOf(issues)).toEqual([]);
		const message = '"Get orders" is the old name of "Fetch orders". Apply uses the new name.';
		expect(issues).toEqual([
			{
				severity: 'warning',
				path: ['connections', TRIGGER, 'main', 0, 0, 'node'],
				message,
			},
			{ severity: 'warning', path: ['connections', 'Get orders'], message },
		]);
	});

	it('checks pinned data keys and items', () => {
		const json = demoWorkflow();
		json.nodes[1].name = 'Fetch orders';
		json.pinData = {
			Nope: [{}],
			'Get orders': [{ json: { id: 1 } }],
			'Is active': { a: 1 },
			'Set fields': [1, { json: 2 }, { total: 3 }],
		};

		const issues = validate(json);

		expect(issues.map(({ severity, path }) => [severity, path])).toEqual([
			['warning', ['connections', TRIGGER, 'main', 0, 0, 'node']],
			['warning', ['connections', 'Get orders']],
			['error', ['pinData', 'Nope']],
			['warning', ['pinData', 'Get orders']],
			['error', ['pinData', 'Is active']],
			['error', ['pinData', 'Set fields', 0]],
			['error', ['pinData', 'Set fields', 1, 'json']],
		]);
		expect(at(issues, ['pinData', 'Is active'])[0].message).toBe(
			'Pinned data must be an array of items.',
		);
	});

	it('checks the workflow and node shapes', () => {
		const json = demoWorkflow();
		const { position: _position, id: _id, ...node } = json.nodes[0];
		json.nodes[0] = { ...node, colour: 'red', disabled: 'yes' };
		json.settings = { executionOrder: 'v2' };

		const issues = validate({ ...json, active: true });

		expect(issues.map(({ severity, path }) => [severity, path])).toEqual([
			['warning', ['active']],
			['warning', ['nodes', 0, 'position']],
			['warning', ['nodes', 0, 'id']],
			['error', ['nodes', 0, 'disabled']],
			['warning', ['nodes', 0, 'colour']],
			['error', ['settings', 'executionOrder']],
		]);
	});

	it('warns about a node field that Apply does not change on a node that exists', () => {
		const tags = { tag: [{ key: 'team', value: 'sales' }] };
		const json = demoWorkflow();
		json.nodes[0].customTelemetryTags = tags;
		json.nodes[2].color = '#ff0000';
		json.nodes.push({
			name: 'New',
			type: 'n8n-nodes-base.noOp',
			typeVersion: 1,
			position: POSITION,
			id: 'id-new',
			parameters: {},
			customTelemetryTags: tags,
		});
		const canvas = demoWorkflow().nodes;
		canvas[1].extendsCredential = 'httpHeaderAuth';

		expect(validate(json, canvas)).toEqual([
			{
				severity: 'warning',
				path: ['nodes', 0, 'customTelemetryTags'],
				message: 'Apply does not change "customTelemetryTags" on an existing node.',
			},
			{
				severity: 'warning',
				path: ['nodes', 1, 'extendsCredential'],
				message: 'Apply does not change "extendsCredential" on an existing node.',
			},
		]);
	});

	it('rejects JSON that is not a workflow object', () => {
		expect(validate([])).toEqual([
			{ severity: 'error', path: [], message: 'The workflow must be a JSON object.' },
		]);
		expect(validate({ nodes: {} }).map(({ path, message }) => [path, message])).toEqual([
			[['nodes'], '"nodes" must be an array.'],
			[['connections'], 'Add the "connections" field.'],
		]);
	});
});
