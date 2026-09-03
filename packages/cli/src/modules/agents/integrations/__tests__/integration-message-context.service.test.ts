import { mock } from 'vitest-mock-extended';

import type { AgentResourceRepository } from '../../repositories/agent-resource.repository';
import type { AgentThreadRepository } from '../../repositories/agent-thread.repository';
import { IntegrationMessageContextService } from '../integration-message-context.service';
import type { IntegrationMessageContext } from '../integration-tools';

describe('IntegrationMessageContextService — session binding', () => {
	const context: IntegrationMessageContext = {
		integrationConnectionId: 'slack:cred-a',
		platform: 'slack',
		target: { type: 'thread', threadId: 'slack:C1:1.1' },
		messageId: '1.1',
		updatedAt: '2026-08-20T10:00:00.000Z',
	};

	/** In-memory backing store keyed by thread id, so findOneBy returns the right
	 * row regardless of call order. */
	function setup(initial: Record<string, Record<string, unknown>> = {}) {
		const threads = new Map<string, { id: string; metadata: string | null }>();
		for (const [id, metadata] of Object.entries(initial)) {
			threads.set(id, { id, metadata: JSON.stringify(metadata) });
		}
		const threadRepository = mock<AgentThreadRepository>();
		const resourceRepository = mock<AgentResourceRepository>();
		resourceRepository.existsBy.mockResolvedValue(true);
		threadRepository.findOneBy.mockImplementation(async ({ id }: { id: string }) =>
			threads.has(id) ? (threads.get(id) as never) : (null as never),
		);
		threadRepository.create.mockImplementation((data: unknown) => data as never);
		threadRepository.save.mockImplementation(
			async (entity: { id: string; metadata: string | null }) => {
				threads.set(entity.id, { id: entity.id, metadata: entity.metadata });
				return undefined as never;
			},
		);
		const service = new IntegrationMessageContextService(threadRepository, resourceRepository);
		return { service, threadRepository, threads };
	}

	it('binds a derived thread to an origin and resolves it back', async () => {
		const { service } = setup({
			task: { boundThreads: [] },
		});

		await service.bindSession('agent-1:slack:D123:1001', {
			threadId: 'task',
			resourceId: 'task:task-1',
		});

		const origin = await service.resolveSession('agent-1:slack:D123:1001');
		expect(origin).toEqual({ threadId: 'task', resourceId: 'task:task-1' });
	});

	it('first write wins — a second bind does not overwrite the existing binding', async () => {
		const { service } = setup({
			'agent-1:slack:D123:1001': {
				continueAs: { threadId: 'task', resourceId: 'task:task-1' },
			},
		});

		await service.bindSession('agent-1:slack:D123:1001', {
			threadId: 'task-2',
			resourceId: 'task:task-2',
		});

		const origin = await service.resolveSession('agent-1:slack:D123:1001');
		expect(origin).toEqual({ threadId: 'task', resourceId: 'task:task-1' });
	});

	it('is a no-op when the derived id already is the origin', async () => {
		const { service, threadRepository } = setup();
		await service.bindSession('task', { threadId: 'task', resourceId: 'task:task-1' });
		expect(threadRepository.save).not.toHaveBeenCalled();
	});

	it('returns null when no binding is stored', async () => {
		const { service } = setup({ 'agent-1:slack:D123:1001': {} });
		const origin = await service.resolveSession('agent-1:slack:D123:1001');
		expect(origin).toBeNull();
	});

	it('unbindSession removes the continueAs key but keeps other metadata', async () => {
		const { service, threadRepository } = setup({
			'agent-1:slack:D123:1001': {
				continueAs: { threadId: 'task', resourceId: 'task:task-1' },
				currentMessageContext: context,
			},
		});

		await service.unbindSession('agent-1:slack:D123:1001');

		expect(threadRepository.save).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'agent-1:slack:D123:1001',
				// JSON.stringify drops the undefined continueAs key, leaving the rest.
				metadata: JSON.stringify({ currentMessageContext: context }),
			}),
		);
	});

	it('does not record the derived id on a later origin when the thread is already bound', async () => {
		const { service, threadRepository } = setup({
			'agent-1:slack:D123:1001': {
				continueAs: { threadId: 'task', resourceId: 'task:task-1' },
			},
			'task-2': {},
		});

		await service.bindSession('agent-1:slack:D123:1001', {
			threadId: 'task-2',
			resourceId: 'task:task-2',
		});

		const saves = (threadRepository.save as unknown as ReturnType<typeof vi.fn>).mock.calls;
		expect(saves.find((c) => (c[0] as { id: string }).id === 'task-2')).toBeUndefined();
	});

	it('records the derived id on the origin thread so completion can unbind by id', async () => {
		const { service, threadRepository } = setup({ task: {} });

		await service.bindSession('agent-1:slack:D123:1001', {
			threadId: 'task',
			resourceId: 'task:task-1',
		});

		const saves = (threadRepository.save as unknown as ReturnType<typeof vi.fn>).mock.calls;
		const originSave = saves.find((c) => (c[0] as { id: string }).id === 'task');
		expect(originSave).toBeDefined();
		expect(JSON.parse((originSave![0] as { metadata: string }).metadata).boundThreads).toEqual([
			'agent-1:slack:D123:1001',
		]);
	});

	it('clearSessionBindings unbinds each derived thread and clears the list', async () => {
		const { service, threadRepository } = setup({
			task: {
				boundThreads: ['agent-1:slack:D123:1001', 'agent-1:slack:C456:2002'],
			},
			'agent-1:slack:D123:1001': {
				continueAs: { threadId: 'task', resourceId: 'task:task-1' },
			},
			'agent-1:slack:C456:2002': {
				continueAs: { threadId: 'task', resourceId: 'task:task-1' },
			},
		});

		await service.clearSessionBindings('task');

		const saves = (threadRepository.save as unknown as ReturnType<typeof vi.fn>).mock.calls;
		const originSave = saves.find((c) => (c[0] as { id: string }).id === 'task');
		expect(originSave).toBeDefined();
		expect(JSON.parse((originSave![0] as { metadata: string }).metadata).boundThreads).toEqual([]);
		// Both derived threads lost their continueAs key.
		const d1Save = saves.find((c) => (c[0] as { id: string }).id === 'agent-1:slack:D123:1001');
		expect(d1Save).toBeDefined();
		expect(JSON.parse((d1Save![0] as { metadata: string }).metadata).continueAs).toBeUndefined();
	});

	it('clearSessionBindings is a no-op when the origin has no bound threads', async () => {
		const { service, threadRepository } = setup({ task: {} });
		await service.clearSessionBindings('task');
		expect(threadRepository.save).not.toHaveBeenCalled();
	});
});
