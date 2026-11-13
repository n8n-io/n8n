import { mock } from 'jest-mock-extended';
import type { IDataObject, IHookFunctions, IRequestOptions } from 'n8n-workflow';

import { CalendlyTrigger } from '../CalendlyTrigger.node';

describe('Calendly Trigger requests', () => {
	const trigger = new CalendlyTrigger();
	const webhookUrl = 'https://n8n.example.com/webhook/calendly';
	const organizationUri = 'https://api.calendly.com/organizations/AAAAAAAAAAAAAAAA';
	const userUri = 'https://api.calendly.com/users/BBBBBBBBBBBBBBBB';
	const webhookUri = 'https://api.calendly.com/webhook_subscriptions/CCCCCCCCCCCCCCCC';

	let staticData: IDataObject;
	let requests: Array<{ method?: string; url: string }>;

	const hookFunctions = () => {
		const requestWithAuthentication = jest.fn(async (_type: string, options: IRequestOptions) => {
			const url = new URL(String(options.uri));
			for (const [key, value] of Object.entries(options.qs ?? {})) {
				url.searchParams.append(key, String(value));
			}
			requests.push({ method: options.method, url: url.toString() });
			if (url.pathname === '/users/me') {
				return { resource: { uri: userUri, current_organization: organizationUri } };
			}
			if (options.method === 'POST') return { resource: { uri: webhookUri } };
			if (options.method === 'GET') {
				return {
					collection: [{ callback_url: webhookUrl, events: ['invitee.created'], uri: webhookUri }],
				};
			}
			return {};
		});
		const functions = mock<IHookFunctions>({ helpers: { requestWithAuthentication } });
		jest.mocked(functions.getWorkflowStaticData).mockReturnValue(staticData);
		jest.mocked(functions.getNodeWebhookUrl).mockReturnValue(webhookUrl);
		// A token with dots selects the access token API
		jest.mocked(functions.getCredentials).mockResolvedValue({ apiKey: 'header.payload.signature' });
		jest.mocked(functions.getNodeParameter).mockImplementation((name: string) => {
			if (name === 'authentication') return 'apiKey';
			if (name === 'events') return ['invitee.created'];
			if (name === 'scope') return 'user';
			return undefined;
		});
		return functions;
	};

	beforeEach(() => {
		staticData = {};
		requests = [];
	});

	it('should request the current user and the webhook subscriptions', async () => {
		const result = await trigger.webhookMethods.default.checkExists.call(hookFunctions());

		expect(result).toBe(true);
		const query = new URLSearchParams({
			scope: 'user',
			organization: organizationUri,
			user: userUri,
		});
		expect(requests).toEqual([
			{ method: 'GET', url: 'https://api.calendly.com/users/me' },
			{ method: 'GET', url: `https://api.calendly.com/webhook_subscriptions?${query.toString()}` },
		]);
	});

	it('should create a webhook subscription', async () => {
		const result = await trigger.webhookMethods.default.create.call(hookFunctions());

		expect(result).toBe(true);
		expect(requests).toEqual([
			{ method: 'GET', url: 'https://api.calendly.com/users/me' },
			{ method: 'POST', url: 'https://api.calendly.com/webhook_subscriptions' },
		]);
	});

	it('should delete the webhook subscription by its URI', async () => {
		staticData.webhookURI = webhookUri;

		const result = await trigger.webhookMethods.default.delete.call(hookFunctions());

		expect(result).toBe(true);
		expect(requests).toEqual([{ method: 'DELETE', url: webhookUri }]);
	});

	it('should not send a request for a stored URI outside the subscriptions endpoint', async () => {
		staticData.webhookURI = 'https://other.example.com/webhook_subscriptions/CCCCCCCCCCCCCCCC';

		const result = await trigger.webhookMethods.default.delete.call(hookFunctions());

		expect(result).toBe(true);
		expect(requests).toEqual([]);
		expect(staticData.webhookURI).toBeUndefined();
	});
});
