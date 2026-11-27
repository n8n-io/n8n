import type { Logger } from '@n8n/backend-common';
import { UUID_V7_PATTERN } from '@n8n/constants';
import type { ErrorWorkflowSource } from '@n8n/engine';
import { OperationalError, UserError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { createErrorWorkflowResolver } from '../engine-error-workflow-resolver';
import type { EngineWorkflowResolveClient } from '../engine-workflow-resolve-client';
import type { ResolvedErrorWorkflow } from '../engine-workflow-resolve.contract';

const source: ErrorWorkflowSource = {
	executionId: '01a03900-0000-7000-8000-00000000000a',
	workflowId: 'failed-wf',
	workflow: { id: 'failed-wf', nodes: [] },
	hostMode: 'trigger',
	hasParent: false,
};

const resolved: ResolvedErrorWorkflow = {
	kind: 'error-workflow',
	workflowId: 'err-wf',
	graph: { nodes: [{ id: 't', name: 'Error Trigger', type: 'trigger' }], edges: [] },
	workflow: { id: 'err-wf' },
	triggerOutputs: [[{ json: { execution: { id: 'exec' } } }]],
	resolveErrorWorkflowOnFailure: true,
	projectId: 'failed-project',
};

describe('createErrorWorkflowResolver', () => {
	const client = mock<EngineWorkflowResolveClient>();
	const logger = mock<Logger>();
	const signal = new AbortController().signal;
	const resolve = createErrorWorkflowResolver(client, logger, signal);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('mints the execution id, asks for the error workflow, and returns a start', async () => {
		client.resolve.mockResolvedValue(resolved);

		const resolution = await resolve(source);

		expect(resolution).toEqual({
			kind: 'start',
			executionId: expect.stringMatching(UUID_V7_PATTERN),
			workflowId: 'err-wf',
			graph: resolved.graph,
			workflow: resolved.workflow,
			triggerOutputs: resolved.triggerOutputs,
			callerContext: { hostMode: 'error', projectId: 'failed-project' },
			resolveErrorWorkflowOnFailure: true,
		});
		const executionId = resolution.kind === 'start' ? resolution.executionId : undefined;
		expect(client.resolve).toHaveBeenCalledExactlyOnceWith(
			{ kind: 'error-workflow', executionId, source },
			expect.any(AbortSignal),
		);
	});

	it('aborts the request when the runtime stops', async () => {
		const stopping = new AbortController();
		client.resolve.mockResolvedValue(resolved);
		await createErrorWorkflowResolver(client, logger, stopping.signal)(source);
		const [, requestSignal] = client.resolve.mock.calls[0];

		stopping.abort();

		expect(requestSignal.aborted).toBe(true);
	});

	it('aborts a request that takes longer than the timeout, so the engine asks again later', async () => {
		client.resolve.mockImplementation(
			async (_request, requestSignal) =>
				await new Promise((_resolve, reject) => {
					requestSignal.addEventListener('abort', () => reject(new Error('aborted')));
				}),
		);

		await expect(createErrorWorkflowResolver(client, logger, signal, 10)(source)).rejects.toThrow(
			'aborted',
		);
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it('mints a new id for every try', async () => {
		client.resolve.mockResolvedValue(resolved);

		const first = await resolve(source);
		const second = await resolve(source);

		expect(first).not.toEqual(second);
	});

	it('answers none for a refusal that the caller can fix, so the engine stops asking', async () => {
		client.resolve.mockRejectedValue(new UserError('The settings name no error workflow'));

		await expect(resolve(source)).resolves.toEqual({
			kind: 'none',
			reason: 'The settings name no error workflow',
		});
	});

	it('logs a refusal as a warning, because no error execution runs', async () => {
		client.resolve.mockRejectedValue(new UserError('Control plane refused with 403'));

		await resolve(source);

		expect(logger.warn).toHaveBeenCalledExactlyOnceWith(
			'The error workflow of a failed execution did not start',
			{
				executionId: source.executionId,
				workflowId: 'failed-wf',
				reason: 'Control plane refused with 403',
			},
		);
	});

	it('throws any other failure, so the engine asks again later', async () => {
		const error = new OperationalError('Control plane refused with 503');
		client.resolve.mockRejectedValue(error);

		await expect(resolve(source)).rejects.toBe(error);
		expect(logger.warn).not.toHaveBeenCalled();
	});
});
