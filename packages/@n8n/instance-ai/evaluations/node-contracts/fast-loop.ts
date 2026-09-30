/**
 * Build-only comparison loop for node contracts: builds each case on each arm
 * (an n8n instance with or without N8N_INSTANCE_AI_NODE_CONTRACTS_ENABLED) and
 * grades the saved workflow deterministically. No execution, mocks or LLM judge.
 *
 * The grader loads the node's own runtime functions from nodes-base/dist and
 * core/dist, and fills parameter defaults from the node description as the
 * Workflow constructor does. A filter is graded on the request the node would
 * send, and downstream expressions are resolved by n8n's expression engine
 * against the output the node would produce.
 *
 * Token counts come from each instance's /metrics counters, so an instance runs one build at a
 * time. Repeat `--arm` with the same name to add instances (lanes) to an arm; lanes run in
 * parallel, capped by --concurrency.
 *
 * Usage (instances need N8N_METRICS=true for token counts):
 *   pnpm exec tsx evaluations/node-contracts/fast-loop.ts --case all \
 *     --arm off=http://localhost:5701 --arm off=http://localhost:5703 \
 *     --arm on=http://localhost:5702 --arm on=http://localhost:5704 --iterations 3
 *   pnpm exec tsx evaluations/node-contracts/fast-loop.ts --grade <results.json | workflow.json> [--case <slug>]
 */
import { isRecord } from '@n8n/utils/is-record';
import type {
	IConnections,
	IDataObject,
	INode,
	INodeExecutionData,
	INodeParameters,
	INodeProperties,
	INodeType,
	INodeTypes,
	IRunExecutionData,
	IWorkflowDataProxyAdditionalKeys,
	NodeParameterValueType,
} from 'n8n-workflow';
import { createRunExecutionData, NodeHelpers, Workflow } from 'n8n-workflow';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import pLimit from 'p-limit';

import { N8nClient, type WorkflowNodeResponse, type WorkflowResponse } from '../clients/n8n-client';
import { loadWorkflowTestCasesWithFiles, type WorkflowTestCaseWithFile } from '../data/workflows';
import { buildWorkflow } from '../harness/build-workflow';
import { createLogger } from '../harness/logger';
import { extractOutcomeFromEvents } from '../outcome/event-parser';

interface Check {
	name: string;
	pass: boolean;
	/** The grader could not evaluate this (e.g. a Code node on the path); excluded from pass. */
	ungraded?: boolean;
	detail: string;
}

const buildPasses = (checks: Check[]) => checks.every((check) => check.pass || check.ungraded);

type Grader = (workflow: WorkflowResponse) => Promise<Check[]>;

const nodesBaseRequire = createRequire(
	path.resolve(__dirname, '../../../../nodes-base/package.json'),
);
const coreRequire = createRequire(path.resolve(__dirname, '../../../../core/package.json'));

function loadDist(requireFrom: NodeJS.Require, file: string, names: string[]) {
	const loaded: unknown = requireFrom(file);
	if (!isRecord(loaded) || names.some((name) => typeof loaded[name] !== 'function')) {
		throw new Error(`Build the package first: ${names.join(', ')} not found in ${file}`);
	}
	return loaded;
}

const invoke = (fn: unknown, thisArg: unknown, ...args: unknown[]): unknown =>
	typeof fn === 'function' ? fn.apply(thisArg, args) : undefined;

/** The Notion node's own filter mapping and output simplification, per typeVersion. */
function notionRuntime() {
	const shared = loadDist(nodesBaseRequire, './dist/nodes/Notion/shared/GenericFunctions.js', [
		'mapFilters',
		'simplifyObjects',
	]);
	const v3 = loadDist(
		nodesBaseRequire,
		'./dist/nodes/Notion/v3/actions/databasePage/DataSourceFilters.js',
		['mapDataSourceFilters'],
	);
	return {
		/** The `filter` body the node sends for manual conditions. */
		filterBody: (conditions: unknown[], matchType: unknown, version: number): unknown =>
			version >= 3
				? invoke(v3.mapDataSourceFilters, undefined, conditions, matchType, 'UTC')
				: {
						[matchType === 'anyFilter' ? 'or' : 'and']: conditions.map((condition) =>
							invoke(shared.mapFilters, undefined, [condition], 'UTC'),
						),
					},
		simplifyObjects: (pages: unknown[], version: number): unknown =>
			invoke(shared.simplifyObjects, undefined, pages, false, version),
	};
}

interface NodeDescription {
	name: string;
	version: number | number[];
	properties: INodeProperties[];
}

const isNodeDescription = (value: unknown): value is NodeDescription =>
	isRecord(value) &&
	typeof value.name === 'string' &&
	Array.isArray(value.properties) &&
	(typeof value.version === 'number' || Array.isArray(value.version));

const isNodeParameters = (value: unknown): value is INodeParameters => isRecord(value);

const isParameterValue = (value: unknown): value is NodeParameterValueType =>
	['string', 'number', 'boolean', 'object', 'undefined'].includes(typeof value);

/** The node's parameters with description defaults filled in, as the Workflow constructor does. */
function withDefaults(node: WorkflowNodeResponse): INodeParameters {
	const version = node.typeVersion ?? 1;
	const loaded: unknown = nodesBaseRequire('./dist/types/nodes.json');
	const description = (Array.isArray(loaded) ? loaded : [])
		.filter(isNodeDescription)
		.find(
			(candidate) =>
				`n8n-nodes-base.${candidate.name}` === node.type &&
				[candidate.version].flat().includes(version),
		);
	if (!description) throw new Error(`No description for ${node.type} v${version} in nodes-base`);
	return (
		NodeHelpers.getNodeParameters(
			description.properties,
			isNodeParameters(node.parameters) ? node.parameters : {},
			true,
			false,
			{ typeVersion: version },
			null,
		) ?? {}
	);
}

