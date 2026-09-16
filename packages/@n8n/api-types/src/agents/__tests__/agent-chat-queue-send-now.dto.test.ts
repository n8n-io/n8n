import { AgentChatQueueSendNowDto } from '../dto';

describe('AgentChatQueueSendNowDto', () => {
	it('accepts only one complete target shape', () => {
		expect(
			AgentChatQueueSendNowDto.safeParse({
				target: { mode: 'active', executionId: crypto.randomUUID(), runId: 'run-1' },
			}).success,
		).toBe(true);
		expect(
			AgentChatQueueSendNowDto.safeParse({
				target: {
					mode: 'active',
					executionId: crypto.randomUUID(),
					runId: 'run-1',
					previousExecutionId: crypto.randomUUID(),
				},
			}).success,
		).toBe(false);
		expect(
			AgentChatQueueSendNowDto.safeParse({
				target: { mode: 'new-parent-turn', previousExecutionId: crypto.randomUUID() },
			}).success,
		).toBe(true);
	});
});
