import {
	EXECUTE_WORKFLOW_NODE_TYPE,
	EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
	type IConnections,
	type IDataObject,
	type INode,
} from 'n8n-workflow';
import type { WorkflowDataCreate } from '@n8n/rest-api-client/api/workflows';
import type { useI18n } from '@n8n/i18n';
import type { IWorkflowDb } from '@/Interface';

const SCENARIO_IDS = [
	'wrong-field',
	'wrong-shape',
	'unavailable-service',
	'healthy',
	'sub-workflow',
	'both-workflows',
	'grandchild-only',
	'three-workflows',
] as const;
type ScenarioId = (typeof SCENARIO_IDS)[number];

export interface PlaygroundScenario {
	id: ScenarioId;
	name: string;
	description: string;
	expectation: string;
	outcome: string;
	input: IDataObject;
	alternateInput: IDataObject;
	chain: string[];
}

export interface PlaygroundIdentity {
	scenario: PlaygroundScenario;
	level: number;
	runId: string;
	path?: string;
}

export const PREFIX = '[self-healing playground] ';
export const WEBHOOK_PREFIX = 'self-healing-playground/';

const ORDER_ID = '={{ $json.body.orderId }}';
const PASSED_ORDER_ID = '={{ $json.orderId }}';
const EMAIL_TOTAL = '={{ $json.body.customer.email }}';
const MISSING_TOTAL = "={{ $('Look up order').item.json.amount }}";
const STEPS: Record<ScenarioId, Array<Record<string, string> | null>> = {
	'wrong-field': [{ orderId: ORDER_ID, total: EMAIL_TOTAL }],
	'wrong-shape': [{}],
	'unavailable-service': [{}],
	healthy: [{ orderId: ORDER_ID, total: '={{ $json.body.amount }}' }],
	'sub-workflow': [null, { orderId: ORDER_ID, total: EMAIL_TOTAL }],
	'both-workflows': [{ orderId: ORDER_ID }, { orderId: PASSED_ORDER_ID, total: MISSING_TOTAL }],
	'grandchild-only': [
		null,
		null,
		{ orderId: ORDER_ID, total: "={{ $('Look up order').item.json.body.amount }}" },
	],
	'three-workflows': [
		{ orderId: ORDER_ID },
		{ orderId: PASSED_ORDER_ID, amount: "={{ $('Read order').item.json.amount }}" },
		{ orderId: PASSED_ORDER_ID, total: MISSING_TOTAL },
	],
};
const INPUTS: Record<ScenarioId, [IDataObject, IDataObject]> = {
	'wrong-field': [
		{ orderId: 'ORDER-101', customer: { email: 'buyer@example.com' }, amount: 42.5 },
		{ orderId: 'ORDER-102', customer: { email: 'other@example.com' }, amount: 19 },
	],
	'wrong-shape': [
		{
			items: [
				{ sku: 'BOOK', quantity: 2 },
				{ sku: 'PEN', quantity: 3 },
			],
		},
		{ items: [{ sku: 'PAD', quantity: 5 }] },
	],
	'unavailable-service': [{ accountId: 'ACCOUNT-101' }, { accountId: 'ACCOUNT-102' }],
	healthy: [
		{ orderId: 'ORDER-101', amount: 42.5 },
		{ orderId: 'ORDER-102', amount: 19 },
	],
	'sub-workflow': [
		{ orderId: 'ORDER-201', customer: { email: 'buyer@example.com' }, amount: 42.5 },
		{ orderId: 'ORDER-202', customer: { email: 'other@example.com' }, amount: 19 },
	],
	'both-workflows': [
		{ orderId: 'ORDER-301', amount: 42.5 },
		{ orderId: 'ORDER-302', amount: 19 },
	],
	'grandchild-only': [
		{ orderId: 'ORDER-401', amount: 42.5 },
		{ orderId: 'ORDER-402', amount: 19 },
	],
	'three-workflows': [
		{ orderId: 'ORDER-501', amount: 42.5 },
		{ orderId: 'ORDER-502', amount: 19 },
	],
};
const LEVELS = [
	'selfHealingPlayground.level.child',
	'selfHealingPlayground.level.grandchild',
] as const;

export function getScenarios(i18n: ReturnType<typeof useI18n>): PlaygroundScenario[] {
	return SCENARIO_IDS.map((id) => ({
		id,
		name: i18n.baseText(`selfHealingPlayground.${id}.name`),
		description: i18n.baseText(`selfHealingPlayground.${id}.description`),
		expectation: i18n.baseText(`selfHealingPlayground.${id}.expectation`),
		outcome: i18n.baseText(`selfHealingPlayground.${id}.outcome`),
		input: INPUTS[id][0],
		alternateInput: INPUTS[id][1],
		chain: LEVELS.slice(0, STEPS[id].length - 1).map((key) => i18n.baseText(key)),
	}));
}

