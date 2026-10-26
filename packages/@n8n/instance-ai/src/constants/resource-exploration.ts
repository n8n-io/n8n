/**
 * What `get_node_parameter_options` answers when a live lookup cannot run. The tool returns it when
 * no exploration service is wired, and an eval run returns it for a seeded credential,
 * whose placeholder token would make a live lookup fail with a misleading auth error.
 */
export const RESOURCE_EXPLORATION_UNAVAILABLE = 'Resource exploration is not available.';
