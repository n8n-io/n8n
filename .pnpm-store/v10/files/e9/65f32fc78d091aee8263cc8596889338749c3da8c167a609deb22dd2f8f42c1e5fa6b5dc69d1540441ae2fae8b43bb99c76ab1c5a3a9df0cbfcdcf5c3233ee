import { _resolveDetailedOutputHandling, callToolResultContentTypes } from "./types.js";
import { getDebugLog } from "./logging.js";
import { ZodError } from "zod/v3";
import { ZodError as ZodError$1, z as z$1 } from "zod/v4";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { ToolMessage } from "@langchain/core/messages";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";

//#region src/tools.ts
const debugLog = getDebugLog("tools");
/**
* Dereferences $ref pointers in a JSON Schema by inlining the definitions from $defs.
* This is necessary because some JSON Schema validators (like @cfworker/json-schema)
* don't automatically resolve $ref references to $defs.
*
* @param schema - The JSON Schema to dereference
* @returns A new schema with all $ref pointers resolved
*/
function dereferenceJsonSchema(schema) {
	const definitions = schema.$defs ?? schema.definitions ?? {};
	/**
	* Recursively resolve $ref pointers in the schema.
	* Tracks visited refs to prevent infinite recursion with circular references.
	*/
	function resolveRefs(obj, visitedRefs = /* @__PURE__ */ new Set()) {
		if (typeof obj !== "object" || obj === null) return obj;
		if (obj.$ref && typeof obj.$ref === "string") {
			const refPath = obj.$ref;
			const defsMatch = refPath.match(/^#\/\$defs\/(.+)$/);
			const definitionsMatch = refPath.match(/^#\/definitions\/(.+)$/);
			const match = defsMatch || definitionsMatch;
			if (match) {
				const defName = match[1];
				const definition = definitions[defName];
				if (definition) {
					if (visitedRefs.has(refPath)) {
						debugLog(`WARNING: Circular reference detected for ${refPath}, using empty object`);
						return { type: "object" };
					}
					const newVisitedRefs = new Set(visitedRefs);
					newVisitedRefs.add(refPath);
					const { $ref: _,...restOfObj } = obj;
					const resolvedDef = resolveRefs(definition, newVisitedRefs);
					return {
						...resolvedDef,
						...restOfObj
					};
				} else debugLog(`WARNING: Could not resolve $ref: ${refPath}`);
			}
			return obj;
		}
		const result = {};
		for (const [key, value] of Object.entries(obj)) {
			if (key === "$defs" || key === "definitions") continue;
			if (Array.isArray(value)) result[key] = value.map((item) => typeof item === "object" && item !== null ? resolveRefs(item, visitedRefs) : item);
			else if (typeof value === "object" && value !== null) result[key] = resolveRefs(value, visitedRefs);
			else result[key] = value;
		}
		return result;
	}
	return resolveRefs(schema);
}
/**
* Deep merges two JSON Schema objects.
* Arrays are concatenated (with special handling for enum), objects are recursively merged,
* primitives are overwritten.
*
* @param target - The target schema to merge into
* @param source - The source schema to merge from
* @returns A new merged schema
*/
function deepMergeSchemas(target, source) {
	const result = { ...target };
	for (const [key, sourceValue] of Object.entries(source)) {
		const targetValue = result[key];
		if (key === "required" && Array.isArray(targetValue)) result[key] = [...new Set([...targetValue, ...sourceValue])];
		else if (key === "const") {
			const existingConst = result.const;
			const existingEnum = result.enum;
			const values = /* @__PURE__ */ new Set();
			if (existingEnum) for (const v of existingEnum) values.add(v);
			if (existingConst !== void 0) values.add(existingConst);
			values.add(sourceValue);
			delete result.const;
			result.enum = [...values];
		} else if (key === "enum" && Array.isArray(sourceValue)) {
			const values = /* @__PURE__ */ new Set();
			if (Array.isArray(targetValue)) for (const v of targetValue) values.add(v);
			if (result.const !== void 0) {
				values.add(result.const);
				delete result.const;
			}
			for (const v of sourceValue) values.add(v);
			result[key] = [...values];
		} else if (key === "properties" && typeof targetValue === "object" && targetValue !== null) {
			const mergedProps = { ...targetValue };
			for (const [propKey, propValue] of Object.entries(sourceValue)) if (mergedProps[propKey] && typeof mergedProps[propKey] === "object" && typeof propValue === "object") mergedProps[propKey] = deepMergeSchemas(mergedProps[propKey], propValue);
			else mergedProps[propKey] = propValue;
			result[key] = mergedProps;
		} else if (Array.isArray(sourceValue) && Array.isArray(targetValue)) result[key] = [...targetValue, ...sourceValue];
		else if (typeof sourceValue === "object" && sourceValue !== null && !Array.isArray(sourceValue) && typeof targetValue === "object" && targetValue !== null && !Array.isArray(targetValue)) result[key] = deepMergeSchemas(targetValue, sourceValue);
		else result[key] = sourceValue;
	}
	return result;
}
/**
* Extracts and merges properties from if/then/else conditional schemas.
* This is used when processing allOf items that contain conditionals.
*
* @param schema - A schema that may contain if/then/else
* @returns Properties extracted from both then and else branches
*/
function extractPropertiesFromConditional(schema) {
	let result = {};
	if (schema.then && typeof schema.then === "object") {
		const thenSchema = schema.then;
		if (thenSchema.properties) result = deepMergeSchemas(result, { properties: thenSchema.properties });
		if (thenSchema.required) result.required = [...new Set([...result.required || [], ...thenSchema.required])];
	}
	if (schema.else && typeof schema.else === "object") {
		const elseSchema = schema.else;
		if (elseSchema.properties) result = deepMergeSchemas(result, { properties: elseSchema.properties });
		if (elseSchema.required) result.required = [...new Set([...result.required || [], ...elseSchema.required])];
	}
	return result;
}
/**
* Simplifies a JSON Schema for LLM compatibility by removing patterns that
* OpenAI and other LLM providers don't support at the top level:
* - allOf: merged into the main schema
* - anyOf/oneOf: flattened to the first object variant or merged if all are objects
* - if/then/else: conditional schemas are removed, but properties are extracted
* - not: negation constraints are removed
* - $schema: meta schema reference is removed
* - unevaluatedProperties: not supported by OpenAI
*
* This transformation is applied recursively to nested schemas as well.
*
* @param schema - The JSON Schema to simplify
* @returns A new simplified schema compatible with LLM tool calling APIs
*/
function simplifyJsonSchemaForLLM(schema) {
	if (typeof schema !== "object" || schema === null) return schema;
	const { allOf, anyOf, oneOf, not: _not, if: schemaIf, then: schemaThen, else: schemaElse, $schema: _$schema, unevaluatedProperties: _unevaluatedProperties,...baseSchema } = schema;
	let result = { ...baseSchema };
	if (schemaIf || schemaThen || schemaElse) {
		const conditionalProps = extractPropertiesFromConditional({
			if: schemaIf,
			then: schemaThen,
			else: schemaElse
		});
		result = deepMergeSchemas(result, conditionalProps);
		debugLog(`INFO: Extracted properties from if/then/else conditional`);
	}
	if (Array.isArray(allOf)) {
		for (const subSchema of allOf) {
			if (subSchema.if || subSchema.then || subSchema.else) {
				const conditionalProps = extractPropertiesFromConditional(subSchema);
				result = deepMergeSchemas(result, conditionalProps);
			}
			const simplified = simplifyJsonSchemaForLLM(subSchema);
			result = deepMergeSchemas(result, simplified);
		}
		debugLog(`INFO: Flattened allOf with ${allOf.length} schemas into base schema`);
	}
	const unionSchemas = anyOf || oneOf;
	if (Array.isArray(unionSchemas) && unionSchemas.length > 0) {
		const allAreObjects = unionSchemas.every((s) => typeof s === "object" && s !== null && (s.type === "object" || s.properties));
		const mergedProperties = {};
		const requiredSets = [];
		const schemasToMerge = allAreObjects ? unionSchemas : unionSchemas.filter((s) => typeof s === "object" && s !== null && (s.type === "object" || s.properties));
		for (const subSchema of schemasToMerge) {
			const simplified = simplifyJsonSchemaForLLM(subSchema);
			if (simplified.properties) Object.assign(mergedProperties, simplified.properties);
			if (simplified.required && Array.isArray(simplified.required)) requiredSets.push(new Set(simplified.required));
			if (simplified.type && !result.type) result.type = simplified.type;
		}
		if (Object.keys(mergedProperties).length > 0) result.properties = {
			...result.properties,
			...mergedProperties
		};
		if (requiredSets.length > 0) {
			const commonRequired = requiredSets.reduce((acc, set) => {
				return new Set([...acc].filter((x) => set.has(x)));
			});
			if (commonRequired.size > 0) result.required = [...new Set([...result.required || [], ...commonRequired])];
		}
		debugLog(`INFO: Merged ${schemasToMerge.length} object schemas from ${anyOf ? "anyOf" : "oneOf"}`);
	}
	if (result.properties && !result.type) result.type = "object";
	if (result.properties) {
		const simplifiedProperties = {};
		for (const [propName, propSchema] of Object.entries(result.properties)) if (typeof propSchema === "object" && propSchema !== null) simplifiedProperties[propName] = simplifyJsonSchemaForLLM(propSchema);
		else simplifiedProperties[propName] = propSchema;
		result.properties = simplifiedProperties;
	}
	if (result.items) {
		if (Array.isArray(result.items)) result.items = result.items.map((item) => typeof item === "object" && item !== null ? simplifyJsonSchemaForLLM(item) : item);
		else if (typeof result.items === "object") result.items = simplifyJsonSchemaForLLM(result.items);
	}
	if (typeof result.additionalProperties === "object" && result.additionalProperties !== null) result.additionalProperties = simplifyJsonSchemaForLLM(result.additionalProperties);
	return result;
}
/**
* Custom error class for tool exceptions
*/
var ToolException = class extends Error {
	constructor(message, cause) {
		super(message);
		this.name = "ToolException";
		/**
		* don't display the large ZodError stack trace
		*/
		if (cause && (cause instanceof ZodError$1 || cause instanceof ZodError)) {
			const minifiedZodError = new Error(z$1.prettifyError(cause));
			const stackByLine = cause.stack?.split("\n") || [];
			minifiedZodError.stack = cause.stack?.split("\n").slice(stackByLine.findIndex((l) => l.includes("    at"))).join("\n");
			this.cause = minifiedZodError;
		} else if (cause) this.cause = cause;
	}
};
function isToolException(error) {
	return typeof error === "object" && error !== null && "name" in error && error.name === "ToolException";
}
function isResourceReference(resource) {
	return typeof resource === "object" && resource !== null && "uri" in resource && typeof resource.uri === "string" && (!("blob" in resource) || resource.blob == null) && (!("text" in resource) || resource.text == null);
}
async function* _embeddedResourceToStandardFileBlocks(resource, client) {
	if (isResourceReference(resource)) {
		const response = await client.readResource({ uri: resource.uri });
		for (const content of response.contents) yield* _embeddedResourceToStandardFileBlocks(content, client);
		return;
	}
	if ("blob" in resource && resource.blob != null) yield {
		type: "file",
		source_type: "base64",
		data: resource.blob,
		mime_type: resource.mimeType,
		...resource.uri != null ? { metadata: { uri: resource.uri } } : {}
	};
	if ("text" in resource && resource.text != null) yield {
		type: "file",
		source_type: "text",
		mime_type: resource.mimeType,
		text: resource.text,
		...resource.uri != null ? { metadata: { uri: resource.uri } } : {}
	};
}
async function _toolOutputToContentBlocks(content, useStandardContentBlocks, client, toolName, serverName) {
	const blocks = [];
	switch (content.type) {
		case "text": return [{
			type: "text",
			...useStandardContentBlocks ? { source_type: "text" } : {},
			text: content.text
		}];
		case "image":
			if (useStandardContentBlocks) return [{
				type: "image",
				source_type: "base64",
				data: content.data,
				mime_type: content.mimeType
			}];
			return [{
				type: "image_url",
				image_url: { url: `data:${content.mimeType};base64,${content.data}` }
			}];
		case "audio": return [{
			type: "audio",
			source_type: "base64",
			data: content.data,
			mime_type: content.mimeType
		}];
		case "resource":
			for await (const block of _embeddedResourceToStandardFileBlocks(content.resource, client)) blocks.push(block);
			return blocks;
		case "resource_link": return [{
			type: "file",
			source_type: "url",
			url: content.uri,
			mime_type: content.mimeType
		}];
		default: throw new ToolException(`MCP tool '${toolName}' on server '${serverName}' returned a content block with unexpected type "${content.type}." Expected one of ${callToolResultContentTypes.map((t) => `"${t}"`).join(", ")}.`);
	}
}
async function _embeddedResourceToArtifact(resource, useStandardContentBlocks, client, toolName, serverName) {
	if (useStandardContentBlocks) return _toolOutputToContentBlocks(resource, useStandardContentBlocks, client, toolName, serverName);
	if ((!("blob" in resource) || resource.blob == null) && (!("text" in resource) || resource.text == null) && "uri" in resource && typeof resource.uri === "string") {
		const response = await client.readResource({ uri: resource.uri });
		return response.contents.map((content) => ({
			type: "resource",
			resource: { ...content }
		}));
	}
	return [resource];
}
function _getOutputTypeForContentType(contentType, outputHandling) {
	if (outputHandling === "content" || outputHandling === "artifact") return outputHandling;
	const resolved = _resolveDetailedOutputHandling(outputHandling);
	return resolved[contentType] ?? (contentType === "resource" ? "artifact" : "content");
}
/**
* Process the result from calling an MCP tool.
* Extracts text content and non-text content for better agent compatibility.
*
* @internal
*
* @param args - The arguments to pass to the tool
* @returns A tuple of [textContent, nonTextContent]
*/
async function _convertCallToolResult({ serverName, toolName, result, client, useStandardContentBlocks, outputHandling }) {
	if (!result) throw new ToolException(`MCP tool '${toolName}' on server '${serverName}' returned an invalid result - tool call response was undefined`);
	if (!Array.isArray(result.content)) throw new ToolException(`MCP tool '${toolName}' on server '${serverName}' returned an invalid result - expected an array of content, but was ${typeof result.content}`);
	if (result.isError) throw new ToolException(`MCP tool '${toolName}' on server '${serverName}' returned an error: ${result.content.map((content) => content.type === "text" ? content.text : "").join("\n")}`);
	const convertedContent = (await Promise.all(result.content.filter((content) => _getOutputTypeForContentType(content.type, outputHandling) === "content").map((content) => _toolOutputToContentBlocks(content, useStandardContentBlocks, client, toolName, serverName)))).flat();
	const artifacts = (await Promise.all(result.content.filter((content) => _getOutputTypeForContentType(content.type, outputHandling) === "artifact").map((content) => {
		return _embeddedResourceToArtifact(content, useStandardContentBlocks, client, toolName, serverName);
	}))).flat();
	const structuredContent = result.structuredContent;
	const meta = result._meta;
	const enhancedArtifacts = [...artifacts];
	if (structuredContent) enhancedArtifacts.push({
		type: "mcp_structured_content",
		data: structuredContent
	});
	if (meta) enhancedArtifacts.push({
		type: "mcp_meta",
		data: meta
	});
	if (convertedContent.length === 1 && convertedContent[0].type === "text") {
		const textBlock = convertedContent[0];
		const textContent = textBlock.text;
		if (structuredContent || meta) return [{
			...textBlock,
			...structuredContent ? { structuredContent } : {},
			...meta ? { meta } : {}
		}, enhancedArtifacts];
		return [textContent, enhancedArtifacts];
	}
	return [convertedContent, enhancedArtifacts];
}
/**
* Call an MCP tool.
*
* Use this with `.bind` to capture the fist three arguments, then pass to the constructor of DynamicStructuredTool.
*
* @internal
* @param args - The arguments to pass to the tool
* @returns A tuple of [textContent, nonTextContent]
*/
async function _callTool({ serverName, toolName, client, args, config, useStandardContentBlocks, outputHandling, onProgress, beforeToolCall, afterToolCall }) {
	try {
		debugLog(`INFO: Calling tool ${toolName}(${JSON.stringify(args)})`);
		const numericTimeout = config?.metadata?.timeoutMs ?? config?.timeout;
		const requestOptions = {
			...numericTimeout ? { timeout: numericTimeout } : {},
			...config?.signal ? { signal: config.signal } : {},
			...onProgress ? { onprogress: (progress) => {
				onProgress?.(progress, {
					type: "tool",
					name: toolName,
					args,
					server: serverName
				});
			} } : {}
		};
		let state = {};
		try {
			state = getCurrentTaskInput(config);
		} catch (error) {
			debugLog(`State can't be derrived as LangGraph is not used: ${String(error)}`);
		}
		const beforeToolCallInterception = await beforeToolCall?.({
			name: toolName,
			args,
			serverName
		}, state, config ?? {});
		const finalArgs = Object.assign(args, beforeToolCallInterception?.args || {});
		const headers = beforeToolCallInterception?.headers || {};
		const hasHeaderChanges = Object.entries(headers).length > 0;
		if (hasHeaderChanges && typeof client.fork !== "function") throw new ToolException(`MCP client for server "${serverName}" does not support header changes`);
		const finalClient = hasHeaderChanges && typeof client.fork === "function" ? await client.fork(headers) : client;
		const callToolArgs = [{
			name: toolName,
			arguments: finalArgs
		}];
		if (Object.keys(requestOptions).length > 0) {
			callToolArgs.push(void 0);
			callToolArgs.push(requestOptions);
		}
		const result = await finalClient.callTool(...callToolArgs);
		const [content, artifacts] = await _convertCallToolResult({
			serverName,
			toolName,
			result,
			client: finalClient,
			useStandardContentBlocks,
			outputHandling
		});
		const normalizedContent = typeof content === "string" ? content : Array.isArray(content) ? content : [content];
		const normalizedArtifacts = artifacts.filter((artifact) => artifact.type === "resource" || artifact.type !== "mcp_structured_content" && artifact.type !== "mcp_meta" && typeof artifact === "object" && artifact !== null && "source_type" in artifact);
		const interceptedResult = await afterToolCall?.({
			name: toolName,
			args: finalArgs,
			result: [normalizedContent, normalizedArtifacts],
			serverName
		}, state, config ?? {});
		if (!interceptedResult) return [content, artifacts];
		if (typeof interceptedResult.result === "string") return [interceptedResult.result, []];
		if (Array.isArray(interceptedResult.result)) return interceptedResult.result;
		if (ToolMessage.isInstance(interceptedResult.result)) return [interceptedResult.result.contentBlocks, []];
		if (interceptedResult?.result instanceof Command) return interceptedResult.result;
		throw new Error(`Unexpected result value type from afterToolCall: expected either a Command, a ToolMessage or a tuple of ContentBlock and Artifact, but got ${interceptedResult.result}`);
	} catch (error) {
		if (error instanceof ZodError$1 || error instanceof ZodError) throw new ToolException(z$1.prettifyError(error), error);
		debugLog(`Error calling tool ${toolName}: ${String(error)}`);
		if (isToolException(error)) throw error;
		throw new ToolException(`Error calling tool ${toolName}: ${String(error)}`);
	}
}
const defaultLoadMcpToolsOptions = {
	throwOnLoadError: true,
	prefixToolNameWithServerName: false,
	additionalToolNamePrefix: "",
	useStandardContentBlocks: false
};
/**
* Load all tools from an MCP client.
*
* @param serverName - The name of the server to load tools from
* @param client - The MCP client
* @returns A list of LangChain tools
*/
async function loadMcpTools(serverName, client, options) {
	const { throwOnLoadError, prefixToolNameWithServerName, additionalToolNamePrefix, useStandardContentBlocks, outputHandling, defaultToolTimeout } = {
		...defaultLoadMcpToolsOptions,
		...options ?? {}
	};
	const mcpTools = [];
	let toolsResponse;
	do {
		toolsResponse = await client.listTools({ ...toolsResponse?.nextCursor ? { cursor: toolsResponse.nextCursor } : {} });
		mcpTools.push(...toolsResponse.tools || []);
	} while (toolsResponse.nextCursor);
	debugLog(`INFO: Found ${mcpTools.length} MCP tools`);
	const initialPrefix = additionalToolNamePrefix ? `${additionalToolNamePrefix}__` : "";
	const serverPrefix = prefixToolNameWithServerName ? `${serverName}__` : "";
	const toolNamePrefix = `${initialPrefix}${serverPrefix}`;
	return (await Promise.all(mcpTools.filter((tool) => !!tool.name).map(async (tool) => {
		try {
			if (!tool.inputSchema.properties) tool.inputSchema.properties = {};
			const dereferencedSchema = dereferenceJsonSchema(tool.inputSchema);
			const simplifiedSchema = simplifyJsonSchemaForLLM(dereferencedSchema);
			const dst = new DynamicStructuredTool({
				name: `${toolNamePrefix}${tool.name}`,
				description: tool.description || "",
				schema: simplifiedSchema,
				responseFormat: "content_and_artifact",
				metadata: { annotations: tool.annotations },
				defaultConfig: defaultToolTimeout ? { timeout: defaultToolTimeout } : void 0,
				func: async (args, _runManager, config) => {
					return _callTool({
						serverName,
						toolName: tool.name,
						client,
						args,
						config,
						useStandardContentBlocks,
						outputHandling,
						onProgress: options?.onProgress,
						beforeToolCall: options?.beforeToolCall,
						afterToolCall: options?.afterToolCall
					});
				}
			});
			debugLog(`INFO: Successfully loaded tool: ${dst.name}`);
			return dst;
		} catch (error) {
			debugLog(`ERROR: Failed to load tool "${tool.name}":`, error);
			if (throwOnLoadError) throw error;
			return null;
		}
	}))).filter(Boolean);
}

//#endregion
export { loadMcpTools };
//# sourceMappingURL=tools.js.map