/**
 * The cursor of the `wfrt` event outbox: the service resumes the stream after
 * the seq that n8n handled, handles the events of a shard in order, and acks
 * them only after the dispatcher finished. The stream is a fake that hands the
 * events of the test to the service, so no `wfrt` process is needed.
 */
import type { Logger } from '@n8n/backend-common';
import type { EventService } from '@n8n/backend-services';
import type { WorkflowRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CompiledEngineBridge } from '@/services/compiled-engine-bridge.service';

import type { CompiledEngineProcesses } from '../compiled-engine-processes';
import type { CompiledEngineSync } from '../compiled-engine-sync.service';
import type { CompiledEngineConfig } from '../compiled-engine.config';
import type { CompiledEngineDispatcher } from '../compiled-engine.dispatcher';
import { CompiledEngineService } from '../compiled-engine.service';
import type { WfrtEvent, WfrtEventCursor } from '../compiled-engine.types';
import type { CompiledExecutionStore } from '../compiled-execution.store';
import type { CompiledWebhookForwarder } from '../compiled-webhook.forwarder';
import type { WfrtAdminClient } from '../wfrt-admin.client';

/** A durable event of one shard. */
const finished = (seq: number, shard = 0): WfrtEvent => ({
	type: 'finished',
	executionId: `w-${seq}`,
	status: 'ok',
	shard,
	seq,
	at: seq,
});

/** An event of an older `wfrt`, which sends no outbox position. */
const startedWithoutSeq: WfrtEvent = {
	type: 'started',
	executionId: 'w-old',
	workflowId: 'wf1',
	versionId: 'hash1',
	mode: 'trigger',
	at: 1,
};

/** Lets the promise chains and the pending macrotasks of the service run. */
async function settle() {
	for (let round = 0; round < 10; round++) await new Promise<void>((r) => setImmediate(r));
}

function setup(storedCursor: Record<string, number> = {}) {
	const config = mock<CompiledEngineConfig>({ manageProcesses: false });
	const client = mock<WfrtAdminClient>();
	const sync = mock<CompiledEngineSync>();
	sync.onConnected.mockResolvedValue([]);
	const dispatcher = mock<CompiledEngineDispatcher>();
	dispatcher.handleEvent.mockResolvedValue(undefined);
	dispatcher.reconcile.mockResolvedValue(undefined);
	dispatcher.drain.mockResolvedValue(undefined);
	const store = mock<CompiledExecutionStore>();
	store.readEventCursor.mockResolvedValue(storedCursor);
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const stream = {
		after: undefined as WfrtEventCursor | undefined,
		onEvent: (_event: WfrtEvent) => {},
		opened: () => {},
	};
	const opened = new Promise<void>((resolve) => {
		stream.opened = resolve;
	});
	client.streamEvents.mockImplementation(async (signal, onOpen, onEvent, after) => {
		stream.after = after;
		stream.onEvent = onEvent;
		await onOpen();
		stream.opened();
		await new Promise<void>((done) => signal.addEventListener('abort', () => done()));
	});

	const service = new CompiledEngineService(
		config,
		mock<CompiledEngineProcesses>(),
		client,
		sync,
		dispatcher,
		mock<CompiledWebhookForwarder>(),
		mock<CompiledEngineBridge>(),
		mock<EventService>(),
		mock<WorkflowRepository>(),
		store,
		logger,
	);

	const start = async () => {
		await service.start();
		await opened;
	};

	return { service, client, dispatcher, store, stream, start };
}

describe('CompiledEngineService event order of one execution', () => {
	it('handles the finished event after the earlier node events of its execution', async () => {
		const { dispatcher, stream, start } = setup();
		const order: string[] = [];
		let releaseTrace = () => {};
		dispatcher.handleEvent.mockImplementation(async (event) => {
			const name = `${event.type}${'step' in event ? `:${String(event.step)}` : ''}`;
			// The node event has a slow database write.
			if (event.type === 'trace') await new Promise<void>((r) => (releaseTrace = r));
			order.push(name);
		});
		await start();

		// As `wfrt` sends them: the node events have no outbox position, `finished` has one.
		stream.onEvent({ type: 'trace', executionId: 'w-1', step: 'Fetch', items: [], at: 1 });
		stream.onEvent({ type: 'trace', executionId: 'w-1', step: 'Respond', items: [], at: 2 });
		stream.onEvent(finished(1));
		// An execution of another shard, with no earlier event, does not wait.
		stream.onEvent(finished(2, 1));
		await settle();
		expect(order).toEqual(['finished']);

		releaseTrace();
		await settle();
		releaseTrace();
		await settle();
		expect(order).toEqual(['finished', 'trace:Fetch', 'trace:Respond', 'finished']);
		expect(
			dispatcher.handleEvent.mock.calls.map(
				([event]) => 'executionId' in event && event.executionId,
			),
		).toEqual(['w-1', 'w-2', 'w-1', 'w-1']);
	});
});

