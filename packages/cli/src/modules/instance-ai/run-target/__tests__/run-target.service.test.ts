import type { LinkedInstanceSummary, RunTarget } from '@n8n/api-types';
import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock, type MockProxy } from 'vitest-mock-extended';

import type { AgentExecutionThread } from '../../../agents/entities/agent-execution-thread.entity';
import type { N8nMemory } from '../../../agents/integrations/n8n-memory';
import { EXECUTION_METADATA_KEY } from '../../../agents/types/agent-queued-message';
import { LinkedInstanceStore } from '../../../linked-instances/linked-instance.store';
import { ASSISTANT_TURN_DEFAULTS_KEY } from '../../assistant-turn-options';
import { RunTargetService } from '../run-target.service';

const OFFICE_NOTICE =
	"This chat runs in Office, which isn't linked any more. Link it again in Settings, or start a new chat.";

const LINK_ID = '3f1c2b6e-8a4d-4e2b-9c1a-7d5e6f8a9b0c';
const OTHER_LINK_ID = '0b9a8c7d-6e5f-4a3b-8c2d-1e0f9a8b7c6d';
const OWNER_ID = 'owner-1';
const THREAD_ID = 'thread-1';

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

/** A memory whose `patchThread` follows the store contract: a null update changes nothing. */
function createMemory(initialMetadata: Record<string, unknown> = {}) {
	const thread = { id: THREAD_ID, title: 'Chat', metadata: initialMetadata };
	const saveMessages = vi.fn(async () => {});
	const patchThread = vi.fn(
		async (args: {
			update: (current: typeof thread) => { metadata?: Record<string, unknown> } | null;
		}) => {
			const patch = args.update(structuredClone(thread));
			if (patch?.metadata) thread.metadata = patch.metadata;
			return thread;
		},
	);
	const memory = mock<N8nMemory>();
	memory.getImplementation.mockReturnValue({ patchThread, saveMessages } as never);
	return { memory, thread, patchThread, saveMessages };
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
	defaults: unknown,
	requested: RunTarget | undefined,
) {
	const { runTarget } = await service.forChatTurn(thread, defaults, { runTarget: requested });
	return runTarget;
}

