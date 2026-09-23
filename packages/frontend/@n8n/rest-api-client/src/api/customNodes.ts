import type {
	CreateCustomNodeDto,
	CreateCustomOperationDto,
	CustomNodeDefinition,
	CustomNodeListItem,
	CustomOperationDefinition,
	PreviewCustomOperationDto,
	UpdateCustomNodeDto,
	UpdateCustomOperationDto,
} from '@n8n/api-types';

import type { INodeTypeDescription } from 'n8n-workflow';

import type { IRestApiContext } from '../types';
import { makeRestApiRequest } from '../utils';

const BASE = '/custom-nodes';

export async function getCustomNodes(context: IRestApiContext): Promise<CustomNodeListItem[]> {
	return await makeRestApiRequest(context, 'GET', BASE);
}

export async function createCustomOperation(
	context: IRestApiContext,
	payload: CreateCustomOperationDto,
): Promise<CustomOperationDefinition> {
	return await makeRestApiRequest(context, 'POST', `${BASE}/operations`, payload);
}

export async function updateCustomOperation(
	context: IRestApiContext,
	id: string,
	payload: UpdateCustomOperationDto,
): Promise<CustomOperationDefinition> {
	return await makeRestApiRequest(context, 'PATCH', `${BASE}/operations/${id}`, payload);
}

export async function setCustomOperationActiveVersion(
	context: IRestApiContext,
	id: string,
	version: number,
): Promise<CustomOperationDefinition> {
	return await makeRestApiRequest(context, 'POST', `${BASE}/operations/${id}/active-version`, {
		version,
	});
}

export async function createCustomNode(
	context: IRestApiContext,
	payload: CreateCustomNodeDto,
): Promise<CustomNodeDefinition> {
	return await makeRestApiRequest(context, 'POST', `${BASE}/nodes`, payload);
}

export async function updateCustomNode(
	context: IRestApiContext,
	id: string,
	payload: UpdateCustomNodeDto,
): Promise<CustomNodeDefinition> {
	return await makeRestApiRequest(context, 'PATCH', `${BASE}/nodes/${id}`, payload);
}

export async function uploadCustomNodeIcon(
	context: IRestApiContext,
	id: string,
	iconDataUri: string,
): Promise<CustomNodeDefinition> {
	return await makeRestApiRequest(context, 'POST', `${BASE}/nodes/${id}/icon`, { iconDataUri });
}

export async function deleteCustomNodeDefinition(
	context: IRestApiContext,
	id: string,
): Promise<void> {
	await makeRestApiRequest(context, 'DELETE', `${BASE}/${id}`);
}

export async function previewCustomOperation(
	context: IRestApiContext,
	payload: PreviewCustomOperationDto,
): Promise<INodeTypeDescription> {
	return await makeRestApiRequest(context, 'POST', `${BASE}/preview`, payload);
}

export async function reseedCustomNodes(context: IRestApiContext): Promise<CustomNodeListItem[]> {
	return await makeRestApiRequest(context, 'POST', `${BASE}/reseed`);
}
