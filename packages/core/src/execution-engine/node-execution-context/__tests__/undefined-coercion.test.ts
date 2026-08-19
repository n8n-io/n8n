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

/**
 * Case B of the `throwOnUndefinedExpression` node setting, seen from the read
 * point: `undefined` coerced into text *inside* an expression. The transform and
 * its engine parity are covered in
 * `packages/workflow/test/expression-undefined-coercion.test.ts`; this file pins
 * the wiring — which contexts opt in, and that the error survives the catch.
 */
/**
 * Two lint rules meet on a template-literal expression: `${` may not sit in a
 * quoted string, and a backtick string with no interpolation is rejected too.
 * Interpolating the path satisfies both.
 */
const templateExpression = (path: string) => `={{ \`Hello, \${${path}}\` }}`;

describe('throwOnUndefinedExpression — in-expression coercion', () => {
	const additionalData = mock<IWorkflowExecuteAdditionalData>({});
	const inputJson = { present: 'value', explicitUndefined: undefined, nullish: null };

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
		it('throws an ExpressionError of type undefined_coercion for `+`', () => {
			const context = buildContext(
				{ recipient: "={{ 'Hello, ' + $json.missing }}" },
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
			expect(expressionError.context.type).toBe('undefined_coercion');
			// The guard fires inside the evaluator, which has no parameter name;
			// `_getNodeParameter`'s catch stamps it on the way out.
			expect(expressionError.context.parameter).toBe('recipient');
		});

		it('throws for a template literal', () => {
			const context = buildContext(
				{ recipient: templateExpression('$json.missing') },
				{ throwOnUndefinedExpression: true },
			);

			expect(() => context.getNodeParameter('recipient', 0)).toThrow(ExpressionError);
		});

		it('throws for a key present with an explicit undefined value', () => {
			const context = buildContext(
				{ recipient: "={{ 'Hello, ' + $json.explicitUndefined }}" },
				{ throwOnUndefinedExpression: true },
			);

			expect(() => context.getNodeParameter('recipient', 0)).toThrow(ExpressionError);
		});

		it.each([
			['nullish coalescing', "={{ 'Hello, ' + ($json.missing ?? '') }}", 'Hello, '],
			['null', "={{ $json.nullish + ' x' }}", 'null x'],
			['numeric addition', '={{ 1 + $json.missing }}', NaN],
			['a resolved value', "={{ 'Hello, ' + $json.present }}", 'Hello, value'],
		])('does not throw for %s', (_label, expression, expected) => {
			const context = buildContext({ recipient: expression }, { throwOnUndefinedExpression: true });

			expect(context.getNodeParameter('recipient', 0)).toEqual(expected);
		});

		it('still throws for a Set node with continueOnFail (PAY-684 must not swallow it)', () => {
			const context = buildContext(
				{ recipient: "={{ 'Hello, ' + $json.missing }}" },
				{
					throwOnUndefinedExpression: true,
					type: 'n8n-nodes-base.set',
					continueOnFail: true,
				},
			);

			expect(() => context.getNodeParameter('recipient', 0)).toThrow(ExpressionError);
		});

		it('leaves the PAY-684 rescue intact for every other ExpressionError', () => {
			const context = buildContext(
				{ recipient: "={{ $('Nonexistent').first().json.x }}" },
				{
					throwOnUndefinedExpression: true,
					type: 'n8n-nodes-base.set',
					continueOnFail: true,
				},
			);

			expect(context.getNodeParameter('recipient', 0)).toEqual([
				{ name: undefined, value: undefined },
			]);
		});

		it('does not apply while loading options in the editor', () => {
			const node: INode = {
				id: 'test-node',
				name: 'Test Node',
				type: 'test.node',
				typeVersion: 1,
				position: [0, 0],
				parameters: { recipient: "={{ 'Hello, ' + $parameter['nothing'] }}" },
				throwOnUndefinedExpression: true,
			};
			const workflow = new Workflow({
				nodes: [node],
				connections: {},
				active: false,
				nodeTypes: nodeTypes(),
			});

			const context = new LoadOptionsContext(workflow, node, additionalData, '');

			expect(context.getNodeParameter('recipient')).toBe('Hello, undefined');
		});
	});

	describe('when the setting is off (the regression gate)', () => {
		it.each([
			['absent', {}],
			['explicitly false', { throwOnUndefinedExpression: false }],
		])('still emits the text "undefined" when the setting is %s', (_label, nodeOverrides) => {
			const context = buildContext(
				{ recipient: "={{ 'Hello, ' + $json.missing }}" },
				nodeOverrides,
			);

			expect(context.getNodeParameter('recipient', 0)).toBe('Hello, undefined');
		});

		it('still emits the text "undefined" from a template literal', () => {
			const context = buildContext({ recipient: templateExpression('$json.missing') });

			expect(context.getNodeParameter('recipient', 0)).toBe('Hello, undefined');
		});
	});

	/**
	 * Where case B reaches further than case A. Case A tests the whole resolved
	 * parameter, which for a collection is an object and so is never `undefined`
	 * (N8N-246). Case B instruments the expression, so it fires on the value
	 * nested inside — and the Set node is where `Hello, undefined` is usually
	 * assembled.
	 */
	describe('inside a collection parameter', () => {
		const collectionDescription: INodeTypeDescription = {
			displayName: 'Edit Fields',
			name: 'n8n-nodes-base.set',
			group: ['transform'],
			version: 1,
			description: '',
			defaults: {},
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			properties: [
				{
					displayName: 'Assignments',
					name: 'assignments',
					type: 'assignmentCollection',
					default: {},
				},
			],
		};

		const buildSetContext = (value: string, throwOnUndefinedExpression: boolean) => {
			const testNode: INode = {
				id: 'set-node',
				name: 'Edit Fields',
				type: 'n8n-nodes-base.set',
				typeVersion: 1,
				position: [0, 0],
				parameters: {
					assignments: {
						assignments: [{ id: 'a', name: 'recipient', value, type: 'string' }],
					},
				},
				throwOnUndefinedExpression,
			};

			const nodeType = mock<INodeType>();
			nodeType.description = collectionDescription;
			const workflow = new Workflow({
				nodes: [testNode],
				connections: {},
				active: false,
				nodeTypes: mock<INodeTypes>({
					getByNameAndVersion: () => nodeType,
					getByName: () => nodeType,
				}),
			});

			const connectionInputData = [{ json: inputJson }];
			const inputData: ITaskDataConnections = { main: [connectionInputData] };

			return new ExecuteContext(
				workflow,
				testNode,
				additionalData,
				'manual',
				createEmptyRunExecutionData(),
				0,
				connectionInputData,
				inputData,
				{ data: inputData, node: testNode, source: null } as IExecuteData,
				[],
			);
		};

		it('throws on coercion nested in an assignment when the setting is on', () => {
			const context = buildSetContext("={{ 'Hello, ' + $json.missing }}", true);

			let caught: unknown;
			try {
				context.getNodeParameter('assignments', 0);
			} catch (error) {
				caught = error;
			}

			expect(caught).toBeInstanceOf(ExpressionError);
			expect((caught as ExpressionError).context.type).toBe('undefined_coercion');
		});

		it('leaves the whole-value case alone — that is N8N-246, not case B', () => {
			const context = buildSetContext('={{ $json.missing }}', true);

			expect(context.getNodeParameter('assignments', 0)).toEqual({
				assignments: [{ id: 'a', name: 'recipient', type: 'string' }],
			});
		});

		it('still emits the text "undefined" when the setting is off', () => {
			const context = buildSetContext("={{ 'Hello, ' + $json.missing }}", false);

			expect(context.getNodeParameter('assignments', 0)).toEqual({
				assignments: [{ id: 'a', name: 'recipient', value: 'Hello, undefined', type: 'string' }],
			});
		});
	});
});
