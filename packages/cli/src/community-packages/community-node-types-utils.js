'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getCommunityNodeTypes = getCommunityNodeTypes;
const strapi_utils_1 = require('./strapi-utils');
const N8N_VETTED_NODE_TYPES_STAGING_URL = 'https://api-staging.n8n.io/api/community-nodes';
const N8N_VETTED_NODE_TYPES_PRODUCTION_URL = 'https://api.n8n.io/api/community-nodes';
async function getCommunityNodeTypes(environment) {
	const url =
		environment === 'production'
			? N8N_VETTED_NODE_TYPES_PRODUCTION_URL
			: N8N_VETTED_NODE_TYPES_STAGING_URL;
	return await (0, strapi_utils_1.paginatedRequest)(url);
}
//# sourceMappingURL=community-node-types-utils.js.map
