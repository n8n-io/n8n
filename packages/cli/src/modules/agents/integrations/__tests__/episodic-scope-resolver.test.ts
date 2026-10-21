import type { Logger } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { EpisodicScopeContext } from '../agent-chat-integration';
import { resolveEpisodicScopeDecision } from '../episodic-scope-resolver';

const context: EpisodicScopeContext = {
	agentId: 'agent-1',
	credentialId: 'credential-1',
	integrationType: 'slack',
	threadId: 'thread-1',
	author: { id: 'U1', name: 'Alice' },
};

describe('resolveEpisodicScopeDecision', () => {
	const logger = mock<Logger>();

	beforeEach(() => vi.clearAllMocks());

	it('returns the scope the channel resolves', async () => {
		const scope = { writeScopeId: 'slack:T1:C1', readScopeIds: ['slack:T1:C1'] };
		const resolveEpisodicScope = vi.fn().mockResolvedValue(scope);

		await expect(
			resolveEpisodicScopeDecision({ resolveEpisodicScope }, context, logger),
		).resolves.toEqual(scope);
		expect(resolveEpisodicScope).toHaveBeenCalledWith(context);
		expect(logger.warn).not.toHaveBeenCalled();
	});

	it.each([
		['has no policy or lacks identity', { resolveEpisodicScope: () => null }],
		['is unknown', undefined],
	])('turns episodic memory off and logs when the channel %s', async (_label, integration) => {
		await expect(resolveEpisodicScopeDecision(integration, context, logger)).resolves.toEqual({
			disabled: true,
		});
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('Episodic memory is off'),
			expect.objectContaining({ agentId: 'agent-1', threadId: 'thread-1' }),
		);
	});
});
