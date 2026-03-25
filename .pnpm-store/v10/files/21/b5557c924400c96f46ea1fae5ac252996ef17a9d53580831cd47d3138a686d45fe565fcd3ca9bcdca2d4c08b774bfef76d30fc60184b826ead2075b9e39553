const require_rolldown_runtime = require('./_virtual/rolldown_runtime.cjs');
const require_hooks = require('./hooks.cjs');
const zod_v3 = require_rolldown_runtime.__toESM(require("zod/v3"));

//#region src/types.ts
const callToolResultContentTypes = [
	"audio",
	"image",
	"resource",
	"resource_link",
	"text"
];
/**
* The severity of a log message.
* @see {@link https://github.com/modelcontextprotocol/typescript-sdk/blob/main/src/types.ts#L1067}
*/
const LoggingLevelSchema = zod_v3.z.enum([
	"debug",
	"info",
	"notice",
	"warning",
	"error",
	"critical",
	"alert",
	"emergency"
]);
/**
* A uniquely identifying ID for a request in JSON-RPC.
* @see {@link https://github.com/modelcontextprotocol/typescript-sdk/blob/main/src/types.ts#L71C1-L74C72}
*/
const RequestIdSchema = zod_v3.z.union([zod_v3.z.string(), zod_v3.z.number().int()]);
const outputTypesUnion = zod_v3.z.union([zod_v3.z.literal("content").describe("Put tool output into the ToolMessage.content array"), zod_v3.z.literal("artifact").describe("Put tool output into the ToolMessage.artifact array")]);
const detailedOutputHandlingSchema = zod_v3.z.object(Object.fromEntries(callToolResultContentTypes.map((contentType) => [contentType, zod_v3.z.union([zod_v3.z.literal("content").describe(`Put all ${contentType} tool output into the ToolMessage.content array`), zod_v3.z.literal("artifact").describe(`Put all ${contentType} tool output into the ToolMessage.artifact array`)]).describe(`Where to place ${contentType} tool output in the LangChain ToolMessage`).optional()])));
const outputHandlingSchema = zod_v3.z.union([outputTypesUnion, detailedOutputHandlingSchema]).describe("Defines where to place each tool output type in the LangChain ToolMessage.\n\nItems in the `content` field will be used as input context for the LLM, while the artifact field is\nused for capturing tool output that won't be shown to the model, to be used in some later workflow\nstep.\n\nFor example, imagine that you have a SQL query tool that can return huge result sets. Rather than\nsending these large outputs directly to the model, perhaps you want the model to be able to inspect\nthe output in a code execution environment. In this case, you would set the output handling for the\n`resource` type to `artifact` (it's default value), and then upon initialization of your code\nexecution environment, you would look through your message history for `ToolMessage`s with the\n`artifact` field set to `resource`, and use the `content` field during initialization of the\nenvironment.");
/**
* Zod schema for validating OAuthClientProvider interface
* Since OAuthClientProvider has methods, we create a custom validator
*/
const oAuthClientProviderSchema = zod_v3.z.custom((val) => {
	if (!val || typeof val !== "object") return false;
	const requiredMethods = [
		"redirectUrl",
		"clientMetadata",
		"clientInformation",
		"tokens",
		"saveTokens"
	];
	if (!("redirectUrl" in val)) return false;
	if (!("clientMetadata" in val)) return false;
	for (const method of requiredMethods) if (!(method in val)) return false;
	return true;
}, { message: "Must be a valid OAuthClientProvider implementation with required properties: redirectUrl, clientMetadata, clientInformation, tokens, saveTokens" });
const baseConfigSchema = zod_v3.z.object({
	outputHandling: outputHandlingSchema.optional(),
	defaultToolTimeout: zod_v3.z.number().min(1).optional()
});
/**
* Stdio transport restart configuration
*/
const stdioRestartSchema = zod_v3.z.object({
	enabled: zod_v3.z.boolean().describe("Whether to automatically restart the process if it exits").optional(),
	maxAttempts: zod_v3.z.number().describe("The maximum number of restart attempts").optional(),
	delayMs: zod_v3.z.number().describe("The delay in milliseconds between restart attempts").optional()
}).describe("Configuration for stdio transport restart");
/**
* Stdio transport connection
*/
const stdioConnectionSchema = zod_v3.z.object({
	transport: zod_v3.z.literal("stdio").optional(),
	type: zod_v3.z.literal("stdio").optional(),
	command: zod_v3.z.string().describe("The executable to run the server"),
	args: zod_v3.z.array(zod_v3.z.string()).describe("Command line arguments to pass to the executable"),
	env: zod_v3.z.record(zod_v3.z.string()).describe("The environment to use when spawning the process").optional(),
	encoding: zod_v3.z.string().describe("The encoding to use when reading from the process").optional(),
	stderr: zod_v3.z.union([
		zod_v3.z.literal("overlapped"),
		zod_v3.z.literal("pipe"),
		zod_v3.z.literal("ignore"),
		zod_v3.z.literal("inherit")
	]).describe("How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`").optional().default("inherit"),
	cwd: zod_v3.z.string().describe("The working directory to use when spawning the process").optional(),
	restart: stdioRestartSchema.optional()
}).and(baseConfigSchema).describe("Configuration for stdio transport connection");
/**
* Streamable HTTP transport reconnection configuration
*/
const streamableHttpReconnectSchema = zod_v3.z.object({
	enabled: zod_v3.z.boolean().describe("Whether to automatically reconnect if the connection is lost").optional(),
	maxAttempts: zod_v3.z.number().describe("The maximum number of reconnection attempts").optional(),
	delayMs: zod_v3.z.number().describe("The delay in milliseconds between reconnection attempts").optional()
}).describe("Configuration for streamable HTTP transport reconnection");
/**
* Streamable HTTP transport connection
*/
const streamableHttpConnectionSchema = zod_v3.z.object({
	transport: zod_v3.z.union([zod_v3.z.literal("http"), zod_v3.z.literal("sse")]).optional(),
	type: zod_v3.z.union([zod_v3.z.literal("http"), zod_v3.z.literal("sse")]).optional(),
	url: zod_v3.z.string().url(),
	headers: zod_v3.z.record(zod_v3.z.string()).optional(),
	authProvider: oAuthClientProviderSchema.optional(),
	reconnect: streamableHttpReconnectSchema.optional(),
	automaticSSEFallback: zod_v3.z.boolean().optional().default(true)
}).and(baseConfigSchema).describe("Configuration for streamable HTTP transport connection");
/**
* Create combined schema for all transport connection types
*/
const connectionSchema = zod_v3.z.union([stdioConnectionSchema, streamableHttpConnectionSchema]).describe("Configuration for a single MCP server");
const toolSourceSchema = zod_v3.z.object({
	type: zod_v3.z.literal("tool"),
	name: zod_v3.z.string(),
	args: zod_v3.z.unknown(),
	server: zod_v3.z.string()
});
/**
* we don't know yet what other types of sources may send progress messages
*/
const unknownSourceSchema = zod_v3.z.object({ type: zod_v3.z.literal("unknown") });
const eventContextSchema = zod_v3.z.union([toolSourceSchema, unknownSourceSchema]);
const serverMessageSourceSchema = zod_v3.z.object({
	server: zod_v3.z.string(),
	options: connectionSchema
});
const notifications = zod_v3.z.object({
	onMessage: zod_v3.z.function().args(zod_v3.z.object({
		level: LoggingLevelSchema,
		logger: zod_v3.z.optional(zod_v3.z.string()),
		data: zod_v3.z.unknown()
	}), serverMessageSourceSchema).returns(zod_v3.z.union([zod_v3.z.void(), zod_v3.z.promise(zod_v3.z.void())])).optional(),
	onProgress: zod_v3.z.function().args(zod_v3.z.object({
		progress: zod_v3.z.number(),
		total: zod_v3.z.optional(zod_v3.z.number()),
		message: zod_v3.z.optional(zod_v3.z.string())
	}), eventContextSchema).returns(zod_v3.z.union([zod_v3.z.void(), zod_v3.z.promise(zod_v3.z.void())])).optional(),
	onCancelled: zod_v3.z.function().args(zod_v3.z.object({
		requestId: RequestIdSchema,
		reason: zod_v3.z.string().optional()
	}), serverMessageSourceSchema).returns(zod_v3.z.union([zod_v3.z.void(), zod_v3.z.promise(zod_v3.z.void())])).optional(),
	onInitialized: zod_v3.z.function().args(serverMessageSourceSchema).returns(zod_v3.z.union([zod_v3.z.void(), zod_v3.z.promise(zod_v3.z.void())])).optional(),
	onPromptsListChanged: zod_v3.z.function().args(serverMessageSourceSchema).returns(zod_v3.z.union([zod_v3.z.void(), zod_v3.z.promise(zod_v3.z.void())])).optional(),
	onResourcesListChanged: zod_v3.z.function().args(serverMessageSourceSchema).returns(zod_v3.z.union([zod_v3.z.void(), zod_v3.z.promise(zod_v3.z.void())])).optional(),
	onResourcesUpdated: zod_v3.z.function().args(zod_v3.z.object({ uri: zod_v3.z.string() }), serverMessageSourceSchema).returns(zod_v3.z.union([zod_v3.z.void(), zod_v3.z.promise(zod_v3.z.void())])).optional(),
	onRootsListChanged: zod_v3.z.function().args(serverMessageSourceSchema).returns(zod_v3.z.union([zod_v3.z.void(), zod_v3.z.promise(zod_v3.z.void())])).optional(),
	onToolsListChanged: zod_v3.z.function().args(serverMessageSourceSchema).returns(zod_v3.z.union([zod_v3.z.void(), zod_v3.z.promise(zod_v3.z.void())])).optional()
});
/**
* {@link MultiServerMCPClient} configuration
*/
const clientConfigSchema = zod_v3.z.object({
	mcpServers: zod_v3.z.record(connectionSchema).describe("A map of server names to their configuration"),
	throwOnLoadError: zod_v3.z.boolean().describe("Whether to throw an error if a tool fails to load").optional().default(true),
	prefixToolNameWithServerName: zod_v3.z.boolean().describe("Whether to prefix tool names with the server name").optional().default(false),
	additionalToolNamePrefix: zod_v3.z.string().describe("An additional prefix to add to the tool name").optional().default(""),
	useStandardContentBlocks: zod_v3.z.boolean().describe("If true, the tool will use LangChain's standard multimodal content blocks for tools that output\nimage or audio content. When true, embedded resources will be converted to `StandardFileBlock`\nobjects. When `false`, all artifacts are left in their MCP format, but embedded resources will\nbe converted to `StandardFileBlock` objects if `outputHandling` causes embedded resources to be\ntreated as content, as otherwise ChatModel providers will not be able to interpret them.").optional().default(false),
	onConnectionError: zod_v3.z.union([zod_v3.z.enum(["throw", "ignore"]), zod_v3.z.function().args(zod_v3.z.object({
		serverName: zod_v3.z.string(),
		error: zod_v3.z.unknown()
	})).returns(zod_v3.z.void())]).describe("Behavior when a server fails to connect: 'throw' to error immediately, 'ignore' to skip failed servers, or a function for custom error handling").optional().default("throw")
}).and(baseConfigSchema).and(require_hooks.toolHooksSchema).and(notifications).describe("Configuration for the MCP client");
/**
* Helper function that expands a string literal OutputHandling to an object with all content types.
* Used when applying server-level overrides to the top-level config.
*
* @internal
*/
function _resolveDetailedOutputHandling(outputHandling, applyDefaults = false) {
	if (outputHandling == null) return {};
	if (typeof outputHandling === "string") return Object.fromEntries(callToolResultContentTypes.map((contentType) => [contentType, outputHandling]));
	const resolved = {};
	for (const contentType of callToolResultContentTypes) if (outputHandling[contentType] || applyDefaults) resolved[contentType] = outputHandling[contentType] ?? (contentType === "resource" ? "artifact" : "content");
	return resolved;
}
/**
* Given a base {@link OutputHandling}, apply any overrides from the override {@link OutputHandling}.
*
* @internal
*/
function _resolveAndApplyOverrideHandlingOverrides(base, override) {
	const expandedBase = _resolveDetailedOutputHandling(base);
	const expandedOverride = _resolveDetailedOutputHandling(override);
	return {
		...expandedBase,
		...expandedOverride
	};
}

//#endregion
exports._resolveAndApplyOverrideHandlingOverrides = _resolveAndApplyOverrideHandlingOverrides;
exports._resolveDetailedOutputHandling = _resolveDetailedOutputHandling;
exports.clientConfigSchema = clientConfigSchema;
exports.connectionSchema = connectionSchema;
//# sourceMappingURL=types.cjs.map