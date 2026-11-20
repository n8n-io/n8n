import type { Logger } from '@n8n/backend-common';
import type { INodeType, INodeTypeDescription } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { EphemeralNodeExecutor } from '@/node-execution/ephemeral-node-executor';
import type { NodeTypes } from '@/node-types';

import { LiveSourceUnavailableError } from '../live-source.errors';
import type { LiveRunContext } from '../live-source-provider';
import { NodeOperationAdapter } from '../node-operation-adapter';

const ctx: LiveRunContext = {
	projectId: 'project-1',
	principal: { kind: 'project' },
	sourceId: 'slack',
	credential: { id: 'cred-1', type: 'slackApi' },
	runId: 'run-1',
};

const operation = {
	nodeType: 'n8n-nodes-base.slack',
	nodeTypeVersion: 2.7,
	parameters: { resource: 'message', operation: 'search', query: 'rota' },
};

function makeAdapter() {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const executor = mock<EphemeralNodeExecutor>();
	const nodeTypes = mock<NodeTypes>();
	nodeTypes.getByNameAndVersion.mockReturnValue(
		mock<INodeType>({ description: mock<INodeTypeDescription>({ properties: [] }) }),
	);
	return { adapter: new NodeOperationAdapter(logger, executor, nodeTypes), executor };
}

describe('NodeOperationAdapter', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('tries a rate-limited operation again after a pause', async () => {
		const { adapter, executor } = makeAdapter();
		executor.executeInline
			.mockResolvedValueOnce({
				status: 'error',
				data: [],
				error: 'Slack error response: "ratelimited"',
			})
			.mockResolvedValueOnce({ status: 'success', data: [{ json: { content: 'Tuesday' } }] });

		const pending = adapter.execute(ctx, operation);
		await vi.advanceTimersByTimeAsync(5_000);

		await expect(pending).resolves.toEqual([{ content: 'Tuesday' }]);
		expect(executor.executeInline).toHaveBeenCalledTimes(2);
	});

	it('gives up after the last pause and reports the source as unavailable', async () => {
		const { adapter, executor } = makeAdapter();
		executor.executeInline.mockResolvedValue({
			status: 'error',
			data: [],
			error: 'Slack error response: "ratelimited"',
		});

		const pending = adapter.execute(ctx, operation);
		const outcome = pending.catch((error: unknown) => error);
		await vi.advanceTimersByTimeAsync(20_000);

		await expect(outcome).resolves.toBeInstanceOf(LiveSourceUnavailableError);
		expect(executor.executeInline).toHaveBeenCalledTimes(3);
	});

	it('does not try again after another failure', async () => {
		const { adapter, executor } = makeAdapter();
		executor.executeInline.mockResolvedValue({
			status: 'error',
			data: [],
			error: 'Authorization failed - please check your credentials',
		});

		await expect(adapter.execute(ctx, operation)).rejects.toThrow(LiveSourceUnavailableError);
		expect(executor.executeInline).toHaveBeenCalledTimes(1);
	});
});
