import { __exportAll } from "../_virtual/_rolldown/runtime.js";
import { ToolInputParsingException, _configHasToolCallId, _isToolCall } from "./utils.js";
import { ToolMessage, isDirectToolOutput } from "../messages/tool.js";
import { CallbackManager, parseCallbackConfigArg } from "../callbacks/manager.js";
import { AsyncLocalStorageProviderSingleton } from "../singletons/async_local_storage/index.js";
import "../singletons/index.js";
import { ensureConfig, mergeConfigs, patchConfig, pickRunnableConfigKeys } from "../runnables/config.js";
import { getAbortSignalError } from "../utils/signal.js";
import { interopParseAsync, isInteropZodError, isInteropZodSchema, isSimpleStringZodSchema } from "../utils/types/zod.js";
import { validatesOnlyStrings } from "../utils/json_schema.js";
import { consumeAsyncGenerator, isAsyncGenerator } from "../runnables/iter.js";
import { BaseLangChain } from "../language_models/base.js";
import { isLangChainTool, isRunnableToolLike, isStructuredTool, isStructuredToolParams } from "./types.js";
import { z } from "zod/v3";
import { validate } from "@cfworker/json-schema";
import { z as z$1 } from "zod/v4";
//#region src/tools/index.ts
var tools_exports = /* @__PURE__ */ __exportAll({
	BaseToolkit: () => BaseToolkit,
	DynamicStructuredTool: () => DynamicStructuredTool,
	DynamicTool: () => DynamicTool,
	StructuredTool: () => StructuredTool,
	Tool: () => Tool,
	ToolInputParsingException: () => ToolInputParsingException,
	isLangChainTool: () => isLangChainTool,
	isRunnableToolLike: () => isRunnableToolLike,
	isStructuredTool: () => isStructuredTool,
	isStructuredToolParams: () => isStructuredToolParams,
	tool: () => tool
});
/**
* Base class for Tools that accept input of any shape defined by a Zod schema.
*/
var StructuredTool = class extends BaseLangChain {
	/**
	* Optional provider-specific extra fields for the tool.
	*
	* This is used to pass provider-specific configuration that doesn't fit into
	* standard tool fields.
	*/
	extras;
	/**
	* Whether to return the tool's output directly.
	*
	* Setting this to true means that after the tool is called,
	* an agent should stop looping.
	*/
	returnDirect = false;
	verboseParsingErrors = false;
	get lc_namespace() {
		return ["langchain", "tools"];
	}
	/**
	* The tool response format.
	*
	* If "content" then the output of the tool is interpreted as the contents of a
	* ToolMessage. If "content_and_artifact" then the output is expected to be a
	* two-tuple corresponding to the (content, artifact) of a ToolMessage.
	*
	* @default "content"
	*/
	responseFormat = "content";
	/**
	* Default config object for the tool runnable.
	*/
	defaultConfig;
	constructor(fields) {
		super(fields ?? {});
		this.verboseParsingErrors = fields?.verboseParsingErrors ?? this.verboseParsingErrors;
		this.responseFormat = fields?.responseFormat ?? this.responseFormat;
		this.defaultConfig = fields?.defaultConfig ?? this.defaultConfig;
		this.metadata = fields?.metadata ?? this.metadata;
		this.extras = fields?.extras ?? this.extras;
	}
	/**
	* Invokes the tool with the provided input and configuration.
	* @param input The input for the tool.
	* @param config Optional configuration for the tool.
	* @returns A Promise that resolves with the tool's output.
	*/
	async invoke(input, config) {
		let toolInput;
		let enrichedConfig = ensureConfig(mergeConfigs(this.defaultConfig, config));
		if (_isToolCall(input)) {
			toolInput = input.args;
			enrichedConfig = {
				...enrichedConfig,
				toolCall: input
			};
		} else toolInput = input;
		return this.call(toolInput, enrichedConfig);
	}
	/**
	* @deprecated Use .invoke() instead. Will be removed in 0.3.0.
	*
	* Calls the tool with the provided argument, configuration, and tags. It
	* parses the input according to the schema, handles any errors, and
	* manages callbacks.
	* @param arg The input argument for the tool.
	* @param configArg Optional configuration or callbacks for the tool.
	* @param tags Optional tags for the tool.
	* @returns A Promise that resolves with a string.
	*/
	async call(arg, configArg, tags) {
		const inputForValidation = _isToolCall(arg) ? arg.args : arg;
		let parsed;
		if (isInteropZodSchema(this.schema)) try {
			parsed = await interopParseAsync(this.schema, inputForValidation);
		} catch (e) {
			let message = `Received tool input did not match expected schema`;
			if (this.verboseParsingErrors) message = `${message}\nDetails: ${e.message}`;
			if (isInteropZodError(e)) message = `${message}\n\n${z$1.prettifyError(e)}`;
			throw new ToolInputParsingException(message, JSON.stringify(arg));
		}
		else {
			const result = validate(inputForValidation, this.schema);
			if (!result.valid) {
				let message = `Received tool input did not match expected schema`;
				if (this.verboseParsingErrors) message = `${message}\nDetails: ${result.errors.map((e) => `${e.keywordLocation}: ${e.error}`).join("\n")}`;
				throw new ToolInputParsingException(message, JSON.stringify(arg));
			}
			parsed = inputForValidation;
		}
		const config = parseCallbackConfigArg(configArg);
		const callbackManager_ = CallbackManager.configure(config.callbacks, this.callbacks, config.tags || tags, this.tags, config.metadata, this.metadata, { verbose: this.verbose });
		let toolCallId;
		if (_isToolCall(arg)) toolCallId = arg.id;
		if (!toolCallId && _configHasToolCallId(config)) toolCallId = config.toolCall.id;
		const runManager = await callbackManager_?.handleToolStart(this.toJSON(), typeof arg === "string" ? arg : JSON.stringify(arg), config.runId, void 0, void 0, void 0, config.runName, toolCallId);
		delete config.runId;
		let result;
		try {
			const raw = await this._call(parsed, runManager, config);
			result = isAsyncGenerator(raw) ? await consumeAsyncGenerator(raw, async (chunk) => {
				try {
					await runManager?.handleToolEvent(chunk);
				} catch (streamError) {
					await runManager?.handleToolError(streamError);
				}
			}) : raw;
		} catch (e) {
			await runManager?.handleToolError(e);
			throw e;
		}
		let content;
		let artifact;
		if (this.responseFormat === "content_and_artifact") if (Array.isArray(result) && result.length === 2) [content, artifact] = result;
		else throw new Error(`Tool response format is "content_and_artifact" but the output was not a two-tuple.\nResult: ${JSON.stringify(result)}`);
		else content = result;
		const formattedOutput = _formatToolOutput({
			content,
			artifact,
			toolCallId,
			name: this.name,
			metadata: this.metadata
		});
		await runManager?.handleToolEnd(formattedOutput);
		return formattedOutput;
	}
};
/**
* Base class for Tools that accept input as a string.
*/
var Tool = class extends StructuredTool {
	schema = z.object({ input: z.string().optional() }).transform((obj) => obj.input);
	constructor(fields) {
		super(fields);
	}
	/**
	* @deprecated Use .invoke() instead. Will be removed in 0.3.0.
	*
	* Calls the tool with the provided argument and callbacks. It handles
	* string inputs specifically.
	* @param arg The input argument for the tool, which can be a string, undefined, or an input of the tool's schema.
	* @param callbacks Optional callbacks for the tool.
	* @returns A Promise that resolves with a string.
	*/
	call(arg, callbacks) {
		const structuredArg = typeof arg === "string" || arg == null ? { input: arg } : arg;
		return super.call(structuredArg, callbacks);
	}
};
/**
* A tool that can be created dynamically from a function, name, and description.
*/
var DynamicTool = class extends Tool {
	static lc_name() {
		return "DynamicTool";
	}
	name;
	description;
	func;
	constructor(fields) {
		super(fields);
		this.name = fields.name;
		this.description = fields.description;
		this.func = fields.func;
		this.returnDirect = fields.returnDirect ?? this.returnDirect;
	}
	/**
	* @deprecated Use .invoke() instead. Will be removed in 0.3.0.
	*/
	async call(arg, configArg) {
		const config = parseCallbackConfigArg(configArg);
		if (config.runName === void 0) config.runName = this.name;
		return super.call(arg, config);
	}
	/** @ignore */
	_call(input, runManager, parentConfig) {
		return this.func(input, runManager, parentConfig);
	}
};
/**
* A tool that can be created dynamically from a function, name, and
* description, designed to work with structured data. It extends the
* StructuredTool class and overrides the _call method to execute the
* provided function when the tool is called.
*
* Schema can be passed as Zod or JSON schema. The tool will not validate
* input if JSON schema is passed.
*
* @template SchemaT The input schema type for the tool (Zod schema or JSON schema). Defaults to `ToolInputSchemaBase`.
* @template SchemaOutputT The output type derived from the schema after parsing/validation. Defaults to `ToolInputSchemaOutputType<SchemaT>`.
* @template SchemaInputT The input type derived from the schema before parsing. Defaults to `ToolInputSchemaInputType<SchemaT>`.
* @template ToolOutputT The return type of the tool's function. Defaults to `ToolOutputType`.
* @template NameT The literal type of the tool name (for discriminated union support). Defaults to `string`.
*/
var DynamicStructuredTool = class extends StructuredTool {
	static lc_name() {
		return "DynamicStructuredTool";
	}
	description;
	func;
	schema;
	constructor(fields) {
		super(fields);
		this.name = fields.name;
		this.description = fields.description;
		this.func = fields.func;
		this.returnDirect = fields.returnDirect ?? this.returnDirect;
		this.schema = fields.schema;
	}
	/**
	* @deprecated Use .invoke() instead. Will be removed in 0.3.0.
	*/
	async call(arg, configArg, tags) {
		const config = parseCallbackConfigArg(configArg);
		if (config.runName === void 0) config.runName = this.name;
		return super.call(arg, config, tags);
	}
	_call(arg, runManager, parentConfig) {
		return this.func(arg, runManager, parentConfig);
	}
};
/**
* Abstract base class for toolkits in LangChain. Toolkits are collections
* of tools that agents can use. Subclasses must implement the `tools`
* property to provide the specific tools for the toolkit.
*/
var BaseToolkit = class {
	getTools() {
		return this.tools;
	}
};
function tool(func, fields) {
	const isSimpleStringSchema = isSimpleStringZodSchema(fields.schema);
	const isStringJSONSchema = validatesOnlyStrings(fields.schema);
	if (!fields.schema || isSimpleStringSchema || isStringJSONSchema) return new DynamicTool({
		...fields,
		description: fields.description ?? fields.schema?.description ?? `${fields.name} tool`,
		func: async (input, runManager, config) => {
			return new Promise((resolve, reject) => {
				const childConfig = patchConfig(config, { callbacks: runManager?.getChild() });
				AsyncLocalStorageProviderSingleton.runWithConfig(pickRunnableConfigKeys(childConfig), async () => {
					try {
						resolve(func(input, childConfig));
					} catch (e) {
						reject(e);
					}
				});
			});
		}
	});
	const schema = fields.schema;
	const description = fields.description ?? fields.schema.description ?? `${fields.name} tool`;
	return new DynamicStructuredTool({
		...fields,
		description,
		schema,
		func: async (input, runManager, config) => {
			return new Promise((resolve, reject) => {
				let listener;
				const cleanup = () => {
					if (config?.signal && listener) config.signal.removeEventListener("abort", listener);
				};
				if (config?.signal) {
					listener = () => {
						cleanup();
						reject(getAbortSignalError(config.signal));
					};
					config.signal.addEventListener("abort", listener, { once: true });
				}
				const childConfig = patchConfig(config, { callbacks: runManager?.getChild() });
				AsyncLocalStorageProviderSingleton.runWithConfig(pickRunnableConfigKeys(childConfig), async () => {
					try {
						const result = await func(input, childConfig);
						if (isAsyncGenerator(result)) {
							resolve(result);
							return;
						}
						/**
						* If the signal is aborted, we don't want to resolve the promise
						* as the promise is already rejected.
						*/
						if (config?.signal?.aborted) {
							cleanup();
							return;
						}
						cleanup();
						resolve(result);
					} catch (e) {
						cleanup();
						reject(e);
					}
				});
			});
		}
	});
}
function _formatToolOutput(params) {
	const { content, artifact, toolCallId, metadata } = params;
	if (toolCallId && !isDirectToolOutput(content)) if (typeof content === "string" || Array.isArray(content) && content.every((item) => typeof item === "object")) return new ToolMessage({
		status: "success",
		content,
		artifact,
		tool_call_id: toolCallId,
		name: params.name,
		metadata
	});
	else return new ToolMessage({
		status: "success",
		content: _stringify(content),
		artifact,
		tool_call_id: toolCallId,
		name: params.name,
		metadata
	});
	else return content;
}
function _stringify(content) {
	try {
		return JSON.stringify(content) ?? "";
	} catch (_noOp) {
		return `${content}`;
	}
}
//#endregion
export { BaseToolkit, DynamicStructuredTool, DynamicTool, StructuredTool, Tool, ToolInputParsingException, isLangChainTool, isRunnableToolLike, isStructuredTool, isStructuredToolParams, tool, tools_exports };

//# sourceMappingURL=index.js.map