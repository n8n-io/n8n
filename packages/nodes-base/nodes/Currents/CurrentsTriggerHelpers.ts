import { randomBytes } from 'crypto';
import type { IHookFunctions, IWebhookFunctions } from 'n8n-workflow';

import { verifySignature as verifySignatureGeneric } from '../../utils/webhook-signature-verification';

const CURRENTS_API_BASE = 'https://api.currents.dev/v1';

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

	const webhookData = this.getWorkflowStaticData('node');
	const expectedSecret = webhookData.webhookSecret;

	return verifySignatureGeneric({
		getExpectedSignature: () => (typeof expectedSecret === 'string' ? expectedSecret : null),
		skipIfNoExpectedSignature: true,
		getActualSignature: () => {
			const actualSecret = headerData[WEBHOOK_SECRET_HEADER];
			return typeof actualSecret === 'string' ? actualSecret : null;
		},
		getTimestamp: () => {
			const timestampHeader = req.headers['x-timestamp'];
			return typeof timestampHeader === 'string' ? timestampHeader : null;
		},
		skipIfNoTimestamp: true,
	});
}
