import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import type { EventService } from '@/events/event.service';

import { InstanceAiEventRelay } from '../instance-ai-event-relay.service';
import type { InstanceAiMemoryService } from '../instance-ai-memory.service';
import type { InstanceAiMcpRegistryConnectionRepository } from '../repositories/instance-ai-mcp-registry-connection.repository';

describe('InstanceAiEventRelay', () => {
	const logger = mock<Logger>();
	const eventService = mock<EventService>();
	const memoryService = mock<InstanceAiMemoryService>();
	const mcpRegistryConnectionRepository = mock<InstanceAiMcpRegistryConnectionRepository>();

	let handleUserDeleted: (event: { targetUserId?: string }) => Promise<void>;

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);

		new InstanceAiEventRelay(logger, eventService, memoryService, mcpRegistryConnectionRepository);

		const registration = eventService.on.mock.calls.find(([name]) => name === 'user-deleted');
		handleUserDeleted = registration![1] as typeof handleUserDeleted;
	});

	it('deletes the user threads and MCP registry connections', async () => {
		memoryService.deleteThreadsForUser.mockResolvedValue(2);
		mcpRegistryConnectionRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

		await handleUserDeleted({ targetUserId: 'user-1' });

		expect(memoryService.deleteThreadsForUser).toHaveBeenCalledWith('user-1');
		expect(mcpRegistryConnectionRepository.delete).toHaveBeenCalledWith({ userId: 'user-1' });
	});

	it('ignores the event when no target user id is present', async () => {
		await handleUserDeleted({});

		expect(memoryService.deleteThreadsForUser).not.toHaveBeenCalled();
		expect(mcpRegistryConnectionRepository.delete).not.toHaveBeenCalled();
	});

	it('logs and swallows errors so user deletion is not blocked', async () => {
		memoryService.deleteThreadsForUser.mockRejectedValue(new Error('db down'));

		await expect(handleUserDeleted({ targetUserId: 'user-1' })).resolves.toBeUndefined();

		expect(logger.error).toHaveBeenCalledWith(
			'Failed to clean up Instance AI data for deleted user',
			expect.objectContaining({ userId: 'user-1' }),
		);
	});
});
