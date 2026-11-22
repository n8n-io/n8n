import type {
	CreateCustomNodeDto,
	CreateParentCustomActionDto,
	CustomActionDraftIssue,
	CustomActionEditKind,
	CustomActionParent,
	CustomActionResponse,
	CustomActionVersionDetailResponse,
	CustomNodeResponse,
	ParentCustomActionResponse,
	PreviewCustomActionDto,
	RollbackCustomActionRevisionDto,
	SaveCustomActionDto,
	SetCustomNodeIconDto,
	UpdateCustomNodeDto,
} from '@n8n/api-types';
import { makeRestApiRequest, type IRestApiContext } from '@n8n/rest-api-client';
import type { INodeProperties } from 'n8n-workflow';

const BASE = '/custom-nodes';

export interface CustomActionPreviewResponse {
	issues: CustomActionDraftIssue[];
	properties: INodeProperties[];
}

export interface SaveCustomActionResponse {
	action: CustomActionResponse;
	kind: CustomActionEditKind;
}

/** URL of the stored icon. The route needs a session, so it works in an image element. */
export function getCustomNodeIconUrl(context: IRestApiContext, nodeId: string): string {
	return `${context.baseUrl}${BASE}/nodes/${encodeURIComponent(nodeId)}/icon`;
}

export async function listCustomNodes(context: IRestApiContext): Promise<CustomNodeResponse[]> {
	return await makeRestApiRequest(context, 'GET', BASE);
}

export async function getCustomNode(
	context: IRestApiContext,
	id: string,
): Promise<CustomNodeResponse> {
	return await makeRestApiRequest(context, 'GET', `${BASE}/nodes/${encodeURIComponent(id)}`);
}

export async function createCustomNode(
	context: IRestApiContext,
	payload: CreateCustomNodeDto,
): Promise<CustomNodeResponse> {
	return await makeRestApiRequest(context, 'POST', `${BASE}/nodes`, payload);
}

export async function updateCustomNode(
	context: IRestApiContext,
	id: string,
	payload: UpdateCustomNodeDto,
): Promise<CustomNodeResponse> {
	return await makeRestApiRequest(
		context,
		'PATCH',
		`${BASE}/nodes/${encodeURIComponent(id)}`,
		payload,
	);
}

export async function deleteCustomNode(context: IRestApiContext, id: string): Promise<void> {
	await makeRestApiRequest(context, 'DELETE', `${BASE}/nodes/${encodeURIComponent(id)}`);
}

export async function setCustomNodeIcon(
	context: IRestApiContext,
	id: string,
	payload: SetCustomNodeIconDto,
): Promise<void> {
	await makeRestApiRequest(context, 'PUT', `${BASE}/nodes/${encodeURIComponent(id)}/icon`, payload);
}

export async function addCustomNodeAction(
	context: IRestApiContext,
	nodeId: string,
	payload: SaveCustomActionDto,
): Promise<CustomActionResponse> {
	return await makeRestApiRequest(
		context,
		'POST',
		`${BASE}/nodes/${encodeURIComponent(nodeId)}/actions`,
		payload,
	);
}

export async function listParentCustomActions(
	context: IRestApiContext,
): Promise<ParentCustomActionResponse[]> {
	return await makeRestApiRequest(context, 'GET', `${BASE}/actions`);
}

export async function listCustomActionParents(
	context: IRestApiContext,
): Promise<CustomActionParent[]> {
	return await makeRestApiRequest(context, 'GET', `${BASE}/parents`);
}

export async function addParentCustomAction(
	context: IRestApiContext,
	payload: CreateParentCustomActionDto,
): Promise<ParentCustomActionResponse> {
	return await makeRestApiRequest(context, 'POST', `${BASE}/actions`, payload);
}

export async function saveCustomAction(
	context: IRestApiContext,
	id: string,
	payload: SaveCustomActionDto,
): Promise<SaveCustomActionResponse> {
	return await makeRestApiRequest(
		context,
		'PATCH',
		`${BASE}/actions/${encodeURIComponent(id)}`,
		payload,
	);
}

export async function getCustomActionVersion(
	context: IRestApiContext,
	id: string,
	version: number,
): Promise<CustomActionVersionDetailResponse> {
	return await makeRestApiRequest(
		context,
		'GET',
		`${BASE}/actions/${encodeURIComponent(id)}/versions/${version}`,
	);
}

export async function rollbackCustomActionRevision(
	context: IRestApiContext,
	id: string,
	version: number,
	payload: RollbackCustomActionRevisionDto,
): Promise<CustomActionResponse> {
	return await makeRestApiRequest(
		context,
		'POST',
		`${BASE}/actions/${encodeURIComponent(id)}/versions/${version}/rollback`,
		payload,
	);
}

export async function deleteCustomAction(context: IRestApiContext, id: string): Promise<void> {
	await makeRestApiRequest(context, 'DELETE', `${BASE}/actions/${encodeURIComponent(id)}`);
}

export async function previewCustomAction(
	context: IRestApiContext,
	payload: PreviewCustomActionDto,
): Promise<CustomActionPreviewResponse> {
	return await makeRestApiRequest(context, 'POST', `${BASE}/preview`, payload);
}
