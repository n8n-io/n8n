import type { OpenAIClient } from '@langchain/openai';
import type { ChatOpenAIToolType } from '@langchain/openai/dist/utils/tools';
import get from 'lodash/get';
import { jsonParse, type IDataObject } from 'n8n-workflow';

const toArray = (str: string) =>
	str
		.split(',')
		.map((e) => e.trim())
		.filter(Boolean);

export const formatBuiltInTools = (builtInTools: IDataObject) => {
	const tools: ChatOpenAIToolType[] = [];
	if (builtInTools) {
		const webSearchOptions = get(builtInTools, 'webSearch') as IDataObject | undefined;
		if (webSearchOptions) {
			let allowedDomains: string[] | undefined;
			const allowedDomainsRaw = get(webSearchOptions, 'allowedDomains', '') as string;
			if (allowedDomainsRaw) {
				allowedDomains = toArray(allowedDomainsRaw);
			}

			let userLocation: OpenAIClient.Responses.WebSearchTool.UserLocation | undefined;
			if (webSearchOptions.country || webSearchOptions.city || webSearchOptions.region) {
				userLocation = {
					type: 'approximate',
					country: webSearchOptions.country as string,
					city: webSearchOptions.city as string,
					region: webSearchOptions.region as string,
				};
			}

			tools.push({
				type: 'web_search_preview',
				search_context_size: get(webSearchOptions, 'searchContextSize', 'medium') as
					| 'low'
					| 'medium'
					| 'high',
				user_location: userLocation,
				...(allowedDomains && { filters: { allowed_domains: allowedDomains } }),
			});
		}

		const mcpServers = get(builtInTools.mcpServers, 'mcpServerOptions') as
			| IDataObject[]
			| undefined;
		if (Array.isArray(mcpServers) && mcpServers.length) {
			for (const mcpServer of mcpServers) {
				let allowedTools: string[] | undefined;
				const allowedToolsRaw = get(mcpServer, 'allowedTools', '') as string;
				if (allowedToolsRaw) {
					allowedTools = toArray(allowedToolsRaw);
				}

				const headersRaw = get(mcpServer, 'headers', '') as string;

				tools.push({
					type: 'mcp',
					server_label: mcpServer.serverLabel as string,
					server_url: mcpServer.serverUrl as string,
					// @ts-expect-error connector_id is not defined in the type yet
					connector_id: mcpServer.connectorId as string,
					authorization: mcpServer.authorization as string,
					allowed_tools: allowedTools,
					headers: headersRaw
						? jsonParse(headersRaw, { errorMessage: 'Failed to parse headers' })
						: undefined,
					require_approval: 'never',
					server_description: mcpServer.serverDescription as string,
				});
			}
		}

		if (builtInTools.codeInterpreter) {
			tools.push({
				type: 'code_interpreter',
				container: {
					type: 'auto',
				},
			});
		}

		if (builtInTools.localShell) {
			tools.push({
				type: 'local_shell',
			});
		}

		if (builtInTools.fileSearch) {
			const vectorStoreIds = get(builtInTools.fileSearch, 'vectorStoreIds', '[]') as string;
			const filters = get(builtInTools.fileSearch, 'filters', '{}') as string;
			tools.push({
				type: 'file_search',
				vector_store_ids: jsonParse(vectorStoreIds, {
					errorMessage: 'Failed to parse vector store IDs',
				}),
				filters: filters
					? jsonParse(filters, { errorMessage: 'Failed to parse filters' })
					: undefined,
				max_num_results: get(builtInTools.fileSearch, 'maxResults') as number,
			});
		}
	}
	return tools;
};
