import type {
	WhatsAppContactFixture,
	WhatsAppInboundMessageFixture,
	WhatsAppReplayFixtures,
	WhatsAppWebhookFixture,
} from './replay-test-context';

const DEFAULT_PHONE_NUMBER_ID = '109876543210';
const DEFAULT_USER_WA_ID = '15551234567';

export const whatsAppContact = (
	overrides: Partial<WhatsAppContactFixture> = {},
): WhatsAppContactFixture => ({
	profile: { name: 'Alice' },
	wa_id: DEFAULT_USER_WA_ID,
	...overrides,
});

/**
 * Inbound message fixture. The timestamp defaults to "now" rather than a
 * fixed epoch — unlike the other platforms, WhatsApp's integration enforces a
 * real 24-hour window against the current clock, so a stale fixed timestamp
 * would silently drift out of the window as the suite ages.
 */
export const whatsAppInboundTextMessage = (
	overrides: Partial<WhatsAppInboundMessageFixture> = {},
): WhatsAppInboundMessageFixture => ({
	from: DEFAULT_USER_WA_ID,
	id: 'wamid.TEST_INBOUND_0001',
	timestamp: String(Math.floor(Date.now() / 1000)),
	type: 'text',
	text: { body: 'hello agent' },
	...overrides,
});

export const whatsAppWebhook = (options: {
	phoneNumberId?: string;
	contact?: WhatsAppContactFixture;
	message: WhatsAppInboundMessageFixture;
}): WhatsAppWebhookFixture => {
	const phoneNumberId = options.phoneNumberId ?? DEFAULT_PHONE_NUMBER_ID;
	return {
		object: 'whatsapp_business_account',
		entry: [
			{
				id: 'waba-test-1',
				changes: [
					{
						field: 'messages',
						value: {
							messaging_product: 'whatsapp',
							metadata: { display_phone_number: phoneNumberId, phone_number_id: phoneNumberId },
							contacts: [options.contact ?? whatsAppContact()],
							messages: [options.message],
						},
					},
				],
			},
		],
	};
};

export const whatsAppReplayFixtures = (
	overrides: Partial<WhatsAppReplayFixtures> = {},
): WhatsAppReplayFixtures => {
	const phoneNumberId = overrides.phoneNumberId ?? DEFAULT_PHONE_NUMBER_ID;
	const contact = overrides.contact ?? whatsAppContact();
	const mention =
		overrides.mention ??
		whatsAppWebhook({
			phoneNumberId,
			contact,
			message: whatsAppInboundTextMessage({ from: contact.wa_id }),
		});

	return {
		phoneNumberId,
		contact,
		mention,
		followUp:
			overrides.followUp ??
			whatsAppWebhook({
				phoneNumberId,
				contact,
				message: whatsAppInboundTextMessage({
					from: contact.wa_id,
					id: 'wamid.TEST_INBOUND_0002',
					text: { body: 'follow up' },
				}),
			}),
	};
};
