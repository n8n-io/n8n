import { beforeEach, describe, expect, it, vi } from 'vitest';

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

	it('tracks persisted integrations as configured without treating them as connected', async () => {
		apiMocks.getIntegrationStatus.mockResolvedValue({
			status: 'configured',
			integrations: [{ type: 'slack', credentialId: 'cred-slack' }],
		});
		const status = useAgentIntegrationStatus(projectId, agentId);

		await status.fetchStatus(['slack', 'linear']);

		expect(status.statuses.value).toMatchObject({
			slack: 'configured',
			linear: 'disconnected',
		});
		expect(status.isConfigured('slack')).toBe(true);
		expect(status.isConnected('slack')).toBe(false);
	});

	it('tracks integrations on a published agent as both configured and connected', async () => {
		apiMocks.getIntegrationStatus.mockResolvedValue({
			status: 'connected',
			integrations: [{ type: 'slack', credentialId: 'cred-slack' }],
		});
		const status = useAgentIntegrationStatus(projectId, agentId);

		await status.fetchStatus(['slack']);

		expect(status.statuses.value.slack).toBe('connected');
		expect(status.isConfigured('slack')).toBe(true);
		expect(status.isConnected('slack')).toBe(true);
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
});