const asText = (value: unknown): string =>
	typeof value === 'string' ? value : value === undefined ? '' : JSON.stringify(value);

const valueAt = (value: unknown, dottedPath: string): unknown =>
	dottedPath.split('.').reduce<unknown>((at, key) => (isRecord(at) ? at[key] : undefined), value);

// ── Expression evaluation ───────────────────────────────────────────────────

const stubNodeType: INodeType = {
	description: {
		displayName: 'Stub',
		name: 'stub',
		group: ['transform'],
		version: 1,
		description: '',
		defaults: {},
		inputs: [],
		outputs: [],
		properties: [],
	},
};

const stubNodeTypes: INodeTypes = {
	getByName: () => stubNodeType,
	getByNameAndVersion: () => stubNodeType,
	getKnownTypes: () => ({}),
};

function stubNode(name: string): INode {
	return { id: name, name, type: 'stub', typeVersion: 1, position: [0, 0], parameters: {} };
}

type Evaluate = (
	value: NodeParameterValueType,
	itemIndex: number,
	additionalKeys?: IWorkflowDataProxyAdditionalKeys,
) => NodeParameterValueType;

/** Runs `run` with an evaluator that resolves values as n8n would on `targetName`, whose single parent `sourceName` emitted `items`. */
async function withChildContext<T>(
	sourceName: string,
	targetName: string,
	items: IDataObject[],
	run: (evaluate: Evaluate) => Promise<T> | T,
	executeOnce = false,
): Promise<T> {
	const connections: IConnections = {
		[sourceName]: { main: [[{ node: targetName, type: 'main', index: 0 }]] },
	};
	const workflow = new Workflow({
		nodes: [stubNode(sourceName), stubNode(targetName)],
		connections,
		active: false,
		nodeTypes: stubNodeTypes,
	});
	const sourceOutput: INodeExecutionData[] = items.map((json) => ({
		json,
		pairedItem: { item: 0 },
	}));
	const runExecutionData: IRunExecutionData = createRunExecutionData({
		resultData: {
			runData: {
				[sourceName]: [
					{
						startTime: 0,
						executionTime: 0,
						executionIndex: 0,
						source: [],
						data: { main: [sourceOutput] },
					},
				],
			},
		},
	});
	const input: INodeExecutionData[] = (executeOnce ? items.slice(0, 1) : items).map(
		(json, item) => ({ json, pairedItem: { item } }),
	);
	const executeData = {
		node: stubNode(targetName),
		data: { main: [input] },
		source: { main: [{ previousNode: sourceName, previousNodeOutput: 0, previousNodeRun: 0 }] },
	};
	return await workflow.expression.withIsolate(
		async () =>
			await run((value, itemIndex, additionalKeys = {}) =>
				workflow.expression.getParameterValue(
					value,
					runExecutionData,
					0,
					itemIndex,
					targetName,
					input,
					'manual',
					additionalKeys,
					executeData,
				),
			),
	);
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Resolves `value` for each of `items` on `targetName`; errors become `<error: …>` strings. */
async function evaluateOnChild(
	value: unknown,
	sourceName: string,
	targetName: string,
	items: IDataObject[],
	executeOnce = false,
): Promise<unknown[]> {
	return await withChildContext(
		sourceName,
		targetName,
		items,
		(evaluate) =>
			(executeOnce ? items.slice(0, 1) : items).map((_, itemIndex) => {
				try {
					return typeof value === 'string' ? evaluate(value, itemIndex) : value;
				} catch (error) {
					return `<error: ${errorText(error)}>`;
				}
			}),
		executeOnce,
	);
}

function parentName(workflow: WorkflowResponse, nodeName: string): string {
	return (
		Object.keys(workflow.connections).find((source) =>
			childrenOf(workflow, source).some((child) => child.name === nodeName),
		) ?? 'Trigger'
	);
}

/** The parameters the node reads at runtime for one empty input item: defaults filled, expressions resolved. */
async function runtimeParameters(
	workflow: WorkflowResponse,
	node: WorkflowNodeResponse,
): Promise<INodeParameters> {
	const parameters = withDefaults(node);
	const resolved = await withChildContext(
		parentName(workflow, node.name),
		node.name,
		[{}],
		(evaluate) => evaluate(parameters, 0),
	);
	return isNodeParameters(resolved) ? resolved : {};
}

/** The JSON body an HTTP Request node would send for each input item. */
async function httpBodies(
	http: WorkflowNodeResponse,
	sourceName: string,
	items: IDataObject[],
): Promise<unknown[]> {
	const parameters = http.parameters ?? {};
	const once = http.executeOnce === true;
	if (parameters.specifyBody === 'json') {
		const resolved = await evaluateOnChild(parameters.jsonBody, sourceName, http.name, items, once);
		return resolved.map((body) => {
			if (typeof body !== 'string') return body;
			try {
				const parsed: unknown = JSON.parse(body);
				return parsed;
			} catch {
				return `<invalid JSON: ${body.slice(0, 80)}>`;
			}
		});
	}
	const bodyParameters = isRecord(parameters.bodyParameters)
		? parameters.bodyParameters.parameters
		: [];
	const pairs = (Array.isArray(bodyParameters) ? bodyParameters : []).filter(isRecord);
	const columns = await Promise.all(
		pairs.map(
			async (pair) => await evaluateOnChild(pair.value, sourceName, http.name, items, once),
		),
	);
	return (once ? items.slice(0, 1) : items).map((_, itemIndex) =>
		Object.fromEntries(
			pairs.map((pair, column) => [String(pair.name), columns[column][itemIndex]]),
		),
	);
}

function childrenOf(workflow: WorkflowResponse, nodeName: string): WorkflowNodeResponse[] {
	const outputs = workflow.connections[nodeName];
	const main = isRecord(outputs) && Array.isArray(outputs.main) ? outputs.main : [];
	const names = main
		.flatMap((branch: unknown) => (Array.isArray(branch) ? branch : []))
		.filter(isRecord)
		.map((connection) => String(connection.node));
	return workflow.nodes.filter((node) => names.includes(node.name));
}

const isDataObject = (value: unknown): value is IDataObject => isRecord(value);

const sortedJson = (value: unknown): string =>
	JSON.stringify(value, (_key, v: unknown) =>
		isRecord(v) && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort()) : v,
	);

