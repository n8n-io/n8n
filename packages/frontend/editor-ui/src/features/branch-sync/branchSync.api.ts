import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';

import type {
	CommitInfo,
	ConflictChoices,
	ConnectScopePayload,
	PlanResponse,
	ProposalActionResponse,
	ProposalStatus,
	ScopeState,
	ScopeSummary,
	SyncPayload,
	SyncResponse,
} from './branchSync.types';

const root = '/branch-sync';

const scopePath = (scopeKey: string) => `${root}/scopes/${encodeURIComponent(scopeKey)}`;
const proposalPath = (scopeKey: string, name: string) =>
	`${scopePath(scopeKey)}/proposals/${encodeURIComponent(name)}`;

export async function fetchScopes(context: IRestApiContext): Promise<ScopeSummary[]> {
	return await makeRestApiRequest(context, 'GET', `${root}/scopes`);
}

export async function connectScope(
	context: IRestApiContext,
	payload: ConnectScopePayload,
): Promise<ScopeState> {
	return await makeRestApiRequest(context, 'POST', `${root}/scopes`, { ...payload });
}

export async function fetchPlan(
	context: IRestApiContext,
	scopeKey: string,
	to?: string,
): Promise<PlanResponse> {
	return await makeRestApiRequest(
		context,
		'GET',
		`${scopePath(scopeKey)}/plan`,
		to ? { to } : undefined,
	);
}

export async function syncScope(
	context: IRestApiContext,
	scopeKey: string,
	payload: SyncPayload,
): Promise<SyncResponse> {
	return await makeRestApiRequest(context, 'POST', `${scopePath(scopeKey)}/sync`, {
		...payload,
	});
}

export async function fetchCommits(
	context: IRestApiContext,
	scopeKey: string,
): Promise<CommitInfo[]> {
	return await makeRestApiRequest(context, 'GET', `${scopePath(scopeKey)}/commits`);
}

export async function createProposal(
	context: IRestApiContext,
	scopeKey: string,
	name: string,
	choices?: ConflictChoices,
): Promise<ProposalStatus> {
	return await makeRestApiRequest(context, 'POST', `${scopePath(scopeKey)}/proposals`, {
		name,
		choices,
	});
}

export async function fetchProposalStatus(
	context: IRestApiContext,
	scopeKey: string,
	name: string,
): Promise<ProposalStatus> {
	return await makeRestApiRequest(context, 'GET', proposalPath(scopeKey, name));
}

export async function refreshProposal(
	context: IRestApiContext,
	scopeKey: string,
	name: string,
	choices?: ConflictChoices,
): Promise<ProposalActionResponse> {
	return await makeRestApiRequest(context, 'POST', `${proposalPath(scopeKey, name)}/refresh`, {
		choices,
	});
}

export async function updateProposalFromLive(
	context: IRestApiContext,
	scopeKey: string,
	name: string,
	choices?: ConflictChoices,
): Promise<ProposalActionResponse> {
	return await makeRestApiRequest(
		context,
		'POST',
		`${proposalPath(scopeKey, name)}/update-from-live`,
		{ choices },
	);
}

export async function mergeProposal(
	context: IRestApiContext,
	scopeKey: string,
	name: string,
): Promise<{ name: string; merged: string }> {
	return await makeRestApiRequest(context, 'POST', `${proposalPath(scopeKey, name)}/merge`, {});
}
