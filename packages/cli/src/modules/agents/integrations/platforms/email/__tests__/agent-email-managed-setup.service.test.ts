/* eslint-disable @typescript-eslint/unbound-method -- assertions intentionally inspect mocks */
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { UrlService } from '@/services/url.service';

import type { AgentIntegrationManagementService } from '../../../../agent-integration-management.service';
import type { Agent } from '../../../../entities/agent.entity';
import type { AgentRepository } from '../../../../repositories/agent.repository';
import { AgentEmailManagedSetupService } from '../agent-email-managed-setup.service';
import type { AgentEmailServiceClient } from '../agent-email-service-client';

describe('AgentEmailManagedSetupService', () => {
	const user = mock<User>();
	const agent = mock<Agent>({
		id: 'agent-1',
		projectId: 'project-1',
		activeVersionId: null,
		integrations: [],
	});
	const client = mock<AgentEmailServiceClient>();
	const credentials = mock<CredentialsService>();
	const management = mock<AgentIntegrationManagementService>();
	const repository = mock<AgentRepository>();
	const urlService = mock<UrlService>();
	const logger = mock<Logger>();
	const service = new AgentEmailManagedSetupService(
		client,
		credentials,
		management,
		repository,
		urlService,
		logger,
	);

	beforeEach(() => {
		vi.resetAllMocks();
		repository.findByIdAndProjectId.mockResolvedValue(agent);
		urlService.getWebhookBaseUrl.mockReturnValue('http://localhost:5678/');
		client.provision.mockResolvedValue({
			channelId: 'inbox-1',
			address: 'generated@agentmail.to',
			callbackSecret: 'whsec_callback',
		});
		credentials.createManagedCredential.mockResolvedValue({ id: 'credential-1' } as never);
	});

	it('provisions, stores, and connects an Email channel', async () => {
		management.connect.mockResolvedValue({ integration: {} as never, savedAgent: agent });

		await expect(
			service.provision({ projectId: 'project-1', agentId: 'agent-1', user }),
		).resolves.toEqual({
			credentialId: 'credential-1',
			address: 'generated@agentmail.to',
			status: 'configured',
		});
		expect(client.provision).toHaveBeenCalledWith(
			'agent-1',
			'http://localhost:5678/rest/projects/project-1/agents/v2/agent-1/webhooks/email',
		);
		expect(credentials.createManagedCredential).toHaveBeenCalledWith(
			expect.objectContaining({
				name: 'generated@agentmail.to',
				type: 'agentEmailApi',
			}),
			user,
		);
		expect(management.connect).toHaveBeenCalledWith(
			expect.objectContaining({
				integration: { type: 'email', credentialId: 'credential-1' },
			}),
		);
	});

	it('removes the new credential when connect fails before persistence', async () => {
		management.connect.mockRejectedValue(new Error('connect failed'));
		repository.findIntegrationState.mockResolvedValue({
			integrations: [],
		} as never);

		await expect(
			service.provision({ projectId: 'project-1', agentId: 'agent-1', user }),
		).rejects.toThrow('connect failed');
		expect(credentials.delete).toHaveBeenCalledWith(user, 'credential-1');
	});
});
