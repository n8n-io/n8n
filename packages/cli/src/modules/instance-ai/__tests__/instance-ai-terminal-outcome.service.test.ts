jest.mock('@n8n/instance-ai', () => ({
	createMemory: jest.fn(),
	TerminalOutcomeStorage: class {},
}));

import type { InstanceAiAgentNode } from '@n8n/api-types';
import type { TerminalOutcome } from '@n8n/instance-ai';

import { InstanceAiTerminalOutcomeService } from '../terminal-outcomes/instance-ai-terminal-outcome.service';

function makeTerminalOutcome(overrides: Partial<TerminalOutcome> = {}): TerminalOutcome {
	return {
		id: 'group-1:task-1:completed',
		threadId: 'thread-a',
		runId: 'run-1',
		messageGroupId: 'group-1',
		correlationId: 'message-1',
		taskId: 'task-1',
		agentId: 'agent-builder',
		status: 'completed',
		userFacingMessage: 'The background workflow-builder task finished.',
		createdAt: '2026-05-01T00:00:00.000Z',
		...overrides,
	};
}

function makeAgentTree(): InstanceAiAgentNode {
	return {
		agentId: 'agent-001',
		role: 'orchestrator',
		status: 'completed',
		textContent: 'Initial response',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [{ type: 'text', content: 'Initial response' }],
	};
}

function createTerminalOutcomeService(
	outcomes: TerminalOutcome[],
	snapshotTree?: InstanceAiAgentNode,
) {
	const storage = {
		getUndelivered: jest.fn(async () => outcomes),
		markDelivered: jest.fn(async () => {}),
		upsert: jest.fn(async () => {}),
	};
	const dbSnapshotStorage = {
		getLatest: jest.fn(async () =>
			snapshotTree
				? {
						tree: snapshotTree,
						runId: 'run-1',
						messageGroupId: 'group-1',
						runIds: ['run-1'],
					}
				: undefined,
		),
		save: jest.fn(async (..._args: unknown[]) => {}),
		updateLast: jest.fn(async (..._args: unknown[]) => {}),
	};
	const eventBus = {
		getEventsForRun: jest.fn(() => []),
		publish: jest.fn(),
	};
	const service = new InstanceAiTerminalOutcomeService({
		orchestratorAgentId: 'agent-001',
		dbSnapshotStorage,
		eventBus,
		telemetry: { track: jest.fn() },
		logger: { warn: jest.fn() },
		createMemoryConfig: jest.fn(() => ({}) as never),
		createStorage: jest.fn(() => storage),
	});

	return { service, storage, dbSnapshotStorage, eventBus };
}

describe('InstanceAiTerminalOutcomeService', () => {
	it('replays undelivered background outcomes into the persisted agent tree', async () => {
		const outcome = makeTerminalOutcome();
		const { service, storage, dbSnapshotStorage, eventBus } = createTerminalOutcomeService(
			[outcome],
			makeAgentTree(),
		);

		await service.replayUndeliveredTerminalOutcomes('thread-a');

		expect(dbSnapshotStorage.updateLast).toHaveBeenCalledTimes(1);
		const updatedTree = dbSnapshotStorage.updateLast.mock.calls[0][1] as InstanceAiAgentNode;
		expect(updatedTree.textContent).toContain(outcome.userFacingMessage);
		expect(updatedTree.timeline).toContainEqual({
			type: 'text',
			content: outcome.userFacingMessage,
			responseId: `background-outcome:${outcome.id}`,
		});
		expect(storage.markDelivered).toHaveBeenCalledWith('thread-a', outcome.id, expect.any(String));
		expect(eventBus.publish).not.toHaveBeenCalled();
	});

	it('publishes recovered background outcomes when replaying for SSE delivery', async () => {
		const outcome = makeTerminalOutcome();
		const { service, storage, dbSnapshotStorage, eventBus } = createTerminalOutcomeService(
			[outcome],
			makeAgentTree(),
		);

		await service.replayUndeliveredTerminalOutcomes('thread-a', { delivery: 'event' });

		expect(dbSnapshotStorage.updateLast).toHaveBeenCalledTimes(1);
		expect(eventBus.publish).toHaveBeenCalledWith('thread-a', {
			type: 'text-delta',
			runId: outcome.runId,
			agentId: 'agent-001',
			responseId: `background-outcome:${outcome.id}`,
			payload: { text: outcome.userFacingMessage },
		});
		expect(storage.markDelivered).toHaveBeenCalledWith('thread-a', outcome.id, expect.any(String));
	});

	it('deduplicates replay by response id only', async () => {
		const outcome = makeTerminalOutcome({ id: 'group-1:task-2:completed' });
		const tree = makeAgentTree();
		tree.textContent = `${tree.textContent}\n\n${outcome.userFacingMessage}`;
		tree.timeline.push({
			type: 'text',
			content: outcome.userFacingMessage,
			responseId: 'background-outcome:different-id',
		});
		const { service, dbSnapshotStorage } = createTerminalOutcomeService([outcome], tree);

		await service.replayUndeliveredTerminalOutcomes('thread-a');

		const updatedTree = dbSnapshotStorage.updateLast.mock.calls[0][1] as InstanceAiAgentNode;
		expect(
			updatedTree.timeline.filter(
				(entry) => entry.type === 'text' && entry.content === outcome.userFacingMessage,
			),
		).toHaveLength(2);
		expect(updatedTree.timeline).toContainEqual({
			type: 'text',
			content: outcome.userFacingMessage,
			responseId: `background-outcome:${outcome.id}`,
		});
	});

	it('creates a snapshot when replay has no prior agent tree', async () => {
		const outcome = makeTerminalOutcome({ status: 'failed' });
		const { service, storage, dbSnapshotStorage } = createTerminalOutcomeService([outcome]);

		await service.replayUndeliveredTerminalOutcomes('thread-a');

		expect(dbSnapshotStorage.save).toHaveBeenCalledTimes(1);
		const savedTree = dbSnapshotStorage.save.mock.calls[0][1] as InstanceAiAgentNode;
		expect(savedTree.status).toBe('error');
		expect(savedTree.textContent).toBe(outcome.userFacingMessage);
		expect(storage.markDelivered).toHaveBeenCalledWith('thread-a', outcome.id, expect.any(String));
	});

	it('publishes the deterministic line when snapshot replay fails', async () => {
		const outcome = makeTerminalOutcome();
		const { service, storage, dbSnapshotStorage, eventBus } = createTerminalOutcomeService(
			[outcome],
			makeAgentTree(),
		);
		dbSnapshotStorage.updateLast.mockRejectedValue(new Error('storage unavailable'));

		await service.replayUndeliveredTerminalOutcomes('thread-a', { delivery: 'event' });

		expect(eventBus.publish).toHaveBeenCalledWith('thread-a', {
			type: 'text-delta',
			runId: outcome.runId,
			agentId: 'agent-001',
			responseId: `background-outcome:${outcome.id}`,
			payload: { text: outcome.userFacingMessage },
		});
		expect(storage.markDelivered).not.toHaveBeenCalled();
	});

	it('checks persisted outcomes on repeated replay calls', async () => {
		const { service, storage } = createTerminalOutcomeService([]);

		await service.replayUndeliveredTerminalOutcomes('thread-a');
		await service.replayUndeliveredTerminalOutcomes('thread-a');

		expect(storage.getUndelivered).toHaveBeenCalledTimes(2);
	});
});