describe('CompiledEngineService event outbox', () => {
	it('resumes the stream from the stored cursor', async () => {
		const { service, client, store, stream, start } = setup({ '0': 6, '3': 1 });

		await start();

		expect(store.readEventCursor).toHaveBeenCalled();
		expect(stream.after).toEqual({ '0': 6, '3': 1 });

		// A cursor that n8n stored but did not ack goes out again on connect.
		await settle();
		expect(client.ackEvents).toHaveBeenCalledWith([
			{ shard: 0, seq: 6 },
			{ shard: 3, seq: 1 },
		]);
		await service.shutdown();
	});

	it('sends neither a cursor nor acks without a stored seq', async () => {
		const { service, client, store, stream, start } = setup();

		await start();
		stream.onEvent(startedWithoutSeq);
		await settle();
		await service.flushEvents();

		expect(stream.after).toEqual({});
		expect(store.saveEventCursor).not.toHaveBeenCalled();
		expect(client.ackEvents).not.toHaveBeenCalled();
		await service.shutdown();
	});

	it('acks an event only after the dispatcher handled it', async () => {
		const { service, client, dispatcher, store, stream, start } = setup();
		let release: () => void = () => {};
		let handling: Promise<void> | undefined;
		dispatcher.handleEvent.mockImplementation(async () => {
			handling = new Promise<void>((resolve) => {
				release = resolve;
			});
			return await handling;
		});
		await start();

		stream.onEvent(finished(1));
		await settle();
		expect(client.ackEvents).not.toHaveBeenCalled();

		release();
		await handling;
		await service.flushEvents();

		expect(store.saveEventCursor).toHaveBeenCalledWith({ '0': 1 });
		expect(client.ackEvents).toHaveBeenCalledWith([{ shard: 0, seq: 1 }]);
		// The cursor is stored before the ack, so a crash cannot lose it.
		expect(store.saveEventCursor.mock.invocationCallOrder[0]).toBeLessThan(
			client.ackEvents.mock.invocationCallOrder[0],
		);
		await service.shutdown();
	});

	it('handles the events of one shard in seq order', async () => {
		const { service, dispatcher, stream, start } = setup();
		const handled: Array<number | undefined> = [];
		let release: () => void = () => {};
		dispatcher.handleEvent.mockImplementation(async (event) => {
			const seq = 'seq' in event ? event.seq : undefined;
			if (seq === 1) {
				await new Promise<void>((resolve) => {
					release = resolve;
				});
			}
			handled.push(seq);
		});
		await start();

		stream.onEvent(finished(1));
		stream.onEvent(finished(2));
		stream.onEvent(finished(3));
		await settle();
		expect(handled).toEqual([]);

		release();
		await settle();
		expect(handled).toEqual([1, 2, 3]);
		await service.shutdown();
	});

	it('stores and acks a batch of 200 events without waiting', async () => {
		const { service, client, store, stream, start } = setup();
		await start();

		for (let seq = 1; seq <= 200; seq++) stream.onEvent(finished(seq, 0));
		await settle();

		expect(store.saveEventCursor).toHaveBeenCalledWith({ '0': 200 });
		expect(client.ackEvents).toHaveBeenCalledTimes(1);
		expect(client.ackEvents).toHaveBeenCalledWith([{ shard: 0, seq: 200 }]);
		await service.shutdown();
	});

	it('waits 250 ms to store and ack a smaller batch', async () => {
		const { service, client, store, stream, start } = setup();
		await start();

		stream.onEvent(finished(1));
		stream.onEvent(finished(2));
		await settle();
		expect(client.ackEvents).not.toHaveBeenCalled();

		await new Promise((r) => setTimeout(r, 300));
		expect(store.saveEventCursor).toHaveBeenCalledWith({ '0': 2 });
		expect(client.ackEvents).toHaveBeenCalledTimes(1);
		expect(client.ackEvents).toHaveBeenCalledWith([{ shard: 0, seq: 2 }]);
		await service.shutdown();
	});

	it('does not advance the cursor past an event that n8n could not handle', async () => {
		const { service, client, dispatcher, store, stream, start } = setup();
		dispatcher.handleEvent.mockImplementation(async (event) => {
			if ('seq' in event && event.seq === 2) throw new Error('the database is down');
		});
		await start();

		stream.onEvent(finished(1));
		stream.onEvent(finished(2));
		stream.onEvent(finished(3));
		await settle();
		await service.flushEvents();

		expect(dispatcher.handleEvent).toHaveBeenCalledTimes(3);
		expect(store.saveEventCursor).toHaveBeenCalledWith({ '0': 1 });
		expect(client.ackEvents).toHaveBeenCalledWith([{ shard: 0, seq: 1 }]);
		await service.shutdown();
	});

	it('ignores a seq that n8n handled already', async () => {
		const { service, client, store, stream, start } = setup();
		await start();

		stream.onEvent(finished(2));
		stream.onEvent(finished(1));
		await settle();
		await service.flushEvents();

		expect(store.saveEventCursor).toHaveBeenCalledWith({ '0': 2 });
		expect(client.ackEvents).toHaveBeenCalledTimes(1);
		expect(client.ackEvents).toHaveBeenCalledWith([{ shard: 0, seq: 2 }]);
		await service.shutdown();
	});

	it('keeps the shards apart', async () => {
		const { service, client, store, stream, start } = setup();
		await start();

		stream.onEvent(finished(4, 0));
		stream.onEvent(finished(9, 1));
		await settle();
		await service.flushEvents();

		expect(store.saveEventCursor).toHaveBeenCalledWith({ '0': 4, '1': 9 });
		expect(client.ackEvents).toHaveBeenCalledTimes(1);
		expect(client.ackEvents).toHaveBeenCalledWith([
			{ shard: 0, seq: 4 },
			{ shard: 1, seq: 9 },
		]);
		await service.shutdown();
	});

	it('stores the cursor and acks on shutdown', async () => {
		const { service, client, store, stream, start } = setup();
		await start();

		stream.onEvent(finished(3));
		await settle();
		expect(client.ackEvents).not.toHaveBeenCalled();

		await service.shutdown();

		expect(store.saveEventCursor).toHaveBeenCalledWith({ '0': 3 });
		expect(client.ackEvents).toHaveBeenCalledWith([{ shard: 0, seq: 3 }]);
	});
});
