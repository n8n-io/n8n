import fc from 'fast-check';
import {
	DATA_TABLE_NODE_TYPES,
	type INode,
	type INodeCredentials,
	type NodeParameterValueType,
} from 'n8n-workflow';

import {
	acceptedCredentialChoices,
	credentialChoicesOfCopy,
	dataTableChoicesOfCopy,
	dataTableIdOf,
	dataTableIdsOf,
	hasNoCredentialValue,
	withDataTableSelections,
} from '../copy-choices';

const node = (id: string, overrides: Partial<INode> = {}): INode => ({
	id,
	name: `Node ${id}`,
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	...overrides,
});

const withCredentials = (id: string, credentials: INodeCredentials) => node(id, { credentials });

const tableNode = (id: string, dataTableId: NodeParameterValueType, type = 'n8n-nodes-base.dataTable') =>
	node(id, { type, parameters: { dataTableId } });

const byId = (value: string, mode = 'id') => ({ __rl: true, mode, value });

describe('credentialChoicesOfCopy', () => {
	it('binds each credential of the package to the credential that the copy uses in the same node and slot', () => {
		const packageNodes = [
			withCredentials('n-1', { stripeApi: { id: 'src-stripe', name: 'Stripe' } }),
			withCredentials('n-2', {
				slackApi: { id: 'src-slack', name: 'Slack' },
				httpHeaderAuth: { id: 'src-header', name: 'Header' },
			}),
		];
		const copyNodes = [
			withCredentials('n-2', {
				slackApi: { id: 'own-slack', name: 'Team Slack' },
				httpHeaderAuth: { id: 'own-header', name: 'Header' },
			}),
			withCredentials('n-1', { stripeApi: { id: 'own-stripe', name: 'Prod Stripe' } }),
		];

		expect(credentialChoicesOfCopy(packageNodes, copyNodes)).toEqual({
			bindings: new Map([
				['src-stripe', 'own-stripe'],
				['src-slack', 'own-slack'],
				['src-header', 'own-header'],
			]),
			conflicting: [],
		});
	});

	it('binds a credential that several nodes share once, when the copy uses one credential for it', () => {
		const shared = { stripeApi: { id: 'src-stripe', name: 'Stripe' } };
		const own = { stripeApi: { id: 'own-stripe', name: 'Prod Stripe' } };

		const choices = credentialChoicesOfCopy(
			[withCredentials('n-1', shared), withCredentials('n-2', shared)],
			[withCredentials('n-1', own), withCredentials('n-2', own)],
		);

		expect(choices).toEqual({ bindings: new Map([['src-stripe', 'own-stripe']]), conflicting: [] });
	});

	it('names a credential for which the copy uses different credentials, sorted, and binds none', () => {
		const packageNodes = ['n-1', 'n-2', 'n-3', 'n-4'].map((id, index) =>
			withCredentials(id, {
				stripeApi: { id: index < 2 ? 'src-stripe' : 'src-alpha', name: 'Stripe' },
			}),
		);
		const copyNodes = ['n-1', 'n-2', 'n-3', 'n-4'].map((id) =>
			withCredentials(id, { stripeApi: { id: `own-${id}`, name: 'Own' } }),
		);

		expect(credentialChoicesOfCopy(packageNodes, copyNodes)).toEqual({
			bindings: new Map(),
			conflicting: ['src-alpha', 'src-stripe'],
		});
	});

	it('binds nothing for a node that the copy no longer has, or a slot that the copy left empty', () => {
		const packageNodes = [
			withCredentials('n-gone', { stripeApi: { id: 'src-stripe', name: 'Stripe' } }),
			withCredentials('n-1', {
				slackApi: { id: 'src-slack', name: 'Slack' },
				smtp: { id: 'src-mail', name: 'Mail' },
			}),
		];
		const copyNodes = [
			withCredentials('n-1', { slackApi: { id: null, name: 'Slack' }, imap: { id: 'x', name: 'X' } }),
		];

		expect(credentialChoicesOfCopy(packageNodes, copyNodes)).toEqual({
			bindings: new Map(),
			conflicting: [],
		});
	});

	it('binds nothing for a package node without a credential id', () => {
		const choices = credentialChoicesOfCopy(
			[withCredentials('n-1', { stripeApi: { id: null, name: 'Stripe' } })],
			[withCredentials('n-1', { stripeApi: { id: 'own-stripe', name: 'Prod' } })],
		);

		expect(choices.bindings.size).toBe(0);
	});

	it('gives each source credential either one binding or a conflict (property)', () => {
		const ids = fc.constantFrom('a', 'b', 'c');
		fc.assert(
			fc.property(
				fc.array(fc.tuple(fc.constantFrom('n-1', 'n-2', 'n-3', 'n-4'), ids, ids), {
					maxLength: 8,
				}),
				(rows) => {
					const packageNodes = rows.map(([nodeId, sourceId], index) =>
						withCredentials(`${nodeId}-${index}`, { api: { id: `src-${sourceId}`, name: 'A' } }),
					);
					const copyNodes = rows.map(([nodeId, , chosenId], index) =>
						withCredentials(`${nodeId}-${index}`, { api: { id: `own-${chosenId}`, name: 'B' } }),
					);
					const { bindings, conflicting } = credentialChoicesOfCopy(packageNodes, copyNodes);
					const sources = new Set(rows.map(([, sourceId]) => `src-${sourceId}`));
					expect(new Set([...bindings.keys(), ...conflicting])).toEqual(sources);
					for (const sourceId of conflicting) expect(bindings.has(sourceId)).toBe(false);
					for (const [sourceId, chosenId] of bindings) {
						const chosen = rows
							.filter(([, s]) => `src-${s}` === sourceId)
							.map(([, , c]) => `own-${c}`);
						expect(new Set(chosen)).toEqual(new Set([chosenId]));
					}
				},
			),
		);
	});
});

