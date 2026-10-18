import type { IDataObject, INode } from 'n8n-workflow';
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
}

export const PREFIX = '[self-healing playground] ';
export const WEBHOOK_PREFIX = 'self-healing-playground/';

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
						value: '={{ $json.body.orderId }}',
					},
					{
						id: crypto.randomUUID(),
						name: 'total',
						type: 'number',
						value:
							scenario.id === 'wrong-field'
								? '={{ $json.body.customer.email }}'
								: '={{ $json.body.amount }}',
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
	return {
		name: `${PREFIX}${scenario.name} · ${runId.slice(0, 8)}`,
		...(projectId ? { projectId } : {}),
		nodes: [webhook, transform],
		connections: { [webhook.name]: { main: [[{ node: transform.name, type: 'main', index: 0 }]] } },
		settings: {
			executionOrder: 'v1',
			saveDataErrorExecution: 'all',
			saveDataSuccessExecution: 'all',
		},
	};
}

export function identifyWorkflow(workflow: IWorkflowDb, scenarios: PlaygroundScenario[]) {
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
	return null;
}
