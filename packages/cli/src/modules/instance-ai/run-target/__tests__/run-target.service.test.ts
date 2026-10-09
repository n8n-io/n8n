import type { LinkedInstanceSummary, RunTarget } from '@n8n/api-types';
import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock, type MockProxy } from 'vitest-mock-extended';

import type { AgentExecutionThread } from '../../../agents/entities/agent-execution-thread.entity';
import type { N8nMemory } from '../../../agents/integrations/n8n-memory';
import { LinkedInstanceStore } from '../../../linked-instances/linked-instance.store';
import {
	ASSISTANT_RUN_TARGET_LOST_KEY,
	ASSISTANT_TURN_DEFAULTS_KEY,
} from '../../assistant-turn-options';
import { RunTargetService } from '../run-target.service';

const LINK_ID = '3f1c2b6e-8a4d-4e2b-9c1a-7d5e6f8a9b0c';
const OTHER_LINK_ID = '0b9a8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d';
const OWNER_ID = 'owner-1';
const THREAD_ID = 'thread-1';
const STORED_LINK = { kind: 'linked', instanceId: LINK_ID, name: 'Office' } as const;

function linkSummary(overrides: Partial<LinkedInstanceSummary> = {}): LinkedInstanceSummary {
	return {
		id: LINK_ID,
		name: 'Office',
		baseUrl: 'https://office.example.test',
		status: 'online',
		lastVerifiedAt: null,
		createdAt: '2026-10-01T00:00:00.000Z',
		defaultRemoteProject: null,
		...overrides,
	};
}

type ThreadPatchArgs = {
	update: (current: { metadata?: Record<string, unknown> }) => {
		metadata?: Record<string, unknown>;
	} | null;
};

/** A memory whose `patchThread` follows the store contract: a null update changes nothing. */
function createMemory(initialMetadata: Record<string, unknown> = {}) {
	const thread = { id: THREAD_ID, title: 'Chat', metadata: initialMetadata };
	const patchThread = vi.fn(async (args: ThreadPatchArgs) => {
		const patch = args.update(structuredClone(thread));
		if (patch?.metadata) thread.metadata = patch.metadata;
		return thread;
	});
	const memory = mock<N8nMemory>();
	memory.getImplementation.mockReturnValue({ patchThread } as never);
	return { memory, thread, patchThread };
}

function chatThread(overrides: Partial<AgentExecutionThread> = {}): AgentExecutionThread {
	return {
		id: THREAD_ID,
		ownerId: OWNER_ID,
		accessScope: 'user',
		...overrides,
	} as AgentExecutionThread;
}

/** The run target of a chat message that names `requested` as its target. */
async function forTurn(
	service: RunTargetService,
	thread: AgentExecutionThread,
	metadata: Record<string, unknown> | undefined,
	requested: RunTarget | undefined,
) {
	return await service.forChatTurn(thread, metadata, { runTarget: requested });
}

function defaultsOf(metadata: Record<string, unknown>) {
	return metadata[ASSISTANT_TURN_DEFAULTS_KEY];
}

