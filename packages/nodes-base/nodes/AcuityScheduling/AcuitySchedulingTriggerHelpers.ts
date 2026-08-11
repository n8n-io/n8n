import { createHmac } from 'crypto';
import type { IWebhookFunctions } from 'n8n-workflow';

import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';

export async function verifySignature(this: IWebhookFunctions): Promise<boolean> {
	const authentication = this.getNodeParameter('authentication', 'apiKey') as string;

	// OAuth2 flows do not expose an API key that can be used as the shared secret,
	// so verification is skipped to remain backward compatible.
	if (authentication !== 'apiKey') {
		return true;
	}

	const req = this.getRequestObject();

	let apiKey: string | undefined;
	try {
		const credentials = await this.getCredentials('acuitySchedulingApi');
		apiKey = typeof credentials?.apiKey === 'string' ? credentials.apiKey : undefined;
	} catch {
		return true;
	}

	return verifySignatureGeneric({
		getExpectedSignature: () => {
			if (!apiKey || !req.rawBody) {
				return null;
			}
			const hmac = createHmac('sha256', apiKey);
			const payload = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(req.rawBody);
			hmac.update(payload);
			return hmac.digest('base64');
		},
		skipIfNoExpectedSignature: !apiKey,
		getActualSignature: () => {
			const signature = req.header('x-acuity-signature');
			return typeof signature === 'string' ? signature : null;
		},
	});
}
