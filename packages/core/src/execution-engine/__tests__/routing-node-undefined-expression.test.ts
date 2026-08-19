import type {
	IExecuteData,
	INode,
	INodeType,
	INodeTypeDescription,
	INodeTypes,
	IRunExecutionData,
	ITaskDataConnections,
	IWorkflowExecuteAdditionalData,
} from 'n8n-workflow';
import {
	ExpressionError,
	NodeConnectionTypes,
	Workflow,
	createEmptyRunExecutionData,
} from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ExecuteContext } from '@/execution-engine/node-execution-context';

import { RoutingNode } from '../routing-node';

/**
 * Declarative (`routing:`) nodes resolve their routed parameters through
 * `ExecuteSingleContext.getNodeParameter`, so they reach the same
 * `throwOnUndefinedExpression` guard as programmatic nodes. This asserts that
 * end-to-end with real contexts — the `runNode` suite in `routing-node.test.ts`
 * mocks `ExecuteSingleContext` and would not exercise it.
 */
describe('RoutingNode with throwOnUndefinedExpression', () => {
	const additionalData = mock<IWorkflowExecuteAdditionalData>({
		executionId: 'test-exec',
		webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
		formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
	});

	// Plain object, not `mock()`: a mock proxy makes `noDataExpression` truthy,
	// which strips the `=` off expression values in `Workflow`'s constructor.
	const description: INodeTypeDescription = {
		displayName: 'Declarative Node',
		name: 'declarative.node',
		group: ['transform'],
		version: 1,
		description: '',
		defaults: {},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		requestDefaults: { baseURL: 'http://127.0.0.1:5678', url: '/test' },
		properties: [
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				routing: { send: { property: 'toEmail', type: 'body' } },
			},
		],
	};

	const runNode = async (nodeOverrides: Partial<INode>) => {
		const nodeType = mock<INodeType>();
		nodeType.description = description;
		const nodeTypes = mock<INodeTypes>({
			getByNameAndVersion: () => nodeType,
			getByName: () => nodeType,
		});

		const node: INode = {
			id: 'declarative-node',
			name: 'Declarative Node',
			type: 'declarative.node',
			typeVersion: 1,
			position: [0, 0],
			parameters: { email: '={{ $json.missing }}' },
			...nodeOverrides,
		};

		const workflow = new Workflow({
			nodes: [node],
			connections: {},
			active: false,
			nodeTypes,
		});

		const runExecutionData: IRunExecutionData = createEmptyRunExecutionData();
		const connectionInputData = [{ json: { present: 'value' } }];
		const inputData: ITaskDataConnections = { main: [connectionInputData] };
		const executeData = { data: inputData, node, source: null } as IExecuteData;

		const executeFunctions = new ExecuteContext(
			workflow,
			node,
			additionalData,
			'manual',
			runExecutionData,
			0,
			connectionInputData,
			inputData,
			executeData,
			[],
		);

		return await new RoutingNode(executeFunctions, nodeType).runNode();
	};

	it('fails the node when a routed parameter resolves to undefined and the setting is on', async () => {
		let caught: unknown;
		try {
			await runNode({ throwOnUndefinedExpression: true });
		} catch (error) {
			caught = error;
		}

		expect(caught).toBeInstanceOf(ExpressionError);
		const expressionError = caught as ExpressionError;
		expect(expressionError.context.type).toBe('undefined_value');
		expect(expressionError.message).toContain('email');
	});

	it('does not raise the undefined_value error when the setting is off', async () => {
		let caught: unknown;
		try {
			await runNode({});
		} catch (error) {
			caught = error;
		}

		// Resolution proceeds past the parameter and the node goes on to make its
		// request, which fails in this harness for unrelated reasons. What matters
		// is that no `undefined_value` error was raised.
		expect((caught as ExpressionError | undefined)?.context?.type).not.toBe('undefined_value');
	});
});
