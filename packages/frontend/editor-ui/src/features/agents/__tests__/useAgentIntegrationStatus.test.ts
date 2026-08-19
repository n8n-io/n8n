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

	it('preserves states the server already confirmed when a refresh fails', async () => {
		syncAgentIntegrationStatusCache(
			projectId,
			agentId,
			['slack'],
			[{ type: 'slack', credentialId: 'cred-slack', status: 'configured' }],
		);
		syncAgentIntegrationStatusCache(
			projectId,
			agentId,
			['linear'],
			[{ type: 'linear', credentialId: 'cred-linear', status: 'connected' }],
		);
		syncAgentIntegrationStatusCache(
			projectId,
			agentId,
			['discord'],
			[{ type: 'discord', credentialId: 'cred-discord', status: 'error' }],
		);
		apiMocks.getIntegrationStatus.mockRejectedValue(new Error('network error'));
		const status = useAgentIntegrationStatus(projectId, agentId);

		await status.fetchStatus(['slack', 'linear', 'discord', 'telegram']);

		expect(status.statuses.value).toMatchObject({
			slack: 'configured',
			linear: 'connected',
			// A failed refresh must not turn a known failure into a shrug.
			discord: 'error',
			telegram: 'unknown',
		});
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
