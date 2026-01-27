import { randomBytes, timingSafeEqual } from 'crypto';
import type { IHookFunctions, IWebhookFunctions } from 'n8n-workflow';

const CURRENTS_API_BASE = 'https://api.currents.dev/v1';

/**
 * Maximum allowed age for a webhook request timestamp (5 minutes).
 * Requests older than this are considered potential replay attacks.
 */
const MAX_TIMESTAMP_AGE_SECONDS = 300;

/**
 * Header name used for webhook secret validation.
 */
const WEBHOOK_SECRET_HEADER = 'x-webhook-secret';

/**
 * Currents webhook object returned from the API.
 */
export interface CurrentsWebhook {
	hookId: string;
	projectId: string;
	url: string;
	headers?: string | null;
	hookEvents: string[];
	label?: string | null;
	createdAt?: string;
	updatedAt?: string;
}

/**
 * Options for creating a Currents webhook.
 */
export interface CreateWebhookOptions {
	url: string;
	hookEvents?: string[];
	headers?: string;
	label?: string;
}

/**
 * Generates a cryptographically secure random secret for webhook validation.
 */
export function generateWebhookSecret(): string {
	return randomBytes(32).toString('hex');
}

/**
 * Lists all webhooks for a project.
 */
export async function listWebhooks(
	this: IHookFunctions,
	projectId: string,
): Promise<CurrentsWebhook[]> {
	const response = await this.helpers.httpRequestWithAuthentication.call(this, 'currentsApi', {
		method: 'GET',
		url: `${CURRENTS_API_BASE}/webhooks`,
		qs: { projectId },
	});

	return (response.data as CurrentsWebhook[]) ?? [];
}

/**
 * Finds an existing webhook by URL for a project.
 */
export async function findWebhookByUrl(
	this: IHookFunctions,
	projectId: string,
	webhookUrl: string,
): Promise<CurrentsWebhook | undefined> {
	const webhooks = await listWebhooks.call(this, projectId);
	return webhooks.find((webhook) => webhook.url === webhookUrl);
}

/**
 * Creates a new webhook in Currents.
 */
export async function createWebhook(
	this: IHookFunctions,
	projectId: string,
	options: CreateWebhookOptions,
): Promise<CurrentsWebhook> {
	const response = await this.helpers.httpRequestWithAuthentication.call(this, 'currentsApi', {
		method: 'POST',
		url: `${CURRENTS_API_BASE}/webhooks`,
		qs: { projectId },
		body: {
			url: options.url,
			hookEvents: options.hookEvents ?? [],
			headers: options.headers,
			label: options.label,
		},
	});

	return response.data as CurrentsWebhook;
}

/**
 * Updates an existing webhook in Currents.
 */
export async function updateWebhook(
	this: IHookFunctions,
	hookId: string,
	options: Partial<CreateWebhookOptions>,
): Promise<CurrentsWebhook> {
	const response = await this.helpers.httpRequestWithAuthentication.call(this, 'currentsApi', {
		method: 'PUT',
		url: `${CURRENTS_API_BASE}/webhooks/${hookId}`,
		body: {
			...(options.url && { url: options.url }),
			...(options.hookEvents && { hookEvents: options.hookEvents }),
			...(options.headers && { headers: options.headers }),
			...(options.label && { label: options.label }),
		},
	});

	return response.data as CurrentsWebhook;
}

/**
 * Deletes a webhook from Currents.
 */
export async function deleteWebhook(this: IHookFunctions, hookId: string): Promise<void> {
	await this.helpers.httpRequestWithAuthentication.call(this, 'currentsApi', {
		method: 'DELETE',
		url: `${CURRENTS_API_BASE}/webhooks/${hookId}`,
	});
}

/**
 * Verifies the webhook request is recent and validates the secret.
 *
 * Uses auto-managed secret from workflow static data.
 *
 * Currents.dev includes an `x-timestamp` header with the epoch timestamp in milliseconds.
 * This function validates that the timestamp is within an acceptable window to prevent
 * replay attacks.
 *
 * @returns true if the request is valid, false otherwise
 */
export function verifyWebhook(this: IWebhookFunctions): boolean {
	const req = this.getRequestObject();
	const headerData = this.getHeaderData();

	// Check timestamp to prevent replay attacks (Currents sends milliseconds)
	const timestampHeader = req.headers['x-timestamp'];
	if (typeof timestampHeader === 'string') {
		const requestTimeMs = parseInt(timestampHeader, 10);
		if (isNaN(requestTimeMs)) {
			return false;
		}
		const requestTimeSec = Math.floor(requestTimeMs / 1000);
		const currentTimeSec = Math.floor(Date.now() / 1000);
		const age = Math.abs(currentTimeSec - requestTimeSec);

		if (age > MAX_TIMESTAMP_AGE_SECONDS) {
			return false;
		}
	}

	const webhookData = this.getWorkflowStaticData('node');
	const expectedSecret = webhookData.webhookSecret;

	if (typeof expectedSecret === 'string') {
		const actualSecret = headerData[WEBHOOK_SECRET_HEADER];
		if (typeof actualSecret !== 'string') {
			return false;
		}
		// Use constant-time comparison to prevent timing attacks
		if (
			expectedSecret.length !== actualSecret.length ||
			!timingSafeEqual(Buffer.from(expectedSecret), Buffer.from(actualSecret))
		) {
			return false;
		}
	}

	return true;
}

/**
 * Validates that a millisecond timestamp is within the acceptable window.
 * Exported separately for unit testing.
 */
export function isTimestampValid(timestampMs: number, currentTimeSec?: number): boolean {
	const requestTimeSec = Math.floor(timestampMs / 1000);
	const now = currentTimeSec ?? Math.floor(Date.now() / 1000);
	const age = Math.abs(now - requestTimeSec);
	return age <= MAX_TIMESTAMP_AGE_SECONDS;
}
