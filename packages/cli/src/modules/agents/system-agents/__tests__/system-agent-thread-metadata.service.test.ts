import type { User } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionThread } from '../../entities/agent-execution-thread.entity';
import type { N8nMemory } from '../../integrations/n8n-memory';
import type { SystemAgentExecutionService } from '../system-agent-execution.service';
import { SystemAgentThreadMetadataService } from '../system-agent-thread-metadata.service';

const AGENT_ID = 'assistant';
const THREAD_ID = 'thread-1';

type Metadata = Record<string, unknown> | undefined;

describe('SystemAgentThreadMetadataService', () => {
	const user = mock<User>({ id: 'user-1' });

	/** A thread row in memory. `patchThread` applies the update the way the real memory does. */
	function setup(row: { exists: boolean; metadata?: Metadata }) {
		const systemAgents = mock<SystemAgentExecutionService>();
		systemAgents.getUsableThread.mockResolvedValue(mock<AgentExecutionThread>({ id: THREAD_ID }));
		const memory = {
			getThread: vi.fn(async () => (row.exists ? { id: THREAD_ID, metadata: row.metadata } : null)),
			patchThread: vi.fn(
				async (args: {
					threadId: string;
					update: (current: { metadata?: Metadata }) => { metadata?: Metadata } | null;
				}) => {
					if (!row.exists) return null;
					const patch = args.update({ metadata: row.metadata });
					if (patch?.metadata !== undefined) row.metadata = patch.metadata;
					return { id: THREAD_ID, metadata: row.metadata };
				},
			),
		};
		const n8nMemory = mock<N8nMemory>();
		n8nMemory.getImplementation.mockReturnValue(
			memory as unknown as ReturnType<N8nMemory['getImplementation']>,
		);
		const service = new SystemAgentThreadMetadataService(systemAgents, n8nMemory);
		return { service, systemAgents, n8nMemory, memory };
	}

	describe('read', () => {
		it('checks access to the thread and returns the value of the key', async () => {
			const { service, systemAgents, n8nMemory } = setup({
				exists: true,
				metadata: { tabs: ['a'], other: true },
			});

			await expect(service.read(AGENT_ID, user, THREAD_ID, 'tabs')).resolves.toEqual(['a']);
			expect(systemAgents.getUsableThread).toHaveBeenCalledWith(AGENT_ID, user, THREAD_ID);
			expect(n8nMemory.getImplementation).toHaveBeenCalledWith(AGENT_ID);
		});

		it('returns undefined when the thread or the key does not exist', async () => {
			await expect(
				setup({ exists: false }).service.read(AGENT_ID, user, THREAD_ID, 'tabs'),
			).resolves.toBeUndefined();
			await expect(
				setup({ exists: true, metadata: { other: true } }).service.read(
					AGENT_ID,
					user,
					THREAD_ID,
					'tabs',
				),
			).resolves.toBeUndefined();
		});

		it('does not read the thread when the user cannot use it', async () => {
			const { service, systemAgents, memory } = setup({ exists: true });
			systemAgents.getUsableThread.mockRejectedValue(new NotFoundError('Session not found'));

			await expect(service.read(AGENT_ID, user, THREAD_ID, 'tabs')).rejects.toThrow(NotFoundError);
			expect(memory.getThread).not.toHaveBeenCalled();
		});
	});

	describe('update', () => {
		it('changes the key and keeps the other keys', async () => {
			const row = { exists: true, metadata: { tabs: ['a'], other: true } as Metadata };
			const { service, systemAgents } = setup(row);

			await service.update(AGENT_ID, user, THREAD_ID, 'tabs', (current) => [
				...(current as string[]),
				'b',
			]);

			expect(systemAgents.getUsableThread).toHaveBeenCalledWith(AGENT_ID, user, THREAD_ID);
			expect(row.metadata).toEqual({ tabs: ['a', 'b'], other: true });
		});

		it('writes nothing when the change returns undefined', async () => {
			const metadata = { tabs: ['a'] };
			const row = { exists: true, metadata: metadata as Metadata };
			const { service } = setup(row);

			await service.update(AGENT_ID, user, THREAD_ID, 'tabs', () => undefined);

			// A write would replace the metadata object, even with equal content.
			expect(row.metadata).toBe(metadata);
		});

		it('does nothing when the thread has no memory row yet', async () => {
			const row = { exists: false, metadata: undefined as Metadata };
			const { service } = setup(row);

			await expect(
				service.update(AGENT_ID, user, THREAD_ID, 'tabs', () => ['a']),
			).resolves.toBeUndefined();
			expect(row.metadata).toBeUndefined();
		});

		it('does not change the thread when the user cannot use it', async () => {
			const { service, systemAgents, memory } = setup({ exists: true });
			systemAgents.getUsableThread.mockRejectedValue(new NotFoundError('Session not found'));

			await expect(service.update(AGENT_ID, user, THREAD_ID, 'tabs', () => ['a'])).rejects.toThrow(
				NotFoundError,
			);
			expect(memory.patchThread).not.toHaveBeenCalled();
		});
	});
});
