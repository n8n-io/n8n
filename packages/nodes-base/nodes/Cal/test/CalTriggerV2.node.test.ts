import { randomBytes } from 'crypto';
import type * as crypto from 'crypto';
import type {
	IDataObject,
	IHookFunctions,
	ILoadOptionsFunctions,
	IWebhookFunctions,
} from 'n8n-workflow';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { CalTrigger } from '../CalTrigger.node';
import { verifySignature } from '../CalTriggerHelpers';
import { calApiRequestV2 } from '../GenericFunctions';
import type { CalTriggerV2 } from '../v2/CalTriggerV2.node';

vi.mock('../CalTriggerHelpers');
vi.mock('../GenericFunctions', async () => ({
	...(await vi.importActual<typeof import('../GenericFunctions')>('../GenericFunctions')),
	calApiRequestV2: vi.fn(),
}));
vi.mock('crypto', async () => ({
	...(await vi.importActual<typeof crypto>('crypto')),
	randomBytes: vi.fn(),
}));

describe('CalTriggerV2', () => {
	const webhookUrl = 'https://example.com/webhook';
	const webhookSecret = 'a'.repeat(64);
	const events = ['BOOKING_CREATED'];

	let trigger: CalTriggerV2;
	let hookFunctions: ReturnType<typeof mock<IHookFunctions>>;
	let loadOptionsFunctions: ReturnType<typeof mock<ILoadOptionsFunctions>>;
	let webhookFunctions: ReturnType<typeof mock<IWebhookFunctions>>;
	let webhookData: IDataObject;
	let options: IDataObject;

	beforeEach(() => {
		vi.clearAllMocks();
		trigger = new CalTrigger().getNodeType(3) as CalTriggerV2;
		hookFunctions = mock<IHookFunctions>();
		loadOptionsFunctions = mock<ILoadOptionsFunctions>();
		webhookFunctions = mock<IWebhookFunctions>();
		webhookData = {};
		options = {};

		hookFunctions.getNodeWebhookUrl.mockReturnValue(webhookUrl);
		hookFunctions.getWorkflowStaticData.mockReturnValue(webhookData);
		hookFunctions.getNodeParameter.mockImplementation((name: string) => {
			if (name === 'events') return events;
			if (name === 'options') return options;
			return undefined;
		});
		webhookFunctions.helpers = {
			returnJsonArray: vi.fn((data) => data),
		} as never;

		(randomBytes as Mock).mockReturnValue({
			toString: vi.fn().mockReturnValue(webhookSecret),
		});
	});

	it('loads event types using the required API version header', async () => {
		(calApiRequestV2 as Mock).mockResolvedValue({
			data: [
				{ id: 2, title: 'Team Meeting' },
				{ id: 1, title: 'Consultation' },
			],
		});

		const result = await trigger.methods.loadOptions.getEventTypes.call(loadOptionsFunctions);

		expect(calApiRequestV2).toHaveBeenCalledWith(
			'GET',
			'/event-types',
			{},
			{},
			{ headers: { 'cal-api-version': '2024-06-14' } },
		);
		expect(result).toEqual([
			{ name: 'Consultation', value: 1 },
			{ name: 'Team Meeting', value: 2 },
		]);
	});

	it('creates a user webhook with the v2 request shape', async () => {
		(calApiRequestV2 as Mock).mockResolvedValue({ data: { id: 123 } });

		const result = await trigger.webhookMethods.default.create.call(hookFunctions);

		expect(result).toBe(true);
		expect(calApiRequestV2).toHaveBeenCalledWith('POST', '/webhooks', {
			subscriberUrl: webhookUrl,
			triggers: events,
			active: true,
			secret: webhookSecret,
		});
		expect(webhookData).toEqual({ webhookId: 123, webhookSecret });
	});

	it('creates an event-type webhook and stores its scope', async () => {
		options = { eventTypeId: 42, payloadTemplate: '{"event":"{{type}}"}' };
		(calApiRequestV2 as Mock).mockResolvedValue({ data: { id: 456 } });

		const result = await trigger.webhookMethods.default.create.call(hookFunctions);

		expect(result).toBe(true);
		expect(calApiRequestV2).toHaveBeenCalledWith('POST', '/event-types/42/webhooks', {
			subscriberUrl: webhookUrl,
			triggers: events,
			active: true,
			secret: webhookSecret,
			payloadTemplate: '{"event":"{{type}}"}',
		});
		expect(webhookData).toEqual({
			webhookId: 456,
			webhookSecret,
			webhookEventTypeId: 42,
		});
	});

	it('reuses an exact active webhook match', async () => {
		(calApiRequestV2 as Mock).mockResolvedValue({
			data: [
				{
					id: 123,
					subscriberUrl: webhookUrl,
					triggers: events,
					active: true,
					payloadTemplate: null,
					secret: webhookSecret,
				},
			],
		});

		const result = await trigger.webhookMethods.default.checkExists.call(hookFunctions);

		expect(result).toBe(true);
		expect(calApiRequestV2).toHaveBeenCalledWith('GET', '/webhooks', {}, { take: 250, skip: 0 });
		expect(webhookData).toEqual({ webhookId: 123, webhookSecret });
	});

	it('stops checking after ten full pages', async () => {
		const fullPage = Array.from({ length: 250 }, (_, id) => ({
			id,
			subscriberUrl: 'https://example.com/other-webhook',
			triggers: events,
			active: true,
			payloadTemplate: null,
		}));
		(calApiRequestV2 as Mock).mockResolvedValue({ data: fullPage });

		const result = await trigger.webhookMethods.default.checkExists.call(hookFunctions);

		expect(result).toBe(false);
		expect(calApiRequestV2).toHaveBeenCalledTimes(10);
		expect(calApiRequestV2).toHaveBeenLastCalledWith(
			'GET',
			'/webhooks',
			{},
			{ take: 250, skip: 2250 },
		);
	});

	it('deletes an event-type webhook using its stored scope', async () => {
		webhookData.webhookId = 456;
		webhookData.webhookSecret = webhookSecret;
		webhookData.webhookEventTypeId = 42;
		(calApiRequestV2 as Mock).mockResolvedValue({});

		const result = await trigger.webhookMethods.default.delete.call(hookFunctions);

		expect(result).toBe(true);
		expect(calApiRequestV2).toHaveBeenCalledWith('DELETE', '/event-types/42/webhooks/456');
		expect(webhookData).toEqual({});
	});

	it.each([
		{
			name: 'nested payload',
			body: {
				triggerEvent: 'BOOKING_CREATED',
				createdAt: '2026-07-28T10:00:00Z',
				payload: { bookingId: 123 },
			},
			expected: {
				triggerEvent: 'BOOKING_CREATED',
				createdAt: '2026-07-28T10:00:00Z',
				bookingId: 123,
			},
		},
		{
			name: 'flat payload',
			body: { triggerEvent: 'MEETING_ENDED', bookingId: 456 },
			expected: { triggerEvent: 'MEETING_ENDED', bookingId: 456 },
		},
	])('returns the $name body', async ({ body, expected }) => {
		(verifySignature as Mock).mockReturnValue(true);
		webhookFunctions.getRequestObject.mockReturnValue({ body } as never);

		const result = await trigger.webhook.call(webhookFunctions);

		expect(result.workflowData).toEqual([expected]);
	});
});
