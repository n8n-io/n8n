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

export interface PlaygroundScenario {
	id: string;
	name: string;
	description: string;
	expectation: string;
	outcome: string;
	input: IDataObject;
	alternateInput: IDataObject;
	subWorkflowName?: string;
}

export const PREFIX = '[self-healing playground] ';
export const WEBHOOK_PREFIX = 'self-healing-playground/';

const TOTALS: Record<string, string | undefined> = {
	'wrong-field': '={{ $json.body.customer.email }}',
	'sub-workflow': '={{ $json.body.customer.email }}',
	'both-workflows': "={{ $('Look up order').item.json.amount }}",
};

export function getScenarios(i18n: ReturnType<typeof useI18n>): PlaygroundScenario[] {
	return [
		{
			id: 'wrong-field',
			name: i18n.baseText('selfHealingPlayground.wrong-field.name'),
			description: i18n.baseText('selfHealingPlayground.wrong-field.description'),
			expectation: i18n.baseText('selfHealingPlayground.wrong-field.expectation'),
			outcome: i18n.baseText('selfHealingPlayground.wrong-field.outcome'),
			input: { orderId: 'ORDER-101', customer: { email: 'buyer@example.com' }, amount: 42.5 },
			alternateInput: {
				orderId: 'ORDER-102',
				customer: { email: 'other@example.com' },
				amount: 19,
			},
		},
		{
			id: 'wrong-shape',
			name: i18n.baseText('selfHealingPlayground.wrong-shape.name'),
			description: i18n.baseText('selfHealingPlayground.wrong-shape.description'),
			expectation: i18n.baseText('selfHealingPlayground.wrong-shape.expectation'),
			outcome: i18n.baseText('selfHealingPlayground.wrong-shape.outcome'),
			input: {
				items: [
					{ sku: 'BOOK', quantity: 2 },
					{ sku: 'PEN', quantity: 3 },
				],
			},
			alternateInput: { items: [{ sku: 'PAD', quantity: 5 }] },
		},
		{
			id: 'unavailable-service',
			name: i18n.baseText('selfHealingPlayground.unavailable-service.name'),
			description: i18n.baseText('selfHealingPlayground.unavailable-service.description'),
			expectation: i18n.baseText('selfHealingPlayground.unavailable-service.expectation'),
			outcome: i18n.baseText('selfHealingPlayground.unavailable-service.outcome'),
			input: { accountId: 'ACCOUNT-101' },
			alternateInput: { accountId: 'ACCOUNT-102' },
		},
		{
			id: 'sub-workflow',
			name: i18n.baseText('selfHealingPlayground.sub-workflow.name'),
			description: i18n.baseText('selfHealingPlayground.sub-workflow.description'),
			expectation: i18n.baseText('selfHealingPlayground.sub-workflow.expectation'),
			outcome: i18n.baseText('selfHealingPlayground.sub-workflow.outcome'),
			subWorkflowName: i18n.baseText('selfHealingPlayground.sub-workflow.subWorkflowName'),
			input: { orderId: 'ORDER-201', customer: { email: 'buyer@example.com' }, amount: 42.5 },
			alternateInput: {
				orderId: 'ORDER-202',
				customer: { email: 'other@example.com' },
				amount: 19,
			},
		},
		{
			id: 'both-workflows',
			name: i18n.baseText('selfHealingPlayground.both-workflows.name'),
			description: i18n.baseText('selfHealingPlayground.both-workflows.description'),
			expectation: i18n.baseText('selfHealingPlayground.both-workflows.expectation'),
			outcome: i18n.baseText('selfHealingPlayground.both-workflows.outcome'),
			subWorkflowName: i18n.baseText('selfHealingPlayground.both-workflows.subWorkflowName'),
			input: { orderId: 'ORDER-301', amount: 42.5 },
			alternateInput: { orderId: 'ORDER-302', amount: 19 },
		},
		{
			id: 'healthy',
			name: i18n.baseText('selfHealingPlayground.healthy.name'),
			description: i18n.baseText('selfHealingPlayground.healthy.description'),
			expectation: i18n.baseText('selfHealingPlayground.healthy.expectation'),
			outcome: i18n.baseText('selfHealingPlayground.healthy.outcome'),
			input: { orderId: 'ORDER-101', amount: 42.5 },
			alternateInput: { orderId: 'ORDER-102', amount: 19 },
		},
	];
}

