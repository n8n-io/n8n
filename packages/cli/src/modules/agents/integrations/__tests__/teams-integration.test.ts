import type { Logger } from '@n8n/backend-common';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ConflictError } from '@/errors/response-errors/conflict.error';

import type { Agent } from '../../entities/agent.entity';
import type { AgentRepository } from '../../repositories/agent.repository';
import {
	ChatIntegrationRegistry,
	type AgentChatIntegrationContext,
} from '../agent-chat-integration';
import { TeamsIntegration } from '../platforms/teams-integration';

const createTeamsAdapter = vi.fn(() => ({ name: 'teams' }));

// The adapter is ESM-only; production reaches it through esm-loader's
// `new Function()` indirection, which cannot run under vitest. A spy stands in
// here so the adapter config this integration builds can be asserted directly.
vi.mock('../esm-loader', () => ({
	loadTeamsAdapter: async () => ({ createTeamsAdapter }),
}));

const AGENT_ID = 'agent-1';
const CREDENTIAL_ID = 'cred-teams';
const CLIENT_ID = '11111111-2222-3333-4444-555555555555';
const TENANT_ID = '99999999-8888-7777-6666-555555555555';
const CLIENT_SECRET = 'test-client-secret';

function servicePrincipalCredential(overrides: Record<string, unknown> = {}) {
	return {
		authentication: 'clientSecret',
		tenantId: TENANT_ID,
		clientId: CLIENT_ID,
		clientSecret: CLIENT_SECRET,
		graphApiBaseUrl: 'https://graph.microsoft.com',
		...overrides,
	};
}

function connectionContext(
	credential: Record<string, unknown> = servicePrincipalCredential(),
): AgentChatIntegrationContext {
	return {
		agentId: AGENT_ID,
		projectId: 'project-1',
		credentialId: CREDENTIAL_ID,
		credential,
		integration: { type: 'teams', credentialId: CREDENTIAL_ID, settings: undefined },
		ingressEnabled: true,
		webhookUrlFor: (platform: string) => `https://n8n.example.com/webhooks/${platform}`,
	};
}

function createIntegration(agentRepository = mock<AgentRepository>()) {
	agentRepository.findByIntegrationCredential.mockResolvedValue([]);
	return { integration: new TeamsIntegration(mock<Logger>(), agentRepository), agentRepository };
}

