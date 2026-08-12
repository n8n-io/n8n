import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { IDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodeType,
	INodeTypes,
	IRun,
	IVersionedNodeType,
	IWorkflowExecuteAdditionalData,
	OnError,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError, Workflow } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ExecutionLifecycleHooks } from '../execution-lifecycle-hooks';
import { WorkflowExecute } from '../workflow-execute';

/**
 * Acceptance criteria 18 and 19 of `throwOnUndefinedExpression`: the spec chose
 * to add no special handling, so `On Error` and `Retry On Fail` must behave
 * exactly as they do for any other node error. Nothing else in the feature's
 * tests runs a whole workflow, so a bypass added later would go unnoticed —
 * these run one.
 *
 * Node types are declared here rather than taken from `@test/helpers` so the
 * suite does not depend on a built `nodes-base`.
 */
describe('throwOnUndefinedExpression — On Error and Retry On Fail', () => {
	const executeSpy = vi.fn();
	/** Control arm: an ordinary node failure, to compare the new error against. */
	let controlFailure = false;

	const sourceNodeType: INodeType = {
		description: {
			displayName: 'Source',
			name: 'source',
			group: ['trigger'],
			version: 1,
			description: '',
			defaults: { name: 'Source' },
			inputs: [],
			outputs: [NodeConnectionTypes.Main],
			properties: [],
		},
		async execute(): Promise<INodeExecutionData[][]> {
			return [[{ json: { present: 'value' } }]];
		},
	};

	const targetNodeType: INodeType = {
		description: {
			displayName: 'Target',
			name: 'target',
			group: ['transform'],
			version: 1,
			description: '',
			defaults: { name: 'Target' },
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			properties: [{ displayName: 'Recipient', name: 'recipient', type: 'string', default: '' }],
		},
		async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
			executeSpy();
			if (controlFailure) throw new NodeOperationError(this.getNode(), 'control failure');
			// A node reads its parameters; that read is where the guard fires.
			const recipient = this.getNodeParameter('recipient', 0);
			return [[{ json: { recipient } as IDataObject }]];
		},
	};

	const downstreamNodeType: INodeType = {
		description: {
			displayName: 'Downstream',
			name: 'downstream',
			group: ['transform'],
			version: 1,
			description: '',
			defaults: { name: 'Downstream' },
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			properties: [],
		},
		async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
			return [this.getInputData()];
		},
	};

	const byName: Record<string, INodeType> = {
		'test.source': sourceNodeType,
		'test.target': targetNodeType,
		'test.downstream': downstreamNodeType,
	};

	const nodeTypes: INodeTypes = {
		getByName: (type: string): INodeType | IVersionedNodeType => byName[type],
		getByNameAndVersion: (type: string): INodeType => byName[type],
		getKnownTypes: () => ({}),
	};

	const additionalData = (waitPromise: IDeferredPromise<IRun>): IWorkflowExecuteAdditionalData => {
		const hooks = new ExecutionLifecycleHooks('trigger', '1', mock());
		hooks.addHandler('workflowExecuteAfter', (fullRunData) => waitPromise.resolve(fullRunData));
		return mock<IWorkflowExecuteAdditionalData>({
			hooks,
			currentNodeExecutionIndex: 0,
			webhookWaitingBaseUrl: 'http://localhost:5678/webhook-waiting',
			formWaitingBaseUrl: 'http://localhost:5678/form-waiting',
			restartExecutionId: undefined,
			encryptedRunnerIdentity: undefined,
		});
	};

	/** `{{ $json.missing }}` is case A, `{{ 'Hi ' + $json.missing }}` is case B. */
	const CASES = [
		['undefined_value', '={{ $json.missing }}'],
		['undefined_coercion', "={{ 'Hi ' + $json.missing }}"],
	] as const;

	const runWorkflow = async (options: {
		expression: string;
		onError?: OnError;
		retryOnFail?: boolean;
		maxTries?: number;
		throwOnUndefinedExpression?: boolean;
		control?: boolean;
	}) => {
		controlFailure = options.control === true;
		const source: INode = {
			id: 'source',
			name: 'Source',
			type: 'test.source',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
		const target: INode = {
			id: 'target',
			name: 'Target',
			type: 'test.target',
			typeVersion: 1,
			position: [200, 0],
			parameters: { recipient: options.expression },
			throwOnUndefinedExpression: options.throwOnUndefinedExpression ?? true,
			...(options.onError ? { onError: options.onError } : {}),
			...(options.retryOnFail
				? { retryOnFail: true, maxTries: options.maxTries ?? 3, waitBetweenTries: 0 }
				: {}),
		};
		const downstream: INode = {
			id: 'downstream',
			name: 'Downstream',
			type: 'test.downstream',
			typeVersion: 1,
			position: [400, 0],
			parameters: {},
		};

		const toDownstream = [{ node: 'Downstream', type: NodeConnectionTypes.Main, index: 0 }];
		const workflow = new Workflow({
			id: 'test',
			nodes: [source, target, downstream],
			connections: {
				Source: { main: [[{ node: 'Target', type: NodeConnectionTypes.Main, index: 0 }]] },
				Target: {
					main: options.onError === 'continueErrorOutput' ? [[], toDownstream] : [toDownstream],
				},
			},
			active: false,
			nodeTypes,
		});

		const waitPromise = createDeferredPromise<IRun>();
		const workflowExecute = new WorkflowExecute(additionalData(waitPromise), 'manual');
		await workflowExecute.run({ workflow, startNode: source });
		return await waitPromise.promise;
	};

	beforeEach(() => {
		executeSpy.mockClear();
		controlFailure = false;
	});

	/** The shape AC 18 is about: where the run ended up and what got data. */
	const shapeOf = (result: IRun) => ({
		status: result.status,
		hasWorkflowError: result.data.resultData.error !== undefined,
		targetHasError: result.data.resultData.runData.Target?.[0]?.error !== undefined,
		targetOutputs: result.data.resultData.runData.Target?.[0]?.data?.main.map(
			(output) => output?.length ?? null,
		),
		downstreamRan: result.data.resultData.runData.Downstream !== undefined,
	});

	describe.each(CASES)('%s', (_type, expression) => {
		it('stops the workflow by default', async () => {
			const result = await runWorkflow({ expression });

			expect(result.status).toBe('error');
			expect(result.data.resultData.error).toBeDefined();
			expect(result.data.resultData.lastNodeExecuted).toBe('Target');
			expect(result.data.resultData.runData.Downstream).toBeUndefined();
		});

		it('continues past the failure with continueRegularOutput', async () => {
			const result = await runWorkflow({ expression, onError: 'continueRegularOutput' });

			expect(result.status).toBe('success');
			expect(result.data.resultData.error).toBeUndefined();
			expect(result.data.resultData.runData.Target[0].error).toBeDefined();
			expect(result.data.resultData.runData.Downstream).toBeDefined();
		});

		it.each(['stopWorkflow', 'continueRegularOutput', 'continueErrorOutput'] as const)(
			'behaves like any other node error under onError=%s',
			async (onError) => {
				// AC 18 says "applies as it does to any node error", so the control is
				// an ordinary NodeOperationError through the identical workflow.
				const control = await runWorkflow({ expression, onError, control: true });
				const actual = await runWorkflow({ expression, onError });

				expect(shapeOf(actual)).toEqual(shapeOf(control));
			},
		);

		it('retries the configured number of times and then fails deterministically', async () => {
			const result = await runWorkflow({ expression, retryOnFail: true, maxTries: 3 });

			// The input item does not change between tries, so every try fails the
			// same way — no infinite loop, no swallowed error.
			expect(executeSpy).toHaveBeenCalledTimes(3);
			expect(result.status).toBe('error');
			expect(result.data.resultData.error).toBeDefined();
		});

		it('neither fails nor retries when the setting is off', async () => {
			const result = await runWorkflow({
				expression,
				retryOnFail: true,
				maxTries: 3,
				throwOnUndefinedExpression: false,
			});

			expect(executeSpy).toHaveBeenCalledTimes(1);
			expect(result.status).toBe('success');
			expect(result.data.resultData.runData.Downstream).toBeDefined();
		});
	});
});
