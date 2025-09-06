import crypto from 'crypto';

import { WAITING_TOKEN_QUERY_PARAM } from '@/constants';

/**
 * Generate signature token from url and secret
 */
export function generateUrlSignature(url: string, secret: string) {
	const token = crypto.createHmac('sha256', secret).update(url).digest('hex');
	return token;
}

/**
 * Prepare url for signing
 */
export function prepareUrlForSigning(url: URL) {
	return `${url.host}${url.pathname}${url.search}`;
}

/**
 * Generates a hmac signature using the given secret for the given URL
 * and appends it to the url as a query parameter.
 *
 * @returns The url with the signature appended
 */
export function generateResumeUrl(opts: {
	webhookWaitingBaseUrl: string;
	executionId: string;
	signingSecret: string;
	nodeId?: string;
	parameters?: Record<string, string>;
}) {
	const { webhookWaitingBaseUrl, executionId, nodeId, signingSecret, parameters = {} } = opts;

	const resumeUrl = new URL(
		nodeId
			? `${webhookWaitingBaseUrl}/${executionId}/${nodeId}`
			: `${webhookWaitingBaseUrl}/${executionId}`,
	);

	for (const [key, value] of Object.entries(parameters)) {
		resumeUrl.searchParams.set(key, value);
	}

	const urlToSign = prepareUrlForSigning(resumeUrl);
	const signature = generateUrlSignature(urlToSign, signingSecret);

	resumeUrl.searchParams.set(WAITING_TOKEN_QUERY_PARAM, signature);

	return resumeUrl.toString();
}