/** Output of a Set node for `items`, run by the node's own execute code at the saved typeVersion. */
async function setOutput(set: WorkflowNodeResponse, sourceName: string, items: IDataObject[]) {
	const { SetV2 } = loadDist(nodesBaseRequire, './dist/nodes/Set/v2/SetV2.node.js', ['SetV2']);
	const setNode: unknown =
		typeof SetV2 === 'function'
			? Reflect.construct(SetV2, [{ displayName: 'Edit Fields', name: 'set' }])
			: {};
	if (!isRecord(setNode)) throw new Error('SetV2 did not construct');
	const parameters = withDefaults(set);
	const once = set.executeOnce === true;
	const output = await withChildContext(
		sourceName,
		set.name,
		items,
		async (evaluate) => {
			const context = {
				getInputData: () =>
					(once ? items.slice(0, 1) : items).map((json, item) => ({ json, pairedItem: { item } })),
				getNodeParameter: (
					name: string,
					itemIndex: number,
					fallback?: unknown,
					options?: unknown,
				) => {
					const raw = valueAt(parameters, name) ?? fallback;
					return valueAt(options, 'rawExpressions') === true || !isParameterValue(raw)
						? raw
						: evaluate(raw, itemIndex);
				},
				evaluateExpression: (expression: string, itemIndex: number) =>
					evaluate(`=${expression}`, itemIndex),
				getNode: () => ({ ...stubNode(set.name), typeVersion: set.typeVersion ?? 1, parameters }),
				getMode: () => 'manual',
				continueOnFail: () => false,
				getWorkflowSettings: () => ({}),
			};
			return await invoke(setNode.execute, context);
		},
		once,
	);
	const [firstOutput] = Array.isArray(output) ? output : [];
	return (Array.isArray(firstOutput) ? firstOutput : [])
		.map((item: unknown) => (isRecord(item) ? item.json : undefined))
		.filter(isDataObject);
}

const toDataValue = (value: unknown): IDataObject[string] =>
	typeof value === 'string' ||
	typeof value === 'number' ||
	typeof value === 'boolean' ||
	value === null
		? value
		: isDataObject(value)
			? value
			: Array.isArray(value)
				? value.filter(isDataObject)
				: value === undefined
					? undefined
					: JSON.stringify(value);

function limitOutput(limit: WorkflowNodeResponse, items: IDataObject[]) {
	const parameters = withDefaults(limit);
	const maxItems = Number(parameters.maxItems);
	return parameters.keep === 'lastItems' ? items.slice(-maxItems) : items.slice(0, maxItems);
}

/** Walks from `startName` through Set and Limit nodes to the first HTTP Request, carrying items along. */
async function followToHttp(
	workflow: WorkflowResponse,
	startName: string,
	startItems: IDataObject[],
) {
	let sourceName = startName;
	let items = startItems;
	const path: string[] = [];
	for (let hop = 0; hop < 5; hop++) {
		const [child] = childrenOf(workflow, sourceName);
		if (!child)
			return {
				node: undefined,
				sourceName,
				items,
				path: `no HTTP Request after ${[startName, ...path].join(' → ')}`,
			};
		if (child.type === 'n8n-nodes-base.httpRequest')
			return {
				node: child,
				sourceName,
				items,
				path: path.length ? `via ${path.join(' → ')}:` : '',
			};
		if (child.type !== 'n8n-nodes-base.set' && child.type !== 'n8n-nodes-base.limit') {
			return {
				node: undefined,
				sourceName,
				items,
				path: `ungraded: ${child.type} between ${startName} and the POST`,
			};
		}
		items =
			child.type === 'n8n-nodes-base.limit'
				? limitOutput(child, items)
				: await setOutput(child, sourceName, items);
		path.push(child.name);
		sourceName = child.name;
	}
	return { node: undefined, sourceName, items, path: 'no HTTP Request within 5 hops' };
}

// ── Graders ─────────────────────────────────────────────────────────────────

const NOTION_USER = '7c3e1a2b-4d5f-4a6b-8c9d-0e1f2a3b4c5d';

function notionPage(id: string, title: string) {
	return {
		object: 'page',
		id,
		url: `https://www.notion.so/${id.replace(/-/g, '')}`,
		parent: { type: 'data_source_id', data_source_id: '5b9e2c1d-0a7f-4c3e-9d21-7f6a8b9c0d1e' },
		properties: {
			Name: {
				id: 'title',
				type: 'title',
				title: [{ type: 'text', plain_text: title, text: { content: title } }],
			},
			Status: { id: 's', type: 'status', status: { name: 'Done' } },
			Completed: {
				id: 'c',
				type: 'date',
				date: { start: '2026-09-10', end: null, time_zone: null },
			},
			Owners: {
				id: 'o',
				type: 'people',
				people: [
					{
						object: 'user',
						id: NOTION_USER,
						name: 'Dana Scully',
						type: 'person',
						person: { email: 'dana@acme.test' },
					},
					{
						object: 'user',
						id: 'u2',
						name: 'Fox Mulder',
						type: 'person',
						person: { email: 'fox@acme.test' },
					},
				],
			},
		},
	};
}

