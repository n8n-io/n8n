import { mock } from 'vitest-mock-extended';
import type { GlobalConfig } from '@n8n/config';
import type { InstanceSettings } from 'n8n-core';

import { JwtService } from '@/services/jwt.service';
import type { UrlService } from '@/services/url.service';

import { TeamsArmTemplateService } from '../teams-arm-template.service';

const PROJECT_ID = 'project-1';
const AGENT_ID = 'agent-1';
const CREDENTIAL_ID = 'cred-1';

const jwtService = new JwtService(
	mock<InstanceSettings>({ encryptionKey: 'test-encryption-key' }),
	mock<GlobalConfig>({ userManagement: { jwtSecret: 'test-jwt-secret' } }),
);
const urlService = mock<UrlService>();
urlService.getWebhookBaseUrl.mockReturnValue('https://n8n.example.com/');

const options = {
	agentName: 'Support Bot',
	agentId: AGENT_ID,
	msaAppId: '11111111-2222-3333-4444-555555555555',
	msaAppTenantId: '99999999-8888-7777-6666-555555555555',
	messagingEndpoint:
		'https://n8n.example.com/rest/projects/project-1/agents/v2/agent-1/webhooks/teams',
};

describe('TeamsArmTemplateService', () => {
	const service = new TeamsArmTemplateService(jwtService, urlService);

	const resourcesOf = (template: Record<string, unknown>) =>
		template.resources as Array<Record<string, unknown>>;
	const parametersOf = (template: Record<string, unknown>) =>
		template.parameters as Record<string, { defaultValue: unknown }>;

	describe('buildTemplate', () => {
		it('labels the bot with the name chosen for Teams when there is one', () => {
			const [bot] = resourcesOf(service.buildTemplate({ ...options, displayName: 'Helpdesk' }));

			expect((bot.properties as { displayName: string }).displayName).toBe('Helpdesk');
		});

		it('falls back to the agent name when no Teams name is set', () => {
			const [bot] = resourcesOf(service.buildTemplate(options));

			expect((bot.properties as { displayName: string }).displayName).toBe('Support Bot');
		});

		it('keeps the resource name on the agent, so a Teams rename cannot move it', () => {
			const withName = parametersOf(service.buildTemplate({ ...options, displayName: 'Helpdesk' }));
			const without = parametersOf(service.buildTemplate(options));

			// The resource name cannot change once the bot exists: a second
			// deployment under a new name creates a second bot instead.
			expect(withName.botName.defaultValue).toBe(without.botName.defaultValue);
		});

		it('refuses a plain-http endpoint, which Azure will not accept', () => {
			expect(() =>
				service.buildTemplate({ ...options, messagingEndpoint: 'http://n8n.example.com/hook' }),
			).toThrow(/HTTPS/);
		});

		it('creates the bot resource and enables the Teams channel', () => {
			const types = resourcesOf(service.buildTemplate(options)).map((r) => r.type);

			expect(types).toEqual([
				'Microsoft.BotService/botServices',
				'Microsoft.BotService/botServices/channels',
			]);
		});

		it('enables the Teams channel rather than only declaring it', () => {
			const channel = resourcesOf(service.buildTemplate(options))[1];

			expect(channel.properties).toEqual({
				channelName: 'MsTeamsChannel',
				properties: { isEnabled: true },
			});
		});

		it('creates the channel only after the bot exists', () => {
			const channel = resourcesOf(service.buildTemplate(options))[1];

			expect(channel.dependsOn).toEqual([
				"[resourceId('Microsoft.BotService/botServices', parameters('botName'))]",
			]);
		});

		it('pre-fills the values the user would otherwise copy, because the portal reads defaults', () => {
			const parameters = parametersOf(service.buildTemplate(options));

			expect(parameters.msaAppId.defaultValue).toBe(options.msaAppId);
			expect(parameters.msaAppTenantId.defaultValue).toBe(options.msaAppTenantId);
			expect(parameters.messagingEndpoint.defaultValue).toBe(options.messagingEndpoint);
		});

		it('registers the bot single-tenant, matching the credential', () => {
			const bot = resourcesOf(service.buildTemplate(options))[0];

			expect((bot.properties as Record<string, unknown>).msaAppType).toBe('SingleTenant');
		});

		it('names the bot after the agent, with a digest because Azure names are global', () => {
			const mine = parametersOf(service.buildTemplate(options)).botName.defaultValue;
			const other = parametersOf(service.buildTemplate({ ...options, agentId: 'agent-2' })).botName
				.defaultValue;

			expect(mine).toMatch(/^support-bot-[0-9a-f]{8}$/);
			expect(other).not.toBe(mine);
		});

		it('falls back to a usable name when the agent name cannot start one', () => {
			const name = parametersOf(service.buildTemplate({ ...options, agentName: '123 🎉' })).botName
				.defaultValue;

			expect(name).toMatch(/^n8n-agent-[0-9a-f]{8}$/);
		});

		it('omits the Entra defaults when unknown, so the portal marks them required', () => {
			const parameters = parametersOf(
				service.buildTemplate({ ...options, msaAppId: '', msaAppTenantId: '' }),
			);

			// An empty default looks filled in, and the deployment then fails at the
			// end with "Microsoft App ID is required".
			expect(parameters.msaAppId).not.toHaveProperty('defaultValue');
			expect(parameters.msaAppTenantId).not.toHaveProperty('defaultValue');
			expect(parameters.messagingEndpoint.defaultValue).toBe(options.messagingEndpoint);
		});

		it('carries no credential secret', () => {
			expect(JSON.stringify(service.buildTemplate(options))).not.toMatch(/secret/i);
		});
	});

	describe('buildDeployUrl', () => {
		it('points the Azure portal at the template URL', () => {
			const url = service.buildDeployUrl(PROJECT_ID, AGENT_ID, CREDENTIAL_ID);

			expect(url.startsWith('https://portal.azure.com/#create/Microsoft.Template/uri/')).toBe(true);
			const encoded = url.slice('https://portal.azure.com/#create/Microsoft.Template/uri/'.length);
			expect(decodeURIComponent(encoded)).toContain(
				'/rest/projects/project-1/agents/v2/agent-1/integrations/teams/arm-template?token=',
			);
		});

		it('carries no credential secret in the URL', () => {
			expect(service.buildDeployUrl(PROJECT_ID, AGENT_ID, CREDENTIAL_ID)).not.toMatch(/secret/i);
		});
	});

	describe('verifyToken', () => {
		const tokenFrom = (url: string) => new URL(url).searchParams.get('token') ?? '';

		it('accepts the token it just issued', () => {
			const token = tokenFrom(service.buildTemplateUrl(PROJECT_ID, AGENT_ID, CREDENTIAL_ID));

			expect(service.verifyToken(PROJECT_ID, AGENT_ID, CREDENTIAL_ID, token)).toBe(true);
		});

		it('rejects an expired token', () => {
			vi.useFakeTimers();
			try {
				const token = tokenFrom(service.buildTemplateUrl(PROJECT_ID, AGENT_ID, CREDENTIAL_ID));
				expect(service.verifyToken(PROJECT_ID, AGENT_ID, CREDENTIAL_ID, token)).toBe(true);

				vi.advanceTimersByTime(16 * 60 * 1000);

				expect(service.verifyToken(PROJECT_ID, AGENT_ID, CREDENTIAL_ID, token)).toBe(false);
			} finally {
				vi.useRealTimers();
			}
		});

		it('rejects a tampered signature', () => {
			const [header, payload, signature] = tokenFrom(
				service.buildTemplateUrl(PROJECT_ID, AGENT_ID, CREDENTIAL_ID),
			).split('.');
			const flipped = signature.startsWith('a')
				? `b${signature.slice(1)}`
				: `a${signature.slice(1)}`;

			expect(
				service.verifyToken(PROJECT_ID, AGENT_ID, CREDENTIAL_ID, `${header}.${payload}.${flipped}`),
			).toBe(false);
		});

		it('rejects a token whose expiry was pushed out', () => {
			const [header, payload, signature] = tokenFrom(
				service.buildTemplateUrl(PROJECT_ID, AGENT_ID, CREDENTIAL_ID),
			).split('.');
			const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
			const extended = Buffer.from(
				JSON.stringify({ ...claims, exp: claims.exp + 86_400 }),
			).toString('base64url');

			// The expiry is inside the signed payload, so pushing it out invalidates
			// the signature that still travels with it.
			expect(
				service.verifyToken(
					PROJECT_ID,
					AGENT_ID,
					CREDENTIAL_ID,
					`${header}.${extended}.${signature}`,
				),
			).toBe(false);
		});

		it('rejects an n8n token minted for anything other than this route', () => {
			// The instance signs tokens for other purposes with the same secret.
			const token = jwtService.sign(
				{ projectId: PROJECT_ID, agentId: AGENT_ID, credentialId: CREDENTIAL_ID },
				{ expiresIn: '15m' },
			);

			expect(service.verifyToken(PROJECT_ID, AGENT_ID, CREDENTIAL_ID, token)).toBe(false);
		});

		it('rejects a token minted for a different agent', () => {
			const token = tokenFrom(service.buildTemplateUrl(PROJECT_ID, 'other-agent', CREDENTIAL_ID));

			expect(service.verifyToken(PROJECT_ID, AGENT_ID, CREDENTIAL_ID, token)).toBe(false);
		});

		it('rejects a token minted for a different credential, so it cannot be swapped', () => {
			const token = tokenFrom(service.buildTemplateUrl(PROJECT_ID, AGENT_ID, 'other-cred'));

			expect(service.verifyToken(PROJECT_ID, AGENT_ID, CREDENTIAL_ID, token)).toBe(false);
		});

		it('rejects a token minted for a different project', () => {
			const token = tokenFrom(service.buildTemplateUrl('other-project', AGENT_ID, CREDENTIAL_ID));

			expect(service.verifyToken(PROJECT_ID, AGENT_ID, CREDENTIAL_ID, token)).toBe(false);
		});

		it.each([
			['', 'empty'],
			['nonsense', 'malformed'],
			['123.456.', 'signature-less'],
		])('rejects a %s token (%s)', (token) => {
			expect(service.verifyToken(PROJECT_ID, AGENT_ID, CREDENTIAL_ID, token)).toBe(false);
		});
	});
});
