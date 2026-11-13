/**
 * Compiled library node: a hand port of `n8n-nodes-base.microsoftOutlook`
 * version 2, operation `message.send` (Microsoft Graph `sendMail`), with the
 * Outlook OAuth2 credential.
 *
 * The URL of the mailbox depends on credential fields (`graphApiBaseUrl`,
 * `useShared`, `userPrincipalName`). The credentials file holds it as the
 * derived value `n8nDerived.outlookApiUrl` (`src/credentials/derived.ts`).
 *
 * Not supported: attachments (binary data), the Microsoft OAuth2 and service
 * principal credentials, and the other operations.
 */
import { defineNode, type Item } from '@n8n/workflow-lang';

interface OutlookParameters {
	resource?: string;
	operation?: string;
	authentication?: string;
	toRecipients?: unknown;
	subject?: unknown;
	bodyContent?: unknown;
	additionalFields?: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** makeRecipient of the v1 node. */
function recipient(email: unknown): Item {
	return { emailAddress: { address: email } };
}

/** createMessage of the v1 node. */
function createMessage(fields: Record<string, unknown>): Item {
	const message: Item = {};
	const hasBody = Boolean(fields.bodyContent || fields.bodyContentType);
	if (hasBody) message.body = { content: fields.bodyContent, contentType: fields.bodyContentType };
	for (const key of Object.keys(fields)) {
		if (hasBody && (key === 'bodyContent' || key === 'bodyContentType')) continue;
		let value = fields[key];
		if (key === 'internetMessageHeaders' && isRecord(value) && 'headers' in value) {
			value = value.headers;
		}
		if (['bccRecipients', 'ccRecipients', 'replyTo', 'sender', 'toRecipients'].includes(key)) {
			if (Array.isArray(value)) message[key] = value.map((email) => recipient(email));
			else if (typeof value === 'string') {
				message[key] = value.split(',').map((r) => recipient(r.trim()));
			} else {
				throw new Error(`The "${key}" field must be a string or an array of strings`);
			}
			continue;
		}
		if (key === 'from') {
			if (value) message[key] = recipient(value);
			continue;
		}
		message[key] = value;
	}
	return message;
}

export default defineNode<OutlookParameters>({
	type: 'n8n-nodes-base.microsoftOutlook',
	version: 2,
	supports: {
		resource: 'message',
		operation: { message: 'send' },
		operations: {
			'message.send': [
				'authentication="microsoftOutlookOAuth2Api"',
				'toRecipients',
				'subject',
				'bodyContent',
				'additionalFields',
				'additionalFields.bccRecipients',
				'additionalFields.categories',
				'additionalFields.ccRecipients',
				'additionalFields.internetMessageHeaders',
				'additionalFields.from',
				'additionalFields.importance',
				'additionalFields.bodyContentType',
				'additionalFields.isReadReceiptRequested',
				'additionalFields.replyTo',
				'additionalFields.saveToSentItems',
			],
		},
	},
	async run(ctx, parameters, items, credential) {
		const resource = parameters.resource ?? 'message';
		const operation = parameters.operation ?? 'send';
		if (resource !== 'message' || operation !== 'send') {
			throw new Error(`Microsoft Outlook: ${resource}.${operation} is not in the compiled library`);
		}
		if (
			(parameters.authentication ?? 'microsoftOutlookOAuth2Api') !== 'microsoftOutlookOAuth2Api'
		) {
			throw new Error(
				'Microsoft Outlook: only the Outlook OAuth2 credential is in the compiled library',
			);
		}
		const out: Item[] = [];
		for (const _item of items ?? [{}]) {
			const additional = parameters.additionalFields ?? {};
			const fields: Record<string, unknown> = {};
			for (const key of Object.keys(additional)) {
				if (key !== 'saveToSentItems') fields[key] = additional[key];
			}
			fields.subject = parameters.subject ?? '';
			fields.bodyContent = parameters.bodyContent || ' ';
			fields.toRecipients = parameters.toRecipients ?? '';
			const saved = additional.saveToSentItems;
			const saveToSentItems = saved === undefined ? true : saved;
			const response = await ctx.http<unknown>({
				method: 'POST',
				url: '{{$credentials.n8nDerived.outlookApiUrl}}/sendMail',
				headers: { 'Content-Type': 'application/json' },
				qs: {},
				body: { message: createMessage(fields), saveToSentItems },
				credential,
			});
			if (response.status >= 400) {
				throw new Error(`Microsoft Outlook: HTTP status ${response.status}`);
			}
			out.push({ success: true });
		}
		return out;
	},
});
