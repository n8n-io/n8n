type RenamedTool = {
	/** The name the tool has now. */
	currentName: string;
	/**
	 * Arguments the former tool accepted that the current tool does not. A call
	 * that carries one is left to fail under its former name: the input schema
	 * strips an unknown key instead of rejecting it, so serving the call would
	 * quietly answer a different question from the one the client asked.
	 */
	droppedArguments?: readonly string[];
};

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
 * Before you add an entry, compare the two input schemas. A rename that also
 * changed an argument needs that argument in `droppedArguments`, or the shim
 * turns a loud failure into a wrong answer.
 *
 * Renamed in 2.34.0 (#34347) and 2.38.0 (#37272).
 */
export const RENAMED_TOOLS: Readonly<Record<string, RenamedTool>> = {
	get_execution: { currentName: 'get_workflow_execution' },
	search_executions: {
		currentName: 'search_workflow_executions',
		// `lastId` carried a raw execution ID. `cursor` replaced it with an
		// opaque token, and no value translates between the two, so a paging
		// call cannot be served. A first-page call carries neither and is.
		droppedArguments: ['lastId'],
	},
	prepare_test_pin_data: { currentName: 'prepare_workflow_pin_data' },
	// The `section` enum only gained a member, so every former value still parses.
	get_sdk_reference: { currentName: 'get_workflow_sdk_reference' },
	list_tags: { currentName: 'list_workflow_tags' },
	list_n8n_connect_services: { currentName: 'list_n8n_gateway_services' },
};
