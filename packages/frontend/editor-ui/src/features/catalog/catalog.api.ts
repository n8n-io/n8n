import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import type {
	CatalogListing,
	CatalogSubscription,
	CatalogSubscriptionInput,
} from '@/features/catalog/catalog.types';

export const fetchCatalogWorkflowsApi = async (context: IRestApiContext) =>
	await makeRestApiRequest<CatalogListing>(context, 'GET', '/catalog/workflows');

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

export const fetchCatalogSubscriptionsApi = async (context: IRestApiContext) =>
	await makeRestApiRequest<CatalogSubscription[]>(context, 'GET', '/catalog/subscriptions');

export const createCatalogSubscriptionApi = async (
	context: IRestApiContext,
	workflowId: string,
	input: CatalogSubscriptionInput,
) =>
	await makeRestApiRequest<CatalogSubscription>(
		context,
		'POST',
		`/catalog/workflows/${workflowId}/subscriptions`,
		input,
	);

export const updateCatalogSubscriptionApi = async (
	context: IRestApiContext,
	subscriptionId: string,
	input: CatalogSubscriptionInput,
) =>
	await makeRestApiRequest<CatalogSubscription>(
		context,
		'PATCH',
		`/catalog/subscriptions/${subscriptionId}`,
		input,
	);

export const deleteCatalogSubscriptionApi = async (
	context: IRestApiContext,
	subscriptionId: string,
) =>
	await makeRestApiRequest<{ success: boolean }>(
		context,
		'DELETE',
		`/catalog/subscriptions/${subscriptionId}`,
	);