const gradeNotionFilterAndRead: Grader = async (workflow) => {
	const runtime = notionRuntime();
	const notion = workflow.nodes.find(
		(node) => node.type === 'n8n-nodes-base.notion' && node.parameters?.operation === 'getAll',
	);
	if (!notion) return [{ name: 'notion-node', pass: false, detail: 'no Notion getAll node' }];
	const parameters = notion.parameters ?? {};

	const version = notion.typeVersion ?? 2;
	const conditions = isRecord(parameters.filters) ? parameters.filters.conditions : undefined;
	const sent = ((): unknown => {
		try {
			if (parameters.filterType === 'manual') {
				return runtime.filterBody(
					Array.isArray(conditions) ? conditions : [],
					parameters.matchType,
					version,
				);
			}
			if (parameters.filterType === 'json' && typeof parameters.filterJson === 'string') {
				const parsed: unknown = JSON.parse(parameters.filterJson.replace(/^=/, ''));
				return parsed;
			}
			return {};
		} catch (error) {
			return `<node throws: ${error instanceof Error ? error.message : String(error)}>`;
		}
	})();
	const expected = [
		{ property: 'Status', status: { equals: 'Done' } },
		{ property: 'Completed', date: { on_or_after: '2026-09-01T00:00:00Z' } },
		{ property: 'Owners', people: { contains: NOTION_USER } },
	];
	const sentConditions = isRecord(sent) && Array.isArray(sent.and) ? sent.and : [];
	const sentKeys = sentConditions.map(sortedJson).sort();
	const filterPass =
		sentConditions.length === expected.length &&
		expected.every((condition) => sentKeys.includes(sortedJson(condition)));

	const items =
		parameters.simple === false
			? [notionPage('p1', 'Ship billing v3'), notionPage('p2', 'Retire old API')]
			: runtime.simplifyObjects(
					[notionPage('p1', 'Ship billing v3'), notionPage('p2', 'Retire old API')],
					notion.typeVersion ?? 2,
				);
	const outputItems = (Array.isArray(items) ? items : []).filter(isDataObject);

	const {
		node: http,
		sourceName,
		items: httpInput,
		path: via,
	} = await followToHttp(workflow, notion.name, outputItems);
	const bodies = http ? await httpBodies(http, sourceName, httpInput) : [];
	const expectBody = (name: string) => (body: unknown) =>
		isRecord(body) &&
		body.name === name &&
		typeof body.owners === 'string' &&
		body.owners.replace(/\s/g, '') === 'dana@acme.test,fox@acme.test' &&
		body.completed === '2026-09-10';
	const readsPass =
		bodies.length === 2 &&
		expectBody('Ship billing v3')(bodies[0]) &&
		expectBody('Retire old API')(bodies[1]);

	return [
		{ name: 'filter', pass: filterPass, detail: JSON.stringify(sent) },
		http
			? { name: 'reads', pass: readsPass, detail: `${via} ${JSON.stringify(bodies)}` }
			: { name: 'reads', pass: false, ungraded: true, detail: via },
	];
};

/** The POST check shared by graders: method and URL after defaults, then the sent bodies. */
async function postedBodies(workflow: WorkflowResponse, startName: string, items: IDataObject[]) {
	const {
		node: http,
		sourceName,
		items: httpInput,
		path: via,
	} = await followToHttp(workflow, startName, items);
	if (!http) return { via, target: undefined, bodies: [] };
	const parameters = withDefaults(http);
	return {
		via,
		target: `${asText(parameters.method)} ${asText(parameters.url).replace(/^=/, '').trim()}`,
		bodies: await httpBodies(http, sourceName, httpInput),
	};
}

function readsCheck(
	posted: Awaited<ReturnType<typeof postedBodies>>,
	expectedTarget: string,
	expectBodies: (bodies: unknown[]) => boolean,
): Check {
	if (!posted.target) return { name: 'reads', pass: false, ungraded: true, detail: posted.via };
	return {
		name: 'reads',
		pass: posted.target === expectedTarget && expectBodies(posted.bodies),
		detail: `${posted.via} ${posted.target} ${JSON.stringify(posted.bodies)}`,
	};
}

const SHEET_ID = '1ZyXwVuTsRqPoNmLkJiHgFeDcBa9876543210';
const STOCK_ROWS = [
	['SKU', 'Price', 'Warehouse'],
	['A-100', 9.5, 'Berlin'],
	['B-200', 19.99, 'Berlin'],
	['B-200', 24.99, 'Lisbon'],
	['C-300', 5, 'Berlin'],
];

/** Rows the Google Sheets read operation returns for `values`, run by the node's own read code. */
async function sheetsReadOutput(parameters: INodeParameters, version: number, values: unknown[][]) {
	const { execute } = loadDist(
		nodesBaseRequire,
		'./dist/nodes/Google/Sheet/v2/actions/sheet/read.operation.js',
		['execute'],
	);
	const { GoogleSheet } = loadDist(
		nodesBaseRequire,
		'./dist/nodes/Google/Sheet/v2/helpers/GoogleSheet.js',
		['GoogleSheet'],
	);
	const context = {
		getNode: () => ({ ...stubNode('Google Sheets'), typeVersion: version }),
		getInputData: () => [{ json: {} }],
		getNodeParameter: (name: string, _itemIndex: number, fallback?: unknown) =>
			valueAt(parameters, name) ?? fallback,
	};
	const sheet: unknown =
		typeof GoogleSheet === 'function' ? Reflect.construct(GoogleSheet, [SHEET_ID, context]) : {};
	if (!isRecord(sheet)) throw new Error('GoogleSheet did not construct');
	sheet.getData = async () => await Promise.resolve(values.map((row) => [...row]));
	const output = await invoke(execute, context, sheet, 'Stock');
	return (Array.isArray(output) ? output : [])
		.map((item: unknown) => (isRecord(item) ? item.json : undefined))
		.filter(isDataObject);
}

function sheetsReadTarget(parameters: INodeParameters, documentId: string, sheetName: string) {
	const document = asText(valueAt(parameters, 'documentId.value'));
	const sheetNames = [
		valueAt(parameters, 'sheetName.value'),
		valueAt(parameters, 'sheetName.cachedResultName'),
	];
	return {
		name: 'target',
		pass:
			parameters.operation === 'read' &&
			document.includes(documentId) &&
			sheetNames.includes(sheetName),
		detail: JSON.stringify({ operation: parameters.operation, document, sheetNames }),
	};
}

