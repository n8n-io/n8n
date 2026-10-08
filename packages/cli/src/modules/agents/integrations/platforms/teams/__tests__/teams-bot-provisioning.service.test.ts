import type { CredentialsEntity, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { CredentialsFinderService } from '@n8n/backend-services';
import { BadRequestError } from '@n8n/errors';

import type { ArmResponse, TeamsArmService } from '../teams-arm.service';
import type { TeamsArmTemplateService } from '../teams-arm-template.service';
import { TeamsBotProvisioningService } from '../teams-bot-provisioning.service';
import type { TeamsManagerTokenService } from '../teams-manager-token.service';

const user = mock<User>({ id: 'user-1' });
const SUBSCRIPTION_ID = 'sub-1';
const BOT_NAME = 'support-bot-abcd1234';

const listOptions = { user, managerCredentialId: 'manager-1' };
const provisionOptions = {
	...listOptions,
	projectId: 'project-1',
	agentId: 'agent-1',
	agentName: 'Support Bot',
	subscriptionId: SUBSCRIPTION_ID,
	msaAppId: '11111111-2222-3333-4444-555555555555',
	msaAppTenantId: '99999999-8888-7777-6666-555555555555',
	messagingEndpoint: 'https://n8n.example.com/rest/webhooks/teams',
};

const ok = (body: unknown = {}): ArmResponse => ({ statusCode: 200, body, ok: true });
const failed = (statusCode: number, code?: string): ArmResponse => ({
	statusCode,
	body: code ? { error: { code } } : {},
	ok: false,
});

describe('TeamsBotProvisioningService', () => {
	let arm: ReturnType<typeof mock<TeamsArmService>>;
	let tokens: ReturnType<typeof mock<TeamsManagerTokenService>>;
	let credentialsFinderService: ReturnType<typeof mock<CredentialsFinderService>>;
	let service: TeamsBotProvisioningService;

	/** Paths the bot create and its Teams channel child are PUT to. */
	const botPath = `/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/n8n-agents/providers/Microsoft.BotService/botServices/${BOT_NAME}`;

	const callTo = (fragment: string) =>
		arm.request.mock.calls.find(([, , path]) => String(path).includes(fragment));

	/** The bot resource is read before it is written, so the method matters. */
	const putTo = (fragment: string) =>
		arm.request.mock.calls.find(
			([, method, path]) => method === 'PUT' && String(path).includes(fragment),
		);

	beforeEach(() => {
		arm = mock<TeamsArmService>();
		tokens = mock<TeamsManagerTokenService>();
		credentialsFinderService = mock<CredentialsFinderService>();
		const armTemplateService = mock<TeamsArmTemplateService>();
		armTemplateService.botNameFor.mockReturnValue(BOT_NAME);

		service = new TeamsBotProvisioningService(
			arm,
			tokens,
			armTemplateService,
			credentialsFinderService,
		);

		tokens.acquire.mockResolvedValue('azure-token');
		credentialsFinderService.findCredentialForUser.mockResolvedValue(
			mock<CredentialsEntity>({
				id: 'manager-1',
				type: 'microsoftTeamsManagerOAuth2Api',
			}) as never,
		);
		arm.request.mockResolvedValue(ok());
	});

	describe('listSubscriptions', () => {
		it('returns the subscriptions the account can use', async () => {
			arm.request.mockResolvedValue(
				ok({
					value: [
						{ subscriptionId: 'sub-1', displayName: 'Production', state: 'Enabled' },
						{ subscriptionId: 'sub-2', displayName: 'Sandbox', state: 'Enabled' },
					],
				}),
			);

			await expect(service.listSubscriptions(listOptions)).resolves.toEqual([
				{ id: 'sub-1', name: 'Production' },
				{ id: 'sub-2', name: 'Sandbox' },
			]);
		});

		it('leaves out a subscription that is not enabled', async () => {
			arm.request.mockResolvedValue(
				ok({
					value: [
						{ subscriptionId: 'sub-1', displayName: 'Expired', state: 'Disabled' },
						{ subscriptionId: 'sub-2', displayName: 'Production', state: 'Enabled' },
					],
				}),
			);

			await expect(service.listSubscriptions(listOptions)).resolves.toEqual([
				{ id: 'sub-2', name: 'Production' },
			]);
		});

		it('reports none for a tenant with no Azure subscription, rather than failing', async () => {
			arm.request.mockResolvedValue(ok({ value: [] }));

			await expect(service.listSubscriptions(listOptions)).resolves.toEqual([]);
		});

		/**
		 * An empty list is how a Microsoft 365 tenant with no Azure at all looks,
		 * and the step says so and moves on. A refusal is not that, and reporting
		 * it as one tells the user something untrue about their account.
		 */
		it('reports a refused listing rather than calling it none', async () => {
			arm.request.mockResolvedValue(failed(403, 'AuthorizationFailed'));

			await expect(service.listSubscriptions(listOptions)).rejects.toThrow();
		});

		it('follows ARM paging, so a long list is not cut short', async () => {
			// The client takes a path and adds the host itself, so the absolute
			// `nextLink` only matches if the service reduced it to a path first.
			arm.request.mockImplementation(async (_t: string, _m: string, path: string) =>
				path === '/subscriptions?skipToken=abc'
					? ok({ value: [{ subscriptionId: 'sub-2', displayName: 'Second', state: 'Enabled' }] })
					: ok({
							value: [{ subscriptionId: 'sub-1', displayName: 'First', state: 'Enabled' }],
							nextLink: 'https://management.azure.com/subscriptions?skipToken=abc',
						}),
			);

			await expect(service.listSubscriptions(listOptions)).resolves.toEqual([
				{ id: 'sub-1', name: 'First' },
				{ id: 'sub-2', name: 'Second' },
			]);
		});

		it('does not follow a nextLink that points off Azure Resource Manager', async () => {
			arm.request.mockImplementation(async (_t: string, _m: string, path: string) =>
				path.startsWith('/subscriptions?api-version')
					? ok({
							value: [{ subscriptionId: 'sub-1', displayName: 'First', state: 'Enabled' }],
							nextLink: 'https://example.test/subscriptions?skipToken=abc',
						})
					: ok({ value: [{ subscriptionId: 'sub-2', displayName: 'Second', state: 'Enabled' }] }),
			);

			await expect(service.listSubscriptions(listOptions)).resolves.toEqual([
				{ id: 'sub-1', name: 'First' },
			]);
			expect(arm.request).toHaveBeenCalledTimes(1);
		});

		it('asks for an Azure token, not a Graph one', async () => {
			await service.listSubscriptions(listOptions);

			expect(tokens.acquire).toHaveBeenCalledWith(
				expect.anything(),
				'https://management.azure.com',
			);
		});
	});

	describe('provisionBot', () => {
		it('creates the bot and turns on its Teams channel', async () => {
			const result = await service.provisionBot(provisionOptions);

			expect(putTo(`${botPath}?`)).toBeDefined();
			expect(putTo('/channels/MsTeamsChannel')).toBeDefined();
			expect(result).toEqual({
				botName: BOT_NAME,
				resourceGroup: 'n8n-agents',
				subscriptionId: SUBSCRIPTION_ID,
			});
		});

		/**
		 * The bot name comes from the agent, so a re-run lands on the bot made last
		 * time. Azure fixes a bot's app id at creation, so one left from an earlier
		 * app registration can never be made to work — and a PUT would not say so.
		 */
		it('refuses a leftover bot tied to a different app registration', async () => {
			arm.request.mockImplementation(async (_t: string, method: string, path: string) =>
				method === 'GET' && path.includes('botServices')
					? ok({ properties: { msaAppId: 'a-different-app-id' } })
					: ok(),
			);

			await expect(service.provisionBot(provisionOptions)).rejects.toThrow(
				/tied to a different app registration/,
			);
		});

		it('reuses the bot it made before, rather than refusing its own work', async () => {
			arm.request.mockImplementation(async (_t: string, method: string, path: string) =>
				method === 'GET' && path.includes('botServices')
					? ok({ properties: { msaAppId: provisionOptions.msaAppId.toUpperCase() } })
					: ok(),
			);

			await expect(service.provisionBot(provisionOptions)).resolves.toMatchObject({
				botName: BOT_NAME,
			});
		});

		/**
		 * An Azure resource cannot be renamed, and the name is derived from the
		 * agent's name — so a rename would ask Azure for a second bot on the same
		 * app registration, which it refuses. The bot is found by the app it signs
		 * for instead.
		 */
		it('reuses the bot for this app after the agent was renamed', async () => {
			arm.request.mockImplementation(async (_t: string, method: string, path: string) => {
				if (method === 'GET' && path.endsWith('botServices?api-version=2022-09-15')) {
					return ok({
						value: [
							{ name: 'other-bot', properties: { msaAppId: 'someone-elses-app' } },
							{
								name: 'the-old-name-abcd1234',
								properties: { msaAppId: provisionOptions.msaAppId },
							},
						],
					});
				}
				return ok();
			});

			const result = await service.provisionBot(provisionOptions);

			expect(result.botName).toBe('the-old-name-abcd1234');
			expect(putTo('botServices/the-old-name-abcd1234')).toBeDefined();
		});

		it('names a new bot after the agent, so the portal shows something readable', async () => {
			arm.request.mockImplementation(async (_t: string, method: string, path: string) =>
				method === 'GET' && path.endsWith('botServices?api-version=2022-09-15')
					? ok({ value: [] })
					: ok(),
			);

			await expect(service.provisionBot(provisionOptions)).resolves.toMatchObject({
				botName: BOT_NAME,
			});
		});

		it('always creates a single-tenant bot', async () => {
			await service.provisionBot(provisionOptions);

			const body = putTo(`${botPath}?`)?.[3] as {
				properties: { msaAppType: string; msaAppTenantId: string };
			};
			expect(body.properties.msaAppType).toBe('SingleTenant');
			expect(body.properties.msaAppTenantId).toBe(provisionOptions.msaAppTenantId);
		});

		it('points the bot at this instance', async () => {
			await service.provisionBot(provisionOptions);

			const body = putTo(`${botPath}?`)?.[3] as { properties: { endpoint: string } };
			expect(body.properties.endpoint).toBe(provisionOptions.messagingEndpoint);
		});

		it('registers the resource provider before creating the bot', async () => {
			await service.provisionBot(provisionOptions);

			expect(callTo('/providers/Microsoft.BotService/register')?.[1]).toBe('POST');
		});

		/** Fixed, not configurable: Azure jargon in a flow that has none. */
		it('always puts the bot in the same resource group', async () => {
			await service.provisionBot(provisionOptions);

			expect(callTo('resourceGroups/n8n-agents/providers')).toBeDefined();
		});

		it('creates the resource group when the subscription has none', async () => {
			arm.request.mockImplementation(async (_t: string, method: string, path: string) =>
				method === 'GET' && path.includes('/resourcegroups/n8n-agents')
					? failed(404, 'ResourceGroupNotFound')
					: ok(),
			);

			await service.provisionBot(provisionOptions);

			expect(putTo('/resourcegroups/n8n-agents')).toBeDefined();
		});

		/**
		 * Creating it again carries our own location, and ARM will not move a
		 * group that already exists elsewhere. The refusal then reads as "this
		 * account cannot create resources", which is a different problem.
		 */
		it('leaves a resource group this tenant already has where it is', async () => {
			await service.provisionBot(provisionOptions);

			expect(putTo('/resourcegroups/n8n-agents')).toBeUndefined();
		});

		it('names the bot exactly as the Deploy to Azure template would', async () => {
			await service.provisionBot(provisionOptions);

			expect(callTo(`botServices/${BOT_NAME}`)).toBeDefined();
		});

		it('says the account needs Contributor when Azure refuses', async () => {
			arm.request.mockImplementation(async (_token: string, _method: string, path: string) =>
				path.includes('botServices') ? failed(403, 'AuthorizationFailed') : ok(),
			);

			await expect(service.provisionBot(provisionOptions)).rejects.toThrow(/Contributor/);
		});

		it('asks the user to retry while Azure is still enabling Bot Service', async () => {
			arm.request.mockImplementation(async (_token: string, _method: string, path: string) =>
				path.includes('botServices') ? failed(409, 'MissingSubscriptionRegistration') : ok(),
			);

			await expect(service.provisionBot(provisionOptions)).rejects.toThrow(/still enabling/);
		});

		it('reports a bot whose Teams channel could not be turned on', async () => {
			arm.request.mockImplementation(async (_token: string, _method: string, path: string) =>
				path.includes('/channels/MsTeamsChannel') ? failed(500) : ok(),
			);

			await expect(service.provisionBot(provisionOptions)).rejects.toThrow(
				/Teams channel could not be turned on/,
			);
		});

		it('refuses an endpoint Azure cannot call back on', async () => {
			await expect(
				service.provisionBot({ ...provisionOptions, messagingEndpoint: 'http://localhost:5678' }),
			).rejects.toThrow(/HTTPS messaging endpoint/);
			expect(arm.request).not.toHaveBeenCalled();
		});

		it('refuses to run without a Microsoft sign-in', async () => {
			credentialsFinderService.findCredentialForUser.mockResolvedValue(null as never);

			await expect(service.provisionBot(provisionOptions)).rejects.toThrow(BadRequestError);
		});
	});
});
