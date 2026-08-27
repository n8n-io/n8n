import type { IDataObject, IWebhookFunctions } from 'n8n-workflow';

import { AcuitySchedulingTrigger } from '../AcuitySchedulingTrigger.node';
import { verifySignature } from '../AcuitySchedulingTriggerHelpers';
import { acuitySchedulingApiRequest } from '../GenericFunctions';
import type { Mock } from 'vitest';

vi.mock('../AcuitySchedulingTriggerHelpers', () => ({
	verifySignature: vi.fn(),
}));

vi.mock('../GenericFunctions', () => ({
	acuitySchedulingApiRequest: vi.fn(),
}));

const mockedVerifySignature = vi.mocked(verifySignature);
const mockedAcuitySchedulingApiRequest = vi.mocked(acuitySchedulingApiRequest);

describe('AcuitySchedulingTrigger', () => {
	let trigger: AcuitySchedulingTrigger;
	let response: { status: Mock; send: Mock; end: Mock };
	let ctx: IWebhookFunctions;
	const requestBody: IDataObject = { action: 'appointment.scheduled', id: 123 };

	const buildContext = (body: IDataObject = requestBody): IWebhookFunctions => {
		response = {
			status: vi.fn().mockReturnThis(),
			send: vi.fn().mockReturnThis(),
			end: vi.fn().mockReturnThis(),
		};
		return {
			getRequestObject: vi.fn().mockReturnValue({ body }),
			getResponseObject: vi.fn().mockReturnValue(response),
			getNodeParameter: vi.fn(),
			helpers: {
				returnJsonArray: vi.fn().mockImplementation((data: IDataObject) => [data]),
			},
		} as unknown as IWebhookFunctions;
	};

	beforeEach(() => {
		vi.clearAllMocks();
		trigger = new AcuitySchedulingTrigger();
		ctx = buildContext();
		mockedVerifySignature.mockResolvedValue(true);
	});

	describe('webhook', () => {
		it('triggers workflow when signature is valid and resolveData is false', async () => {
			(ctx.getNodeParameter as Mock).mockImplementation((name: string) =>
				name === 'resolveData' ? false : undefined,
			);

			const result = await trigger.webhook.call(ctx);

			expect(mockedVerifySignature).toHaveBeenCalled();
			expect(result).toEqual({ workflowData: [[requestBody]] });
		});

		it('returns 401 when signature is invalid', async () => {
			mockedVerifySignature.mockResolvedValue(false);

			const result = await trigger.webhook.call(ctx);

			expect(response.status).toHaveBeenCalledWith(401);
			expect(response.send).toHaveBeenCalledWith('Unauthorized');
			expect(response.end).toHaveBeenCalled();
			expect(result).toEqual({ noWebhookResponse: true });
			expect(mockedAcuitySchedulingApiRequest).not.toHaveBeenCalled();
		});

		it('triggers workflow when no signing secret is configured (backward compat)', async () => {
			mockedVerifySignature.mockResolvedValue(true);
			(ctx.getNodeParameter as Mock).mockImplementation((name: string) =>
				name === 'resolveData' ? false : undefined,
			);

			const result = await trigger.webhook.call(ctx);

			expect(result).toEqual({ workflowData: [[requestBody]] });
		});

		it('resolves data via API when resolveData is true', async () => {
			ctx = buildContext({ id: 123 });
			(ctx.getNodeParameter as Mock).mockImplementation((name: string) => {
				if (name === 'resolveData') return true;
				if (name === 'event') return 'appointment.scheduled';
				return undefined;
			});
			mockedAcuitySchedulingApiRequest.mockResolvedValue({ id: 123, name: 'Resolved' });

			const result = await trigger.webhook.call(ctx);

			expect(mockedAcuitySchedulingApiRequest).toHaveBeenCalledWith('GET', '/appointments/123', {});
			expect(result).toEqual({ workflowData: [[{ id: 123, name: 'Resolved' }]] });
		});
	});
});
