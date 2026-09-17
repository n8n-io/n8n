import { DATABRICKS_PARTNER_USER_AGENT } from 'n8n-nodes-base/dist/nodes/Databricks/constants';
import {
	NodeApiError,
	NodeOperationError,
	type ILoadOptionsFunctions,
	type INodeListSearchResult,
} from 'n8n-workflow';

import { assertHttpsHost } from './constants';
import { DATABRICKS_CREDENTIAL_TYPE, type DatabricksOAuth2Credential } from './token-provider';

interface ModelService {
	name: string;
	comment?: string;
	supported_api_types?: string[];
}

interface ModelServicesResponse {
	model_services?: ModelService[];
	next_page_token?: string;
}

/**
 * What a picker keeps. `apiTypeSuffix` is matched as a suffix because live
 * workspaces advertise `mlflow/v1/...` types for routes that answer as
 * `openai/v1`.
 */
export interface ModelCapability {
	apiTypeSuffix: string;
	emptyMessage: string;
	emptyDescription: string;
}

export const CHAT_CAPABILITY: ModelCapability = {
	apiTypeSuffix: '/chat/completions',
	emptyMessage: 'No chat-capable model services found',
	emptyDescription:
		'None of the visible model services supports chat completions. Use ID mode to enter a service name directly',
};

export const EMBEDDINGS_CAPABILITY: ModelCapability = {
	apiTypeSuffix: '/embeddings',
	emptyMessage: 'No embeddings-capable model services found',
	emptyDescription:
		'None of the visible model services supports embeddings. Use ID mode to enter a service name directly',
};

/** Builds the `searchListMethod` for a Model resource locator. */
export function makeModelSearch(capability: ModelCapability) {
	return async function searchModels(
		this: ILoadOptionsFunctions,
		filter?: string,
	): Promise<INodeListSearchResult> {
		const credentials = await this.getCredentials<DatabricksOAuth2Credential>(
			DATABRICKS_CREDENTIAL_TYPE,
		);
		assertHttpsHost(this, credentials.host);
		const host = credentials.host.replace(/\/$/, '');

		const listModelServices = async (parent?: string): Promise<ModelService[]> => {
			let services: ModelService[] = [];
			let pageToken: string | undefined;
			let pages = 0;
			do {
				// Guard against a host or proxy that echoes the same next_page_token back
				if (++pages > 50) {
					throw new NodeOperationError(this.getNode(), 'Model service list exceeded 50 pages');
				}
				const page: ModelServicesResponse = await this.helpers.httpRequestWithAuthentication.call(
					this,
					DATABRICKS_CREDENTIAL_TYPE,
					{
						method: 'GET',
						url: `${host}/api/2.1/unity-catalog/model-services`,
						// FULL view is needed for supported_api_types
						qs: { view: 'FULL', parent, page_token: pageToken },
						headers: { Accept: 'application/json', 'User-Agent': DATABRICKS_PARTNER_USER_AGENT },
						json: true,
					},
				);
				services = services.concat(page.model_services ?? []);
				pageToken = page.next_page_token;
			} while (pageToken);
			return services;
		};

		let services: ModelService[];
		try {
			// The docs mark `parent` as required, but the unscoped call returns every
			// service the caller can access across all schemas (verified live). If the
			// API starts to enforce it, fall back to the Databricks-provided schema.
			services = await listModelServices();
		} catch (error) {
			if (!(error instanceof NodeApiError) || error.httpCode !== '400') throw error;
			services = await listModelServices('schemas/system.ai');
		}

		if (services.length === 0) {
			throw new NodeOperationError(this.getNode(), 'No model services found', {
				description:
					'Check that Unity AI Gateway is enabled on this workspace and that this credential can access at least one model service',
			});
		}

		// Services that advertise another capability, or nothing at all, drop out
		// here but stay reachable via ID mode
		const capable = services.filter((service) =>
			service.supported_api_types?.some((type) => type.endsWith(capability.apiTypeSuffix)),
		);

		if (capable.length === 0) {
			throw new NodeOperationError(this.getNode(), capability.emptyMessage, {
				description: capability.emptyDescription,
			});
		}

		const allResults = capable.map((service) => {
			// The API returns the resource name; the gateway expects catalog.schema.service
			const name = service.name.replace(/^model-services\//, '');
			return { name, value: name, description: service.comment };
		});

		if (filter) {
			const filterLower = filter.toLowerCase();
			return {
				results: allResults.filter(
					(r) =>
						r.name.toLowerCase().includes(filterLower) ||
						(r.description ?? '').toLowerCase().includes(filterLower),
				),
			};
		}

		return { results: allResults };
	};
}
