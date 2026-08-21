import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ResponseError } from '@n8n/rest-api-client';

import {
	clearAgentIntegrationStatusCache,
	syncAgentIntegrationStatusCache,
	useAgentIntegrationStatus,
} from '../composables/useAgentIntegrationStatus';

const apiMocks = vi.hoisted(() => ({
	connectIntegration: vi.fn(),
	disconnectIntegration: vi.fn(),
	getIntegrationStatus: vi.fn(),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: {} }),
}));

vi.mock('../composables/useAgentApi', () => apiMocks);

const projectId = 'project-1';
const agentId = 'agent-1';

describe('useAgentIntegrationStatus', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearAgentIntegrationStatusCache(projectId, agentId);
	});

	it.each([
		{ serverStatus: 'configured' as const, connected: false },
		{ serverStatus: 'starting' as const, connected: false },
		{ serverStatus: 'connected' as const, connected: true },
		{ serverStatus: 'error' as const, connected: false },
	])('tracks a $serverStatus channel', async ({ serverStatus, connected }) => {
		apiMocks.getIntegrationStatus.mockResolvedValue({
			status: serverStatus,
			integrations: [{ type: 'slack', credentialId: 'cred-slack', status: serverStatus }],
		});
		const status = useAgentIntegrationStatus(projectId, agentId);

		await status.fetchStatus(['slack']);

		expect(status.statuses.value.slack).toBe(serverStatus);
		// Every one of these means the channel is set up, so the list keeps
		// offering Edit and Disconnect rather than a Connect button.
		expect(status.isConfigured('slack')).toBe(true);
		expect(status.isConnected('slack')).toBe(connected);
		expect(status.hasRuntimeError('slack')).toBe(serverStatus === 'error');
	});

	it('takes each channel from its own status, not the rollup', async () => {
		apiMocks.getIntegrationStatus.mockResolvedValue({
			status: 'partial',
			integrations: [
				{ type: 'slack', credentialId: 'cred-slack', status: 'connected' },
				{
					type: 'telegram',
					credentialId: 'cred-telegram',
					status: 'error',
					errorMessage: 'Credential cred-telegram not found',
				},
			],
		});
		const status = useAgentIntegrationStatus(projectId, agentId);

		await status.fetchStatus(['slack', 'telegram']);

		expect(status.isConnected('slack')).toBe(true);
		expect(status.hasRuntimeError('telegram')).toBe(true);
		expect(status.runtimeErrors.value.telegram).toBe('Credential cred-telegram not found');
	});

	it('drops a stale runtime error once the channel starts', async () => {
		const status = useAgentIntegrationStatus(projectId, agentId);
		apiMocks.getIntegrationStatus.mockResolvedValue({
			status: 'error',
			integrations: [
				{ type: 'slack', credentialId: 'cred-slack', status: 'error', errorMessage: 'boom' },
			],
		});
		await status.fetchStatus(['slack']);
		expect(status.runtimeErrors.value.slack).toBe('boom');

		apiMocks.getIntegrationStatus.mockResolvedValue({
			status: 'connected',
			integrations: [{ type: 'slack', credentialId: 'cred-slack', status: 'connected' }],
		});
		await status.fetchStatus(['slack']);

		expect(status.runtimeErrors.value.slack).toBe('');
		expect(status.hasRuntimeError('slack')).toBe(false);
	});

	it('uses the configuration response status after saving an integration', async () => {
		apiMocks.connectIntegration.mockResolvedValue({
			status: 'configured',
		});
		const status = useAgentIntegrationStatus(projectId, agentId);

		await status.connect('telegram', 'cred-telegram', { accessMode: 'public', allowedUsers: [] });

		expect(status.statuses.value.telegram).toBe('configured');
		expect(status.connectedCredentials.value.telegram).toBe('cred-telegram');
		expect(status.isConfigured('telegram')).toBe(true);
		expect(status.isConnected('telegram')).toBe(false);
	});

	it('does not pass a locally-seeded status off as a server answer', async () => {
		// The builder seeds this cache from the agent's own configuration so the
		// panel can render before the status endpoint replies. If that request then
		// fails, the seeded guess must not be preserved as though it were confirmed.
		syncAgentIntegrationStatusCache(
			projectId,
			agentId,
			['slack'],
			[{ type: 'slack', credentialId: 'cred-slack', status: 'starting' }],
		);
		apiMocks.getIntegrationStatus.mockRejectedValue(new Error('network error'));
		const status = useAgentIntegrationStatus(projectId, agentId);

		await status.fetchStatus(['slack']);

		expect(status.statuses.value.slack).toBe('unknown');
	});

	it('keeps a server-confirmed starting status when a later refresh fails', async () => {
		apiMocks.getIntegrationStatus.mockResolvedValue({
			status: 'partial',
			integrations: [{ type: 'slack', credentialId: 'cred-slack', status: 'starting' }],
		});
		const status = useAgentIntegrationStatus(projectId, agentId);
		await status.fetchStatus(['slack']);

		apiMocks.getIntegrationStatus.mockRejectedValue(new Error('network error'));
		await status.fetchStatus(['slack']);

		expect(status.statuses.value.slack).toBe('starting');
	});

	it('preserves states the server already confirmed when a refresh fails', async () => {
		apiMocks.getIntegrationStatus.mockResolvedValue({
			status: 'partial',
			integrations: [
				{ type: 'slack', credentialId: 'cred-slack', status: 'configured' },
				{ type: 'linear', credentialId: 'cred-linear', status: 'connected' },
				{ type: 'discord', credentialId: 'cred-discord', status: 'error' },
			],
		});
		const status = useAgentIntegrationStatus(projectId, agentId);
		await status.fetchStatus(['slack', 'linear', 'discord']);

		apiMocks.getIntegrationStatus.mockRejectedValue(new Error('network error'));
		await status.fetchStatus(['slack', 'linear', 'discord', 'telegram']);

		expect(status.statuses.value).toMatchObject({
			slack: 'configured',
			linear: 'connected',
			// A failed refresh must not turn a known failure into a shrug.
			discord: 'error',
			// Never answered for, so there is nothing to preserve.
			telegram: 'unknown',
		});
	});

	it('keeps a connect result when a later refresh fails, since the server did answer', async () => {
		apiMocks.connectIntegration.mockResolvedValue({ status: 'connected' });
		const status = useAgentIntegrationStatus(projectId, agentId);
		await status.connect('slack', 'cred-slack');

		apiMocks.getIntegrationStatus.mockRejectedValue(new Error('network error'));
		await status.fetchStatus(['slack']);

		expect(status.statuses.value.slack).toBe('connected');
	});

	it('keeps a disconnect result when a later refresh fails', async () => {
		apiMocks.disconnectIntegration.mockResolvedValue({ status: 'disconnected' });
		const status = useAgentIntegrationStatus(projectId, agentId);
		await status.disconnect('slack', 'cred-slack');

		apiMocks.getIntegrationStatus.mockRejectedValue(new Error('network error'));
		await status.fetchStatus(['slack']);

		expect(status.statuses.value.slack).toBe('disconnected');
	});

	it('does not let a builder re-seed downgrade a channel the server confirmed', async () => {
		// Every builder write re-seeds this cache from local configuration, where a
		// published agent's channels read as `starting`. That guess must not replace
		// what the status endpoint said — nothing on that path refetches to correct it.
		apiMocks.getIntegrationStatus.mockResolvedValue({
			status: 'partial',
			integrations: [
				{ type: 'slack', credentialId: 'cred-slack', status: 'connected' },
				{ type: 'discord', credentialId: 'cred-discord', status: 'error', errorMessage: 'boom' },
			],
		});
		const status = useAgentIntegrationStatus(projectId, agentId);
		await status.fetchStatus(['slack', 'discord']);

		syncAgentIntegrationStatusCache(
			projectId,
			agentId,
			['slack', 'discord'],
			[
				{ type: 'slack', credentialId: 'cred-slack', status: 'starting' },
				{ type: 'discord', credentialId: 'cred-discord', status: 'starting' },
			],
		);

		expect(status.statuses.value.slack).toBe('connected');
		expect(status.statuses.value.discord).toBe('error');
		expect(status.runtimeErrors.value.discord).toBe('boom');
	});

	it('lets an unpublish seed retire a channel the server reported as running', async () => {
		// Unpublishing is configuration's own fact, and the channels of an
		// unpublished agent are not running whatever they were doing before — so the
		// seed's `configured` outranks the earlier `connected`, and the error of a
		// channel that had failed goes with it.
		apiMocks.getIntegrationStatus.mockResolvedValue({
			status: 'partial',
			integrations: [
				{ type: 'slack', credentialId: 'cred-slack', status: 'connected' },
				{ type: 'discord', credentialId: 'cred-discord', status: 'error', errorMessage: 'boom' },
			],
		});
		const status = useAgentIntegrationStatus(projectId, agentId);
		await status.fetchStatus(['slack', 'discord']);

		syncAgentIntegrationStatusCache(
			projectId,
			agentId,
			['slack', 'discord'],
			[
				{ type: 'slack', credentialId: 'cred-slack', status: 'configured' },
				{ type: 'discord', credentialId: 'cred-discord', status: 'configured' },
			],
		);

		expect(status.statuses.value.slack).toBe('configured');
		expect(status.statuses.value.discord).toBe('configured');
		expect(status.runtimeErrors.value.discord).toBe('');
	});

	it('still takes the credential and settings of a confirmed channel from configuration', async () => {
		// Only the status is the server's to know; what the channel is set up with is
		// the builder's own write, which is what the seed exists to carry.
		apiMocks.getIntegrationStatus.mockResolvedValue({
			status: 'connected',
			integrations: [{ type: 'telegram', credentialId: 'cred-old', status: 'connected' }],
		});
		const status = useAgentIntegrationStatus(projectId, agentId);
		await status.fetchStatus(['telegram']);

		syncAgentIntegrationStatusCache(
			projectId,
			agentId,
			['telegram'],
			[{ type: 'telegram', credentialId: 'cred-new', status: 'starting' }],
		);

		expect(status.statuses.value.telegram).toBe('connected');
		expect(status.connectedCredentials.value.telegram).toBe('cred-new');
	});

	it('seeds a channel the server last reported as absent', async () => {
		// The answer was about a channel that did not exist then. Configuration has
		// one now — just added in the builder — so the seed is the fresher account.
		apiMocks.getIntegrationStatus.mockResolvedValue({ status: 'configured', integrations: [] });
		const status = useAgentIntegrationStatus(projectId, agentId);
		await status.fetchStatus(['slack']);
		expect(status.statuses.value.slack).toBe('disconnected');

		syncAgentIntegrationStatusCache(
			projectId,
			agentId,
			['slack'],
			[{ type: 'slack', credentialId: 'cred-slack', status: 'starting' }],
		);

		expect(status.statuses.value.slack).toBe('starting');
	});

	it('forgets a confirmed channel that configuration no longer has', async () => {
		apiMocks.getIntegrationStatus.mockResolvedValue({
			status: 'connected',
			integrations: [{ type: 'slack', credentialId: 'cred-slack', status: 'connected' }],
		});
		const status = useAgentIntegrationStatus(projectId, agentId);
		await status.fetchStatus(['slack']);

		// Removed in the builder.
		syncAgentIntegrationStatusCache(projectId, agentId, ['slack'], []);
		expect(status.statuses.value.slack).toBe('disconnected');

		// And the stale answer is gone with it, so a failed refresh has nothing to
		// preserve rather than resurrecting a channel that no longer exists.
		apiMocks.getIntegrationStatus.mockRejectedValue(new Error('network error'));
		await status.fetchStatus(['slack']);

		expect(status.statuses.value.slack).toBe('unknown');
	});

	it('clears a cached integration error', async () => {
		apiMocks.connectIntegration.mockRejectedValue(
			new ResponseError('Slack credential is already connected', { httpStatusCode: 409 }),
		);
		const status = useAgentIntegrationStatus(projectId, agentId);
		await expect(status.connect('slack', 'cred-slack')).rejects.toThrow(
			'Slack credential is already connected',
		);
		expect(status.errorMessages.value.slack).toBe('Slack credential is already connected');
		expect(status.errorIsConflict.value.slack).toBe(true);

		status.clearError('slack');

		expect(status.errorMessages.value.slack).toBe('');
		expect(status.errorIsConflict.value.slack).toBe(false);
	});
});
