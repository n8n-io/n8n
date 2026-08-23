import type { GraphNode, NodeInstance } from '../../../types/base';
import type { PluginContext } from '../types';
import { executeWorkflowValidator } from './execute-workflow-validator';

function createMockNode(
	parameters: unknown,
	version = '1.2',
): NodeInstance<string, string, unknown> {
	return {
		type: 'n8n-nodes-base.executeWorkflow',
		name: 'Run Sub-workflow',
		version,
		config: { parameters },
	} as NodeInstance<string, string, unknown>;
}

function validate(parameters: unknown, version = '1.2') {
	const node = createMockNode(parameters, version);
	const graphNode: GraphNode = { instance: node, connections: new Map() };
	const ctx: PluginContext = {
		nodes: new Map([[node.name, graphNode]]),
		workflowId: 'test-workflow',
		workflowName: 'Test Workflow',
		settings: {},
	};

	return executeWorkflowValidator.validateNode(node, graphNode, ctx);
}

describe('executeWorkflowValidator', () => {
	describe('metadata', () => {
		it('targets Execute Workflow nodes at priority 40', () => {
			expect(executeWorkflowValidator).toEqual(
				expect.objectContaining({
					id: 'core:execute-workflow',
					name: 'Execute Workflow Validator',
					nodeTypes: ['n8n-nodes-base.executeWorkflow'],
					priority: 40,
				}),
			);
		});
	});

	describe('defineBelow mappings', () => {
		it.each([
			['null', null],
			['an array', []],
			['a string', 'order'],
			['a number', 1],
			['a boolean', true],
		])('rejects value when it is %s', (_description, value) => {
			const issues = validate({
				source: 'database',
				workflowInputs: { mappingMode: 'defineBelow', value },
			});

			expect(issues).toHaveLength(1);
			expect(issues[0]).toEqual(
				expect.objectContaining({
					code: 'EXECUTE_WORKFLOW_INVALID_INPUT_MAPPING',
					severity: 'error',
					violationLevel: 'major',
					nodeName: 'Run Sub-workflow',
					parameterPath: 'parameters.workflowInputs.value',
				}),
			);
		});

		it.each([
			['null', null],
			['an array', []],
			['a string', 'inputs'],
		])('rejects workflowInputs when it is %s', (_description, workflowInputs) => {
			const issues = validate({ source: 'database', workflowInputs });

			expect(issues).toHaveLength(1);
			expect(issues[0]?.code).toBe('EXECUTE_WORKFLOW_INVALID_INPUT_MAPPING');
		});

		it('allows workflowInputs to be omitted for sub-workflows that accept all data', () => {
			const issues = validate({ source: 'database' });

			expect(issues).toHaveLength(0);
		});

		it.each([
			['workflowInputs.value', { mappingMode: 'defineBelow' }],
			['mappingMode and value', {}],
		])('allows workflowInputs with omitted %s', (_description, workflowInputs) => {
			const issues = validate({ source: 'database', workflowInputs });

			expect(issues).toHaveLength(0);
		});

		it('treats an omitted mappingMode as defineBelow', () => {
			const issues = validate({
				source: 'database',
				workflowInputs: { value: null },
			});

			expect(issues).toHaveLength(1);
			expect(issues[0]?.code).toBe('EXECUTE_WORKFLOW_INVALID_INPUT_MAPPING');
		});

		it('includes the failing path and a complete valid mapping example', () => {
			const issues = validate({
				source: 'database',
				workflowInputs: { mappingMode: 'defineBelow', value: null },
			});

			expect(issues[0]?.message).toContain('parameters.workflowInputs.value');
			expect(issues[0]?.message).toContain('accepts all data');
			expect(issues[0]?.message).toContain('omit parameters.workflowInputs');
			expect(issues[0]?.message).toContain("orderId: expr('{{ $json.id }}')");
			expect(issues[0]?.message).toContain("amount: expr('{{ $json.total }}')");
			expect(issues[0]?.message).toContain("id: 'orderId'");
			expect(issues[0]?.message).toContain("type: 'string'");
			expect(issues[0]?.message).toContain("id: 'amount'");
			expect(issues[0]?.message).toContain("type: 'number'");
			expect(issues[0]?.message).toContain('matchingColumns: []');
		});

		it('allows a populated value object', () => {
			const issues = validate({
				source: 'database',
				workflowInputs: {
					mappingMode: 'defineBelow',
					value: {
						orderId: '={{ $json.id }}',
						amount: '={{ $json.total }}',
					},
					matchingColumns: [],
					schema: [
						{
							id: 'orderId',
							displayName: 'orderId',
							required: false,
							defaultMatch: false,
							display: true,
							canBeUsedToMatch: true,
							type: 'string',
						},
						{
							id: 'amount',
							displayName: 'amount',
							required: false,
							defaultMatch: false,
							display: true,
							canBeUsedToMatch: true,
							type: 'number',
						},
					],
					attemptToConvertTypes: false,
					convertFieldsToString: true,
				},
			});

			expect(issues).toHaveLength(0);
		});

		it('allows an empty value object for sub-workflows with no declared inputs', () => {
			const issues = validate({
				source: 'database',
				workflowInputs: { mappingMode: 'defineBelow', value: {} },
			});

			expect(issues).toHaveLength(0);
		});

		it('allows an omitted mappingMode when value is an object', () => {
			const issues = validate({
				source: 'database',
				workflowInputs: { value: { order: '={{ $json }}' } },
			});

			expect(issues).toHaveLength(0);
		});
	});

	describe('applicability', () => {
		it('treats an omitted source as database', () => {
			const issues = validate({
				workflowInputs: { mappingMode: 'defineBelow', value: null },
			});

			expect(issues).toHaveLength(1);
			expect(issues[0]?.code).toBe('EXECUTE_WORKFLOW_INVALID_INPUT_MAPPING');
		});

		it.each(['1', '1.1'])('skips legacy node version %s', (version) => {
			const issues = validate(
				{
					source: 'database',
					workflowInputs: { mappingMode: 'defineBelow', value: null },
				},
				version,
			);

			expect(issues).toHaveLength(0);
		});

		it('skips non-database sources', () => {
			const issues = validate({
				source: 'parameter',
				workflowInputs: { mappingMode: 'defineBelow', value: null },
			});

			expect(issues).toHaveLength(0);
		});

		it('skips mapping modes other than defineBelow', () => {
			const issues = validate({
				source: 'database',
				workflowInputs: { mappingMode: 'autoMapInputData', value: null },
			});

			expect(issues).toHaveLength(0);
		});
	});
});
