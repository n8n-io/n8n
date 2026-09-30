import {
	FORM_NODE_TYPE,
	FORM_TRIGGER_NODE_TYPE,
	Expression,
	createRunExecutionData,
	type INode,
	type INodeType,
	type INodeTypes,
	type ITaskData,
	type IWebhookData,
	Workflow,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { getFormTriggerResponseMode } from '../form-response-mode';
import { WebhookExecutionContext } from '../webhook-execution-context';

describe('getFormTriggerResponseMode', () => {
	beforeAll(async () => {
		await Expression.initExpressionEngine({
			engine: 'vm',
			bridgeTimeout: 1000,
			bridgeMemoryLimit: 128,
			poolSize: 1,
			maxCodeCacheSize: 10,
		});
	});

	afterAll(async () => {
		await Expression.disposeExpressionEngine();
	});

	function setup(responseMode?: string) {
		const unusedTrigger: INode = {
			id: 'unused',
			name: 'Unused trigger',
			type: FORM_TRIGGER_NODE_TYPE,
			typeVersion: 2.5,
			position: [0, 0],
			parameters: { responseMode: 'lastNode' },
		};
		const trigger: INode = {
			id: 'trigger',
			name: 'Form Trigger',
			type: FORM_TRIGGER_NODE_TYPE,
			typeVersion: 2.5,
			position: [0, 200],
			parameters: responseMode === undefined ? {} : { responseMode },
		};
		const form: INode = {
			id: 'form',
			name: 'Form',
			type: FORM_NODE_TYPE,
			typeVersion: 2.5,
			position: [200, 0],
			parameters: {},
		};
		const nodeTypes = mock<INodeTypes>();
		nodeTypes.getByNameAndVersion.mockReturnValue(
			mock<INodeType>({
				description: {
					properties: [
						{
							name: 'responseMode',
							displayName: 'Respond When',
							type: 'string',
							noDataExpression: false,
							default: 'onReceived',
						},
					],
				},
			}),
		);
		const workflow = new Workflow({
			nodes: [unusedTrigger, trigger, form],
			connections: {
				'Unused trigger': { main: [[{ node: 'Form', type: 'main', index: 0 }]] },
				'Form Trigger': { main: [[{ node: 'Form', type: 'main', index: 0 }]] },
			},
			active: false,
			nodeTypes,
		});
		const runExecutionData = createRunExecutionData({
			resultData: { runData: { 'Form Trigger': [mock<ITaskData>()] } },
		});
		const context = new WebhookExecutionContext(workflow, form, mock<IWebhookData>(), 'manual', {});
		return { context, runExecutionData, trigger };
	}

	it.each([
		['onReceived', 'onReceived'],
		['lastNode', 'lastNode'],
		['responseNode', 'responseNode'],
		[undefined, 'onReceived'],
		['={{ "onReceived" }}', 'onReceived'],
	])('uses %s from the trigger that ran', async (savedMode, expectedMode) => {
		const { context, runExecutionData } = setup(savedMode);
		await context.workflow.expression.acquireIsolate();
		try {
			expect(getFormTriggerResponseMode(context, runExecutionData)).toBe(expectedMode);
		} finally {
			await context.workflow.expression.releaseIsolate();
		}
	});

	it('keeps the existing mode if no ancestor form trigger ran', () => {
		const { context } = setup('onReceived');
		expect(getFormTriggerResponseMode(context, createRunExecutionData())).toBeUndefined();
		expect(getFormTriggerResponseMode(context, undefined)).toBeUndefined();
	});

	it('ignores disabled triggers', () => {
		const { context, runExecutionData, trigger } = setup('onReceived');
		trigger.disabled = true;
		expect(getFormTriggerResponseMode(context, runExecutionData)).toBeUndefined();
	});
});
