import type { EngineV2Reason } from '@n8n/workflow-engine-check';

import { formatEngineV2Message, isEngineV2NodeSettingCode } from './engine-v2-support';
import { validateWorkflow, type ValidationError } from './validate-workflow';
import { validateWorkflowBuilder } from './validate-workflow-builder';
import type { NodeJSON, WorkflowJSON, WorkflowSettings } from '../types/base';

const trigger: NodeJSON = {
	id: 'trigger-id',
	name: 'Trigger',
	type: 'n8n-nodes-base.manualTrigger',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

function node(overrides: Partial<NodeJSON>): NodeJSON {
	return {
		id: 'node-id',
		name: 'Fetch Orders',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 4.2,
		position: [200, 0],
		parameters: { url: 'https://example.com' },
		...overrides,
	};
}

/** Trigger -> target over `main`, plus any extra nodes and connections. */
function workflowJson(
	target: NodeJSON,
	settings: WorkflowSettings = {},
	extra: Pick<WorkflowJSON, 'nodes' | 'connections'> = { nodes: [], connections: {} },
): WorkflowJSON {
	return {
		name: 'Test',
		nodes: [trigger, target, ...extra.nodes],
		connections: {
			Trigger: { main: [[{ node: target.name ?? '', type: 'main', index: 0 }]] },
			...extra.connections,
		},
		settings,
	};
}

function engineErrors(errors: ValidationError[]): ValidationError[] {
	return errors.filter((error) => error.code.startsWith('ENGINE_V2_'));
}

const V1_FALLBACK = "set `engineType: 'v1'` in the workflow settings.";

describe('engine v2 support validation', () => {
	describe('isEngineV2NodeSettingCode', () => {
		it('accepts the node setting codes', () => {
			expect(isEngineV2NodeSettingCode('EXECUTE_ONCE')).toBe(true);
			expect(isEngineV2NodeSettingCode('ALWAYS_OUTPUT_DATA')).toBe(true);
		});

		it('rejects other codes and inherited object keys', () => {
			expect(isEngineV2NodeSettingCode('COMMUNITY_NODE')).toBe(false);
			expect(isEngineV2NodeSettingCode('toString')).toBe(false);
			expect(isEngineV2NodeSettingCode('constructor')).toBe(false);
		});
	});

	describe('engine selection', () => {
		const json = workflowJson(node({ retryOnFail: true }));

		it('does not check engine v2 when the workflow has no engineType', () => {
			const result = validateWorkflow(json);

			expect(engineErrors(result.errors)).toEqual([]);
		});

		it('does not change v1 validation', () => {
			const withoutEngine = validateWorkflow(json);
			const onV1 = validateWorkflow(json, { engine: 'v1' });
			const onV1Settings = validateWorkflow(
				workflowJson(node({ retryOnFail: true }), {
					engineType: 'v1',
				}),
			);

			expect(onV1).toEqual(withoutEngine);
			expect(onV1Settings).toEqual(withoutEngine);
			expect(withoutEngine.valid).toBe(true);
		});

		it("checks engine v2 when the workflow's settings.engineType is v2", () => {
			const result = validateWorkflow(
				workflowJson(node({ retryOnFail: true }), { engineType: 'v2' }),
			);

			expect(result.valid).toBe(false);
			expect(engineErrors(result.errors).map((error) => error.code)).toEqual([
				'ENGINE_V2_RETRY_ON_FAIL',
			]);
		});

		it('uses the engine option for a workflow without engineType', () => {
			expect(engineErrors(validateWorkflow(json, { engine: 'v2' }).errors)).toHaveLength(1);
		});

		it('lets settings.engineType win over the engine option', () => {
			const v2Workflow = workflowJson(node({ retryOnFail: true }), { engineType: 'v2' });
			const v1Workflow = workflowJson(node({ retryOnFail: true }), { engineType: 'v1' });

			// The messages tell the builder to set engineType v1, so doing that must clear them.
			expect(engineErrors(validateWorkflow(v1Workflow, { engine: 'v2' }).errors)).toEqual([]);
			expect(engineErrors(validateWorkflow(v2Workflow, { engine: 'v1' }).errors)).toHaveLength(1);
		});

		it('passes the engine option through validateWorkflowBuilder', () => {
			const builder = {
				validate: () => ({ valid: true, errors: [], warnings: [] }),
				toJSON: () => workflowJson(node({ executeOnce: true })),
			};

			expect(validateWorkflowBuilder(builder).ok).toBe(true);
			const onV2 = validateWorkflowBuilder(builder, { engine: 'v2' });
			expect(onV2.ok).toBe(false);
			expect(onV2.blocking.map((issue) => issue.code)).toContain('ENGINE_V2_EXECUTE_ONCE');
		});
	});

	describe('v2 alternatives', () => {
		it.each([
			[
				'RETRY_ON_FAIL',
				{ retryOnFail: true },
				'`Fetch Orders`: engine v2 does not support Retry On Fail yet. Remove `retryOnFail`. ' +
					"To continue after a failure, set `onError: 'continueRegularOutput'` and check the result with an IF node. " +
					`If the workflow must retry, ${V1_FALLBACK}`,
			],
			[
				'CONTINUE_ERROR_OUTPUT',
				{ onError: 'continueErrorOutput' },
				"`Fetch Orders`: engine v2 does not support the error output (`onError: 'continueErrorOutput'`) yet. " +
					"Set `onError: 'continueRegularOutput'` and connect an IF node that checks for the `error` field in the output. " +
					`If the workflow must have a separate error output, ${V1_FALLBACK}`,
			],
			[
				'EXECUTE_ONCE',
				{ executeOnce: true },
				'`Fetch Orders`: engine v2 does not support Execute Once yet. Remove `executeOnce`. ' +
					'To use only the first item, add a Limit node (1 item) before this node. ' +
					'To use all items in one run, add an Aggregate node before this node. The Aggregate node combines the items into one item, so update the expressions of this node. ' +
					`If the workflow must use Execute Once, ${V1_FALLBACK}`,
			],
			[
				'ALWAYS_OUTPUT_DATA',
				{ alwaysOutputData: true },
				'`Fetch Orders`: engine v2 does not support Always Output Data yet. Remove `alwaysOutputData`. ' +
					'Make sure that the workflow can stop at this node when the node returns no items. ' +
					`If the next nodes must run when this node returns no items, ${V1_FALLBACK}`,
			],
		] as const)('reports %s with its v2 alternative', (code, options, message) => {
			const result = validateWorkflow(workflowJson(node(options)), { engine: 'v2' });

			expect(engineErrors(result.errors)).toEqual([
				expect.objectContaining({ code: `ENGINE_V2_${code}`, nodeName: 'Fetch Orders', message }),
			]);
		});

		it('reports every blocking reason of a node', () => {
			const result = validateWorkflow(
				workflowJson(node({ retryOnFail: true, executeOnce: true, alwaysOutputData: true })),
				{ engine: 'v2' },
			);

			expect(engineErrors(result.errors).map((error) => error.code)).toEqual([
				'ENGINE_V2_RETRY_ON_FAIL',
				'ENGINE_V2_ALWAYS_OUTPUT_DATA',
				'ENGINE_V2_EXECUTE_ONCE',
			]);
		});

		it("accepts onError: 'continueRegularOutput'", () => {
			const result = validateWorkflow(workflowJson(node({ onError: 'continueRegularOutput' })), {
				engine: 'v2',
			});

			expect(engineErrors(result.errors)).toEqual([]);
		});
	});

	describe('default message for each reason kind', () => {
		it('tells the builder to use engine v1 for a temporary reason', () => {
			const form = node({
				name: 'Form',
				type: 'n8n-nodes-base.form',
				typeVersion: 1,
				parameters: {},
			});

			const [error] = engineErrors(validateWorkflow(workflowJson(form), { engine: 'v2' }).errors);

			expect(error.code).toBe('ENGINE_V2_FORM_NODE');
			expect(error.nodeName).toBe('Form');
			expect(error.message).toBe(
				`Engine v2 does not run the "Form" node yet. Run this workflow on engine v1 for now. To do this, ${V1_FALLBACK}`,
			);
		});

		it('gives the reason text alone for a permanent reason', () => {
			const merge = node({
				name: 'Merge',
				type: 'n8n-nodes-base.merge',
				typeVersion: 3,
				parameters: { mode: '={{ "append" }}' },
			});

			const errors = engineErrors(validateWorkflow(workflowJson(merge), { engine: 'v2' }).errors);
			const error = errors.find((e) => e.code === 'ENGINE_V2_MERGE_MODE_EXPRESSION');

			expect(error?.message).toBe(
				'The "Merge" node sets its Merge mode with an expression. Engine v2 needs the mode before the workflow runs. Use a fixed mode.',
			);
		});

		it('says that engine v1 does not help for an invalid reason', () => {
			const loop = node({
				name: 'Loop',
				type: 'n8n-nodes-base.splitInBatches',
				typeVersion: 3,
				parameters: { batchSize: 0 },
			});
			const body = node({
				id: 'body-id',
				name: 'Body',
				type: 'n8n-nodes-base.noOp',
				typeVersion: 1,
			});

			const errors = engineErrors(
				validateWorkflow(
					workflowJson(
						loop,
						{},
						{
							nodes: [body],
							connections: {
								Loop: { main: [[], [{ node: 'Body', type: 'main', index: 0 }]] },
								Body: { main: [[{ node: 'Loop', type: 'main', index: 0 }]] },
							},
						},
					),
					{ engine: 'v2' },
				).errors,
			);
			const error = errors.find((e) => e.code === 'ENGINE_V2_SPLIT_IN_BATCHES_BATCH_SIZE');

			expect(error?.message).toBe(
				'The "Loop" node needs a batch size that is a whole number of at least 1. Engine v1 cannot run this workflow either.',
			);
		});

		it('leaves out the node name for a workflow-level reason', () => {
			const result = validateWorkflow(
				workflowJson(node({}), { errorWorkflow: 'error-workflow-id' }),
				{ engine: 'v2' },
			);

			const [error] = engineErrors(result.errors);
			expect(error.code).toBe('ENGINE_V2_ERROR_WORKFLOW');
			expect(error.nodeName).toBeUndefined();
			expect(error.message).toBe(
				`Engine v2 does not run error workflows yet. Run this workflow on engine v1 for now. To do this, ${V1_FALLBACK}`,
			);
		});

		it.each([
			['temporary', 'Run this workflow on engine v1 for now.', `To do this, ${V1_FALLBACK}`],
			['permanent', 'Use a fixed mode.', 'Use a fixed mode.'],
			['invalid', 'Use a whole number.', 'Engine v1 cannot run this workflow either.'],
		] as const)('formats a %s reason', (kind, problem, ending) => {
			const reason: EngineV2Reason = {
				code: 'NESTED_LOOP',
				kind,
				severity: 'blocking',
				nodeName: 'Node',
				message: problem,
			};

			const message = formatEngineV2Message(reason);

			expect(message.startsWith(`\`Node\`: ${problem}`)).toBe(true);
			expect(message.endsWith(ending)).toBe(true);
		});

		it('does not repeat a node name that the reason text already gives', () => {
			const message = formatEngineV2Message({
				code: 'NESTED_LOOP',
				kind: 'permanent',
				severity: 'blocking',
				nodeName: 'Node',
				message: 'The "Node" node is nested.',
			});

			expect(message).toBe('The "Node" node is nested.');
		});
	});

	it('passes every workflow setting to the check', () => {
		const result = validateWorkflow(
			workflowJson(node({}), { credentialResolverId: 'resolver-id' }),
			{ engine: 'v2' },
		);

		expect(engineErrors(result.errors).map((error) => error.code)).toEqual([
			'ENGINE_V2_END_USER_CREDENTIALS',
		]);
	});

	it('does not report nodes that no trigger reaches', () => {
		const json = workflowJson(node({}));
		json.nodes.push(node({ id: 'other-id', name: 'Unused', retryOnFail: true }));

		expect(engineErrors(validateWorkflow(json, { engine: 'v2' }).errors)).toEqual([]);
	});
});
