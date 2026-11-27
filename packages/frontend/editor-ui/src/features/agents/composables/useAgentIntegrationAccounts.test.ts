import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getIntegrationAccount } from './useAgentApi';
import { useAgentIntegrationAccounts } from './useAgentIntegrationAccounts';

vi.mock('./useAgentApi', () => ({
	getIntegrationAccount: vi.fn(),
}));

const mockedGetIntegrationAccount = vi.mocked(getIntegrationAccount);

/** The cache is module state, so each test uses its own agent ID. */
let agentCounter = 0;
function nextAgentId() {
	agentCounter += 1;
	return `agent-${agentCounter}`;
}

describe('useAgentIntegrationAccounts', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		mockedGetIntegrationAccount.mockReset();
	});

	it('loads an account and returns it by agent, channel, and credential', async () => {
		const agentId = nextAgentId();
		mockedGetIntegrationAccount.mockResolvedValue({ botName: 'bot' });
		const { getAccount, loadAccount } = useAgentIntegrationAccounts();

		await loadAccount('p1', { agentId, type: 'slack', credentialId: 'c1' });

		expect(getAccount({ agentId, type: 'slack', credentialId: 'c1' })).toEqual({
			botName: 'bot',
		});
		expect(getAccount({ agentId, type: 'slack', credentialId: 'c2' })).toBeUndefined();
	});

	it('requests each key only once', async () => {
		const agentId = nextAgentId();
		mockedGetIntegrationAccount.mockResolvedValue({});
		const { loadAccount } = useAgentIntegrationAccounts();
		const ref = { agentId, type: 'slack', credentialId: 'c1' };

		await Promise.all([loadAccount('p1', ref), loadAccount('p1', ref)]);
		await loadAccount('p1', ref);

		expect(mockedGetIntegrationAccount).toHaveBeenCalledTimes(1);
	});

	it('skips channels without a credential or without mentions', async () => {
		const agentId = nextAgentId();
		const { getAccount, loadAccount } = useAgentIntegrationAccounts();

		await loadAccount('p1', { agentId, type: 'slack', credentialId: undefined });
		await loadAccount('p1', { agentId, type: 'telegram', credentialId: 'c1' });

		expect(mockedGetIntegrationAccount).not.toHaveBeenCalled();
		expect(getAccount({ agentId, type: 'slack', credentialId: undefined })).toBeUndefined();
	});

	it('keeps every result when loads for several channels resolve out of order', async () => {
		const agentId = nextAgentId();
		const resolvers: Record<string, (value: { botName: string }) => void> = {};
		mockedGetIntegrationAccount.mockImplementation(
			async (_context, _projectId, _agentId, type) =>
				await new Promise((resolve) => {
					resolvers[type] = resolve;
				}),
		);
		const { getAccount, loadAccount } = useAgentIntegrationAccounts();

		const slack = loadAccount('p1', { agentId, type: 'slack', credentialId: 'c1' });
		const discord = loadAccount('p1', { agentId, type: 'discord', credentialId: 'c2' });
		resolvers.discord({ botName: 'discord-bot' });
		resolvers.slack({ botName: 'slack-bot' });
		await Promise.all([slack, discord]);

		expect(getAccount({ agentId, type: 'slack', credentialId: 'c1' })).toEqual({
			botName: 'slack-bot',
		});
		expect(getAccount({ agentId, type: 'discord', credentialId: 'c2' })).toEqual({
			botName: 'discord-bot',
		});
	});

	it('allows a retry after a failed request', async () => {
		const agentId = nextAgentId();
		mockedGetIntegrationAccount
			.mockRejectedValueOnce(new Error('network'))
			.mockResolvedValueOnce({ botName: 'bot' });
		const { getAccount, loadAccount } = useAgentIntegrationAccounts();
		const ref = { agentId, type: 'discord', credentialId: 'c1' };

		await expect(loadAccount('p1', ref)).resolves.toBeUndefined();
		expect(getAccount(ref)).toBeUndefined();

		await loadAccount('p1', ref);

		expect(mockedGetIntegrationAccount).toHaveBeenCalledTimes(2);
		expect(getAccount(ref)).toEqual({ botName: 'bot' });
	});
});
