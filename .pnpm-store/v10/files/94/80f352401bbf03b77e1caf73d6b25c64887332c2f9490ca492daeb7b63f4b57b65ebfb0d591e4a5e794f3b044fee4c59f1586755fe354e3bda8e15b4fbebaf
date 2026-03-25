import { toolHooksSchema } from "./hooks.js";
import { z } from "zod/v3";

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
const LoggingLevelSchema = z.enum([
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
const RequestIdSchema = z.union([z.string(), z.number().int()]);
const outputTypesUnion = z.union([z.literal("content").describe("Put tool output into the ToolMessage.content array"), z.literal("artifact").describe("Put tool output into the ToolMessage.artifact array")]);
const detailedOutputHandlingSchema = z.object(Object.fromEntries(callToolResultContentTypes.map((contentType) => [contentType, z.union([z.literal("content").describe(`Put all ${contentType} tool output into the ToolMessage.content array`), z.literal("artifact").describe(`Put all ${contentType} tool output into the ToolMessage.artifact array`)]).describe(`Where to place ${contentType} tool output in the LangChain ToolMessage`).optional()])));
const outputHandlingSchema = z.union([outputTypesUnion, detailedOutputHandlingSchema]).describe("Defines where to place each tool output type in the LangChain ToolMessage.\n\nItems in the `content` field will be used as input context for the LLM, while the artifact field is\nused for capturing tool output that won't be shown to the model, to be used in some later workflow\nstep.\n\nFor example, imagine that you have a SQL query tool that can return huge result sets. Rather than\nsending these large outputs directly to the model, perhaps you want the model to be able to inspect\nthe output in a code execution environment. In this case, you would set the output handling for the\n`resource` type to `artifact` (it's default value), and then upon initialization of your code\nexecution environment, you would look through your message history for `ToolMessage`s with the\n`artifact` field set to `resource`, and use the `content` field during initialization of the\nenvironment.");
/**
* Zod schema for validating OAuthClientProvider interface
* Since OAuthClientProvider has methods, we create a custom validator
*/
const oAuthClientProviderSchema = z.custom((val) => {
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
const baseConfigSchema = z.object({
	outputHandling: outputHandlingSchema.optional(),
	defaultToolTimeout: z.number().min(1).optional()
});
/**
* Stdio transport restart configuration
*/
const stdioRestartSchema = z.object({
	enabled: z.boolean().describe("Whether to automatically restart the process if it exits").optional(),
	maxAttempts: z.number().describe("The maximum number of restart attempts").optional(),
	delayMs: z.number().describe("The delay in milliseconds between restart attempts").optional()
}).describe("Configuration for stdio transport restart");
/**
* Stdio transport connection
*/
const stdioConnectionSchema = z.object({
	transport: z.literal("stdio").optional(),
	type: z.literal("stdio").optional(),
	command: z.string().describe("The executable to run the server"),
	args: z.array(z.string()).describe("Command line arguments to pass to the executable"),
	env: z.record(z.string()).describe("The environment to use when spawning the process").optional(),
	encoding: z.string().describe("The encoding to use when reading from the process").optional(),
	stderr: z.union([
		z.literal("overlapped"),
		z.literal("pipe"),
		z.literal("ignore"),
		z.literal("inherit")
	]).describe("How to handle stderr of the child process. This matches the semantics of Node's `child_process.spawn`").optional().default("inherit"),
	cwd: z.string().describe("The working directory to use when spawning the process").optional(),
	restart: stdioRestartSchema.optional()
}).and(baseConfigSchema).describe("Configuration for stdio transport connection");
/**
* Streamable HTTP transport reconnection configuration
*/
const streamableHttpReconnectSchema = z.object({
	enabled: z.boolean().describe("Whether to automatically reconnect if the connection is lost").optional(),
	maxAttempts: z.number().describe("The maximum number of reconnection attempts").optional(),
	delayMs: z.number().describe("The delay in milliseconds between reconnection attempts").optional()
}).describe("Configuration for streamable HTTP transport reconnection");
/**
* Streamable HTTP transport connection
*/
const streamableHttpConnectionSchema = z.object({
	transport: z.union([z.literal("http"), z.literal("sse")]).optional(),
	type: z.union([z.literal("http"), z.literal("sse")]).optional(),
	url: z.string().url(),
	headers: z.record(z.string()).optional(),
	authProvider: oAuthClientProviderSchema.optional(),
	reconnect: streamableHttpReconnectSchema.optional(),
	automaticSSEFallback: z.boolean().optional().default(true)
}).and(baseConfigSchema).describe("Configuration for streamable HTTP transport connection");
/**
* Create combined schema for all transport connection types
*/
const connectionSchema = z.union([stdioConnectionSchema, streamableHttpConnectionSchema]).describe("Configuration for a single MCP server");
const toolSourceSchema = z.object({
	type: z.literal("tool"),
	name: z.string(),
	args: z.unknown(),
	server: z.string()
});
/**
* we don't know yet what other types of sources may send progress messages
*/
const unknownSourceSchema = z.object({ type: z.literal("unknown") });
const eventContextSchema = z.union([toolSourceSchema, unknownSourceSchema]);
const serverMessageSourceSchema = z.object({
	server: z.string(),
	options: connectionSchema
});
const notifications = z.object({
	onMessage: z.function().args(z.object({
		level: LoggingLevelSchema,
		logger: z.optional(z.string()),
		data: z.unknown()
	}), serverMessageSourceSchema).returns(z.union([z.void(), z.promise(z.void())])).optional(),
	onProgress: z.function().args(z.object({
		progress: z.number(),
		total: z.optional(z.number()),
		message: z.optional(z.string())
	}), eventContextSchema).returns(z.union([z.void(), z.promise(z.void())])).optional(),
	onCancelled: z.function().args(z.object({
		requestId: RequestIdSchema,
		reason: z.string().optional()
	}), serverMessageSourceSchema).returns(z.union([z.void(), z.promise(z.void())])).optional(),
	onInitialized: z.function().args(serverMessageSourceSchema).returns(z.union([z.void(), z.promise(z.void())])).optional(),
	onPromptsListChanged: z.function().args(serverMessageSourceSchema).returns(z.union([z.void(), z.promise(z.void())])).optional(),
	onResourcesListChanged: z.function().args(serverMessageSourceSchema).returns(z.union([z.void(), z.promise(z.void())])).optional(),
	onResourcesUpdated: z.function().args(z.object({ uri: z.string() }), serverMessageSourceSchema).returns(z.union([z.void(), z.promise(z.void())])).optional(),
	onRootsListChanged: z.function().args(serverMessageSourceSchema).returns(z.union([z.void(), z.promise(z.void())])).optional(),
	onToolsListChanged: z.function().args(serverMessageSourceSchema).returns(z.union([z.void(), z.promise(z.void())])).optional()
});
/**
* {@link MultiServerMCPClient} configuration
*/
const clientConfigSchema = z.object({
	mcpServers: z.record(connectionSchema).describe("A map of server names to their configuration"),
	throwOnLoadError: z.boolean().describe("Whether to throw an error if a tool fails to load").optional().default(true),
	prefixToolNameWithServerName: z.boolean().describe("Whether to prefix tool names with the server name").optional().default(false),
	additionalToolNamePrefix: z.string().describe("An additional prefix to add to the tool name").optional().default(""),
	useStandardContentBlocks: z.boolean().describe("If true, the tool will use LangChain's standard multimodal content blocks for tools that output\nimage or audio content. When true, embedded resources will be converted to `StandardFileBlock`\nobjects. When `false`, all artifacts are left in their MCP format, but embedded resources will\nbe converted to `StandardFileBlock` objects if `outputHandling` causes embedded resources to be\ntreated as content, as otherwise ChatModel providers will not be able to interpret them.").optional().default(false),
	onConnectionError: z.union([z.enum(["throw", "ignore"]), z.function().args(z.object({
		serverName: z.string(),
		error: z.unknown()
	})).returns(z.void())]).describe("Behavior when a server fails to connect: 'throw' to error immediately, 'ignore' to skip failed servers, or a function for custom error handling").optional().default("throw")
}).and(baseConfigSchema).and(toolHooksSchema).and(notifications).describe("Configuration for the MCP client");
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
export { _resolveAndApplyOverrideHandlingOverrides, _resolveDetailedOutputHandling, clientConfigSchema, connectionSchema };
//# sourceMappingURL=types.js.map