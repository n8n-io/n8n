import { randomBytes } from 'crypto';
import type { IHookFunctions, IWebhookFunctions } from 'n8n-workflow';

import { CalendlyTrigger } from '../CalendlyTrigger.node';
import { verifySignature } from '../CalendlyTriggerHelpers';
import { calendlyApiRequest, getAuthenticationType } from '../GenericFunctions';

jest.mock('../GenericFunctions');
jest.mock('../CalendlyTriggerHelpers');
jest.mock('crypto', () => ({
	...jest.requireActual('crypto'),
	randomBytes: jest.fn(),
}));

describe('CalendlyTrigger', () => {
	let trigger: CalendlyTrigger;

	beforeEach(() => {
		jest.clearAllMocks();
		trigger = new CalendlyTrigger();
	});

	describe('webhookMethods.default.create', () => {
		it('should generate a signing key and send it to Calendly via v2 API', async () => {
			const webhookSecret = 'a'.repeat(64);
			const userResource = {
				uri: 'https://api.calendly.com/users/USER',
				current_organization: 'https://api.calendly.com/organizations/ORG',
			};

			(getAuthenticationType as jest.Mock).mockResolvedValue('accessToken');
			(randomBytes as jest.Mock).mockReturnValue({
				toString: jest.fn().mockReturnValue(webhookSecret),
			});
			(calendlyApiRequest as jest.Mock)
				.mockResolvedValueOnce({ resource: userResource })
				.mockResolvedValueOnce({
					resource: { uri: 'https://api.calendly.com/webhook_subscriptions/SUB' },
				});

			const webhookData: Record<string, unknown> = {};
			const mockHook = {
				getNodeWebhookUrl: jest.fn().mockReturnValue('https://example.com/webhook'),
				getNodeParameter: jest.fn().mockImplementation((name: string) => {
					if (name === 'events') return ['invitee.created'];
					if (name === 'scope') return 'user';
				}),
				getWorkflowStaticData: jest.fn().mockReturnValue(webhookData),
			} as unknown as IHookFunctions;

			await trigger.webhookMethods!.default.create.call(mockHook);

			expect(calendlyApiRequest).toHaveBeenLastCalledWith(
				'POST',
				'/webhook_subscriptions',
				expect.objectContaining({ signing_key: webhookSecret }),
			);
			expect(webhookData.webhookSecret).toBe(webhookSecret);
		});
	});

	describe('webhook', () => {
		it('should return 401 when signature verification fails', async () => {
			const mockRes = {
				status: jest.fn().mockReturnThis(),
				send: jest.fn().mockReturnThis(),
				end: jest.fn(),
			};
			(verifySignature as jest.Mock).mockReturnValue(false);

			const mockFn = {
				getResponseObject: jest.fn().mockReturnValue(mockRes),
			} as unknown as IWebhookFunctions;

			const result = await trigger.webhook.call(mockFn);

			expect(result).toEqual({ noWebhookResponse: true });
			expect(mockRes.status).toHaveBeenCalledWith(401);
		});

		it('should process the webhook when signature is valid', async () => {
			const bodyData = { event: 'invitee.created', payload: { foo: 'bar' } };
			(verifySignature as jest.Mock).mockReturnValue(true);

			const mockFn = {
				getBodyData: jest.fn().mockReturnValue(bodyData),
				helpers: { returnJsonArray: jest.fn((data) => data) },
			} as unknown as IWebhookFunctions;

			const result = await trigger.webhook.call(mockFn);

			expect(result).toEqual({ workflowData: [bodyData] });
		});
	});
});
