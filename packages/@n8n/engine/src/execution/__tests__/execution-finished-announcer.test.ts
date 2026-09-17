import { describe, expect, it, vi } from 'vitest';

import type { GraphNode, WorkflowGraph } from '../../graph';
import type { EngineLogger } from '../../logging';
import type { ExecutionResponseChannel } from '../../response-channel';
import { ExecutionFinishedAnnouncer } from '../execution-finished-announcer';
import type { ExecutionRecord } from '../execution-store';
import type { StepRecord, StepStore } from '../step-store';

const graph: WorkflowGraph = {
	nodes: [
		{ id: 'a', name: 'A', type: 'v1-node' },
		{ id: 'b', name: 'B', type: 'v1-node' },
	],
	edges: [{ from: 'a', to: 'b', outputIndex: 0, inputIndex: 0 }],
};

const execution = { id: 'exec-1', workflowId: 'wf-1', graph } as ExecutionRecord;

const step = (overrides: Partial<StepRecord> = {}): StepRecord => ({
	id: 'step-a',
	executionId: 'exec-1',
	nodeId: 'a',
	iteration: 0,
	status: 'completed',
	outputs: [[{ json: { a: 1 } }]],
	...overrides,
});

const node = (id: string): GraphNode => graph.nodes.find((candidate) => candidate.id === id)!;

const silentLogger = (): EngineLogger => ({
	error: vi.fn(),
	warn: vi.fn(),
	info: vi.fn(),
	debug: vi.fn(),
});

function makeAnnouncer(store: Partial<StepStore> = {}) {
	const stepStore = {
		loadLastOutcomeStep: vi.fn().mockResolvedValue(null),
		...store,
	} as unknown as StepStore;
	const responseChannel = { publish: vi.fn() } as unknown as ExecutionResponseChannel;
	const logger = silentLogger();

	return {
		announcer: new ExecutionFinishedAnnouncer(stepStore, responseChannel, logger),
		stepStore,
		responseChannel,
		logger,
	};
}

describe('ExecutionFinishedAnnouncer', () => {
	it('answers from the settling step when it completed', async () => {
		const { announcer, responseChannel, stepStore } = makeAnnouncer();

		await announcer.announce(execution, step(), node('a'), 'completed');

		expect(responseChannel.publish).toHaveBeenCalledExactlyOnceWith({
			type: 'ended',
			executionId: 'exec-1',
			workflowId: 'wf-1',
			status: 'completed',
			lastStep: {
				nodeId: 'a',
				nodeName: 'A',
				status: 'completed',
				outputs: [[{ json: { a: 1 } }]],
				error: undefined,
			},
		});
		// A completed step carries its own outputs, so nothing is read.
		expect(stepStore.loadLastOutcomeStep).not.toHaveBeenCalled();
	});

	it('answers from the step that ran when a skip ended the run', async () => {
		const { announcer, responseChannel } = makeAnnouncer({
			loadLastOutcomeStep: vi
				.fn()
				.mockResolvedValue(step({ id: 'step-b', nodeId: 'b', outputs: [[{ json: { b: 2 } }]] })),
		});

		await announcer.announce(
			execution,
			step({ status: 'skipped', outputs: null }),
			node('a'),
			'completed',
		);

		expect(responseChannel.publish).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				lastStep: {
					nodeId: 'b',
					nodeName: 'B',
					status: 'completed',
					outputs: [[{ json: { b: 2 } }]],
				},
			}),
		);
	});

	it('answers from the step that failed, without reading', async () => {
		const { announcer, responseChannel, stepStore } = makeAnnouncer();
		const failed = step({
			status: 'failed',
			outputs: null,
			error: { name: 'NodeOperationError', message: 'it broke', stack: 'at trace' },
		});

		await announcer.announce(execution, failed, node('a'), 'failed');

		expect(responseChannel.publish).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				status: 'failed',
				lastStep: {
					nodeId: 'a',
					nodeName: 'A',
					status: 'failed',
					outputs: null,
					// Only name/message cross the seam; the stack does not.
					error: { name: 'NodeOperationError', message: 'it broke' },
				},
			}),
		);
		expect(stepStore.loadLastOutcomeStep).not.toHaveBeenCalled();
	});

	it('answers from the step that failed when a skip ended a failed run', async () => {
		// A failure elsewhere ends the run, so the step that settles last is not
		// the one that failed.
		const { announcer, responseChannel } = makeAnnouncer({
			loadLastOutcomeStep: vi.fn().mockResolvedValue(
				step({
					id: 'step-b',
					nodeId: 'b',
					status: 'failed',
					outputs: null,
					error: { name: 'NodeOperationError', message: 'it broke' },
				}),
			),
		});

		await announcer.announce(
			execution,
			step({ status: 'skipped', outputs: null }),
			node('a'),
			'failed',
		);

		expect(responseChannel.publish).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({
				status: 'failed',
				lastStep: {
					nodeId: 'b',
					nodeName: 'B',
					status: 'failed',
					outputs: null,
					error: { name: 'NodeOperationError', message: 'it broke' },
				},
			}),
		);
	});

	it('publishes a failure when no step reached an outcome', async () => {
		const { announcer, responseChannel, logger } = makeAnnouncer();

		await announcer.announce(
			execution,
			step({ status: 'skipped', outputs: null }),
			node('a'),
			'completed',
		);

		// The caller hears why, rather than waiting out its response timeout.
		expect(responseChannel.publish).toHaveBeenCalledExactlyOnceWith({
			type: 'failure',
			executionId: 'exec-1',
			error: {
				code: 'LAST_STEP_UNRESOLVED',
				message: 'The step that answers the execution could not be resolved.',
			},
		});
		expect(logger.error).toHaveBeenCalled();
	});

	it('publishes a failure when the step that answers names no node in the graph', async () => {
		const { announcer, responseChannel } = makeAnnouncer({
			loadLastOutcomeStep: vi.fn().mockResolvedValue(step({ nodeId: 'ghost' })),
		});

		await announcer.announce(
			execution,
			step({ status: 'skipped', outputs: null }),
			node('a'),
			'completed',
		);

		expect(responseChannel.publish).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ type: 'failure' }),
		);
	});

	it('publishes a failure when the read fails', async () => {
		const { announcer, responseChannel, logger } = makeAnnouncer({
			loadLastOutcomeStep: vi.fn().mockRejectedValue(new Error('the database is down')),
		});

		await announcer.announce(
			execution,
			step({ status: 'skipped', outputs: null }),
			node('a'),
			'completed',
		);

		expect(responseChannel.publish).toHaveBeenCalledExactlyOnceWith(
			expect.objectContaining({ type: 'failure' }),
		);
		expect(logger.error).toHaveBeenCalled();
	});

	it('refuses to announce a step that has not settled', async () => {
		const { announcer, responseChannel } = makeAnnouncer();

		await expect(
			announcer.announce(
				execution,
				step({ status: 'running', outputs: null }),
				node('a'),
				'completed',
			),
		).rejects.toThrow("is reported as settled from status 'running'");
		expect(responseChannel.publish).not.toHaveBeenCalled();
	});
});
