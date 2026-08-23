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
		{ serverStatus: 'connected' as const, connected: true },
	])('tracks a $serverStatus integration', async ({ serverStatus, connected }) => {
		apiMocks.getIntegrationStatus.mockResolvedValue({
			status: serverStatus,
			integrations: [{ type: 'slack', credentialId: 'cred-slack' }],
		});
		const status = useAgentIntegrationStatus(projectId, agentId);

		await status.fetchStatus(['slack']);

		expect(status.statuses.value.slack).toBe(serverStatus);
		expect(status.isConfigured('slack')).toBe(true);
		expect(status.isConnected('slack')).toBe(connected);
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

	it('preserves confirmed configured and connected states when a refresh fails', async () => {
		syncAgentIntegrationStatusCache(
			projectId,
			agentId,
			['slack'],
			[{ type: 'slack', credentialId: 'cred-slack' }],
			'configured',
		);
		syncAgentIntegrationStatusCache(
			projectId,
			agentId,
			['linear'],
			[{ type: 'linear', credentialId: 'cred-linear' }],
			'connected',
		);
		apiMocks.getIntegrationStatus.mockRejectedValue(new Error('network error'));
		const status = useAgentIntegrationStatus(projectId, agentId);

		await status.fetchStatus(['slack', 'linear', 'telegram']);

		expect(status.statuses.value).toMatchObject({
			slack: 'configured',
			linear: 'connected',
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
