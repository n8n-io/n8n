import type {
	ScimConfigPatchResponse,
	ScimConfigResponse,
	ScimDataAction,
	ScimOnDelete,
	ScimTransferTargetType,
	ScimTransferTargetsResponse,
} from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

/** Body of `PATCH /rest/scim/config`. Send only the fields that change. */
export type ScimConfigPatch = {
	enabled?: boolean;
	onDelete?: ScimOnDelete;
	dataAction?: ScimDataAction;
	/** Null sends the work of a deleted user to the personal project of the owner. */
	transferProjectId?: string | null;
};

/** Response of `POST /rest/scim/token`. The only place the full token value appears. */
export type ScimTokenResponse = {
	token: string;
	baseUrl: string;
};

export type ScimTransferTargetsQuery = {
	search?: string;
	type?: ScimTransferTargetType;
	skip?: number;
	take?: number;
};

export async function getScimConfig(context: IRestApiContext): Promise<ScimConfigResponse> {
	return await makeRestApiRequest(context, 'GET', '/scim/config');
}

export async function updateScimConfig(
	context: IRestApiContext,
	patch: ScimConfigPatch,
): Promise<ScimConfigPatchResponse> {
	return await makeRestApiRequest(context, 'PATCH', '/scim/config', patch);
}

export async function generateScimToken(context: IRestApiContext): Promise<ScimTokenResponse> {
	return await makeRestApiRequest(context, 'POST', '/scim/token');
}

export async function revokeScimToken(context: IRestApiContext): Promise<{ success: boolean }> {
	return await makeRestApiRequest(context, 'DELETE', '/scim/token');
}

export async function fetchScimTransferTargets(
	context: IRestApiContext,
	query: ScimTransferTargetsQuery = {},
): Promise<ScimTransferTargetsResponse> {
	return await makeRestApiRequest(context, 'GET', '/scim/transfer-targets', query);
}
