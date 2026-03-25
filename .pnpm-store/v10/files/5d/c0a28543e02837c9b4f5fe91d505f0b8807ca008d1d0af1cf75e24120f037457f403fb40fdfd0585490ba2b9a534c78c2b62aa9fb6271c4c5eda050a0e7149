
//#region src/tools/mcp.ts
/**
* Converts a McpToolFilter to the API format.
*/
function convertToolFilter(filter) {
	return {
		tool_names: filter.toolNames,
		read_only: filter.readOnly
	};
}
/**
* Converts allowed_tools option to API format.
*/
function convertAllowedTools(allowedTools) {
	if (!allowedTools) return void 0;
	if (Array.isArray(allowedTools)) return allowedTools;
	return convertToolFilter(allowedTools);
}
/**
* Converts require_approval option to API format.
*/
function convertRequireApproval(requireApproval) {
	if (!requireApproval) return void 0;
	if (typeof requireApproval === "string") return requireApproval;
	return {
		always: requireApproval.always ? convertToolFilter(requireApproval.always) : void 0,
		never: requireApproval.never ? convertToolFilter(requireApproval.never) : void 0
	};
}
function mcp(options) {
	const baseConfig = {
		type: "mcp",
		server_label: options.serverLabel,
		allowed_tools: convertAllowedTools(options.allowedTools),
		authorization: options.authorization,
		headers: options.headers,
		require_approval: convertRequireApproval(options.requireApproval),
		server_description: options.serverDescription
	};
	if ("serverUrl" in options) return {
		...baseConfig,
		server_url: options.serverUrl
	};
	return {
		...baseConfig,
		connector_id: options.connectorId
	};
}

//#endregion
exports.mcp = mcp;
//# sourceMappingURL=mcp.cjs.map