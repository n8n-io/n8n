import type { IDataObject } from 'n8n-workflow';

import type { ProviderTool } from 'src/types/tool';

const toArray = (str: string) =>
	str
		.split(',')
		.map((e) => e.trim())
		.filter(Boolean);

export const formatBuiltInTools = (builtInTools: IDataObject): ProviderTool[] => {
	const tools: ProviderTool[] = [];
	if (builtInTools) {
		const webSearchOptions = builtInTools.webSearch as IDataObject;
		if (webSearchOptions) {
			let allowedDomains: string[] | undefined;
			const allowedDomainsRaw = webSearchOptions.allowedDomains as string;
			if (allowedDomainsRaw) {
				allowedDomains = toArray(allowedDomainsRaw);
			}

			let userLocation: IDataObject | undefined;
			if (webSearchOptions.country || webSearchOptions.city || webSearchOptions.region) {
				userLocation = {
					type: 'approximate',
					country: webSearchOptions.country as string,
					city: webSearchOptions.city as string,
					region: webSearchOptions.region as string,
				};
			}

			tools.push({
				type: 'provider',
				name: 'web_search',
				args: {
					search_context_size: webSearchOptions.searchContextSize as string,
					user_location: userLocation,
					...(allowedDomains && { filters: { allowed_domains: allowedDomains } }),
				},
			});
		}
	}
	return tools;
};
