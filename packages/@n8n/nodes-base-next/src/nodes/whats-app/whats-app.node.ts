import {
	arr,
	credential,
	credentialType,
	defineNode,
	defineResource,
	int,
	isHttpError,
	loose,
	matches,
	obj,
	parse,
	ref,
	str,
	t,
	type Http,
} from '@n8n/node-sdk';

// The legacy node pins this Graph API version; Meta serves an expired version as the oldest live one.
const GRAPH_API = 'https://graph.facebook.com/v13.0';

export const whatsAppToken = credentialType({
	id: 'whatsApp.token',
	legacyName: 'whatsAppApi',
	displayName: 'WhatsApp API',
	docs: 'whatsapp',
	fields: {
		accessToken: t.secret('Access Token'),
		businessAccountId: t.text('Business Account ID'),
	},
	baseUrl: GRAPH_API,
	hosts: ['graph.facebook.com'],
	auth: (a) => a.bearer('accessToken'),
	test: {
		get: '/',
		ignoreHttpStatusErrors: true,
		failWhen: [{ body: { error: { type: 'OAuthException' } }, message: 'Invalid access token' }],
	},
});

export const whatsApp = defineNode({
	id: 'whatsApp',
	displayName: 'WhatsApp Business Cloud',
	// The scopes are Meta app permissions of the system user token.
	credential: credential({
		types: [whatsAppToken],
		scopes: { whatsapp_business_messaging: 'Send messages from a business phone number' },
	}),
	baseUrl: GRAPH_API,
});

export const whatsAppPhoneNumber = defineResource({
	id: 'whatsApp.phoneNumber',
	label: 'Sender Phone Number',
	shape: {
		pattern: '^[0-9]+$',
		'x-n8n-hint': 'The phone number ID from WhatsApp Manager, not the phone number',
		examples: ['106540352242922'],
	},
});

/** The sender and the recipient of each message. */
export const message = whatsApp.resource('message', {
	input: {
		phoneNumberId: ref(whatsAppPhoneNumber),
		to: str()
			.with({ pattern: '^\\+?[0-9][0-9 ()-]{4,}$' })
			.hint('Recipient number with country code, e.g. +4915112345678'),
	},
});

/** The send response. The Graph API may leave out a field, so each one is optional and nullable. */
export const sent = loose(
	obj({
		messaging_product: str(),
		contacts: arr(
			obj({ input: str(), wa_id: str().hint('WhatsApp ID of the recipient') }).with({
				additionalProperties: true,
			}),
		),
		messages: arr(
			obj({ id: str().hint('Message ID, e.g. wamid.HBgM…') }).with({ additionalProperties: true }),
		),
	}).with({ additionalProperties: true }),
);

/** A Graph API error body. */
const graphError = obj({
	error: obj({ message: str(), code: int().optional() }).with({ additionalProperties: true }),
}).with({ additionalProperties: true });

/** Meta puts the reason in `error.message`, with a `(#code)` prefix that the legacy node drops. */
async function post(http: Http, path: `/${string}`, body: unknown) {
	try {
		return await http.request({ method: 'POST', path, body });
	} catch (error) {
		if (!isHttpError(error) || !matches(graphError, error.body)) throw error;
		const reason = error.body.error.message.replace(/^\(#\d+\) /, '');
		throw new Error(`WhatsApp refused the message: ${reason}`);
	}
}

/** Sends one message of `type` with its type object, e.g. `{ body }` for text. */
export async function sendMessage(
	http: Http,
	input: { readonly phoneNumberId: string; readonly to: string },
	type: string,
	payload: Readonly<Record<string, unknown>>,
) {
	const response = await post(http, `/${encodeURIComponent(input.phoneNumberId)}/messages`, {
		messaging_product: 'whatsapp',
		// WhatsApp wants digits only; the legacy node keeps spaces.
		to: input.to.replace(/[^0-9]/g, ''),
		type,
		[type]: payload,
	});
	return parse(sent, response);
}
