/**
 * Verifies how errors in WorkflowExecute decides what gets forwarded to ErrorReporter
 */

vi.mock('@n8n/di', () => ({
	Container: {
		get: vi.fn(),
	},
	Service: () => (target: unknown) => target,
}));

import { Container } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import {
	ApplicationError,
	NodeConnectionTypes,
	NodeOperationError,
	OperationalError,
	UnexpectedError,
	UserError,
	Workflow,
} from 'n8n-workflow';
import type {
	INodeType,
	INodeTypes,
	IWorkflowExecuteAdditionalData,
	IWorkflowSettings,
	IRun,
} from 'n8n-workflow';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { ExecutionLifecycleHooks } from '@/execution-engine/execution-lifecycle-hooks';

import { createNodeData } from '../partial-execution-utils/__tests__/helpers';
import { WorkflowExecute } from '../workflow-execute';

const mockContainer = Container as Mocked<typeof Container>;

function makeAdditionalData(
	waitPromise: ReturnType<typeof createDeferredPromise<IRun>>,
	overrides: Partial<IWorkflowExecuteAdditionalData> = {},
): IWorkflowExecuteAdditionalData {
	const hooks = new ExecutionLifecycleHooks('trigger', '1', mock());
	hooks.addHandler('workflowExecuteAfter', (fullRunData) => waitPromise.resolve(fullRunData));
	return mock<IWorkflowExecuteAdditionalData>({ hooks, ...overrides });
}

