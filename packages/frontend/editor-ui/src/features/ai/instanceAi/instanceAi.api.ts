import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type {
	InstanceAiBrowserCreateLinkResponse,
	InstanceAiBrowserStatusResponse,
	InstanceAiEnsureThreadResponse,
	InstanceAiCredits,
	InstanceAiThreadOrigin,
	InstanceAiThreadSource,
} from '@n8n/api-types';

export interface InstanceAiThreadLaunchInput {
	source: InstanceAiThreadSource;
	origin?: InstanceAiThreadOrigin;
	sourceContext?: Record<string, unknown>;
}

export async function ensureThread(
	context: IRestApiContext,
	threadId: string,
	projectId: string,
	launch: InstanceAiThreadLaunchInput,
): Promise<InstanceAiEnsureThreadResponse> {
	return await makeRestApiRequest<InstanceAiEnsureThreadResponse>(
		context,
		'POST',
		'/instance-ai/threads',
		{ threadId, projectId, ...launch },
	);
}

/**
 * GET /instance-ai/credits -> { creditsQuota, creditsClaimed, quotaLocked }
 * Returns -1 quota when the proxy is disabled, and also for the activation-capped trial cohort,
 * whose balance is never shown — for them `quotaLocked` is the only usage signal.
 */
export async function getInstanceAiCredits(context: IRestApiContext): Promise<InstanceAiCredits> {
	return await makeRestApiRequest<InstanceAiCredits>(context, 'GET', '/instance-ai/credits');
}

/**
 * POST /instance-ai/gateway/create-link -> { token, command, expiresAt, ttlSeconds }
 * Generate a dynamic gateway token and pre-built CLI command.
 */
export async function createGatewayLink(context: IRestApiContext): Promise<{
	token: string;
	command: string;
	expiresAt: string | null;
	ttlSeconds: number | null;
}> {
	return await makeRestApiRequest<{
		token: string;
		command: string;
		expiresAt: string | null;
		ttlSeconds: number | null;
	}>(context, 'POST', '/instance-ai/gateway/create-link');
}

/**
 * POST /instance-ai/gateway/disconnect-session -> { ok }
 * Tear down the current user's gateway session so its tools are no longer
 * exposed to the agent. Does not change the user's localGatewayDisabled
 * preference.
 */
export async function disconnectGatewaySession(context: IRestApiContext): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/instance-ai/gateway/disconnect-session');
}

/**
 * POST /instance-ai/browser/create-link -> { connectUrl, expiresAt, ttlSeconds }
 * Create (or refresh) a direct browser session and return the opaque URL that
 * opens the Browser Use extension connect page.
 */
export async function createBrowserLink(
	context: IRestApiContext,
): Promise<InstanceAiBrowserCreateLinkResponse> {
	return await makeRestApiRequest<InstanceAiBrowserCreateLinkResponse>(
		context,
		'POST',
		'/instance-ai/browser/create-link',
	);
}

/**
 * GET /instance-ai/browser/status -> { connected, connectedAt, toolCategories }
 * Check whether the Browser Use extension is connected directly to the server.
 */
export async function getBrowserStatus(
	context: IRestApiContext,
): Promise<InstanceAiBrowserStatusResponse> {
	return await makeRestApiRequest<InstanceAiBrowserStatusResponse>(
		context,
		'GET',
		'/instance-ai/browser/status',
	);
}

/**
 * POST /instance-ai/browser/disconnect-session -> { ok }
 * Tear down the current user's direct browser session.
 */
export async function disconnectBrowserSession(context: IRestApiContext): Promise<void> {
	await makeRestApiRequest(context, 'POST', '/instance-ai/browser/disconnect-session');
}

/**
 * GET /instance-ai/gateway/status -> { connected, connectedAt, directory, hostIdentifier, toolCategories }
 * Check whether the gateway daemon is currently connected.
 */
export async function getGatewayStatus(context: IRestApiContext): Promise<{
	connected: boolean;
	connectedAt: string | null;
	directory: string | null;
	hostIdentifier: string | null;
	toolCategories: Array<{ name: string; enabled: boolean; writeAccess?: boolean }>;
}> {
	return await makeRestApiRequest<{
		connected: boolean;
		connectedAt: string | null;
		directory: string | null;
		hostIdentifier: string | null;
		toolCategories: Array<{ name: string; enabled: boolean; writeAccess?: boolean }>;
	}>(context, 'GET', '/instance-ai/gateway/status');
}