// A Limit node that keeps the first row passes: it sends the same single POST.
const gradeSheetsLookupFirstMatch: Grader = async (workflow) => {
	const sheets = workflow.nodes.find((node) => node.type === 'n8n-nodes-base.googleSheets');
	if (!sheets) return [{ name: 'sheets-node', pass: false, detail: 'no Google Sheets node' }];
	const parameters = await runtimeParameters(workflow, sheets);
	const rows = await sheetsReadOutput(parameters, sheets.typeVersion ?? 1, STOCK_ROWS);
	const posted = await postedBodies(workflow, sheets.name, rows);
	return [
		sheetsReadTarget(parameters, SHEET_ID, 'Stock'),
		{
			name: 'lookup',
			pass:
				rows.length > 0 &&
				rows.every((row) => row.SKU === 'B-200') &&
				rows[0].Warehouse === 'Berlin',
			detail: `${rows.length} row(s) ${JSON.stringify(rows)} filters ${JSON.stringify(valueAt(parameters, 'filtersUI.values'))} options ${JSON.stringify(parameters.options)}`,
		},
		readsCheck(
			posted,
			'POST https://shop.example.com/api/price',
			(bodies) => bodies.length === 1 && isRecord(bodies[0]) && String(bodies[0].price) === '19.99',
		),
	];
};

const SIGNUPS_SHEET_ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789';
// Only Email is named in the prompt; the other columns are unknown to the builder.
const SIGNUP_ROWS = [
	['Email', 'Name', 'Plan'],
	['a@b.test', 'A', 'pro'],
	['c@d.test', 'C', 'free'],
];

const gradeSheetsDynamicColumns: Grader = async (workflow) => {
	const sheets = workflow.nodes.find((node) => node.type === 'n8n-nodes-base.googleSheets');
	if (!sheets) return [{ name: 'sheets-node', pass: false, detail: 'no Google Sheets node' }];
	const parameters = await runtimeParameters(workflow, sheets);
	const rows = await sheetsReadOutput(parameters, sheets.typeVersion ?? 1, SIGNUP_ROWS);
	const posted = await postedBodies(workflow, sheets.name, rows);
	return [
		sheetsReadTarget(parameters, SIGNUPS_SHEET_ID, 'Signups'),
		readsCheck(
			posted,
			'POST https://hooks.example.com/api/signups',
			(bodies) =>
				sortedJson(bodies) ===
				sortedJson([
					{ email: 'a@b.test', row: 2 },
					{ email: 'c@d.test', row: 3 },
				]),
		),
	];
};

const ORDER_URL = 'https://shop.example.com/api/orders/o1';
const ORDER: IDataObject = { id: 'o1', total: 10, currency: 'EUR', customer: { tier: 'gold' } };

const gradeSetKeepAllPassthrough: Grader = async (workflow) => {
	const get = workflow.nodes.find(
		(node) =>
			node.type === 'n8n-nodes-base.httpRequest' &&
			asText(node.parameters?.url).includes(ORDER_URL),
	);
	if (!get) return [{ name: 'get-node', pass: false, detail: 'no HTTP Request to the order URL' }];
	const set = childrenOf(workflow, get.name).find((node) => node.type === 'n8n-nodes-base.set');
	if (!set) return [{ name: 'set-node', pass: false, detail: 'no Set node after the GET' }];
	const [output] = await setOutput(set, get.name, [ORDER]);
	const posted = await postedBodies(workflow, get.name, [ORDER]);
	const setParameters = withDefaults(set);
	return [
		{
			name: 'keep-all',
			pass: Object.entries(ORDER).every(
				([key, value]) => sortedJson(output?.[key]) === sortedJson(value),
			),
			detail: `v${set.typeVersion ?? 1} includeOtherFields=${asText(setParameters.includeOtherFields)} include=${asText(setParameters.include)} ${JSON.stringify(output)}`,
		},
		{
			name: 'number-type',
			pass: output?.total_with_tax === 12,
			detail: `total_with_tax=${JSON.stringify(output?.total_with_tax)} (${typeof output?.total_with_tax})`,
		},
		readsCheck(
			posted,
			'POST https://ledger.example.com/api/orders',
			(bodies) =>
				bodies.length === 1 &&
				sortedJson(bodies[0]) === sortedJson({ id: 'o1', total_with_tax: 12 }),
		),
	];
};

const CUSTOMERS_URL = 'https://api.example.com/v1/customers';
const CUSTOMER_PAGES: Record<string, IDataObject> = {
	'': { data: [{ id: 1 }, { id: 2 }], next_cursor: 'c2' },
	c2: { data: [{ id: 3 }, { id: 4 }], next_cursor: 'c3' },
	c3: { data: [{ id: 5 }], next_cursor: null },
};
const MAX_FAKE_REQUESTS = 6;

/** The `continue` expression HttpRequestV3 builds from the pagination settings. */
function paginationContinue(pagination: Record<string, unknown>, neverError: boolean): string {
	if (pagination.paginationCompleteWhen === 'receiveSpecificStatusCodes') {
		const codes = asText(pagination.statusCodesWhenComplete)
			.split(',')
			.map((code) => parseInt(code.trim()));
		return `={{ !${JSON.stringify(codes)}.includes($response.statusCode) }}`;
	}
	if (pagination.paginationCompleteWhen === 'responseIsEmpty') {
		return '={{ Array.isArray($response.body) ? $response.body.length : !!$response.body }}';
	}
	const complete = asText(pagination.completeExpression);
	if (!complete.startsWith('=')) throw new Error('Invalid or empty Complete Expression');
	const condition = complete.trim().slice(3, -2);
	return neverError
		? `={{ !(${condition}) }}`
		: `={{ !(${condition}) || ($response.statusCode < 200 || $response.statusCode >= 300) }}`;
}

