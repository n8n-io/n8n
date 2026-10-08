import {
	defineNode,
	defineResource,
	isHttpError,
	matches,
	parse,
	path,
	ref,
	t,
	type EncodedPath,
	type Http,
} from '@n8n/node-sdk';
import { credential } from '@n8n/node-sdk/credentials';

import { whatsAppToken } from './credentials';

// The legacy node pins this Graph API version; Meta serves an expired version as the oldest live one.
const GRAPH_API = 'https://graph.facebook.com/v13.0';

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
		phoneNumberId: ref(whatsAppPhoneNumber).title('Sender Phone Number (or ID)'),
		to: t
			.str()
			.with({ pattern: '^\\+?[0-9][0-9 ()-]{4,}$' })
			.title("Recipient's Phone Number")
			.hint('Recipient number with country code, e.g. +4915112345678'),
	},
});

/** The send response. The Graph API may leave out a field, so each one is optional and nullable. */
export const sent = t.loose(
	t
		.obj({
			messaging_product: t.str(),
			contacts: t.arr(
				t.obj({ input: t.str(), wa_id: t.str().hint('WhatsApp ID of the recipient') }).with({
					additionalProperties: true,
				}),
			),
			messages: t.arr(
				t
					.obj({ id: t.str().hint('Message ID, e.g. wamid.HBgM…') })
					.with({ additionalProperties: true }),
			),
		})
		.with({ additionalProperties: true }),
);

/** A Graph API error body. */
const graphError = t
	.obj({
		error: t
			.obj({ message: t.str(), code: t.int().optional() })
			.with({ additionalProperties: true }),
	})
	.with({ additionalProperties: true });

/**
 * Meta puts the reason in `error.message`, with a `(#code)` prefix that the legacy node drops.
 * The `HttpError` stays, so the host can classify the failure by its status.
 */
async function post(http: Http, requestPath: EncodedPath, body: unknown) {
	try {
		return await http.request({ method: 'POST', path: requestPath, body });
	} catch (error) {
		if (!isHttpError(error) || !matches(graphError, error.body)) throw error;
		const reason = error.body.error.message.replace(/^\(#\d+\) /, '');
		error.message = `WhatsApp refused the message: ${reason}`;
		throw error;
	}
}

/** Sends one message of `type` with its type object, e.g. `{ body }` for text. */
export async function sendMessage(
	http: Http,
	input: { readonly phoneNumberId: string; readonly to: string },
	type: string,
	payload: Readonly<Record<string, unknown>>,
) {
	const response = await post(http, path`/${input.phoneNumberId}/messages`, {
		messaging_product: 'whatsapp',
		// WhatsApp wants digits only; the legacy node keeps spaces.
		to: input.to.replace(/[^0-9]/g, ''),
		type,
		[type]: payload,
	});
	return parse(sent, response);
}
