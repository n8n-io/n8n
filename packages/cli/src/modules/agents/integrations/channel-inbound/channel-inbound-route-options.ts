import { AgentIngressConfig, GlobalConfig } from '@n8n/config';
import { createIpRateLimit, createParamKeyedRateLimiter } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { limitRawBodySize } from '@/middlewares/body-parser';

import { AGENT_HOOK_PATH, MAX_CHANNEL_INBOUND_BODY_BYTES } from './channel-inbound.types';

/**
 * Stop reading a chat platform webhook body at the size that the ingress
 * stores. Without this, the body reader reads up to the global payload limit
 * before the ingress rejects the body.
 */
export function limitChannelInboundBodySize() {
	const restPrefix = `/${Container.get(GlobalConfig).endpoints.rest}/projects/`;
	limitRawBodySize(
		(path) => path.startsWith(`/${AGENT_HOOK_PATH}/`) || isLegacyWebhookPath(path, restPrefix),
		MAX_CHANNEL_INBOUND_BODY_BYTES,
	);
}

/** Matches `/<rest>/projects/:projectId/agents/v2/:agentId/webhooks/:platform`. */
function isLegacyWebhookPath(path: string, restPrefix: string) {
	if (!path.startsWith(restPrefix)) return false;
	const parts = path.slice(restPrefix.length).replace(/\/$/, '').split('/');
	return (
		parts.length === 6 &&
		parts[1] === 'agents' &&
		parts[2] === 'v2' &&
		parts[4] === 'webhooks' &&
		parts.every((part) => part.length > 0)
	);
}

/**
 * The route options of every chat platform webhook route: `/agent-hook` and
 * the legacy `/rest/.../webhooks/:platform` route. Both routes use the same
 * configured limits, so that the legacy URL is not an unlimited way in.
 *
 * The routes are public. The caller is a chat platform, and the ingress
 * service checks the platform signature.
 */
export function channelInboundRouteOptions() {
	const config = Container.get(AgentIngressConfig);
	return {
		ipRateLimit: createIpRateLimit(config.channelWebhookIpRateLimit),
		keyedRateLimit: createParamKeyedRateLimiter({
			param: 'agentId',
			limit: config.channelWebhookAgentRateLimit,
		}),
		skipAuth: true,
		allowBots: true,
	} as const;
}