const dataAt = (value: unknown, key: string): IDataObject => {
	const at = valueAt(value, key);
	return isDataObject(at) ? at : {};
};

/** Copies the keys core's pagination loop passes, typed for the expression engine. */
const additionalKeys = (keys: unknown): IWorkflowDataProxyAdditionalKeys => ({
	$response: dataAt(keys, '$response'),
	$request: dataAt(keys, '$request'),
	$pageCount: Number(valueAt(keys, '$pageCount') ?? 0),
});

/** Runs core's pagination loop for the node against CUSTOMER_PAGES and returns the URLs it requests. */
async function paginatedRequests(workflow: WorkflowResponse, http: WorkflowNodeResponse) {
	const parameters = withDefaults(http);
	const pagination = valueAt(parameters, 'options.pagination.pagination');
	if (!isRecord(pagination) || pagination.paginationMode === 'off') {
		return { urls: [], pages: [], error: 'pagination is off' };
	}
	const updates = valueAt(pagination, 'parameters.parameters');
	const request: Record<string, unknown> =
		pagination.paginationMode === 'responseContainsNextURL'
			? { url: pagination.nextURL }
			: (Array.isArray(updates) ? updates : [])
					.filter(isRecord)
					.reduce<Record<string, IDataObject>>(
						(grouped, update) => ({
							...grouped,
							[String(update.type)]: {
								...grouped[String(update.type)],
								[String(update.name)]: toDataValue(update.value),
							},
						}),
						{},
					);
	const { requestWithAuthenticationPaginated } = loadDist(
		coreRequire,
		'./dist/execution-engine/node-execution-context/utils/request-helpers/pagination.js',
		['requestWithAuthenticationPaginated'],
	);
	const urls: string[] = [];
	const fakeRequest = async (options: unknown) => {
		const url = new URL(String(valueAt(options, 'uri')));
		const qs = valueAt(options, 'qs');
		for (const [key, value] of Object.entries(isRecord(qs) ? qs : {})) {
			if (value !== undefined && value !== null) url.searchParams.set(key, asText(value));
		}
		urls.push(url.toString());
		if (urls.length > MAX_FAKE_REQUESTS) throw new Error(`more than ${MAX_FAKE_REQUESTS} requests`);
		const body = CUSTOMER_PAGES[url.searchParams.get('cursor') ?? ''];
		return await Promise.resolve(
			body
				? { body, headers: {}, statusCode: 200 }
				: { body: { error: 'unknown cursor' }, headers: {}, statusCode: 400 },
		);
	};
	try {
		const paginationOptions = {
			continue: paginationContinue(
				pagination,
				valueAt(parameters, 'options.response.response.neverError') === true,
			),
			request,
			requestInterval: 0,
			...(pagination.limitPagesFetched === true ? { maxRequests: pagination.maxRequests } : {}),
		};
		const responses = await withChildContext(
			parentName(workflow, http.name),
			http.name,
			[{}],
			async (evaluate) =>
				await invoke(
					requestWithAuthenticationPaginated,
					{ helpers: { request: fakeRequest } },
					{ uri: asText(parameters.url).replace(/^=/, '').trim(), method: parameters.method },
					0,
					paginationOptions,
					(value: unknown, itemIndex: number, _run: number, _data: unknown, keys: unknown) =>
						isParameterValue(value) ? evaluate(value, itemIndex, additionalKeys(keys)) : value,
					{ ...stubNode(http.name), typeVersion: http.typeVersion ?? 1 },
				),
		);
		const pages = (Array.isArray(responses) ? responses : [])
			.map((response: unknown) => valueAt(response, 'body'))
			.filter(isDataObject);
		return { urls, pages, error: undefined };
	} catch (error) {
		return { urls, pages: [], error: errorText(error) };
	}
}

const gradeHttpCursorPagination: Grader = async (workflow) => {
	const http = workflow.nodes.find(
		(node) =>
			node.type === 'n8n-nodes-base.httpRequest' &&
			asText(node.parameters?.url).includes('api.example.com/v1/customers'),
	);
	if (!http)
		return [{ name: 'http-node', pass: false, detail: 'no HTTP Request to the customers API' }];
	const { urls, pages, error } = await paginatedRequests(workflow, http);
	const expected = [CUSTOMERS_URL, `${CUSTOMERS_URL}?cursor=c2`, `${CUSTOMERS_URL}?cursor=c3`];
	const posted = await postedBodies(workflow, http.name, pages);
	return [
		{
			name: 'pagination',
			pass: !error && JSON.stringify(urls) === JSON.stringify(expected),
			detail: `${error ? `${error}; ` : ''}${urls.join(' , ')}`,
		},
		readsCheck(
			posted,
			'POST https://reports.example.com/api/customers/count',
			(bodies) => bodies.length === 1 && isRecord(bodies[0]) && String(bodies[0].total) === '5',
		),
	];
};

const GMAIL_SENT = { id: 'm-1042', threadId: 't-77', labelIds: ['SENT'] };

const gradeGmailSendThenPost: Grader = async (workflow) => {
	const gmail = workflow.nodes.find((node) => node.type === 'n8n-nodes-base.gmail');
	if (!gmail) return [{ name: 'gmail-node', pass: false, detail: 'no Gmail node' }];
	const parameters = await runtimeParameters(workflow, gmail);
	const send = {
		resource: parameters.resource,
		operation: parameters.operation,
		sendTo: asText(parameters.sendTo).trim(),
		subject: parameters.subject,
		emailType: parameters.emailType,
		message: asText(parameters.message).trim(),
	};
	const expected = {
		resource: 'message',
		operation: 'send',
		sendTo: 'billing@acme.test',
		subject: 'Invoice 1042 sent',
		emailType: 'text',
		message: 'Invoice 1042 is ready.',
	};
	const posted = await postedBodies(workflow, gmail.name, [GMAIL_SENT]);
	return [
		{ name: 'send', pass: sortedJson(send) === sortedJson(expected), detail: JSON.stringify(send) },
		readsCheck(
			posted,
			'POST https://crm.example.com/api/emails',
			(bodies) =>
				bodies.length === 1 &&
				sortedJson(bodies[0]) === sortedJson({ messageId: 'm-1042', threadId: 't-77' }),
		),
	];
};