export function createWorkflow(
	scenario: PlaygroundScenario,
	projectId: string,
	subWorkflowId?: string,
): WorkflowDataCreate {
	const runId = crypto.randomUUID();
	const webhook: INode = {
		id: crypto.randomUUID(),
		name: 'Receive order',
		type: 'n8n-nodes-base.webhook',
		typeVersion: 2.1,
		position: [0, 0],
		webhookId: crypto.randomUUID(),
		parameters: {
			httpMethod: 'POST',
			path: `${WEBHOOK_PREFIX}${scenario.id}/${runId}`,
			responseMode: 'lastNode',
			responseData: 'firstEntryJson',
			options: {},
		},
	};
	const transform: INode = {
		id: crypto.randomUUID(),
		name: scenario.id === 'wrong-shape' ? 'Prepare order output' : 'Prepare invoice',
		type: 'n8n-nodes-base.set',
		typeVersion: 3.4,
		position: [280, 0],
		notes: scenario.expectation,
		notesInFlow: true,
		parameters: {
			assignments: {
				assignments: [
					{
						id: crypto.randomUUID(),
						name: 'orderId',
						type: 'string',
						value:
							scenario.id === 'both-workflows'
								? '={{ $json.orderId }}'
								: '={{ $json.body.orderId }}',
					},
					{
						id: crypto.randomUUID(),
						name: 'total',
						type: 'number',
						value: TOTALS[scenario.id] ?? '={{ $json.body.amount }}',
					},
				],
			},
			options: {},
		},
	};
	if (scenario.id === 'wrong-shape') {
		transform.parameters = { mode: 'raw', jsonOutput: '={{ $json.body.items }}', options: {} };
	}
	if (scenario.id === 'unavailable-service') {
		transform.name = 'Read account';
		transform.type = 'n8n-nodes-base.httpRequest';
		transform.typeVersion = 4.2;
		transform.parameters = {
			url: 'https://api.example.invalid/account',
			options: { timeout: 5000 },
		};
	}
	if (subWorkflowId) {
		transform.name = 'Calculate invoice';
		transform.type = EXECUTE_WORKFLOW_NODE_TYPE;
		transform.typeVersion = 1.2;
		transform.parameters = {
			source: 'database',
			workflowId: { __rl: true, mode: 'id', value: subWorkflowId },
			options: {},
		};
	}
	const nodes = [webhook, transform];
	const check: INode = {
		id: crypto.randomUUID(),
		name: 'Check total',
		type: 'n8n-nodes-base.if',
		typeVersion: 2.2,
		position: [0, 0],
		parameters: {
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
		},
	};
	const guarded = Boolean(subWorkflowId) && scenario.id === 'both-workflows';
	if (guarded) {
		nodes.splice(1, 0, {
			id: crypto.randomUUID(),
			name: 'Prepare order',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [0, 0],
			parameters: {
				assignments: {
					assignments: [
						{
							id: crypto.randomUUID(),
							name: 'orderId',
							type: 'string',
							value: '={{ $json.body.orderId }}',
						},
					],
				},
				options: {},
			},
		});
		nodes.push(check);
	}
	const connections: IConnections = {};
	nodes.forEach((node, index) => {
		node.position = [index * 280, 0];
		const next = nodes[index + 1];
		if (next) connections[node.name] = { main: [[{ node: next.name, type: 'main', index: 0 }]] };
	});
	if (guarded) {
		const reject: INode = {
			id: crypto.randomUUID(),
			name: 'Reject total',
			type: 'n8n-nodes-base.stopAndError',
			typeVersion: 1,
			position: [nodes.length * 280, 160],
			parameters: { errorMessage: 'The invoice total does not match the order amount.' },
		};
		connections[check.name] = { main: [[], [{ node: reject.name, type: 'main', index: 0 }]] };
		nodes.push(reject);
	}
	return {
		name: `${PREFIX}${scenario.name} · ${runId.slice(0, 8)}`,
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

export function createSubWorkflow(
	scenario: PlaygroundScenario,
	projectId: string,
): WorkflowDataCreate {
	const workflow = createWorkflow(scenario, projectId);
	const trigger: INode = {
		id: crypto.randomUUID(),
		name: 'Receive order',
		type: EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE,
		typeVersion: 1.1,
		position: [0, 0],
		parameters: { inputSource: 'passthrough' },
	};
	return {
		...workflow,
		name: `${PREFIX}${scenario.subWorkflowName} · ${crypto.randomUUID().slice(0, 8)}`,
		nodes: [trigger, workflow.nodes[1]],
	};
}

export function identifyWorkflow(
	workflow: IWorkflowDb,
	scenarios: PlaygroundScenario[],
): { scenario: PlaygroundScenario; path?: string } | null {
	if (!workflow.name.startsWith(PREFIX)) return null;
	for (const node of workflow.nodes) {
		const path = node.parameters.path;
		if (
			node.type !== 'n8n-nodes-base.webhook' ||
			typeof path !== 'string' ||
			!path.startsWith(WEBHOOK_PREFIX)
		)
			continue;
		const scenario = scenarios.find(({ id }) => id === path.split('/')[1]);
		if (scenario) return { scenario, path };
	}
	const scenario = scenarios.find(
		({ subWorkflowName }) =>
			subWorkflowName && workflow.name.startsWith(`${PREFIX}${subWorkflowName} · `),
	);
	return scenario && workflow.nodes.some(({ type }) => type === EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE)
		? { scenario }
		: null;
}
