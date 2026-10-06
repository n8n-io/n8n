import { WhatsAppApi } from 'n8n-nodes-base/dist/credentials/WhatsAppApi.credentials';
import { WhatsApp } from 'n8n-nodes-base/dist/nodes/WhatsApp/WhatsApp.node';

import { sendWhatsAppMessage } from '../../nodes/whats-app/actions/message.send';
import { sendWhatsAppTemplate } from '../../nodes/whats-app/actions/message.send-template';
import {
	actionNode,
	compareRuns,
	runNode,
	type AllowedDifference,
	type ParityCase,
	type Route,
} from '../../../../nodes-core/src/__tests__/parity/harness';

const PHONE_ID = '106540352242922';
const URL = `https://graph.facebook.com/v13.0/${PHONE_ID}/messages`;

const credential: ParityCase['credential'] = {
	data: { accessToken: 'token-parity', businessAccountId: '102290129340398' },
	types: [new WhatsAppApi()],
};

const legacyNode = (parameters: Record<string, unknown>) => ({
	nodeType: new WhatsApp(),
	type: 'n8n-nodes-base.whatsApp',
	typeVersion: 1.1,
	credential: 'whatsAppApi',
	parameters: { resource: 'message', operation: 'send', phoneNumberId: PHONE_ID, ...parameters },
});

const accepted: Route = {
	method: 'POST',
	url: URL,
	json: {
		messaging_product: 'whatsapp',
		contacts: [{ input: '4915112345678', wa_id: '4915112345678' }],
		messages: [{ id: 'wamid.HBgNNDkxNTExMjM0NTY3OBUCABEYEjQ' }],
	},
};