const GRADERS: Record<string, Grader> = {
	'nc-notion-filter-and-read': gradeNotionFilterAndRead,
	'nc-sheets-lookup-first-match': gradeSheetsLookupFirstMatch,
	'nc-http-cursor-pagination': gradeHttpCursorPagination,
	'nc-gmail-send-then-post': gradeGmailSendThenPost,
	'nc-sheets-dynamic-columns': gradeSheetsDynamicColumns,
	'nc-set-keep-all-passthrough': gradeSetKeepAllPassthrough,
};

async function gradeSafely(caseSlug: string, workflow: WorkflowResponse): Promise<Check[]> {
	const grade = GRADERS[caseSlug];
	if (!grade) return [{ name: 'grader', pass: false, detail: `no grader for ${caseSlug}` }];
	try {
		return await grade(workflow);
	} catch (error) {
		return [{ name: 'grader', pass: false, detail: `grader threw: ${errorText(error)}` }];
	}
}

// ── Runner ──────────────────────────────────────────────────────────────────

interface Arm {
	name: string;
	baseUrl: string;
}

const flagValues = (argv: string[], flag: string) =>
	argv.flatMap((arg, index) => (arg === flag && argv[index + 1] ? [argv[index + 1]] : []));

const expandCases = (slugs: string[]) => [
	...new Set(slugs.flatMap((slug) => (slug === 'all' ? Object.keys(GRADERS) : [slug]))),
];

function parseArgs(argv: string[]) {
	const value = (flag: string) => flagValues(argv, flag)[0];
	const arms: Arm[] = flagValues(argv, '--arm').flatMap((spec) => {
		const [name, baseUrl] = spec.split('=');
		return name && baseUrl ? [{ name, baseUrl }] : [];
	});
	const cases = expandCases(flagValues(argv, '--case'));
	if (cases.length === 0 || arms.length === 0) {
		throw new Error(
			'Usage: --case <slug|all> [--case ...] --arm <name>=<baseUrl> [--arm ...] [--iterations N] [--concurrency N] [--out dir]',
		);
	}
	const ungraded = cases.filter((slug) => !GRADERS[slug]);
	if (ungraded.length) throw new Error(`No grader for ${ungraded.join(', ')}; add one to GRADERS`);
	return {
		cases,
		arms,
		iterations: Number(value('--iterations') ?? 3),
		concurrency: Number(value('--concurrency') ?? 4),
		out:
			value('--out') ??
			path.join('/tmp', 'node-contracts-fast-loop', new Date().toISOString().replace(/[:.]/g, '-')),
	};
}

async function scrapeTokens(baseUrl: string) {
	const text = await fetch(`${baseUrl}/metrics`)
		.then(async (response) => await response.text())
		.catch(() => '');
	const metric = (pattern: RegExp) => Number(text.match(pattern)?.[1] ?? 0);
	return {
		input: metric(/^n8n_instance_ai_tokens_total\{type="input"\} (\S+)/m),
		output: metric(/^n8n_instance_ai_tokens_total\{type="output"\} (\S+)/m),
		cost: metric(/^n8n_instance_ai_cost_usd_total (\S+)/m),
	};
}

async function openArm(arm: Arm) {
	const client = new N8nClient(arm.baseUrl);
	await client.login();
	return {
		arm,
		client,
		preRunWorkflowIds: new Set(await client.listWorkflowIds()),
		claimedWorkflowIds: new Set<string>(),
		createdCredentialIds: new Set<string>(),
	};
}

type ArmSession = Awaited<ReturnType<typeof openArm>>;

const logger = createLogger(false);

async function runBuild(
	session: ArmSession,
	testCase: WorkflowTestCaseWithFile,
	iteration: number,
) {
	const started = Date.now();
	const before = await scrapeTokens(session.arm.baseUrl);
	const build = await buildWorkflow({
		client: session.client,
		conversation: testCase.testCase.conversation,
		credentials: testCase.testCase.credentials,
		createdCredentialIds: session.createdCredentialIds,
		preRunWorkflowIds: session.preRunWorkflowIds,
		claimedWorkflowIds: session.claimedWorkflowIds,
		logger,
		skipWorkflowChecks: true,
	});
	const after = await scrapeTokens(session.arm.baseUrl);
	const seconds = Math.round((Date.now() - started) / 1000);
	const toolCalls = extractOutcomeFromEvents(build.events ?? []).toolCalls.map(
		(call) => call.toolName,
	);
	const workflow = build.workflowJsons[0];
	const checks = workflow
		? await gradeSafely(testCase.fileSlug, workflow)
		: [{ name: 'build', pass: false, detail: build.error ?? 'no workflow' }];
	const result = {
		case: testCase.fileSlug,
		arm: session.arm.name,
		iteration,
		seconds,
		built: build.success,
		pass: buildPasses(checks),
		checks,
		toolCalls,
		tokens: {
			input: after.input - before.input,
			output: after.output - before.output,
			cost: after.cost - before.cost,
		},
		workflowId: build.workflowId,
		threadId: build.threadId,
		workflow,
	};
	console.log(
		`[${result.case} ${result.arm} #${iteration}] ${result.pass ? 'PASS' : 'FAIL'} ${seconds}s ${toolCalls.length} tools  ` +
			checks
				.map((check) => `${check.name}=${check.ungraded ? '?' : check.pass ? 'ok' : 'x'}`)
				.join(' '),
	);
	return result;
}

type BuildRecord = Awaited<ReturnType<typeof runBuild>>;