describe('TeamsIntegration', () => {
	beforeEach(() => {
		createTeamsAdapter.mockClear();
	});

	describe('platform capabilities', () => {
		it('reuses the Microsoft Entra service principal credential', () => {
			const { integration } = createIntegration();
			expect(integration.credentialTypes).toEqual(['microsoftEntraServicePrincipalApi']);
		});

		it('stays hidden from the public integrations catalog', () => {
			const { integration } = createIntegration();
			expect(integration.internal).toBe(true);
		});

		it('buffers agent output instead of streaming it', () => {
			const { integration } = createIntegration();
			expect(integration.disableStreaming).toBe(true);
		});

		it('runs on every main because Teams only receives webhooks', () => {
			const { integration } = createIntegration();
			expect(integration.requiresLeader()).toBe(false);
		});

		it('carries full Adaptive Card action payloads without a callback store', () => {
			const { integration } = createIntegration();
			expect(integration.needsShortCallbackData).toBe(false);
		});

		it('settles an answered action card in place instead of deleting it', () => {
			const { integration } = createIntegration();
			expect(integration.deleteActionMessageBeforeResume).toBe(false);
		});
	});

	describe('createAdapter', () => {
		it('maps the credential onto a single-tenant bot identity', async () => {
			const { integration } = createIntegration();

			await integration.createAdapter(connectionContext());

			expect(createTeamsAdapter).toHaveBeenCalledWith(
				expect.objectContaining({
					appId: CLIENT_ID,
					appPassword: CLIENT_SECRET,
					appTenantId: TENANT_ID,
					appType: 'SingleTenant',
				}),
			);
		});

		it('trims whitespace pasted into credential fields', async () => {
			const { integration } = createIntegration();

			await integration.createAdapter(
				connectionContext(servicePrincipalCredential({ clientId: `  ${CLIENT_ID}  ` })),
			);

			expect(createTeamsAdapter).toHaveBeenCalledWith(
				expect.objectContaining({ appId: CLIENT_ID }),
			);
		});

		it('rejects a credential that uses certificate authentication', async () => {
			const { integration } = createIntegration();
			const credential = servicePrincipalCredential({
				authentication: 'certificate',
				clientSecret: '',
				privateKey: 'pem-key',
				certificate: 'pem-cert',
			});

			await expect(integration.createAdapter(connectionContext(credential))).rejects.toThrow(
				UserError,
			);
			await expect(integration.createAdapter(connectionContext(credential))).rejects.toThrow(
				/certificate authentication/i,
			);
			expect(createTeamsAdapter).not.toHaveBeenCalled();
		});

		it('pins the Bot Connector host instead of letting an env var choose it', async () => {
			const { integration } = createIntegration();

			await integration.createAdapter(connectionContext());

			expect(createTeamsAdapter).toHaveBeenCalledWith(
				expect.objectContaining({ apiUrl: 'https://smba.trafficmanager.net/teams' }),
			);
		});

		it.each([
			'https://graph.microsoft.us',
			'https://dod-graph.microsoft.us',
			'https://microsoftgraph.chinacloudapi.cn',
		])('rejects the sovereign cloud %s', async (graphApiBaseUrl) => {
			const { integration } = createIntegration();

			await expect(
				integration.createAdapter(
					connectionContext(servicePrincipalCredential({ graphApiBaseUrl })),
				),
			).rejects.toThrow(/global Microsoft cloud/);
			expect(createTeamsAdapter).not.toHaveBeenCalled();
		});

		it.each([
			['clientId', /Application \(client\) ID/],
			['clientSecret', /Client Secret/],
			['tenantId', /Directory \(tenant\) ID/],
		])('rejects a credential with no %s', async (field, message) => {
			const { integration } = createIntegration();

			await expect(
				integration.createAdapter(connectionContext(servicePrincipalCredential({ [field]: '' }))),
			).rejects.toThrow(message);
			expect(createTeamsAdapter).not.toHaveBeenCalled();
		});
	});

	describe('onBeforeConnect', () => {
		it('rejects a credential another agent already connected', async () => {
			const { integration, agentRepository } = createIntegration();
			agentRepository.findByIntegrationCredential.mockResolvedValue([
				mock<Agent>({ name: 'Support bot' }),
			]);

			await expect(integration.onBeforeConnect(connectionContext())).rejects.toThrow(ConflictError);
		});

		it('surfaces a broken credential before the channel connects', async () => {
			const { integration } = createIntegration();

			await expect(
				integration.onBeforeConnect(
					connectionContext(servicePrincipalCredential({ tenantId: '' })),
				),
			).rejects.toThrow(UserError);
		});
	});

	describe('formatActionDecisionMessage', () => {
		const user = { userId: 'u-1', userName: 'alice', fullName: 'Alice', isBot: false, isMe: false };

		it('names the decision when one was resolved', () => {
			const { integration } = createIntegration();

			expect(
				integration.formatActionDecisionMessage({
					approved: false,
					raw: {},
					user,
				} as Parameters<typeof integration.formatActionDecisionMessage>[0]),
			).toBe('🚫 Declined by Alice');
		});

		// Without the CallbackStore the resume handler resolves neither the
		// decision nor the label, so this generic wording is what a Teams
		// approval actually settles to today.
		it('falls back to a generic outcome when no decision reaches it', () => {
			const { integration } = createIntegration();

			expect(
				integration.formatActionDecisionMessage({
					raw: {},
					user,
				} as Parameters<typeof integration.formatActionDecisionMessage>[0]),
			).toBe('✅ Action selected by Alice');
		});
	});

	describe('normalizeComponents', () => {
		it('converts select options into individual buttons', () => {
			const { integration } = createIntegration();

			expect(
				integration.normalizeComponents([
					{
						type: 'select',
						label: 'Environment',
						options: [
							{ label: 'Staging', value: 'staging' },
							{ label: 'Production', value: 'production' },
						],
					},
				]),
			).toEqual([
				{ type: 'button', label: 'Staging', value: 'staging' },
				{ type: 'button', label: 'Production', value: 'production' },
			]);
		});

		it('leaves components Adaptive Cards render natively untouched', () => {
			const { integration } = createIntegration();
			const components = [
				{ type: 'section' as const, text: 'Deploy summary' },
				{ type: 'image' as const, url: 'https://example.com/chart.png', altText: 'Chart' },
				{ type: 'divider' as const },
				{ type: 'button' as const, label: 'Approve', value: 'true' },
			];

			expect(integration.normalizeComponents(components)).toEqual(components);
		});
	});
});

describe('Teams channel registration', () => {
	it('resolves by type but stays out of the public catalog', () => {
		const { integration } = createIntegration();
		const registry = new ChatIntegrationRegistry();
		registry.register(integration);

		expect(registry.get('teams')).toBe(integration);
		expect(registry.listPublic().map((i) => i.type)).not.toContain('teams');
	});
});
