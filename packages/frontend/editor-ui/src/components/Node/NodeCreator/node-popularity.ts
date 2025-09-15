// This file imports node popularity data that is fetched during build time
// The data is stored in .build/node-popularity.json and fetched from
// https://internal.users.n8n.cloud/webhook/nodes-popularity-scores

import nodePopularityData from 'virtual:node-popularity-data';

// Export in the expected format for backward compatibility
// The data might have different field names from the API, so we normalize it here
export const nodePopularity = Array.isArray(nodePopularityData)
	? nodePopularityData.map((item: any) => ({
			// Support both 'name' and 'id' fields from the API
			name: item.name || item.id,
			// Support various popularity field names
			popularity_score: item.popularity_score ?? item.popularity ?? 0,
			// Include any additional fields
			...item,
		}))
	: [];
