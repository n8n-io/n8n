import type { Logger } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { AgentMessageRepository } from '../../repositories/agent-message.repository';
import type { EpisodicScopeContext } from '../agent-chat-integration';
import { EpisodicScopeResolver, resolveEpisodicScopeOverride } from '../episodic-scope-resolver';

const context: EpisodicScopeContext = {
	agentId: 'agent-1',
	credentialId: 'credential-1',
	integrationType: 'slack',
	threadId: 'thread-1',
	author: { id: 'U1', name: 'Alice' },
};

describe('resolveEpisodicScopeOverride', () => {
	const logger = mock<Logger>();

	it('leaves the shared default in place when the integration has no override', () => {
		expect(resolveEpisodicScopeOverride({}, context, logger)).toBeUndefined();
		expect(resolveEpisodicScopeOverride(undefined, context, logger)).toBeUndefined();
	});

	it('returns the scope the override resolves', () => {
		const scope = { writeScopeId: 'slack:T1:C1', readScopeIds: ['slack:T1:C1'] };
		const resolveEpisodicScope = vi.fn().mockReturnValue(scope);

		expect(resolveEpisodicScopeOverride({ resolveEpisodicScope }, context, logger)).toEqual(scope);
		expect(resolveEpisodicScope).toHaveBeenCalledWith(context);
	});

	it('turns episodic memory off and logs when the override lacks identity', () => {
		const result = resolveEpisodicScopeOverride(
			{ resolveEpisodicScope: () => null },
			context,
			logger,
		);

		expect(result).toEqual({ disabled: true });
		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('Episodic memory is off'),
			expect.objectContaining({ agentId: 'agent-1', threadId: 'thread-1' }),
		);
	});
});

describe('EpisodicScopeResolver', () => {
	const messageRepository = mock<AgentMessageRepository>();
	const resolver = new EpisodicScopeResolver(messageRepository);

	it('resolves an integration turn to the thread write scope and the participated threads', async () => {
		messageRepository.findRecentThreadIdsByResourceId.mockResolvedValue(['thread-1', 'thread-old']);

		const scope = await resolver.resolveDefault('agent-1', {
			resourceId: 'integration:slack:U1',
			threadId: 'thread-1',
		});

		expect(scope).toEqual({
			writeScopeId: 'thread:thread-1',
			readScopeIds: ['integration:slack:U1', 'thread:thread-1', 'thread:thread-old'],
		});
		expect(messageRepository.findRecentThreadIdsByResourceId).toHaveBeenCalledWith(
			'agent-1',
			'integration:slack:U1',
			200,
		);
	});

	it('keeps the resource as the scope for non-integration turns without a thread lookup', async () => {
		messageRepository.findRecentThreadIdsByResourceId.mockClear();

		const scope = await resolver.resolveDefault('agent-1', {
			resourceId: 'n8n-chat-production:user-1',
			threadId: 'thread-1',
		});

		expect(scope).toEqual({
			writeScopeId: 'n8n-chat-production:user-1',
			readScopeIds: ['n8n-chat-production:user-1'],
		});
		expect(messageRepository.findRecentThreadIdsByResourceId).not.toHaveBeenCalled();
	});
});
