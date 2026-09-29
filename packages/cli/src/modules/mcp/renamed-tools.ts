/**
 * Tool names earlier n8n versions exposed, mapped to the name each tool has
 * now. A client caches the tool list it read before the upgrade and keeps
 * calling the old name afterwards; the MCP SDK rejects an unknown name before
 * any n8n code runs, so the call is rewritten to the current name on the way
 * in (see `resolveRenamedToolCall`).
 *
 * The old names stay out of `tools/list`: a client that lists again sees only
 * current names, and no tool is advertised twice.
 *
 * Renamed in 2.34.0 (#34347) and 2.38.0 (#37272).
 */
export const RENAMED_TOOLS: Readonly<Record<string, string>> = {
	get_execution: 'get_workflow_execution',
	search_executions: 'search_workflow_executions',
	prepare_test_pin_data: 'prepare_workflow_pin_data',
	get_sdk_reference: 'get_workflow_sdk_reference',
	list_tags: 'list_workflow_tags',
	list_n8n_connect_services: 'list_n8n_gateway_services',
};