describe('whatsApp.message.send parity with WhatsApp v1.1 message send', () => {
	// The harness cannot resolve `$json` in a declarative legacy node, so the text is fixed.
	const parityCase: ParityCase = { credential, input: [{}, {}], routes: [accepted] };

	it('sends the same text message and emits the same items', async () => {
		const legacy = await runNode(
			legacyNode({
				recipientPhoneNumber: '+49-151-12345678',
				messageType: 'text',
				textBody: 'Tier: standard. Reply YES to confirm.',
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(
				sendWhatsAppMessage,
				{
					phoneNumberId: PHONE_ID,
					to: '+49-151-12345678',
					message: { type: 'text', body: 'Tier: standard. Reply YES to confirm.' },
				},
				'whatsAppApi',
			),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(legacy.items).toHaveLength(2);
		expect(compareRuns(legacy, next, [])).toEqual({ unexplained: [], stale: [] });
	});

	it('sends digits only for a number with spaces', async () => {
		const spaced: ParityCase = { credential, input: [{}], routes: [accepted] };
		const legacy = await runNode(
			legacyNode({ recipientPhoneNumber: '+49 151 12345678', messageType: 'text', textBody: 'Hi' }),
			spaced,
		);
		const next = await runNode(
			actionNode(
				sendWhatsAppMessage,
				{ phoneNumberId: PHONE_ID, to: '+49 151 12345678', message: { type: 'text', body: 'Hi' } },
				'whatsAppApi',
			),
			spaced,
		);
		const allowed: AllowedDifference[] = [
			{
				path: `requests.POST ${URL} #0.body.to`,
				kind: 'intended',
				reason: 'The action drops every non-digit; the legacy node keeps spaces.',
			},
		];
		expect(legacy.requests[`POST ${URL} #0`]?.body).toMatchObject({ to: '49 151 12345678' });
		expect(next.requests[`POST ${URL} #0`]?.body).toMatchObject({ to: '4915112345678' });
		expect(compareRuns(legacy, next, allowed)).toEqual({ unexplained: [], stale: [] });
	});

	it('sends the same image message by link', async () => {
		const imageCase: ParityCase = { credential, input: [{}], routes: [accepted] };
		const legacy = await runNode(
			legacyNode({
				recipientPhoneNumber: '4915112345678',
				messageType: 'image',
				mediaPath: 'useMediaLink',
				mediaLink: 'https://example.com/chart.png',
				additionalFields: { mediaCaption: 'Weekly chart' },
			}),
			imageCase,
		);
		const next = await runNode(
			actionNode(
				sendWhatsAppMessage,
				{
					phoneNumberId: PHONE_ID,
					to: '4915112345678',
					message: {
						type: 'image',
						media: { source: 'link', link: 'https://example.com/chart.png' },
						caption: 'Weekly chart',
					},
				},
				'whatsAppApi',
			),
			imageCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(compareRuns(legacy, next, [])).toEqual({ unexplained: [], stale: [] });
	});

	it('fails with the reason WhatsApp gives', async () => {
		const refused: ParityCase = {
			credential,
			input: [{}],
			routes: [
				{
					method: 'POST',
					url: URL,
					status: 400,
					json: {
						error: {
							message: '(#131030) Recipient phone number not in allowed list',
							type: 'OAuthException',
							code: 131030,
							fbtrace_id: 'trace',
						},
					},
				},
			],
		};
		const legacy = await runNode(
			legacyNode({ recipientPhoneNumber: '4915112345678', messageType: 'text', textBody: 'Hi' }),
			refused,
		);
		const next = await runNode(
			actionNode(
				sendWhatsAppMessage,
				{ phoneNumberId: PHONE_ID, to: '4915112345678', message: { type: 'text', body: 'Hi' } },
				'whatsAppApi',
			),
			refused,
		);
		const allowed: AllowedDifference[] = [
			{
				path: 'error',
				kind: 'intended',
				reason:
					'The action puts the WhatsApp reason in the message; legacy puts it in the details.',
			},
		];
		expect(next.error).toBe(
			'WhatsApp refused the message: Recipient phone number not in allowed list',
		);
		expect(compareRuns(legacy, next, allowed)).toEqual({ unexplained: [], stale: [] });
	});
});

describe('whatsApp.message.sendTemplate parity with WhatsApp v1.1 message sendTemplate', () => {
	it('sends the same template with body, header and button values', async () => {
		const parityCase: ParityCase = { credential, input: [{}], routes: [accepted] };
		const legacy = await runNode(
			legacyNode({
				operation: 'sendTemplate',
				recipientPhoneNumber: '+4915112345678',
				template: 'order_confirmation|en_US',
				components: {
					component: [
						{
							type: 'header',
							headerParameters: {
								parameter: [{ type: 'image', imageLink: 'https://example.com/logo.png' }],
							},
						},
						{
							type: 'body',
							bodyParameters: {
								parameter: [
									{ type: 'text', text: 'Ada' },
									{ type: 'currency', code: 'EUR', amount_1000: 12.5, fallback_value: '€12.50' },
									{ type: 'date_time', date_time: 'March 3, 2026' },
								],
							},
						},
						{
							type: 'button',
							index: 0,
							sub_type: 'quick_reply',
							buttonParameters: { parameter: { type: 'payload', payload: 'CONFIRM' } },
						},
					],
				},
			}),
			parityCase,
		);
		const next = await runNode(
			actionNode(
				sendWhatsAppTemplate,
				{
					phoneNumberId: PHONE_ID,
					to: '+4915112345678',
					template: 'order_confirmation',
					language: 'en_US',
					components: [
						{
							type: 'header',
							parameter: { type: 'image', link: 'https://example.com/logo.png' },
						},
						{
							type: 'body',
							parameters: [
								{ type: 'text', text: 'Ada' },
								{ type: 'currency', code: 'EUR', amount: 12.5, fallback: '€12.50' },
								{ type: 'date_time', fallback: 'March 3, 2026' },
							],
						},
						{ type: 'button', index: 0, subType: 'quick_reply', value: 'CONFIRM' },
					],
				},
				'whatsAppApi',
			),
			parityCase,
		);
		expect(legacy.error, legacy.unmatched.join('; ')).toBeUndefined();
		expect(compareRuns(legacy, next, [])).toEqual({ unexplained: [], stale: [] });
	});
});