describe('acceptedCredentialChoices', () => {
	const requirements = [
		{ id: 'src-stripe', type: 'stripeApi' },
		{ id: 'src-slack', type: 'slackApi' },
	];

	it('keeps a binding to a usable credential of the required type', () => {
		const bindings = new Map([
			['src-stripe', 'own-stripe'],
			['src-slack', 'own-slack'],
		]);

		expect(
			acceptedCredentialChoices(bindings, requirements, [
				{ id: 'own-stripe', type: 'stripeApi' },
				{ id: 'own-slack', type: 'slackApi' },
			]),
		).toEqual(bindings);
	});

	it('drops a binding to a credential that is gone or that the user cannot use', () => {
		expect(
			acceptedCredentialChoices(new Map([['src-stripe', 'own-stripe']]), requirements, [
				{ id: 'other', type: 'stripeApi' },
			]),
		).toEqual(new Map());
	});

	it('drops a binding to a credential of another type', () => {
		expect(
			acceptedCredentialChoices(new Map([['src-stripe', 'own-slack']]), requirements, [
				{ id: 'own-slack', type: 'slackApi' },
			]),
		).toEqual(new Map());
	});

	it('drops a binding for a credential that the package does not require', () => {
		expect(
			acceptedCredentialChoices(new Map([['src-unknown', 'own-stripe']]), requirements, [
				{ id: 'own-stripe', type: 'stripeApi' },
			]),
		).toEqual(new Map());
	});
});

describe('dataTableIdOf', () => {
	it.each([
		['the id mode', byId('dt-1'), 'dt-1'],
		['the list mode', byId('dt-1', 'list'), 'dt-1'],
		['a locator without a mode', { __rl: true, value: 'dt-1' }, 'dt-1'],
	])('gives the table id of a data table node in %s', (_case, locator, expected) => {
		expect(dataTableIdOf(tableNode('n-1', locator))).toBe(expected);
	});

	it.each(DATA_TABLE_NODE_TYPES)('gives the table id of a %s node', (type) => {
		expect(dataTableIdOf(tableNode('n-1', byId('dt-1'), type))).toBe('dt-1');
	});

	it.each([
		['another node type', tableNode('n-1', byId('dt-1'), 'n8n-nodes-base.set')],
		['the name mode', tableNode('n-1', byId('Customers', 'name'))],
		['an expression', tableNode('n-1', byId('={{ $json.table }}'))],
		['an empty value', tableNode('n-1', byId(''))],
		['a value that is not text', tableNode('n-1', { __rl: true, mode: 'id', value: 3 })],
		['a parameter that is not a locator', tableNode('n-1', 'dt-1')],
		['no parameter', node('n-1', { type: 'n8n-nodes-base.dataTable' })],
	])('gives no id for %s', (_case, input) => {
		expect(dataTableIdOf(input)).toBeUndefined();
	});
});

describe('dataTableIdsOf', () => {
	it('gives the table ids of the data table nodes once each', () => {
		expect(
			dataTableIdsOf([
				tableNode('n-1', byId('dt-1')),
				node('n-2'),
				tableNode('n-3', byId('dt-2', 'list')),
				tableNode('n-4', byId('dt-1')),
			]),
		).toEqual(['dt-1', 'dt-2']);
	});
});

