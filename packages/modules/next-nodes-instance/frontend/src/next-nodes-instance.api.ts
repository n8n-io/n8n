import type {
	NextNodeActionConfig,
	NextNodeDraftTestResult,
	NextNodeInstanceVersion,
	NextNodeParent,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

import type { HttpActionConfig } from './next-nodes-instance.config';

const BASE = '/next-nodes/instance';

export const listVersions = async (context: IRestApiContext) =>
	await makeRestApiRequest<NextNodeInstanceVersion[]>(context, 'GET', `${BASE}/versions`);

export const listParents = async (context: IRestApiContext) =>
	await makeRestApiRequest<NextNodeParent[]>(context, 'GET', `${BASE}/parents`);

export const testDraft = async (
	context: IRestApiContext,
	config: HttpActionConfig,
	params: Record<string, string | number | boolean>,
	credentialId?: string,
) =>
	await makeRestApiRequest<NextNodeDraftTestResult>(context, 'POST', `${BASE}/drafts/test`, {
		config: { ...config },
		params,
		...(credentialId ? { credentialId } : {}),
	});

export const publishVersion = async (
	context: IRestApiContext,
	config: HttpActionConfig,
	fixture: Record<string, unknown>,
) =>
	await makeRestApiRequest<{ id: string; semver: string }>(context, 'POST', `${BASE}/versions`, {
		config: { ...config },
		fixtures: { executions: [fixture] },
	});

export const actionConfig = async (context: IRestApiContext, actionId: string) =>
	await makeRestApiRequest<NextNodeActionConfig>(
		context,
		'GET',
		`${BASE}/actions/${encodeURIComponent(actionId)}/config`,
	);

export const hideAction = async (context: IRestApiContext, actionId: string) =>
	await makeRestApiRequest<{ hidden: string }>(
		context,
		'POST',
		`${BASE}/actions/${encodeURIComponent(actionId)}/hide`,
	);
