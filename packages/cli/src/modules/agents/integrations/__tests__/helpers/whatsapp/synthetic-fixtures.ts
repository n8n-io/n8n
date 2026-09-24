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

/** Shared base fields every media fixture below overrides on top of. */
const mediaMessageBase = (
	overrides: Partial<WhatsAppInboundMessageFixture>,
): Pick<WhatsAppInboundMessageFixture, 'from' | 'id' | 'timestamp'> => ({
	from: DEFAULT_USER_WA_ID,
	id: 'wamid.TEST_INBOUND_MEDIA',
	timestamp: String(Math.floor(Date.now() / 1000)),
	...overrides,
});

export const whatsAppInboundImageMessage = (
	overrides: Partial<WhatsAppInboundMessageFixture> = {},
): WhatsAppInboundMessageFixture => ({
	...mediaMessageBase(overrides),
	type: 'image',
	image: { id: 'media-image-1', mime_type: 'image/jpeg', sha256: 'test-sha256-image' },
	...overrides,
});

export const whatsAppInboundDocumentMessage = (
	overrides: Partial<WhatsAppInboundMessageFixture> = {},
): WhatsAppInboundMessageFixture => ({
	...mediaMessageBase(overrides),
	type: 'document',
	document: {
		id: 'media-document-1',
		mime_type: 'application/pdf',
		sha256: 'test-sha256-document',
		filename: 'invoice.pdf',
	},
	...overrides,
});

export const whatsAppInboundAudioMessage = (
	overrides: Partial<WhatsAppInboundMessageFixture> = {},
): WhatsAppInboundMessageFixture => ({
	...mediaMessageBase(overrides),
	type: 'audio',
	audio: { id: 'media-audio-1', mime_type: 'audio/mpeg', sha256: 'test-sha256-audio' },
	...overrides,
});

/** A recorded voice note, distinct from a shared `audio` file — see `type` on `WhatsAppInboundMessage`. */
export const whatsAppInboundVoiceMessage = (
	overrides: Partial<WhatsAppInboundMessageFixture> = {},
): WhatsAppInboundMessageFixture => ({
	...mediaMessageBase(overrides),
	type: 'voice',
	voice: { id: 'media-voice-1', mime_type: 'audio/ogg', sha256: 'test-sha256-voice' },
	...overrides,
});

export const whatsAppInboundVideoMessage = (
	overrides: Partial<WhatsAppInboundMessageFixture> = {},
): WhatsAppInboundMessageFixture => ({
	...mediaMessageBase(overrides),
	type: 'video',
	video: { id: 'media-video-1', mime_type: 'video/mp4', sha256: 'test-sha256-video' },
	...overrides,
});

export const whatsAppInboundStickerMessage = (
	overrides: Partial<WhatsAppInboundMessageFixture> = {},
): WhatsAppInboundMessageFixture => ({
	...mediaMessageBase(overrides),
	type: 'sticker',
	sticker: {
		id: 'media-sticker-1',
		mime_type: 'image/webp',
		sha256: 'test-sha256-sticker',
		animated: false,
	},
	...overrides,
});

export const whatsAppInboundLocationMessage = (
	overrides: Partial<WhatsAppInboundMessageFixture> = {},
): WhatsAppInboundMessageFixture => ({
	...mediaMessageBase(overrides),
	type: 'location',
	location: { latitude: 51.5072, longitude: -0.1276, name: 'London' },
	...overrides,
});

/**
 * The real adapter drops `contacts` messages entirely (no structured field on
 * `WhatsAppInboundMessage`, `extractTextContent` returns null for the type,
 * so the message never reaches n8n) — this fixture exists to prove that drop
 * in a test, not to exercise any handling of it.
 */
export const whatsAppInboundContactsMessage = (
	overrides: Partial<WhatsAppInboundMessageFixture> = {},
): WhatsAppInboundMessageFixture => ({
	...mediaMessageBase(overrides),
	type: 'contacts',
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