function defaultsOf(thread: { metadata: Record<string, unknown> }) {
	return thread.metadata[ASSISTANT_TURN_DEFAULTS_KEY];
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

			expect(target).toEqual({ kind: 'linked', instanceId: LINK_ID, name: 'Office' });
			expect(store.getForUser).toHaveBeenCalledWith(OWNER_ID, LINK_ID);
			expect(defaultsOf(thread)).toEqual({
				runTarget: { kind: 'linked', instanceId: LINK_ID, name: 'Office' },
			});
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
			expect(defaultsOf(thread)).toEqual({ runTarget: { kind: 'local' } });
		});

		it('stores local when the message names no target', async () => {
			const { memory, thread } = createMemory();
			const service = createService(memory);

			const target = await forTurn(service, chatThread(), undefined, undefined);

			expect(target).toEqual({ kind: 'local' });
			expect(store.getForUser).not.toHaveBeenCalled();
			expect(defaultsOf(thread)).toEqual({ runTarget: { kind: 'local' } });
		});

		it('keeps the first stored target when two first messages race', async () => {
			const { memory, thread } = createMemory();
			const service = createService(memory);
			const firstChoice = { kind: 'linked', instanceId: LINK_ID } as const;

			await forTurn(service, chatThread(), undefined, firstChoice);
			const second = await forTurn(service, chatThread(), undefined, { kind: 'local' });

			expect(second).toEqual({ kind: 'linked', instanceId: LINK_ID, name: 'Office' });
			expect(defaultsOf(thread)).toEqual({
				runTarget: { kind: 'linked', instanceId: LINK_ID, name: 'Office' },
			});
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
			expect(defaultsOf(thread)).toEqual({ runTarget: { kind: 'local' } });
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
			expect(defaultsOf(thread)).toBeUndefined();
		});
	});

	describe('a later message', () => {
		it('ignores a different target and keeps the stored local target', async () => {
			const { memory, thread, patchThread } = createMemory({
				[ASSISTANT_TURN_DEFAULTS_KEY]: { runTarget: { kind: 'local' } },
			});
			const service = createService(memory);

			const target = await forTurn(service, chatThread(), defaultsOf(thread), {
				kind: 'linked',
				instanceId: LINK_ID,
			});

			expect(target).toEqual({ kind: 'local' });
			expect(store.getForUser).not.toHaveBeenCalled();
			expect(patchThread).not.toHaveBeenCalled();
		});

		it('keeps the stored linked target when the message asks for local', async () => {
			const stored = { kind: 'linked', instanceId: LINK_ID, name: 'Office' };
			const { memory, thread } = createMemory({
				[ASSISTANT_TURN_DEFAULTS_KEY]: { runTarget: stored },
			});
			const service = createService(memory);

			const target = await forTurn(service, chatThread(), defaultsOf(thread), {
				kind: 'local',
			});

			expect(target).toEqual(stored);
			expect(defaultsOf(thread)).toEqual({ runTarget: stored });
		});

		it('keeps a chat without a stored target local, as a chat from before run targets', async () => {
			const { memory, thread, patchThread } = createMemory({
				[ASSISTANT_TURN_DEFAULTS_KEY]: { pushRef: 'push-1' },
			});
			const service = createService(memory);

			const target = await forTurn(service, chatThread(), defaultsOf(thread), {
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
			const stored = { kind: 'linked', instanceId: LINK_ID, name: 'Office' };
			const { memory, thread, saveMessages } = createMemory({
				[ASSISTANT_TURN_DEFAULTS_KEY]: { runTarget: stored },
			});
			const service = createService(memory);

			const target = await forTurn(
				service,
				chatThread({ accessScope: 'project' }),
				defaultsOf(thread),
				undefined,
			);

			expect(target).toEqual({ kind: 'local' });
			expect(store.getForUser).not.toHaveBeenCalled();
			expect(saveMessages).not.toHaveBeenCalled();
			expect(defaultsOf(thread)).toEqual({ runTarget: stored });
		});
	});

	describe('a link that is gone', () => {
		const stored = { kind: 'linked', instanceId: LINK_ID, name: 'Office' };

		it('runs locally, changes the stored target and returns one notice', async () => {
			store.getForUser.mockResolvedValue(null);
			const { memory, thread, saveMessages } = createMemory({
				[ASSISTANT_TURN_DEFAULTS_KEY]: { runTarget: stored },
			});
			const service = createService(memory);

			const first = await service.forChatTurn(chatThread(), defaultsOf(thread), undefined);
			const second = await service.forChatTurn(chatThread(), defaultsOf(thread), undefined);

			expect(first).toEqual({ runTarget: { kind: 'local' }, notice: OFFICE_NOTICE });
			expect(second).toEqual({ runTarget: { kind: 'local' } });
			expect(defaultsOf(thread)).toEqual({ runTarget: { kind: 'local' } });
			expect(saveMessages).not.toHaveBeenCalled();
		});

		it('keeps the stored link while the linked-instances module is off', async () => {
			moduleRegistry.isActive.mockReturnValue(false);
			const { memory, thread, patchThread, saveMessages } = createMemory({
				[ASSISTANT_TURN_DEFAULTS_KEY]: { runTarget: stored },
			});
			const service = createService(memory);

			const result = await service.forChatTurn(chatThread(), defaultsOf(thread), undefined);

			expect(result).toEqual({ runTarget: { kind: 'local' } });
			expect(store.getForUser).not.toHaveBeenCalled();
			expect(patchThread).not.toHaveBeenCalled();
			expect(saveMessages).not.toHaveBeenCalled();
			expect(defaultsOf(thread)).toEqual({ runTarget: stored });
		});

		it('gives the link back to the chat when the module is on again', async () => {
			moduleRegistry.isActive.mockReturnValue(false);
			const { memory, thread } = createMemory({
				[ASSISTANT_TURN_DEFAULTS_KEY]: { runTarget: stored },
			});
			const service = createService(memory);
			await service.forChatTurn(chatThread(), defaultsOf(thread), undefined);

			moduleRegistry.isActive.mockReturnValue(true);
			const result = await service.forChatTurn(chatThread(), defaultsOf(thread), undefined);

			expect(result).toEqual({ runTarget: stored });
			expect(result.notice).toBeUndefined();
		});
	});

	describe('postTurnNotice', () => {
		const scope = () => ({
			thread: chatThread(),
			resourceId: 'resource-1',
			executionId: 'execution-1',
		});

		it('writes the notice into the chat, linked to the execution of the turn', async () => {
			const { memory, saveMessages } = createMemory();
			const service = createService(memory);

			await service.postTurnNotice(scope(), OFFICE_NOTICE);

			expect(saveMessages).toHaveBeenCalledTimes(1);
			expect(saveMessages).toHaveBeenCalledWith({
				threadId: THREAD_ID,
				resourceId: 'resource-1',
				messages: [
					expect.objectContaining({
						role: 'assistant',
						content: [{ type: 'text', text: OFFICE_NOTICE }],
					}),
				],
				hostMetadata: { [EXECUTION_METADATA_KEY]: 'execution-1' },
			});
		});

		it('writes nothing when the turn has no execution to show the notice in', async () => {
			const { memory, saveMessages } = createMemory();
			const service = createService(memory);

			await service.postTurnNotice({ ...scope(), executionId: undefined }, OFFICE_NOTICE);

			expect(saveMessages).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalledWith(
				'Skipped the run target notice, because the turn has no execution',
				{ threadId: THREAD_ID },
			);
		});

		it('does not fail the turn when the write fails', async () => {
			const { memory, saveMessages } = createMemory();
			saveMessages.mockRejectedValueOnce(new Error('write failed'));
			const service = createService(memory);

			await expect(service.postTurnNotice(scope(), OFFICE_NOTICE)).resolves.toBeUndefined();
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to post the run target notice',
				expect.objectContaining({ threadId: THREAD_ID, error: 'write failed' }),
			);
		});
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
		expect(defaultsOf(thread)).toBeUndefined();
	});
});
