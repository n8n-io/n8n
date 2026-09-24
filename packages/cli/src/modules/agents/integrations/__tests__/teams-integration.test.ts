import type { Logger } from '@n8n/backend-common';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ConflictError } from '@/errors/response-errors/conflict.error';

import type { Agent } from '../../entities/agent.entity';
import type { AgentRepository } from '../../repositories/agent.repository';
import type { AgentChatIntegrationContext } from '../agent-chat-integration';
import {
	TEAMS_APP_ID as CLIENT_ID,
	TEAMS_CLIENT_SECRET as CLIENT_SECRET,
	TEAMS_TENANT_ID as TENANT_ID,
} from './helpers/teams/synthetic-fixtures';
import { TeamsIntegration } from '../platforms/teams/teams-integration';

const createTeamsAdapter = vi.fn(() => ({ name: 'teams' }));

// The adapter is ESM-only; production reaches it through esm-loader's
// `new Function()` indirection, which cannot run under vitest. A spy stands in
// here so the adapter config this integration builds can be asserted directly.
vi.mock('../esm-loader', () => ({
	loadTeamsAdapter: async () => ({ createTeamsAdapter }),
}));

const AGENT_ID = 'agent-1';
const CREDENTIAL_ID = 'cred-teams';

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

describe('TeamsIntegration', () => {
	let integration: TeamsIntegration;
	let agentRepository: ReturnType<typeof mock<AgentRepository>>;

	beforeEach(() => {
		createTeamsAdapter.mockClear();
		agentRepository = mock<AgentRepository>();
		agentRepository.findByIntegrationCredential.mockResolvedValue([]);
		integration = new TeamsIntegration(mock<Logger>(), agentRepository);
	});

	describe('platform capabilities', () => {
		it('reuses the Entra credential, stays hidden, buffers, and settles in place', () => {
			expect(integration).toMatchObject({
				credentialTypes: ['microsoftEntraServicePrincipalApi'],
				internal: true,
				disableStreaming: true,
				// Left at the base-class default: full Adaptive Card payloads fit, so
				// no callback store is needed.
				needsShortCallbackData: false,
				deleteActionMessageBeforeResume: false,
			});
		});

		// Also the base-class default; asserted because Teams receiving only
		// webhooks is what makes that default correct here.
		it('runs on every main', () => {
			expect(integration.requiresLeader()).toBe(false);
		});
	});

	describe('createAdapter', () => {
		it('maps the credential onto a single-tenant bot identity', async () => {
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
			await integration.createAdapter(
				connectionContext(servicePrincipalCredential({ clientId: `  ${CLIENT_ID}  ` })),
			);

			expect(createTeamsAdapter).toHaveBeenCalledWith(
				expect.objectContaining({ appId: CLIENT_ID }),
			);
		});

		it('rejects a credential that uses certificate authentication', async () => {
			const credential = servicePrincipalCredential({
				authentication: 'certificate',
				clientSecret: '',
				privateKey: 'pem-key',
				certificate: 'pem-cert',
			});

			const rejected = integration.createAdapter(connectionContext(credential));
			await expect(rejected).rejects.toThrow(UserError);
			await expect(rejected).rejects.toThrow(/certificate authentication/i);
			expect(createTeamsAdapter).not.toHaveBeenCalled();
		});

		it('pins the Bot Connector host instead of letting an env var choose it', async () => {
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
			await expect(
				integration.createAdapter(
					connectionContext(servicePrincipalCredential({ graphApiBaseUrl })),
				),
			).rejects.toThrow(/global Microsoft cloud/);
			expect(createTeamsAdapter).not.toHaveBeenCalled();
		});

		it.each([
			'tenant/id',
			'tenant id',
			'tenant@id',
			'tenant?id',
			'tenant#id',
			// Dot segments pass an alphabet check, then normalize the tenant away.
			'.',
			'..',
			'-',
			'a-',
			'-a',
			'a..b',
			// A verified domain always has at least two labels.
			'contoso',
		])('rejects the malformed tenant ID %p', async (tenantId) => {
			await expect(
				integration.createAdapter(connectionContext(servicePrincipalCredential({ tenantId }))),
			).rejects.toThrow(/invalid Directory \(tenant\) ID/);
			expect(createTeamsAdapter).not.toHaveBeenCalled();
		});

		it.each([TENANT_ID, 'contoso.onmicrosoft.com', 'a.b', 'my-tenant.example.com'])(
			'accepts the tenant ID %p',
			async (tenantId) => {
				await expect(
					integration.createAdapter(connectionContext(servicePrincipalCredential({ tenantId }))),
				).resolves.toBeDefined();
				expect(createTeamsAdapter).toHaveBeenCalledWith(
					expect.objectContaining({ appTenantId: tenantId }),
				);
			},
		);

		it.each([
			['clientId', /Application \(client\) ID/],
			['clientSecret', /Client Secret/],
			['tenantId', /Directory \(tenant\) ID/],
		])('rejects a credential with no %s', async (field, message) => {
			await expect(
				integration.createAdapter(connectionContext(servicePrincipalCredential({ [field]: '' }))),
			).rejects.toThrow(message);
			expect(createTeamsAdapter).not.toHaveBeenCalled();
		});
	});

	describe('onBeforeConnect', () => {
		it('rejects a credential another agent already connected', async () => {
			agentRepository.findByIntegrationCredential.mockResolvedValue([
				mock<Agent>({ name: 'Support bot' }),
			]);

			await expect(integration.onBeforeConnect(connectionContext())).rejects.toThrow(ConflictError);
		});

		it('surfaces a broken credential before the channel connects', async () => {
			await expect(
				integration.onBeforeConnect(
					connectionContext(servicePrincipalCredential({ tenantId: '' })),
				),
			).rejects.toThrow(UserError);
		});
	});

	describe('formatActionDecisionMessage', () => {
		const user = { userId: 'u-1', userName: 'alice', fullName: 'Alice', isBot: false, isMe: false };

		it.each([
			[true, '✅ Approved by Alice'],
			[false, '🚫 Declined by Alice'],
		])('names the decision when one was resolved: %p', (approved, expected) => {
			expect(
				integration.formatActionDecisionMessage({
					approved,
					raw: {},
					user,
				} as Parameters<typeof integration.formatActionDecisionMessage>[0]),
			).toBe(expected);
		});

		it.each([
			[{ userId: 'u-1', userName: 'alice', fullName: 'Alice' }, 'Alice'],
			[{ userId: 'u-1', userName: 'alice', fullName: '' }, 'alice'],
			[{ userId: 'u-1', userName: '', fullName: '' }, 'u-1'],
		])('resolves the responder from %p', (responder, expected) => {
			expect(
				integration.formatActionDecisionMessage({
					approved: true,
					raw: {},
					user: { ...responder, isBot: false, isMe: false },
				} as Parameters<typeof integration.formatActionDecisionMessage>[0]),
			).toBe(`✅ Approved by ${expected}`);
		});

		// Without the CallbackStore the resume handler resolves neither the
		// decision nor the label, so this generic wording is what a Teams
		// approval actually settles to today.
		it('falls back to a generic outcome when no decision reaches it', () => {
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
