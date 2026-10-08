import type { LinkedInstanceSummary, RunTarget } from '@n8n/api-types';
import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { mock, type MockProxy } from 'vitest-mock-extended';

import type { AgentExecutionThread } from '../../../agents/entities/agent-execution-thread.entity';
import type { N8nMemory } from '../../../agents/integrations/n8n-memory';
import { LinkedInstanceStore } from '../../../linked-instances/linked-instance.store';
import { ASSISTANT_TURN_DEFAULTS_KEY } from '../../assistant-turn-options';
import { RunTargetService } from '../run-target.service';

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

/** A chat message that names `requested` as its run target. */
async function forTurn(
	service: RunTargetService,
	thread: AgentExecutionThread,
	defaults: unknown,
	requested: RunTarget | undefined,
) {
	return await service.forChatTurn(thread, defaults, { runTarget: requested });
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

		it('runs locally without a link lookup when the module is off', async () => {
			moduleRegistry.isActive.mockReturnValue(false);
			const { memory, thread } = createMemory();
			const service = createService(memory);

			const target = await forTurn(service, chatThread(), undefined, {
				kind: 'linked',
				instanceId: LINK_ID,
			});

			expect(target).toEqual({ kind: 'local' });
			expect(store.getForUser).not.toHaveBeenCalled();
			expect(defaultsOf(thread)).toEqual({ runTarget: { kind: 'local' } });
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

		it('runs locally, changes the stored target and posts one notice', async () => {
			store.getForUser.mockResolvedValue(null);
			const { memory, thread, saveMessages } = createMemory({
				[ASSISTANT_TURN_DEFAULTS_KEY]: { runTarget: stored },
			});
			const service = createService(memory);

			const first = await forTurn(service, chatThread(), defaultsOf(thread), undefined);
			const second = await forTurn(service, chatThread(), defaultsOf(thread), undefined);

			expect(first).toEqual({ kind: 'local' });
			expect(second).toEqual({ kind: 'local' });
			expect(defaultsOf(thread)).toEqual({ runTarget: { kind: 'local' } });
			expect(saveMessages).toHaveBeenCalledTimes(1);
			expect(saveMessages).toHaveBeenCalledWith(
				expect.objectContaining({
					threadId: THREAD_ID,
					messages: [
						expect.objectContaining({
							role: 'assistant',
							content: [
								{
									type: 'text',
									text: expect.stringContaining(
										"This chat runs in Office, which isn't linked any more.",
									),
								},
							],
						}),
					],
				}),
			);
		});

		it('treats the link as gone when the linked-instances module is off', async () => {
			moduleRegistry.isActive.mockReturnValue(false);
			const { memory, thread, saveMessages } = createMemory({
				[ASSISTANT_TURN_DEFAULTS_KEY]: { runTarget: stored },
			});
			const service = createService(memory);

			const target = await forTurn(service, chatThread(), defaultsOf(thread), undefined);

			expect(target).toEqual({ kind: 'local' });
			expect(store.getForUser).not.toHaveBeenCalled();
			expect(saveMessages).toHaveBeenCalledTimes(1);
		});

		it('still runs locally when the notice cannot be written', async () => {
			store.getForUser.mockResolvedValue(null);
			const { memory, thread, saveMessages } = createMemory({
				[ASSISTANT_TURN_DEFAULTS_KEY]: { runTarget: stored },
			});
			saveMessages.mockRejectedValueOnce(new Error('write failed'));
			const service = createService(memory);

			const target = await forTurn(service, chatThread(), defaultsOf(thread), undefined);

			expect(target).toEqual({ kind: 'local' });
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
