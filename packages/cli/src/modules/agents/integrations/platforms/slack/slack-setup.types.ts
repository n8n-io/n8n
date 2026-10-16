import { isRecord } from '@n8n/utils/is-record';

import { BadRequestError } from '@n8n/errors';

import { stringProperty } from '../../integration-helpers';

const SLACK_APP_SETUP_CACHE_PREFIX = 'agents:slack-app-setup:';
const SLACK_MANAGED_APP_CACHE_PREFIX = 'agents:slack-managed-app:';

export const SLACK_APP_SETUP_TTL_MS = 60 * 60 * 1000;
export const SLACK_CREDENTIAL_TYPE = 'slackApi';

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
	setupId?: string;
	requestUrl?: string;
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

export function hasSessionShape(value: unknown): value is SlackAppSetupSession {
	const keys: Array<keyof SlackAppSetupSession> = [
		'projectId',
		'agentId',
		'userId',
		'appId',
		'clientId',
		'clientSecret',
		'signingSecret',
		'redirectUrl',
	];
	return (
		isRecord(value) &&
		keys.every((key) => typeof value[key] === 'string') &&
		(value.setupId === undefined || typeof value.setupId === 'string') &&
		(value.requestUrl === undefined || typeof value.requestUrl === 'string')
	);
}

export function slackSetupCacheKey(state: string): string {
	return `${SLACK_APP_SETUP_CACHE_PREFIX}${state}`;
}

export function slackCredentialMatchesDestination(
	credential: unknown,
	destination: { agentId: string; projectId: string; webhookUrl: string },
): boolean {
	return (
		stringProperty(credential, 'agentId') === destination.agentId &&
		stringProperty(credential, 'agentProjectId') === destination.projectId &&
		stringProperty(credential, 'agentWebhookUrl') === destination.webhookUrl
	);
}

/** Both Slack setup services read and write this entry, so the key must stay identical. */
export function managedSlackAppCacheKey(options: {
	setupId?: string;
	projectId: string;
	agentId: string;
	managerCredentialId: string;
	workspaceId: string;
	userId: string;
}): string {
	const key = `${SLACK_MANAGED_APP_CACHE_PREFIX}${options.projectId}:${options.agentId}:${options.managerCredentialId}:${options.workspaceId}:${options.userId}`;
	return options.setupId ? `${key}:${options.setupId}` : key;
}

export function childRecord(
	record: Record<string, unknown>,
	key: string,
): Record<string, unknown> | undefined {
	const child = record[key];
	return isRecord(child) ? child : undefined;
}

export function parseSlackAppSetupResponse(response: Record<string, unknown>) {
	const credentials = childRecord(response, 'credentials');
	const appId = stringProperty(response, 'app_id');
	const clientId = stringProperty(credentials, 'client_id');
	const clientSecret = stringProperty(credentials, 'client_secret');
	const signingSecret = stringProperty(credentials, 'signing_secret');
	const oauthAuthorizeUrl = stringProperty(response, 'oauth_authorize_url');
	if (!appId || !clientId || !clientSecret || !signingSecret || !oauthAuthorizeUrl) {
		throw new BadRequestError('Slack returned an incomplete app setup response');
	}
	return { appId, clientId, clientSecret, signingSecret, oauthAuthorizeUrl };
}
