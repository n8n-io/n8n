/**
 * Compiled library node: a hand port of `n8n-nodes-base.microsoftOutlook`
 * version 2, operations `message.send` (Microsoft Graph `sendMail`),
 * `message.move` and `message.delete`, with the Outlook OAuth2 credential.
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
	messageId?: unknown;
	folderId?: unknown;
}

/** The value of a resource locator; the converter passes only the value. */
function locatorValue(value: unknown): unknown {
	return isRecord(value) && value.__rl === true ? value.value : value;
}

/** String(value) of JavaScript for the id of a path. */
function idText(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return `${value}`;
	return value === null ? 'null' : value === undefined ? 'undefined' : '[object Object]';
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

/**
 * The message of the NodeApiError of n8n-workflow for an HTTP status (STATUS_CODE_MESSAGES):
 * the message of v1 for a failed request.
 */
function statusMessage(status: number): string {
	if (status === 400) return 'Bad request - please check your parameters';
	if (status === 401) return 'Authorization failed - please check your credentials';
	if (status === 402) return 'Payment required - perhaps check your payment details?';
	if (status === 403) return 'Forbidden - perhaps check your credentials?';
	if (status === 404) return 'The resource you are requesting could not be found';
	if (status === 405) {
		return 'Method not allowed - please check you are using the right HTTP method';
	}
	if (status === 429) return 'The service is receiving too many requests from you';
	if (status === 500) return 'The service was not able to process your request';
	if (status === 502) return 'Bad gateway - the service failed to handle your request';
	if (status === 503) {
		return 'Service unavailable - try again later or consider setting this node to retry automatically (in the node settings)';
	}
	if (status === 504) return 'Gateway timed out - perhaps try again later?';
	return status < 500
		? 'Your request is invalid or could not be processed by the service'
		: 'The service failed to process your request';
}

/**
 * The message of v1 for a failed request of the Outlook node: for status 400 the node gives
 * the message of the answer of Microsoft Graph when there is one.
 */
function outlookError(status: number, body: unknown): string {
	if (status !== 400) return statusMessage(status);
	const error = isRecord(body) ? body.error : undefined;
	const text = isRecord(body) && body.message ? body.message : isRecord(error) ? error.message : '';
	return typeof text === 'string' && text !== '' ? text : 'Request failed with status code 400';
}

export default defineNode<OutlookParameters>({
	type: 'n8n-nodes-base.microsoftOutlook',
	version: 2,
	supports: {
		resource: 'message',
		operation: { message: 'send' },
		operations: {
			'message.move': ['authentication="microsoftOutlookOAuth2Api"', 'messageId', 'folderId'],
			'message.delete': ['authentication="microsoftOutlookOAuth2Api"', 'messageId'],
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
		if (resource === 'message' && (operation === 'move' || operation === 'delete')) {
			if (
				(parameters.authentication ?? 'microsoftOutlookOAuth2Api') !== 'microsoftOutlookOAuth2Api'
			) {
				throw new Error(
					'Microsoft Outlook: only the Outlook OAuth2 credential is in the compiled library',
				);
			}
			const done: Item[] = [];
			for (const _item of items ?? [{}]) {
				const message = `{{$credentials.n8nDerived.outlookApiUrl}}/messages/${idText(locatorValue(parameters.messageId))}`;
				const response =
					operation === 'move'
						? await ctx.http<unknown>({
								method: 'POST',
								url: `${message}/move`,
								headers: { 'Content-Type': 'application/json' },
								qs: {},
								body: { destinationId: locatorValue(parameters.folderId) },
								credential,
							})
						: await ctx.http<unknown>({
								method: 'DELETE',
								url: message,
								headers: { 'Content-Type': 'application/json' },
								qs: {},
								body: undefined,
								credential,
							});
				if (response.status >= 400) {
					throw new Error(outlookError(response.status, response.body));
				}
				done.push({ success: true });
			}
			return done;
		}
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
				acceptAs: 'legacy',
				json: true,
				method: 'POST',
				url: '{{$credentials.n8nDerived.outlookApiUrl}}/sendMail',
				headers: { 'Content-Type': 'application/json' },
				qs: {},
				body: { message: createMessage(fields), saveToSentItems },
				credential,
			});
			if (response.status >= 400) {
				throw new Error(outlookError(response.status, response.body));
			}
			out.push({ success: true });
		}
		return out;
	},
});
