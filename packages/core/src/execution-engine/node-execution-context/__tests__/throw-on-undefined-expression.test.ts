import type {
	IExecuteData,
	INode,
	INodeParameters,
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

import { ExecuteContext } from '../execute-context';
import { LoadOptionsContext } from '../load-options-context';
import { LoadWorkflowNodeContext } from '../workflow-node-context';

/**
 * Covers the `throwOnUndefinedExpression` node setting for the programmatic
 * resolution path. Declarative (`routing:`) nodes reach the same guard through
 * `ExecuteSingleContext` — see `__tests__/routing-node-undefined-expression.test.ts`.
 */
describe('throwOnUndefinedExpression', () => {
	const additionalData = mock<IWorkflowExecuteAdditionalData>({});
	const inputJson = { present: 'value', explicitUndefined: undefined, nullish: null };

	// `Workflow` drops parameters the node type does not declare, so `recipient` has to
	// exist on the description. The description is a plain object rather than a `mock()`:
	// a mock proxy makes `noDataExpression` truthy, which strips the `=` off expressions.
	const description: INodeTypeDescription = {
		displayName: 'Test Node',
		name: 'test.node',
		group: ['transform'],
		version: 1,
		description: '',
		defaults: {},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		properties: [{ displayName: 'Recipient', name: 'recipient', type: 'string', default: '' }],
	};

	const nodeTypes = () => {
		const nodeType = mock<INodeType>();
		nodeType.description = description;
		return mock<INodeTypes>({
			getByNameAndVersion: () => nodeType,
			getByName: () => nodeType,
		});
	};

	const buildContext = (parameters: INodeParameters, node?: Partial<INode>) => {
		const testNode: INode = {
			id: 'test-node',
			name: 'Test Node',
			type: 'test.node',
			typeVersion: 1,
			position: [0, 0],
			parameters,
			...node,
		};

		const workflow = new Workflow({
			nodes: [testNode],
			connections: {},
			active: false,
			nodeTypes: nodeTypes(),
		});

		const runExecutionData: IRunExecutionData = createEmptyRunExecutionData();
		const connectionInputData = [{ json: inputJson }];
		const inputData: ITaskDataConnections = { main: [connectionInputData] };
		const executeData = { data: inputData, node: testNode, source: null } as IExecuteData;

		return new ExecuteContext(
			workflow,
			testNode,
			additionalData,
			'manual',
			runExecutionData,
			0,
			connectionInputData,
			inputData,
			executeData,
			[],
		);
	};

	describe('when the setting is on', () => {
		it('throws an ExpressionError of type undefined_value for a missing key', () => {
			const context = buildContext(
				{ recipient: '={{ $json.missing }}' },
				{ throwOnUndefinedExpression: true },
			);

			let caught: unknown;
			try {
				context.getNodeParameter('recipient', 0);
			} catch (error) {
				caught = error;
			}

			expect(caught).toBeInstanceOf(ExpressionError);
			const expressionError = caught as ExpressionError;
			expect(expressionError.context.type).toBe('undefined_value');
			// The message must name the offending parameter so the NDV is actionable.
			expect(expressionError.message).toContain('recipient');
			expect(expressionError.context.parameter).toBe('recipient');
		});

		it('throws for a key that is present with an explicit undefined value', () => {
			const context = buildContext(
				{ recipient: '={{ $json.explicitUndefined }}' },
				{ throwOnUndefinedExpression: true },
			);

			expect(() => context.getNodeParameter('recipient', 0)).toThrow(ExpressionError);
		});

		it.each([
			['null', '={{ $json.nullish }}', null],
			['empty string', "={{ '' }}", ''],
			['zero', '={{ 0 }}', 0],
			['false', '={{ false }}', false],
			['a resolved value', '={{ $json.present }}', 'value'],
		])('does not throw for %s', (_label, expression, expected) => {
			const context = buildContext({ recipient: expression }, { throwOnUndefinedExpression: true });

			expect(context.getNodeParameter('recipient', 0)).toBe(expected);
		});

		it('does not throw for NaN', () => {
			const context = buildContext(
				{ recipient: '={{ 1 + $json.missing }}' },
				{ throwOnUndefinedExpression: true },
			);

			expect(context.getNodeParameter('recipient', 0)).toBeNaN();
		});

		it('leaves surrounding-text templates alone — they resolve to "" today', () => {
			// Documented gap: interpolation already coerces undefined to '' in shared
			// codegen, so this stays untouched. See N8N-245 for in-expression coercion.
			const context = buildContext(
				{ recipient: '=Hello, {{ $json.missing }}' },
				{ throwOnUndefinedExpression: true },
			);

			expect(context.getNodeParameter('recipient', 0)).toBe('Hello, ');
		});

		it('still throws for a Set node with continueOnFail (PAY-684 must not swallow it)', () => {
			const context = buildContext(
				{ recipient: '={{ $json.missing }}' },
				{
					throwOnUndefinedExpression: true,
					type: 'n8n-nodes-base.set',
					continueOnFail: true,
				},
			);

			expect(() => context.getNodeParameter('recipient', 0)).toThrow(ExpressionError);
		});

		it('does not apply while loading options in the editor', () => {
			const node: INode = {
				id: 'test-node',
				name: 'Test Node',
				type: 'test.node',
				typeVersion: 1,
				position: [0, 0],
				parameters: { recipient: "={{ $parameter['nothing'] }}" },
				throwOnUndefinedExpression: true,
			};
			const workflow = new Workflow({
				nodes: [node],
				connections: {},
				active: false,
				nodeTypes: nodeTypes(),
			});

			const context = new LoadOptionsContext(workflow, node, additionalData, '');

			expect(context.getNodeParameter('recipient')).toBeUndefined();
		});

		// The opt-out is a subclass field, so it only takes effect after the base
		// constructor has run. `LoadOptionsContext` above is the sibling case;
		// this one had the field but no test.
		it.each([
			['a whole undefined value', "={{ $parameter['nothing'] }}", undefined],
			['in-expression coercion', "={{ 'Hello, ' + $parameter['nothing'] }}", 'Hello, undefined'],
		])('does not apply to sub-workflow node resolution — %s', (_label, expression, expected) => {
			const node: INode = {
				id: 'test-node',
				name: 'Test Node',
				type: 'test.node',
				typeVersion: 1,
				position: [0, 0],
				parameters: { recipient: expression },
				throwOnUndefinedExpression: true,
			};
			const workflow = new Workflow({
				nodes: [node],
				connections: {},
				active: false,
				nodeTypes: nodeTypes(),
			});

			const context = new LoadWorkflowNodeContext(workflow, node, additionalData);

			expect(context.getNodeParameter('recipient', 0)).toBe(expected);
		});
	});

	describe('when the setting is off (the regression gate)', () => {
		it.each([
			['absent', {}],
			['explicitly false', { throwOnUndefinedExpression: false }],
		])('returns undefined without throwing when the setting is %s', (_label, nodeOverrides) => {
			const context = buildContext({ recipient: '={{ $json.missing }}' }, nodeOverrides);

			expect(context.getNodeParameter('recipient', 0)).toBeUndefined();
		});
	});
});