function node(
	name: string,
	type: string,
	typeVersion: number,
	parameters: INode['parameters'],
): INode {
	return { id: crypto.randomUUID(), name, type, typeVersion, position: [0, 0], parameters };
}

export function createWorkflow(
	scenario: PlaygroundScenario,
	projectId: string,
	{
		level = 0,
		calleeId = '',
		runId = crypto.randomUUID(),
	}: { level?: number; calleeId?: string; runId?: string } = {},
): WorkflowDataCreate {
	const entry = level
		? node('Receive order', EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, 1.1, { inputSource: 'passthrough' })
		: {
				...node('Receive order', 'n8n-nodes-base.webhook', 2.1, {
					httpMethod: 'POST',
					path: `${WEBHOOK_PREFIX}${scenario.id}/${runId}`,
					responseMode: 'lastNode',
					responseData: 'firstEntryJson',
					options: {},
				}),
				webhookId: crypto.randomUUID(),
			};
	const nodes = [entry];
	const fields = STEPS[scenario.id][level];
	if (fields) {
		const step = node(
			'total' in fields ? 'Prepare invoice' : level ? 'Prepare amount' : 'Prepare order',
			'n8n-nodes-base.set',
			3.4,
			{
				assignments: {
					assignments: Object.entries(fields).map(([name, value]) => ({
						id: crypto.randomUUID(),
						name,
						type: name === 'orderId' ? 'string' : 'number',
						value,
					})),
				},
				options: {},
			},
		);
		if (scenario.id === 'wrong-shape') {
			Object.assign(step, {
				name: 'Prepare order output',
				parameters: { mode: 'raw', jsonOutput: '={{ $json.body.items }}', options: {} },
			});
		}
		if (scenario.id === 'unavailable-service') {
			Object.assign(
				step,
				node('Read account', 'n8n-nodes-base.httpRequest', 4.2, {
					url: 'https://api.example.invalid/account',
					options: { timeout: 5000 },
				}),
			);
		}
		nodes.push({ ...step, notes: scenario.expectation, notesInFlow: true });
	}
	if (level < scenario.chain.length) {
		nodes.push(
			node('Calculate invoice', EXECUTE_WORKFLOW_NODE_TYPE, 1.2, {
				source: 'database',
				workflowId: { __rl: true, mode: 'id', value: calleeId },
				options: {},
			}),
		);
	}
	const check = node('Check total', 'n8n-nodes-base.if', 2.2, {
		conditions: {
			options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
			conditions: [
				{
					id: crypto.randomUUID(),
					leftValue: '={{ $json.total }}',
					rightValue: "={{ $('Receive order').first().json.body.amount }}",
					operator: { type: 'number', operation: 'equals' },
				},
			],
			combinator: 'and',
		},
		options: {},
	});
	const guarded = !level && Boolean(fields) && scenario.chain.length > 0;
	if (guarded) nodes.push(check);
	const connections: IConnections = {};
	nodes.forEach((current, index) => {
		current.position = [index * 280, 0];
		const next = nodes[index + 1];
		if (next) connections[current.name] = { main: [[{ node: next.name, type: 'main', index: 0 }]] };
	});
	if (guarded) {
		const reject = node('Reject total', 'n8n-nodes-base.stopAndError', 1, {
			errorMessage: 'The invoice total does not match the order amount.',
		});
		reject.position = [nodes.length * 280, 160];
		connections[check.name] = { main: [[], [{ node: reject.name, type: 'main', index: 0 }]] };
		nodes.push(reject);
	}
	const label = level ? [scenario.name, scenario.chain[level - 1]] : [scenario.name];
	return {
		name: `${PREFIX}${[...label, runId.slice(0, 8)].join(' · ')}`,
		...(projectId ? { projectId } : {}),
		nodes,
		connections,
		settings: {
			executionOrder: 'v1',
			saveDataErrorExecution: 'all',
			saveDataSuccessExecution: 'all',
		},
	};
}

export function identifyWorkflow(
	workflow: IWorkflowDb,
	scenarios: PlaygroundScenario[],
): PlaygroundIdentity | null {
	if (!workflow.name.startsWith(PREFIX)) return null;
	const parts = workflow.name.slice(PREFIX.length).split(' · ');
	const runId = parts[parts.length - 1];
	const scenario = scenarios.find(({ name }) => name === parts[0]);
	if (!scenario || parts.length < 2) return null;
	if (parts.length === 2) {
		const path = workflow.nodes
			.filter(({ type }) => type === 'n8n-nodes-base.webhook')
			.map(({ parameters }) => parameters.path)
			.find(
				(value): value is string =>
					typeof value === 'string' && value.startsWith(`${WEBHOOK_PREFIX}${scenario.id}/`),
			);
		return path ? { scenario, level: 0, runId, path } : null;
	}
	const level = scenario.chain.indexOf(parts[1]) + 1;
	return parts.length === 3 &&
		level > 0 &&
		workflow.nodes.some(({ type }) => type === EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE)
		? { scenario, level, runId }
		: null;
}