describe('WorkflowExecute node error forwarding to ErrorReporter', () => {
	let mockErrorReporter: { error: ReturnType<typeof vi.fn> };
	let mockNodeTypes: Mocked<INodeTypes>;
	let mockLogger: { error: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn> };
	let mockExecutionContextService: {
		augmentExecutionContextWithHooks: ReturnType<typeof vi.fn>;
		maybeBindExecutionId: ReturnType<typeof vi.fn>;
	};

	beforeEach(() => {
		vi.clearAllMocks();

		mockErrorReporter = { error: vi.fn() };
		mockLogger = { error: vi.fn(), warn: vi.fn() };

		// establishExecutionContext is called before any node runs and does
		// Container.get(ExecutionContextService).augmentExecutionContextWithHooks()
		// Without this the call throws and aborts the run
		mockExecutionContextService = {
			augmentExecutionContextWithHooks: vi.fn().mockResolvedValue({
				context: { version: 1, establishedAt: Date.now(), source: 'manual' },
				triggerItems: undefined,
			}),
			// establishExecutionContext also binds the execution id onto an already
			// established context; pass through so the run isn't aborted.
			maybeBindExecutionId: vi.fn(async (context) => context),
		};

		mockContainer.get.mockImplementation((token) => {
			const name = typeof token === 'function' ? token.name : token;
			if (name === 'ErrorReporter') return mockErrorReporter;
			if (name === 'Logger') return mockLogger;
			if (name === 'ExecutionContextService') return mockExecutionContextService;
			return { error: vi.fn(), warn: vi.fn() };
		});

		mockNodeTypes = mock<INodeTypes>();
	});

	/**
	 * Runs a workflow with a single node rejecting with `error`, then resolves
	 * once execution has finished. Wires the throwing node into mockNodeTypes and
	 * suppresses checkForWorkflowIssues
	 */
	async function runWorkflowThatThrows(
		error: unknown,
		additionalDataOverrides: Partial<IWorkflowExecuteAdditionalData> = {},
		workflowSettings: IWorkflowSettings = {},
	): Promise<IRun> {
		const nodeType = mock<INodeType>({
			description: {
				name: 'manualTrigger',
				displayName: 'Manual Trigger',
				defaultVersion: 1,
				properties: [],
				inputs: [],
				outputs: [{ type: NodeConnectionTypes.Main }],
			},
			execute: vi.fn().mockRejectedValue(error) as unknown as INodeType['execute'],
		});
		mockNodeTypes.getByNameAndVersion.mockReturnValue(nodeType);

		const triggerNode = createNodeData({
			name: 'ThrowingNode',
			type: 'n8n-nodes-base.manualTrigger',
		});
		const workflow = new Workflow({
			id: 'test-error',
			nodes: [triggerNode],
			connections: {},
			active: false,
			nodeTypes: mockNodeTypes,
			settings: workflowSettings,
		});

		const waitPromise = createDeferredPromise<IRun>();
		const additionalData = makeAdditionalData(waitPromise, additionalDataOverrides);
		const workflowExecute = new WorkflowExecute(additionalData, 'manual');

		vi.spyOn(
			workflowExecute as unknown as { checkForWorkflowIssues: () => void },
			'checkForWorkflowIssues',
		).mockImplementation(() => {});

		await workflowExecute.run({ workflow, startNode: triggerNode });
		return await waitPromise.promise;
	}

	function createAxiosError() {
		return Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:443'), {
			name: 'AxiosError',
			isAxiosError: true,
			code: 'ECONNREFUSED',
			config: {
				headers: { 'x-request-header': 'payload' },
				data: '{"requestField":"payload"}',
			},
			options: {
				headers: { 'x-request-header': 'payload' },
				data: '{"requestField":"payload"}',
			},
		});
	}

	it('should report a Error instance as class + stack only, without its message', async () => {
		const rawError = new Error('raw error message');

		await runWorkflowThatThrows(rawError);

		expect(mockErrorReporter.error).toHaveBeenCalledTimes(1);
		const [reported] = mockErrorReporter.error.mock.calls[0] as [Error];
		expect(reported).toBeInstanceOf(Error);
		expect(reported.message).not.toContain('raw error message');
		expect(reported.message).toBe('Error');
		expect(reported.stack).toBeDefined();
	});

	it('should report an ApplicationError wrapping a raw Error', async () => {
		const causeError = new Error('underlying third-party error');
		const wrappedError = new ApplicationError('wrapper', { cause: causeError });

		await runWorkflowThatThrows(wrappedError);

		expect(mockErrorReporter.error).toHaveBeenCalledWith(
			causeError,
			expect.objectContaining({
				extra: expect.objectContaining({
					nodeName: 'ThrowingNode',
					nodeType: 'n8n-nodes-base.manualTrigger',
					nodeVersion: expect.any(Number),
					workflowId: 'test-error',
				}),
			}),
		);
	});

	it.each([
		['UnexpectedError', new UnexpectedError('unexpected')],
		['OperationalError', new OperationalError('operational')],
		['UserError', new UserError('user')],
	])('should report a %s (BaseError subclass) as-is', async (_name, baseError) => {
		await runWorkflowThatThrows(baseError);

		expect(mockErrorReporter.error).toHaveBeenCalledTimes(1);
		const [reported] = mockErrorReporter.error.mock.calls[0] as [Error];
		expect(reported).toBe(baseError);
	});

	describe('when the run is redacted', () => {
		// The engine runs in manual mode here, so 'all' covers the run and
		// 'non-manual' does not.
		const redactAll: IWorkflowSettings = { redactionPolicy: 'all' };

		it('should report a BaseError as class + stack only, without its message', async () => {
			const baseError = new UnexpectedError('secret value');

			await runWorkflowThatThrows(baseError, {}, redactAll);

			expect(mockErrorReporter.error).toHaveBeenCalledTimes(1);
			const [reported] = mockErrorReporter.error.mock.calls[0] as [Error];
			expect(reported).not.toBe(baseError);
			expect(reported.name).toBe('UnexpectedError');
			expect(reported.message).toBe('UnexpectedError');
			expect(reported.stack).not.toContain('secret value');
			expect(reported.stack).toMatch(/^UnexpectedError\n\s+at /);
		});

		it('should label the report with the class when the error name was changed', async () => {
			const baseError = Object.assign(new UnexpectedError('secret value'), { name: 'secret name' });

			await runWorkflowThatThrows(baseError, {}, redactAll);

			const [reported] = mockErrorReporter.error.mock.calls[0] as [Error];
			expect(reported.name).toBe('UnexpectedError');
			expect(reported.message).toBe('UnexpectedError');
			expect(reported.stack).not.toContain('secret');
		});

		it('should not report a BaseError that must not reach Sentry', async () => {
			const baseError = new OperationalError('secret value');
			expect(baseError.shouldReport).toBe(false);

			await runWorkflowThatThrows(baseError, {}, redactAll);

			expect(mockErrorReporter.error).not.toHaveBeenCalled();
		});

		it('should not report a warning-level BaseError that Sentry would ignore', async () => {
			// `NodeOperationError` keeps `shouldReport` true while it sets `level` to
			// 'warning' after construction, so the level check must run here.
			const node = createNodeData({ name: 'ThrowingNode', type: 'n8n-nodes-base.manualTrigger' });
			const baseError = new NodeOperationError(node, 'secret value');
			expect(baseError.shouldReport).toBe(true);
			expect(baseError.level).toBe('warning');

			await runWorkflowThatThrows(baseError, {}, redactAll);

			expect(mockErrorReporter.error).not.toHaveBeenCalled();
		});

		it('should not report an ApplicationError whose cause is an axios error', async () => {
			const wrappedError = new ApplicationError('wrapper', { cause: createAxiosError() });

			await runWorkflowThatThrows(wrappedError, {}, redactAll);

			expect(mockErrorReporter.error).not.toHaveBeenCalled();
		});

		it('should not report an ApplicationError whose cause must not reach Sentry', async () => {
			const wrappedError = new ApplicationError('wrapper', {
				cause: new OperationalError('secret value'),
			});

			await runWorkflowThatThrows(wrappedError, {}, redactAll);

			expect(mockErrorReporter.error).not.toHaveBeenCalled();
		});

		it('should report the cause of an ApplicationError as class + stack only', async () => {
			const causeError = new Error('secret value');
			const wrappedError = new ApplicationError('wrapper', { cause: causeError });

			await runWorkflowThatThrows(wrappedError, {}, redactAll);

			expect(mockErrorReporter.error).toHaveBeenCalledTimes(1);
			const [reported] = mockErrorReporter.error.mock.calls[0] as [Error];
			expect(reported).not.toBe(causeError);
			expect(reported.message).toBe('Error');
			expect(reported.stack).not.toContain('secret value');
		});

		it('should report a BaseError as-is when the policy does not cover the run mode', async () => {
			const baseError = new UnexpectedError('visible value');

			await runWorkflowThatThrows(baseError, {}, { redactionPolicy: 'non-manual' });

			const [reported] = mockErrorReporter.error.mock.calls[0] as [Error];
			expect(reported).toBe(baseError);
		});
	});

	it('should not report an axios error', async () => {
		const axiosError = Object.assign(new Error('connect ECONNREFUSED 127.0.0.1:443'), {
			name: 'AxiosError',
			isAxiosError: true,
		});

		await runWorkflowThatThrows(axiosError);

		expect(mockErrorReporter.error).not.toHaveBeenCalled();
	});

	it('should store unhandled axios errors as NodeApiError', async () => {
		const run = await runWorkflowThatThrows(createAxiosError());
		const nodeError = run.data.resultData.runData.ThrowingNode[0].error;
		const resultError = run.data.resultData.error;

		expect(nodeError?.name).toBe('NodeApiError');
		expect(resultError?.name).toBe('NodeApiError');
	});

	it('should omit axios config from stored errors', async () => {
		const run = await runWorkflowThatThrows(createAxiosError());
		const nodeError = run.data.resultData.runData.ThrowingNode[0].error;
		const resultError = run.data.resultData.error;

		expect(nodeError).not.toHaveProperty('config');
		expect(resultError).not.toHaveProperty('config');
	});

	it('should omit legacy request options from stored errors', async () => {
		const run = await runWorkflowThatThrows(createAxiosError());
		const nodeError = run.data.resultData.runData.ThrowingNode[0].error;
		const resultError = run.data.resultData.error;

		expect(nodeError).not.toHaveProperty('options');
		expect(resultError).not.toHaveProperty('options');
	});

	it('should omit request values from serialized execution errors', async () => {
		const run = await runWorkflowThatThrows(createAxiosError());

		expect(JSON.stringify(run.data.resultData)).not.toContain('payload');
	});

	it('should not report an ApplicationError with no cause', async () => {
		const plainAppError = new ApplicationError('plain operational error', { level: 'error' });

		await runWorkflowThatThrows(plainAppError);

		expect(mockErrorReporter.error).not.toHaveBeenCalled();
	});

	it('should forward an error to Sentry with no message', async () => {
		const payloadError = new Error('Failed to parse: {"key":"value"}');

		await runWorkflowThatThrows(payloadError);

		expect(mockErrorReporter.error).toHaveBeenCalledTimes(1);
		const [reported] = mockErrorReporter.error.mock.calls[0] as [Error];
		expect(reported.message).not.toContain('Failed to parse');
		expect(reported.message).not.toContain('"value"');
	});

	it('should strip the message from the reported stack', async () => {
		const payloadError = new Error('Failed to parse: {"key1":"single-line-value"}');

		await runWorkflowThatThrows(payloadError);

		const [reported] = mockErrorReporter.error.mock.calls[0] as [Error];
		expect(reported.stack).toBeDefined();
		expect(reported.stack).not.toContain('Failed to parse');
		expect(reported.stack).not.toContain('single-line-value');
	});

	it('should strip a multi-line message from the reported stack', async () => {
		const payloadError = new Error('Failed to parse. Text: first-value\nMore text: second-value');

		await runWorkflowThatThrows(payloadError);

		const [reported] = mockErrorReporter.error.mock.calls[0] as [Error];
		expect(reported.stack).toBeDefined();
		expect(reported.stack).not.toContain('first-value');
		expect(reported.stack).not.toContain('second-value');
		expect(reported.stack).toContain('at '); // call frame
	});

	it('should include executionId and a deep-link executionUrl when both are available', async () => {
		const baseError = new UnexpectedError('boom');

		await runWorkflowThatThrows(baseError, {
			executionId: 'exec-42',
			instanceBaseUrl: 'https://n8n.example.com/',
		});

		expect(mockErrorReporter.error).toHaveBeenCalledWith(
			baseError,
			expect.objectContaining({
				extra: expect.objectContaining({
					executionId: 'exec-42',
					workflowId: 'test-error',
					executionUrl: 'https://n8n.example.com/workflow/test-error/executions/exec-42',
				}),
			}),
		);
	});

	it('should omit executionUrl when instanceBaseUrl is not known', async () => {
		const baseError = new UnexpectedError('boom');

		await runWorkflowThatThrows(baseError, {
			executionId: 'exec-42',
			instanceBaseUrl: '',
		});

		const [, options] = mockErrorReporter.error.mock.calls[0] as [Error, { extra: object }];
		expect(options.extra).toMatchObject({ executionId: 'exec-42' });
		expect((options.extra as { executionUrl?: string }).executionUrl).toBeUndefined();
	});
});
