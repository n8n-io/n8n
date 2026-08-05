import { isRecord } from '@n8n/utils/is-record';

const SLACK_APP_SETUP_CACHE_PREFIX = 'agents:slack-app-setup:';

export const SLACK_BOT_SCOPES = [
	'app_mentions:read',
	'assistant:write',
	'channels:history',
	'channels:join',
	'channels:read',
	'chat:write',
	'files:read',
	'files:write',
	'groups:history',
	'groups:read',
	'im:history',
	'im:read',
	'im:write',
	'mpim:history',
	'mpim:read',
	'mpim:write',
	'reactions:write',
	'users:read',
	'users:read.email',
] as const;

export interface SlackAppSetupSession {
	projectId: string;
	agentId: string;
	userId: string;
	appId: string;
	clientId: string;
	clientSecret: string;
	signingSecret: string;
	redirectUrl: string;
	managerCredentialId?: string;
	teamId?: string;
	teamName?: string;
}

export function slackSetupCacheKey(state: string): string {
	return `${SLACK_APP_SETUP_CACHE_PREFIX}${state}`;
}

export function childRecord(
	record: Record<string, unknown>,
	key: string,
): Record<string, unknown> | undefined {
	const child = record[key];
	return isRecord(child) ? child : undefined;
}
