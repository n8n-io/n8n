import { mock } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import type { UrlService } from '@/services/url.service';

import { TeamsArmTemplateService } from '../teams-arm-template.service';

const PROJECT_ID = 'project-1';
const AGENT_ID = 'agent-1';

const instanceSettings = mock<InstanceSettings>({ encryptionKey: 'test-encryption-key' });
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
	const service = new TeamsArmTemplateService(instanceSettings, urlService);

	const resourcesOf = (template: Record<string, unknown>) =>
		template.resources as Array<Record<string, unknown>>;
	const parametersOf = (template: Record<string, unknown>) =>
		template.parameters as Record<string, { defaultValue: unknown }>;

	describe('buildTemplate', () => {
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

		it('derives a bot name per agent, since the name is globally unique in Azure', () => {
			const mine = parametersOf(service.buildTemplate(options)).botName.defaultValue;
			const other = parametersOf(service.buildTemplate({ ...options, agentId: 'agent-2' })).botName
				.defaultValue;

			expect(mine).not.toBe(other);
			expect(mine).toMatch(/^n8n-agent-[0-9a-f]{12}$/);
		});

		it('carries no credential secret', () => {
			expect(JSON.stringify(service.buildTemplate(options))).not.toMatch(/secret/i);
		});
	});

	describe('buildDeployUrl', () => {
		it('points the Azure portal at the template URL', () => {
			const url = service.buildDeployUrl(PROJECT_ID, AGENT_ID);

			expect(url.startsWith('https://portal.azure.com/#create/Microsoft.Template/uri/')).toBe(true);
			const encoded = url.slice('https://portal.azure.com/#create/Microsoft.Template/uri/'.length);
			expect(decodeURIComponent(encoded)).toContain(
				'/rest/projects/project-1/agents/v2/agent-1/integrations/teams/arm-template?token=',
			);
		});

		it('carries no credential secret in the URL', () => {
			expect(service.buildDeployUrl(PROJECT_ID, AGENT_ID)).not.toMatch(/secret/i);
		});
	});

	describe('verifyToken', () => {
		const tokenFrom = (url: string) => new URL(url).searchParams.get('token') ?? '';

		it('accepts the token it just issued', () => {
			const token = tokenFrom(service.buildTemplateUrl(PROJECT_ID, AGENT_ID));

			expect(service.verifyToken(PROJECT_ID, AGENT_ID, token)).toBe(true);
		});

		it('rejects an expired token', () => {
			vi.useFakeTimers();
			try {
				const token = tokenFrom(service.buildTemplateUrl(PROJECT_ID, AGENT_ID));
				expect(service.verifyToken(PROJECT_ID, AGENT_ID, token)).toBe(true);

				vi.advanceTimersByTime(16 * 60 * 1000);

				expect(service.verifyToken(PROJECT_ID, AGENT_ID, token)).toBe(false);
			} finally {
				vi.useRealTimers();
			}
		});

		it('rejects a tampered signature', () => {
			const [expiry, signature] = tokenFrom(service.buildTemplateUrl(PROJECT_ID, AGENT_ID)).split(
				'.',
			);
			const flipped = signature.startsWith('a')
				? `b${signature.slice(1)}`
				: `a${signature.slice(1)}`;

			expect(service.verifyToken(PROJECT_ID, AGENT_ID, `${expiry}.${flipped}`)).toBe(false);
		});

		it('rejects a token whose expiry was pushed out', () => {
			const [, signature] = tokenFrom(service.buildTemplateUrl(PROJECT_ID, AGENT_ID)).split('.');

			expect(
				service.verifyToken(PROJECT_ID, AGENT_ID, `${Date.now() + 86_400_000}.${signature}`),
			).toBe(false);
		});

		it('rejects a token minted for a different agent', () => {
			const token = tokenFrom(service.buildTemplateUrl(PROJECT_ID, 'other-agent'));

			expect(service.verifyToken(PROJECT_ID, AGENT_ID, token)).toBe(false);
		});

		it('rejects a token minted for a different project', () => {
			const token = tokenFrom(service.buildTemplateUrl('other-project', AGENT_ID));

			expect(service.verifyToken(PROJECT_ID, AGENT_ID, token)).toBe(false);
		});

		it.each([
			['', 'empty'],
			['nonsense', 'malformed'],
			['123.', 'signature-less'],
		])('rejects a %s token (%s)', (token) => {
			expect(service.verifyToken(PROJECT_ID, AGENT_ID, token)).toBe(false);
		});
	});
});