const mean = (values: number[]) =>
	values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;

function summaryRow(label: string, builds: BuildRecord[]) {
	const n = builds.length || 1;
	const checkNames = [
		...new Set(builds.flatMap((build) => build.checks.map((check) => check.name))),
	];
	const checkSummary = checkNames
		.map(
			(name) =>
				`${name} ${builds.filter((build) => build.checks.some((c) => c.name === name && c.pass)).length}/${n}${builds.some((build) => build.checks.some((c) => c.name === name && c.ungraded)) ? ' (some ungraded)' : ''}`,
		)
		.join(', ');
	return (
		`| ${label} | ${builds.filter((build) => build.pass).length}/${n} | ${checkSummary} | ` +
		`${mean(builds.map((build) => build.seconds)).toFixed(0)} | ` +
		`${mean(builds.map((build) => build.toolCalls.length)).toFixed(1)} | ` +
		`${mean(builds.map((build) => build.toolCalls.filter((t) => t === 'nodes').length)).toFixed(1)} | ` +
		`${(mean(builds.map((build) => build.tokens.input)) / 1000).toFixed(0)} | ` +
		`${(mean(builds.map((build) => build.tokens.output)) / 1000).toFixed(1)} | ` +
		`${mean(builds.map((build) => build.tokens.cost)).toFixed(3)} |`
	);
}

function printSummary(builds: BuildRecord[], cases: string[], arms: Arm[]) {
	console.log(
		'\n| case | arm | pass | checks | build s | tools | nodes calls | in ktok/build | out ktok/build | $/build |',
	);
	console.log('|---|---|---|---|---|---|---|---|---|---|');
	const armNames = [...new Set(arms.map((arm) => arm.name))];
	const rows = [
		...cases.flatMap((caseSlug) => armNames.map((armName) => [caseSlug, armName])),
		...armNames.map((armName) => ['all', armName]),
	];
	for (const [caseSlug, armName] of rows) {
		const matching = builds.filter(
			(build) => build.arm === armName && (caseSlug === 'all' || build.case === caseSlug),
		);
		console.log(summaryRow(`${caseSlug} | ${armName}`, matching));
	}
}

/** `--grade <file> [--case <slug>]` regrades a saved workflow JSON, or every build in a results.json. */
async function gradeFile(caseSlugs: string[], file: string) {
	const parsed: unknown = JSON.parse(readFileSync(file, 'utf8'));
	const targets = isWorkflowResponse(parsed)
		? caseSlugs.map((caseSlug) => ({
				label: `${caseSlug} ${path.basename(file)}`,
				caseSlug,
				workflow: parsed,
			}))
		: (Array.isArray(parsed) ? parsed : [])
				.filter(isRecord)
				// Single-case results.json files nest builds per arm and carry no case slug.
				.flatMap((entry) => (Array.isArray(entry.builds) ? entry.builds : [entry]))
				.filter(isRecord)
				.flatMap((build) => {
					const caseSlug = typeof build.case === 'string' ? build.case : caseSlugs[0];
					return caseSlug &&
						(caseSlugs.length === 0 || caseSlugs.includes(caseSlug)) &&
						isWorkflowResponse(build.workflow)
						? [
								{
									label: `${caseSlug} ${String(build.arm)} #${String(build.iteration)}`,
									caseSlug,
									workflow: build.workflow,
								},
							]
						: [];
				});
	if (targets.length === 0) throw new Error(`Nothing to grade in ${file}; pass --case <slug>`);
	for (const { label, caseSlug, workflow } of targets) {
		const checks = await gradeSafely(caseSlug, workflow);
		console.log(`[${label}] ${buildPasses(checks) ? 'PASS' : 'FAIL'}`);
		for (const check of checks) {
			console.log(
				`   ${check.ungraded ? '? ' : check.pass ? 'ok' : 'x '} ${check.name}: ${check.detail.slice(0, 300)}`,
			);
		}
	}
}

function isWorkflowResponse(value: unknown): value is WorkflowResponse {
	return isRecord(value) && Array.isArray(value.nodes) && isRecord(value.connections);
}

async function main() {
	const argv = process.argv.slice(2);
	const gradeTarget = flagValues(argv, '--grade')[0];
	if (gradeTarget) {
		await gradeFile(expandCases(flagValues(argv, '--case')), gradeTarget);
		return;
	}
	const args = parseArgs(argv);
	const testCases = loadWorkflowTestCasesWithFiles(undefined, undefined, {
		slugs: new Set(args.cases),
	});
	const missing = args.cases.filter(
		(slug) => !testCases.some((loaded) => loaded.fileSlug === slug),
	);
	if (missing.length) throw new Error(`Case not found: ${missing.join(', ')}`);
	mkdirSync(args.out, { recursive: true });

	const sessions = await Promise.all(args.arms.map(openArm));
	const limit = pLimit(args.concurrency);
	// One queue per arm; each lane (instance) pulls one job at a time from its arm's queue.
	const queues = new Map(
		[...new Set(args.arms.map((arm) => arm.name))].map((armName) => [
			armName,
			Array.from({ length: args.iterations }, (_, iteration) =>
				testCases.map((testCase) => ({ testCase, iteration })),
			).flat(),
		]),
	);
	const drain = async (session: ArmSession): Promise<BuildRecord[]> => {
		const job = queues.get(session.arm.name)?.shift();
		if (!job) return [];
		const build = await limit(async () => await runBuild(session, job.testCase, job.iteration));
		return [build, ...(await drain(session))];
	};
	const builds = (await Promise.all(sessions.map(drain))).flat();
	writeFileSync(path.join(args.out, 'results.json'), JSON.stringify(builds, null, 2));
	printSummary(builds, args.cases, args.arms);
	console.log(`\nResults: ${path.join(args.out, 'results.json')}`);
}

main().catch((error: unknown) => {
	console.error(error);
	process.exit(1);
});
