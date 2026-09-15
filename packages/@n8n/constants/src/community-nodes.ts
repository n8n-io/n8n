export const NPM_COMMUNITY_NODE_SEARCH_API_URL = 'https://api.npms.io/v2/';

/**
 * Node-authoring API level supported by the runtime that bundles this copy.
 *
 * Compatibility rule for community packages:
 * `package.n8n.n8nNodesApiVersion <= N8N_NODES_API_VERSION`.
 *
 * The level mirrors the n8n major for the v3 transition: `1` on master
 * (which ships as 2.x during the v3 window) and `3` on the `3.x` branch,
 * where it also serves as the v3 feature flag for node-authoring APIs.
 *
 * Lives here, not in `n8n-workflow`, so tooling that cannot depend on the
 * runtime packages (e.g. `@n8n/node-cli`) can read the same value.
 */
export const N8N_NODES_API_VERSION = 1;
