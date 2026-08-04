import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import type { CatalogListing, CatalogRunListing } from '@/features/catalog/catalog.types';

export const fetchCatalogWorkflowsApi = async (context: IRestApiContext) =>
	await makeRestApiRequest<CatalogListing>(context, 'GET', '/catalog/workflows');

export const fetchCatalogRunsApi = async (context: IRestApiContext) =>
	await makeRestApiRequest<CatalogRunListing>(context, 'GET', '/catalog/runs');

export const runCatalogWorkflowApi = async (
	context: IRestApiContext,
	workflowId: string,
	inputs: Record<string, unknown>,
) =>
	await makeRestApiRequest<{ executionId: string }>(
		context,
		'POST',
		`/catalog/workflows/${workflowId}/run`,
		{ inputs },
	);
