import { mock } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { UrlService } from '@/services/url.service';

import type { Agent } from '../../../../entities/agent.entity';
import type { AgentRepository } from '../../../../repositories/agent.repository';
import { TeamsArmTemplateService } from '../teams-arm-template.service';
import { TeamsManifestService } from '../teams-manifest.service';
import { TeamsSetupService } from '../teams-setup.service';

const PROJECT_ID = 'project-1';
const AGENT_ID = 'agent-1';
const CREDENTIAL_ID = 'cred-1';
const CLIENT_ID = '11111111-2222-3333-4444-555555555555';
const TENANT_ID = '99999999-8888-7777-6666-555555555555';

const instanceSettings = mock<InstanceSettings>({ encryptionKey: 'test-encryption-key' });

describe('TeamsSetupService', () => {
	let agentRepository: ReturnType<typeof mock<AgentRepository>>;
	let credentialsService: ReturnType<typeof mock<CredentialsService>>;
	let urlService: ReturnType<typeof mock<UrlService>>;
	let armTemplateService: TeamsArmTemplateService;
	let service: TeamsSetupService;

	/**
	 * `integrations` is assigned rather than passed to `mock`, which proxies
	 * nested objects: the integration's `settings` would come back as mock
	 * functions, so an absent `displayName` would read as present.
	 */
	const agentWith = (integrations: Agent['integrations']) =>
		Object.assign(
			mock<Agent>({
				id: AGENT_ID,
				projectId: PROJECT_ID,
				name: 'Support Bot',
				updatedAt: new Date('2026-09-15T10:00:00.000Z'),
			}),
			{ integrations },
		);

	const connectTeamsCredential = (type = 'microsoftEntraServicePrincipalApi') => {
		agentRepository.findByIdAndProjectId.mockResolvedValue(
			agentWith([{ type: 'teams', credentialId: CREDENTIAL_ID, settings: {} }]),
		);
		credentialsService.findAllCredentialIdsForProject.mockResolvedValue([
			mock({ id: CREDENTIAL_ID, type }),
		]);
		credentialsService.decrypt.mockResolvedValue({
			clientId: CLIENT_ID,
			tenantId: TENANT_ID,
			clientSecret: 'super-secret',
		});
	};

	beforeEach(() => {
		agentRepository = mock<AgentRepository>();
		credentialsService = mock<CredentialsService>();
		urlService = mock<UrlService>();
		urlService.getWebhookBaseUrl.mockReturnValue('https://n8n.example.com/');
		credentialsService.findAllCredentialIdsForProject.mockResolvedValue([]);
		credentialsService.findAllGlobalCredentialIds.mockResolvedValue([]);
		agentRepository.findByIdAndProjectId.mockResolvedValue(agentWith([]));

		armTemplateService = new TeamsArmTemplateService(instanceSettings, urlService);
		service = new TeamsSetupService(
			agentRepository,
			credentialsService,
			new TeamsManifestService(),
			armTemplateService,
			urlService,
		);
	});

	describe('getSetupState', () => {
		it('always shows the messaging endpoint URL, credential or not', async () => {
			const state = await service.getSetupState({ projectId: PROJECT_ID, agentId: AGENT_ID });

			expect(state.messagingEndpointUrl).toBe(
				'https://n8n.example.com/rest/projects/project-1/agents/v2/agent-1/webhooks/teams',
			);
		});

		it('withholds the deployment until a credential supplies the Entra IDs', async () => {
			const state = await service.getSetupState({ projectId: PROJECT_ID, agentId: AGENT_ID });

			expect(state.botId).toBeNull();
			expect(state.deployToAzureUrl).toBeNull();
		});

		it('pre-fills the deployment from a credential that is picked but not yet connected', async () => {
			credentialsService.findAllCredentialIdsForProject.mockResolvedValue([
				mock({ id: CREDENTIAL_ID, type: 'microsoftEntraServicePrincipalApi' }),
			]);
			credentialsService.decrypt.mockResolvedValue({
				clientId: CLIENT_ID,
				tenantId: TENANT_ID,
				clientSecret: 'super-secret',
			});

			const state = await service.getSetupState(
				{ projectId: PROJECT_ID, agentId: AGENT_ID },
				CREDENTIAL_ID,
			);

			expect(state.botId).toBe(CLIENT_ID);
			expect(state.deployToAzureUrl).toContain('portal.azure.com');
		});

		it('reports the bot once a credential is connected', async () => {
			connectTeamsCredential();

			const state = await service.getSetupState({ projectId: PROJECT_ID, agentId: AGENT_ID });

			expect(state.botId).toBe(CLIENT_ID);
		});

		it('ignores a connected credential of the wrong type', async () => {
			connectTeamsCredential('slackApi');

			const state = await service.getSetupState({ projectId: PROJECT_ID, agentId: AGENT_ID });

			expect(state.botId).toBeNull();
		});

		it('never leaks the client secret', async () => {
			connectTeamsCredential();

			const state = await service.getSetupState({ projectId: PROJECT_ID, agentId: AGENT_ID });

			expect(JSON.stringify(state)).not.toContain('super-secret');
		});
	});

	describe('buildPackage', () => {
		it('refuses to build a package before a credential supplies the client ID', async () => {
			await expect(
				service.buildPackage({ projectId: PROJECT_ID, agentId: AGENT_ID }),
			).rejects.toThrow(/Add the credential/);
		});

		it('builds a package from a credential that is picked but not yet connected', async () => {
			credentialsService.findAllCredentialIdsForProject.mockResolvedValue([
				mock({ id: CREDENTIAL_ID, type: 'microsoftEntraServicePrincipalApi' }),
			]);
			credentialsService.decrypt.mockResolvedValue({
				clientId: CLIENT_ID,
				tenantId: TENANT_ID,
			});

			await expect(
				service.buildPackage({ projectId: PROJECT_ID, agentId: AGENT_ID }, CREDENTIAL_ID),
			).resolves.toBeInstanceOf(Buffer);
		});

		it('builds a package once a credential is connected', async () => {
			connectTeamsCredential();

			await expect(
				service.buildPackage({ projectId: PROJECT_ID, agentId: AGENT_ID }),
			).resolves.toBeInstanceOf(Buffer);
		});
	});

	describe('buildArmTemplate', () => {
		const validToken = () =>
			new URL(
				armTemplateService.buildTemplateUrl(PROJECT_ID, AGENT_ID, CREDENTIAL_ID),
			).searchParams.get('token') ?? '';

		it('rejects a request without a usable token', async () => {
			connectTeamsCredential();

			await expect(
				service.buildArmTemplate({
					projectId: PROJECT_ID,
					agentId: AGENT_ID,
					credentialId: CREDENTIAL_ID,
					token: 'nope',
				}),
			).rejects.toThrow(/expired/);
		});

		it('does not read the agent at all when the token is bad', async () => {
			await expect(
				service.buildArmTemplate({
					projectId: PROJECT_ID,
					agentId: AGENT_ID,
					credentialId: CREDENTIAL_ID,
					token: 'nope',
				}),
			).rejects.toThrow();

			expect(agentRepository.findByIdAndProjectId).not.toHaveBeenCalled();
		});

		it('returns a template carrying the credential values for a valid token', async () => {
			connectTeamsCredential();

			const template = await service.buildArmTemplate({
				projectId: PROJECT_ID,
				agentId: AGENT_ID,
				credentialId: CREDENTIAL_ID,
				token: validToken(),
			});

			const parameters = template.parameters as Record<string, { defaultValue: unknown }>;
			expect(parameters.msaAppId.defaultValue).toBe(CLIENT_ID);
			expect(parameters.msaAppTenantId.defaultValue).toBe(TENANT_ID);
			expect(parameters.messagingEndpoint.defaultValue).toBe(
				'https://n8n.example.com/rest/projects/project-1/agents/v2/agent-1/webhooks/teams',
			);
		});

		it('never puts the client secret in the template', async () => {
			connectTeamsCredential();

			const template = await service.buildArmTemplate({
				projectId: PROJECT_ID,
				agentId: AGENT_ID,
				credentialId: CREDENTIAL_ID,
				token: validToken(),
			});

			expect(JSON.stringify(template)).not.toContain('super-secret');
		});
	});
});
