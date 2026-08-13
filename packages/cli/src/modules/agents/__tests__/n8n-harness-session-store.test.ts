import type {
	HarnessAgentContinueTurnState,
	HarnessAgentResumeSessionState,
} from '@n8n/agents/harness';
import type { AgentsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import type { N8nHarnessSessionCleanupService } from '../integrations/n8n-harness-session-cleanup.service';
import { N8nHarnessSessionStore } from '../integrations/n8n-harness-session-store';
import type { AgentHarnessSession } from '../entities/agent-harness-session.entity';
import type { AgentHarnessSessionRepository } from '../repositories/agent-harness-session.repository';
import { createReusableDaytonaSandboxId } from '../utils/harness-sandbox-provider';

const scope = {
	projectId: 'project-1',
	agentId: 'agent-1',
	threadId: 'thread-1',
	resourceId: 'resource-1',
	runtimeIdentity: 'identity-1',
	adapter: 'claude-code',
};

function makeRow(overrides: Partial<AgentHarnessSession> = {}): AgentHarnessSession {
	return {
		...scope,
		sessionId: 'sandbox-1',
		state: null,
		status: 'claimed',
		ownershipEpoch: 2,
		claimToken: 'stored-token',
		...overrides,
	} as AgentHarnessSession;
}

function makeService() {
	const repository = mock<AgentHarnessSessionRepository>();
	const cleanup = mock<N8nHarnessSessionCleanupService>();
	const config = mock<AgentsConfig>({
		modules: ['harnesses'],
		harnessClaimTtlSeconds: 60,
		harnessSessionTtlSeconds: 600,
	});
	cleanup.destroySupersededForThread.mockResolvedValue(false);
	cleanup.destroyExpiredForThread.mockResolvedValue(false);
	repository.acquire.mockResolvedValue(makeRow());
	repository.release.mockResolvedValue(true);
	repository.saveClaimedState.mockResolvedValue(true);
	repository.deleteClaimed.mockResolvedValue(true);
	return { service: new N8nHarnessSessionStore(repository, config, cleanup), repository, cleanup };
}

describe('N8nHarnessSessionStore', () => {
	it('rejects a concurrent claim and accepts an expired-claim takeover epoch', async () => {
		const { service, repository } = makeService();
		const claim = await service.claim(scope);
		expect(claim.fence.ownershipEpoch).toBe(2);
		await claim.release();

		repository.acquire.mockResolvedValueOnce(null);
		await expect(service.claim(scope)).rejects.toThrow(
			'This harness conversation is already processing another turn',
		);
	});

	it('rejects a stale writer after its fenced claim loses ownership', async () => {
		const { service, repository } = makeService();
		const claim = await service.claim(scope);
		repository.saveClaimedState.mockResolvedValueOnce(false);

		await expect(claim.save({ sessionId: 'sandbox-1' })).rejects.toThrow(
			'Harness session ownership was lost',
		);
		await claim.release();
	});

	it.each([
		[
			'resumeFrom',
			{
				type: 'resume-session',
				specificationVersion: 'harness-v1',
				harnessId: 'claude-code',
				data: {},
			},
		],
		[
			'continueFrom',
			{
				type: 'continue-turn',
				specificationVersion: 'harness-v1',
				harnessId: 'claude-code',
				data: {},
			},
		],
	] as const)('persists %s state under the active fence', async (field, state) => {
		const { service, repository } = makeService();
		const claim = await service.claim(scope);
		const typedState =
			field === 'resumeFrom'
				? (state as HarnessAgentResumeSessionState)
				: (state as HarnessAgentContinueTurnState);

		await claim.save({ sessionId: 'sandbox-1', [field]: typedState });

		expect(repository.saveClaimedState).toHaveBeenCalledWith(
			expect.objectContaining({ ownershipEpoch: 2 }),
			{
				sessionId: 'sandbox-1',
				serializedState: JSON.stringify(state),
			},
			600_000,
		);
		await claim.release();
	});

	it('destroys a superseded identity and exposes a visible reset boundary', async () => {
		const { service, repository, cleanup } = makeService();
		cleanup.destroySupersededForThread.mockResolvedValueOnce(true);

		await expect(service.claim(scope)).rejects.toThrow(
			'This agent changed since the conversation started',
		);
		expect(repository.acquire).not.toHaveBeenCalled();
	});

	it('destroys an expired session and exposes a visible reset boundary', async () => {
		const { service, repository, cleanup } = makeService();
		cleanup.destroyExpiredForThread.mockResolvedValueOnce(true);

		await expect(service.claim(scope)).rejects.toThrow('This agent session expired');
		expect(repository.acquire).not.toHaveBeenCalled();
	});

	it('reuses one Daytona sandbox for the same project and user scope', async () => {
		const { service, repository } = makeService();
		const daytonaScope = { ...scope, adapter: 'codex:daytona' };
		const sessionId = createReusableDaytonaSandboxId(daytonaScope);
		repository.acquire.mockResolvedValue(makeRow({ adapter: daytonaScope.adapter, sessionId }));

		const claim = await service.claim(daytonaScope);

		expect(repository.acquire).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ sessionId }),
		);
		await claim.release();
	});

	it('rejects concurrent local turns sharing a reusable Daytona sandbox', async () => {
		const { service, repository } = makeService();
		const daytonaScope = { ...scope, adapter: 'codex:daytona' };
		const sessionId = createReusableDaytonaSandboxId(daytonaScope);
		repository.acquire
			.mockResolvedValueOnce(makeRow({ adapter: daytonaScope.adapter, sessionId }))
			.mockResolvedValueOnce(
				makeRow({ adapter: daytonaScope.adapter, sessionId, threadId: 'thread-2' }),
			);
		const firstClaim = await service.claim(daytonaScope);

		await expect(service.claim({ ...daytonaScope, threadId: 'thread-2' })).rejects.toThrow(
			'already has another harness conversation running',
		);
		await firstClaim.release();
	});
});
