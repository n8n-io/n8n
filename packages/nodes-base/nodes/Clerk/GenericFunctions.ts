import {
	createHmac,
} from 'crypto';

import {
	IWebhookFunctions,
	NodeOperationError,
} from 'n8n-workflow';

// Adapted from:
// https://github.com/svix/svix-libs/blob/main/javascript/src/index.ts

export function verify(
	this: IWebhookFunctions,
	payload: string,
	headers_: Record<string, string>,
	secret: string,
): unknown {
	const headers: Record<string, string> = {};
	for (const key of Object.keys(headers_)) {
		headers[key.toLowerCase()] = (headers_ as Record<string, string>)[key];
	}

	const msgId = headers['svix-id'];
	const msgSignature = headers['svix-signature'];
	const msgTimestamp = headers['svix-timestamp'];

	if (!msgSignature || !msgId || !msgTimestamp) {
		throw new NodeOperationError(this.getNode(), 'Missing required headers');
	}

	const timestamp = verifyTimestamp.call(this, msgTimestamp);

	const computedSignature = sign(msgId, timestamp, payload, secret);
	const expectedSignature = computedSignature.split(',')[1];

	const passedSignatures = msgSignature.split(' ');
	for (const versionedSignature of passedSignatures) {
		const [version, signature] = versionedSignature.split(',');
		if (version !== 'v1') {
			continue;
		}

		if (signature === expectedSignature) {
			return JSON.parse(payload);
		}
	}

	throw new NodeOperationError(this.getNode(), 'No matching signature found');
}

function verifyTimestamp(
	this: IWebhookFunctions,
	timestampHeader: string,
): Date {
	const now = Math.floor(Date.now() / 1000);
	const timestamp = parseInt(timestampHeader, 10);
	if (isNaN(timestamp)) {
		throw new NodeOperationError(this.getNode(), 'Invalid Signature Headers');
	}

	const WEBHOOK_TOLERANCE_IN_SECONDS = 5 * 60; // 5 minutes

	if (now - timestamp > WEBHOOK_TOLERANCE_IN_SECONDS) {
		throw new NodeOperationError(this.getNode(), 'Message timestamp too old');
	}
	if (timestamp > now + WEBHOOK_TOLERANCE_IN_SECONDS) {
		throw new NodeOperationError(this.getNode(), 'Message timestamp too new');
	}
	return new Date(timestamp * 1000);
}

function sign(
	msgId: string,
	timestamp: Date,
	payload: string,
	secret: string,
): string {
	const toSign = Buffer.from(`${msgId}.${timestamp.getTime() / 1000}.${payload}`, 'utf-8').toString();
	const expectedSignature = createHmac('sha256', getKey(secret)).update(toSign).digest('base64');

	return `v1,${expectedSignature}`;
}

function getKey(secret: string) {
	const prefix = 'whsec_';

	if (secret.startsWith(prefix)) {
		secret = secret.substr(prefix.length);
	}

	return Buffer.from(secret, 'base64');
}
