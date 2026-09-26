import { createHash } from 'node:crypto';

import type { IExecuteFunctions, ILoadOptionsFunctions, IWebhookFunctions } from 'n8n-workflow';

import type { ExportTraceServiceRequest } from './otlp';

/*
 * Thin client for the Cerebro platform. A Cerebro API key is not a bearer token:
 * it is exchanged at /config/v1/auth/api-keys/token for a short-lived JWT, which
 * then authorizes /config and /ingest calls. Tokens are cached per key
 * fingerprint until shortly before they expire, so a burst of calls (agent list,
 * then trace export) does one exchange, not three.
 */

export const CEREBRO_CREDENTIAL = 'cerebroApi';

type Ctx = IExecuteFunctions | IWebhookFunctions | ILoadOptionsFunctions;

interface CerebroCredentials {
	baseUrl: string;
	apiKey: string;
}

export interface CerebroAgent {
	agent_id: string;
	agent_name: string;
	status?: string;
	ingestion_mode?: string;
}

interface CachedToken {
	token: string;
	expiresAt: number;
}

// Module-level: shared across invocations in the same process. Keyed by a hash
// of the api key so the raw key never sits in the cache keys.
const tokenCache = new Map<string, CachedToken>();

const trimBase = (baseUrl: string) => baseUrl.replace(/\/+$/, '');
const fingerprint = (apiKey: string) => createHash('sha256').update(apiKey).digest('hex');

/** Exchanges the API key for a JWT, reusing a cached one until 30s before expiry. */
export async function cerebroToken(ctx: Ctx, credentials: CerebroCredentials): Promise<string> {
	const key = fingerprint(credentials.apiKey);
	const cached = tokenCache.get(key);
	if (cached && Date.now() < cached.expiresAt) return cached.token;

	const response = (await ctx.helpers.httpRequest({
		url: `${trimBase(credentials.baseUrl)}/config/v1/auth/api-keys/token`,
		method: 'POST',
		json: true,
		headers: { 'content-type': 'application/json' },
		body: { api_key: credentials.apiKey },
	})) as { access_token: string; expires_in?: number };

	const ttlMs = Math.max(0, (response.expires_in ?? 300) * 1000 - 30_000);
	tokenCache.set(key, { token: response.access_token, expiresAt: Date.now() + ttlMs });
	return response.access_token;
}

async function credsAndToken(ctx: Ctx) {
	const credentials = await ctx.getCredentials<CerebroCredentials>(CEREBRO_CREDENTIAL);
	const token = await cerebroToken(ctx, credentials);
	return { baseUrl: trimBase(credentials.baseUrl), token };
}

/** All agents configured for the key's tenant, for the node's Agent dropdown. */
export async function cerebroListAgents(ctx: Ctx): Promise<CerebroAgent[]> {
	const { baseUrl, token } = await credsAndToken(ctx);
	const response = (await ctx.helpers.httpRequest({
		url: `${baseUrl}/config/v1/agents`,
		method: 'GET',
		json: true,
		headers: { Authorization: `Bearer ${token}` },
	})) as { items?: CerebroAgent[] };
	return response.items ?? [];
}

/**
 * Ships one round's OTLP spans to the agent's ingest endpoint. Returns whether
 * Cerebro accepted them (202). Best effort: telemetry must not fail a round.
 */
export interface CerebroIngestResult {
	delivered: boolean;
	url: string;
	acceptedSpans?: number;
	rejectedSpans?: number;
	error?: string;
}

export async function cerebroIngestTraces(
	ctx: IExecuteFunctions | IWebhookFunctions,
	agentId: string,
	payload: ExportTraceServiceRequest,
): Promise<CerebroIngestResult> {
	const { baseUrl, token } = await credsAndToken(ctx);
	const url = `${baseUrl}/ingest/v1/agents/${encodeURIComponent(agentId)}/traces`;
	try {
		const res = (await ctx.helpers.httpRequest({
			url,
			method: 'POST',
			json: true,
			headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
			body: payload,
		})) as { accepted_spans?: number; rejected_spans?: number };
		return {
			delivered: true,
			url,
			acceptedSpans: res.accepted_spans,
			rejectedSpans: res.rejected_spans,
		};
	} catch (error) {
		ctx.logger.warn('Cerebro OTLP trace ingest failed', {
			agentId,
			error: (error as Error).message,
		});
		return { delivered: false, url, error: (error as Error).message };
	}
}

/** Resolves an agent's display name for the trace context; id-only on failure. */
export async function cerebroAgentInfo(
	ctx: Ctx,
	agentId: string | undefined,
): Promise<{ agentId?: string; agentName?: string }> {
	if (!agentId) return {};
	try {
		const agent = (await cerebroListAgents(ctx)).find((a) => a.agent_id === agentId);
		return { agentId, agentName: agent?.agent_name };
	} catch {
		return { agentId };
	}
}