describe('RunTargetService', () => {
	let store: MockProxy<LinkedInstanceStore>;
	let moduleRegistry: MockProxy<ModuleRegistry>;
	let logger: MockProxy<Logger>;

	beforeEach(() => {
		store = mock<LinkedInstanceStore>();
		store.getForUser.mockResolvedValue(linkSummary());
		moduleRegistry = mock<ModuleRegistry>();
		moduleRegistry.isActive.mockReturnValue(true);
		logger = mock<Logger>();
		Container.set(LinkedInstanceStore, store);
	});

	afterEach(() => {
		Container.reset();
	});

	function createService(memory: N8nMemory) {
		return new RunTargetService(logger, moduleRegistry, memory);
	}

	describe('the first message', () => {
		it('stores and runs on the linked instance that the owner holds', async () => {
			const { memory, thread } = createMemory();
			const service = createService(memory);

			const target = await forTurn(service, chatThread(), undefined, {
				kind: 'linked',
				instanceId: LINK_ID,
			});

			expect(target).toEqual(STORED_LINK);
			expect(store.getForUser).toHaveBeenCalledWith(OWNER_ID, LINK_ID);
			expect(defaultsOf(thread.metadata)).toEqual({ runTarget: STORED_LINK });
		});

		it('runs locally when the owner does not hold the requested link', async () => {
			store.getForUser.mockResolvedValue(null);
			const { memory, thread } = createMemory();
			const service = createService(memory);

			const target = await forTurn(service, chatThread(), undefined, {
				kind: 'linked',
				instanceId: OTHER_LINK_ID,
			});

			expect(target).toEqual({ kind: 'local' });
			expect(defaultsOf(thread.metadata)).toEqual({ runTarget: { kind: 'local' } });
		});

		it('stores local when the message names no target', async () => {
			const { memory, thread } = createMemory();
			const service = createService(memory);

			const target = await forTurn(service, chatThread(), undefined, undefined);

			expect(target).toEqual({ kind: 'local' });
			expect(store.getForUser).not.toHaveBeenCalled();
			expect(defaultsOf(thread.metadata)).toEqual({ runTarget: { kind: 'local' } });
		});

		it('keeps the first stored target when two first messages race', async () => {
			const { memory, thread } = createMemory();
			const service = createService(memory);

			await forTurn(service, chatThread(), undefined, { kind: 'linked', instanceId: LINK_ID });
			// The second message read the thread before the first one stored its target.
			const second = await forTurn(service, chatThread(), undefined, { kind: 'local' });

			expect(second).toEqual(STORED_LINK);
			expect(defaultsOf(thread.metadata)).toEqual({ runTarget: STORED_LINK });
		});

		it('stores local for a shared chat, so a shared chat never takes a remote target', async () => {
			const { memory, thread } = createMemory();
			const service = createService(memory);

			const target = await forTurn(service, chatThread({ accessScope: 'project' }), undefined, {
				kind: 'linked',
				instanceId: LINK_ID,
			});

			expect(target).toEqual({ kind: 'local' });
			expect(store.getForUser).not.toHaveBeenCalled();
			expect(defaultsOf(thread.metadata)).toEqual({ runTarget: { kind: 'local' } });
		});

		it('runs locally, without a link lookup or a stored target, when the module is off', async () => {
			moduleRegistry.isActive.mockReturnValue(false);
			const { memory, thread, patchThread } = createMemory();
			const service = createService(memory);

			const target = await forTurn(service, chatThread(), undefined, {
				kind: 'linked',
				instanceId: LINK_ID,
			});

			expect(target).toEqual({ kind: 'local' });
			expect(store.getForUser).not.toHaveBeenCalled();
			expect(patchThread).not.toHaveBeenCalled();
			expect(defaultsOf(thread.metadata)).toBeUndefined();
		});

		it('runs locally for a chat without an owner', async () => {
			const { memory, thread } = createMemory();
			const service = createService(memory);

			const target = await forTurn(service, chatThread({ ownerId: null }), undefined, {
				kind: 'linked',
				instanceId: LINK_ID,
			});

			expect(target).toEqual({ kind: 'local' });
			expect(store.getForUser).not.toHaveBeenCalled();
			expect(defaultsOf(thread.metadata)).toBeUndefined();
		});
	});

	describe('a later message', () => {
		it('ignores a different target and keeps the stored local target', async () => {
			const { memory, thread, patchThread } = createMemory({
				[ASSISTANT_TURN_DEFAULTS_KEY]: { runTarget: { kind: 'local' } },
			});
			const service = createService(memory);

			const target = await forTurn(service, chatThread(), thread.metadata, {
				kind: 'linked',
				instanceId: LINK_ID,
			});

			expect(target).toEqual({ kind: 'local' });
			expect(store.getForUser).not.toHaveBeenCalled();
			expect(patchThread).not.toHaveBeenCalled();
		});

		it('keeps the stored linked target when the message asks for local', async () => {
			const { memory, thread } = createMemory({
				[ASSISTANT_TURN_DEFAULTS_KEY]: { runTarget: STORED_LINK },
			});
			const service = createService(memory);

			const target = await forTurn(service, chatThread(), thread.metadata, { kind: 'local' });

			expect(target).toEqual(STORED_LINK);
			expect(defaultsOf(thread.metadata)).toEqual({ runTarget: STORED_LINK });
		});

		it('keeps a chat without a stored target local, as a chat from before run targets', async () => {
			const { memory, thread, patchThread } = createMemory({
				[ASSISTANT_TURN_DEFAULTS_KEY]: { pushRef: 'push-1' },
			});
			const service = createService(memory);

			const target = await forTurn(service, chatThread(), thread.metadata, {
				kind: 'linked',
				instanceId: LINK_ID,
			});

			expect(target).toEqual({ kind: 'local' });
			expect(patchThread).not.toHaveBeenCalled();
			expect(store.getForUser).not.toHaveBeenCalled();
		});
	});

	describe('a shared chat', () => {
		it('runs locally and keeps its stored link for when it is no longer shared', async () => {
			const { memory, thread } = createMemory({
				[ASSISTANT_TURN_DEFAULTS_KEY]: { runTarget: STORED_LINK },
			});
			const service = createService(memory);

			const target = await forTurn(
				service,
				chatThread({ accessScope: 'project' }),
				thread.metadata,
				undefined,
			);

			expect(target).toEqual({ kind: 'local' });
			expect(store.getForUser).not.toHaveBeenCalled();
			expect(defaultsOf(thread.metadata)).toEqual({ runTarget: STORED_LINK });
		});
	});

	describe('a link that is gone', () => {
		beforeEach(() => {
			store.getForUser.mockResolvedValue(null);
		});

		it('runs locally, stores local and records the lost link name in the chat', async () => {
			const { memory, thread } = createMemory({
				[ASSISTANT_TURN_DEFAULTS_KEY]: { runTarget: STORED_LINK },
			});
			const service = createService(memory);

			const target = await forTurn(service, chatThread(), thread.metadata, undefined);

			expect(target).toEqual({ kind: 'local' });
			expect(defaultsOf(thread.metadata)).toEqual({ runTarget: { kind: 'local' } });
			expect(thread.metadata[ASSISTANT_RUN_TARGET_LOST_KEY]).toEqual({ name: 'Office' });
		});

		it('keeps the lost link name for later messages, until the owner acknowledges it', async () => {
			const { memory, thread, patchThread } = createMemory({
				[ASSISTANT_TURN_DEFAULTS_KEY]: { runTarget: STORED_LINK },
			});
			const service = createService(memory);
			await forTurn(service, chatThread(), thread.metadata, undefined);
			const writesAfterDrop = patchThread.mock.calls.length;

			const next = await forTurn(service, chatThread(), thread.metadata, undefined);

			expect(next).toEqual({ kind: 'local' });
			expect(thread.metadata[ASSISTANT_RUN_TARGET_LOST_KEY]).toEqual({ name: 'Office' });
			expect(patchThread).toHaveBeenCalledTimes(writesAfterDrop);
		});

		it('records the lost link name once when a stale read finds the link gone again', async () => {
			const staleMetadata = { [ASSISTANT_TURN_DEFAULTS_KEY]: { runTarget: STORED_LINK } };
			const { memory, thread } = createMemory({ ...staleMetadata });
			const service = createService(memory);
			await forTurn(service, chatThread(), staleMetadata, undefined);
			const recorded = thread.metadata[ASSISTANT_RUN_TARGET_LOST_KEY];

			const again = await forTurn(service, chatThread(), staleMetadata, undefined);

			expect(again).toEqual({ kind: 'local' });
			expect(thread.metadata[ASSISTANT_RUN_TARGET_LOST_KEY]).toEqual(recorded);
			expect(defaultsOf(thread.metadata)).toEqual({ runTarget: { kind: 'local' } });
		});

		it('keeps the stored link while the linked-instances module is off', async () => {
			moduleRegistry.isActive.mockReturnValue(false);
			const { memory, thread, patchThread } = createMemory({
				[ASSISTANT_TURN_DEFAULTS_KEY]: { runTarget: STORED_LINK },
			});
			const service = createService(memory);

			const target = await forTurn(service, chatThread(), thread.metadata, undefined);

			expect(target).toEqual({ kind: 'local' });
			expect(store.getForUser).not.toHaveBeenCalled();
			expect(patchThread).not.toHaveBeenCalled();
			expect(defaultsOf(thread.metadata)).toEqual({ runTarget: STORED_LINK });
		});

		it('gives the link back to the chat when the module is on again and the link exists', async () => {
			store.getForUser.mockResolvedValue(linkSummary());
			moduleRegistry.isActive.mockReturnValue(false);
			const { memory, thread } = createMemory({
				[ASSISTANT_TURN_DEFAULTS_KEY]: { runTarget: STORED_LINK },
			});
			const service = createService(memory);
			await forTurn(service, chatThread(), thread.metadata, undefined);

			moduleRegistry.isActive.mockReturnValue(true);
			const target = await forTurn(service, chatThread(), thread.metadata, undefined);

			expect(target).toEqual(STORED_LINK);
			expect(thread.metadata).not.toHaveProperty(ASSISTANT_RUN_TARGET_LOST_KEY);
		});
	});

	describe('a failed lookup or write', () => {
		it('keeps the stored link for the message, without a drop', async () => {
			store.getForUser.mockRejectedValue(new Error('connection reset'));
			const { memory, thread, patchThread } = createMemory({
				[ASSISTANT_TURN_DEFAULTS_KEY]: { runTarget: STORED_LINK },
			});
			const service = createService(memory);

			const target = await forTurn(service, chatThread(), thread.metadata, undefined);

			expect(target).toEqual(STORED_LINK);
			expect(patchThread).not.toHaveBeenCalled();
			expect(defaultsOf(thread.metadata)).toEqual({ runTarget: STORED_LINK });
			expect(thread.metadata).not.toHaveProperty(ASSISTANT_RUN_TARGET_LOST_KEY);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to resolve the run target of a chat message',
				expect.objectContaining({ threadId: THREAD_ID, error: 'connection reset' }),
			);
		});

		it('runs locally and stores nothing when the lookup of the first message fails', async () => {
			store.getForUser.mockRejectedValue(new Error('timeout'));
			const { memory, thread, patchThread } = createMemory();
			const service = createService(memory);

			const target = await forTurn(service, chatThread(), undefined, {
				kind: 'linked',
				instanceId: LINK_ID,
			});

			expect(target).toEqual({ kind: 'local' });
			expect(patchThread).not.toHaveBeenCalled();
			expect(thread.metadata).toEqual({});
		});

		it('keeps the stored link when the drop cannot be written, so the chat is not made local', async () => {
			store.getForUser.mockResolvedValue(null);
			const { memory, thread, patchThread } = createMemory({
				[ASSISTANT_TURN_DEFAULTS_KEY]: { runTarget: STORED_LINK },
			});
			patchThread.mockRejectedValueOnce(new Error('write failed'));
			const service = createService(memory);

			const target = await forTurn(service, chatThread(), thread.metadata, undefined);

			expect(target).toEqual(STORED_LINK);
			expect(defaultsOf(thread.metadata)).toEqual({ runTarget: STORED_LINK });
			expect(thread.metadata).not.toHaveProperty(ASSISTANT_RUN_TARGET_LOST_KEY);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to resolve the run target of a chat message',
				expect.objectContaining({ error: 'write failed' }),
			);
		});
	});
});