describe('dataTableChoicesOfCopy', () => {
	const missing = [{ id: 'dt-source', name: 'Customers' }];

	it('keeps the table that the copy selected in place of a table that the project does not have', () => {
		const ownTable = byId('dt-own', 'list');

		const choices = dataTableChoicesOfCopy(
			[tableNode('n-1', byId('dt-source')), tableNode('n-2', byId('dt-source'))],
			[tableNode('n-1', ownTable), tableNode('n-2', byId('dt-other'))],
			missing,
		);

		expect(choices).toEqual({
			selections: new Map([
				['n-1', ownTable],
				['n-2', byId('dt-other')],
			]),
			replacedTables: missing,
		});
	});

	it('keeps a selection by name or by an expression too', () => {
		const choices = dataTableChoicesOfCopy(
			[tableNode('n-1', byId('dt-source')), tableNode('n-2', byId('dt-source'))],
			[tableNode('n-1', byId('Customers', 'name')), tableNode('n-2', '={{ $json.table }}')],
			missing,
		);

		expect([...choices.selections.values()]).toEqual([
			byId('Customers', 'name'),
			'={{ $json.table }}',
		]);
	});

	it('keeps nothing for a table that the project has', () => {
		const choices = dataTableChoicesOfCopy(
			[tableNode('n-1', byId('dt-found'))],
			[tableNode('n-1', byId('dt-own'))],
			missing,
		);

		expect(choices).toEqual({ selections: new Map(), replacedTables: [] });
	});

	it.each([
		['the copy still uses the table of the package', [tableNode('n-1', byId('dt-source'))]],
		['the copy has no such node', [tableNode('n-9', byId('dt-own'))]],
		[
			'the node of the copy has another type',
			[tableNode('n-1', byId('dt-own'), 'n8n-nodes-base.dataTableTool')],
		],
		['the node of the copy has no table', [node('n-1', { type: 'n8n-nodes-base.dataTable' })]],
	])('keeps nothing when %s', (_case, copyNodes) => {
		const choices = dataTableChoicesOfCopy([tableNode('n-1', byId('dt-source'))], copyNodes, missing);

		expect(choices).toEqual({ selections: new Map(), replacedTables: [] });
	});

	it('keeps nothing for a package node without a table id', () => {
		const choices = dataTableChoicesOfCopy(
			[tableNode('n-1', byId('={{ $json.table }}')), node('n-2')],
			[tableNode('n-1', byId('dt-own')), node('n-2')],
			[{ id: '={{ $json.table }}', name: 'Expression' }],
		);

		expect(choices).toEqual({ selections: new Map(), replacedTables: [] });
	});
});

describe('withDataTableSelections', () => {
	const ownTable = byId('dt-own', 'list');

	it('puts the selections into the nodes and leaves the other nodes as they are', () => {
		const other = node('n-2');
		const nodes = [
			tableNode('n-1', byId('dt-source')),
			other,
			{ ...tableNode('n-3', byId('dt-source')), parameters: { dataTableId: byId('dt-source'), limit: 5 } },
		];

		const result = withDataTableSelections(
			nodes,
			new Map([
				['n-1', ownTable],
				['n-3', ownTable],
			]),
		);

		expect(result).toEqual([
			tableNode('n-1', ownTable),
			other,
			{ ...tableNode('n-3', ownTable), parameters: { dataTableId: ownTable, limit: 5 } },
		]);
		expect(result?.[1]).toBe(other);
		expect(nodes[0].parameters.dataTableId).toEqual(byId('dt-source'));
	});

	it('gives undefined when the nodes already have the selections or there are none', () => {
		expect(
			withDataTableSelections([tableNode('n-1', ownTable)], new Map([['n-1', ownTable]])),
		).toBeUndefined();
		expect(withDataTableSelections([tableNode('n-1', byId('dt-1'))], new Map())).toBeUndefined();
	});
});

describe('hasNoCredentialValue', () => {
	it.each([
		['no fields', {}],
		['empty fields', { apiKey: '', domain: undefined, region: null }],
	])('is true for data with %s', (_case, data) => {
		expect(hasNoCredentialValue(data)).toBe(true);
	});

	it.each([
		['a text value', { apiKey: '', token: 'value' }],
		['a number', { port: 0 }],
		['a flag', { allowUnauthorizedCerts: false }],
		['a nested value', { oauthTokenData: {} }],
	])('is false for data with %s', (_case, data) => {
		expect(hasNoCredentialValue(data)).toBe(false);
	});
});
