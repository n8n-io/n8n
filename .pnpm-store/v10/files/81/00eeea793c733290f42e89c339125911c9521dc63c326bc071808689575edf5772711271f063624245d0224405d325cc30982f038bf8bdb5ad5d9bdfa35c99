const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_meta = require('./meta.cjs');
const __langchain_core_utils_json_schema = require_rolldown_runtime.__toESM(require("@langchain/core/utils/json_schema"));

//#region src/graph/zod/schema.ts
const PartialStateSchema = Symbol.for("langgraph.state.partial");
function isGraphWithZodLike(graph) {
	if (!graph || typeof graph !== "object") return false;
	if (!("builder" in graph) || typeof graph.builder !== "object" || graph.builder == null) return false;
	return true;
}
function applyJsonSchemaExtrasFromDescription(schema) {
	if (Array.isArray(schema)) return schema.map(applyJsonSchemaExtrasFromDescription);
	if (typeof schema === "object" && schema != null) {
		const output = Object.fromEntries(Object.entries(schema).map(([key, value]) => [key, applyJsonSchemaExtrasFromDescription(value)]));
		if ("description" in output && typeof output.description === "string" && output.description.startsWith(require_meta.META_EXTRAS_DESCRIPTION_PREFIX)) {
			const strMeta = output.description.slice(require_meta.META_EXTRAS_DESCRIPTION_PREFIX.length);
			delete output.description;
			Object.assign(output, JSON.parse(strMeta));
		}
		return output;
	}
	return schema;
}
function toJsonSchema(schema) {
	return applyJsonSchemaExtrasFromDescription((0, __langchain_core_utils_json_schema.toJsonSchema)(schema));
}
/**
* Get the state schema for a graph.
* @param graph - The graph to get the state schema for.
* @returns The state schema for the graph.
*/
function getStateTypeSchema(graph, registry = require_meta.schemaMetaRegistry) {
	if (!isGraphWithZodLike(graph)) return void 0;
	const schemaDef = graph.builder._schemaRuntimeDefinition;
	if (!schemaDef) return void 0;
	return toJsonSchema(registry.getExtendedChannelSchemas(schemaDef, { withJsonSchemaExtrasAsDescription: true }));
}
/**
* Get the update schema for a graph.
* @param graph - The graph to get the update schema for.
* @returns The update schema for the graph.
*/
function getUpdateTypeSchema(graph, registry = require_meta.schemaMetaRegistry) {
	if (!isGraphWithZodLike(graph)) return void 0;
	const schemaDef = graph.builder._schemaRuntimeDefinition;
	if (!schemaDef) return void 0;
	return toJsonSchema(registry.getExtendedChannelSchemas(schemaDef, {
		withReducerSchema: true,
		withJsonSchemaExtrasAsDescription: true,
		asPartial: true
	}));
}
/**
* Get the input schema for a graph.
* @param graph - The graph to get the input schema for.
* @returns The input schema for the graph.
*/
function getInputTypeSchema(graph, registry = require_meta.schemaMetaRegistry) {
	if (!isGraphWithZodLike(graph)) return void 0;
	let schemaDef = graph.builder._inputRuntimeDefinition;
	if (schemaDef === PartialStateSchema) schemaDef = graph.builder._schemaRuntimeDefinition;
	if (!schemaDef) return void 0;
	return toJsonSchema(registry.getExtendedChannelSchemas(schemaDef, {
		withReducerSchema: true,
		withJsonSchemaExtrasAsDescription: true,
		asPartial: true
	}));
}
/**
* Get the output schema for a graph.
* @param graph - The graph to get the output schema for.
* @returns The output schema for the graph.
*/
function getOutputTypeSchema(graph, registry = require_meta.schemaMetaRegistry) {
	if (!isGraphWithZodLike(graph)) return void 0;
	const schemaDef = graph.builder._outputRuntimeDefinition;
	if (!schemaDef) return void 0;
	return toJsonSchema(registry.getExtendedChannelSchemas(schemaDef, { withJsonSchemaExtrasAsDescription: true }));
}
/**
* Get the config schema for a graph.
* @param graph - The graph to get the config schema for.
* @returns The config schema for the graph.
*/
function getConfigTypeSchema(graph, registry = require_meta.schemaMetaRegistry) {
	if (!isGraphWithZodLike(graph)) return void 0;
	const configDef = graph.builder._configRuntimeSchema;
	if (!configDef) return void 0;
	return toJsonSchema(registry.getExtendedChannelSchemas(configDef, { withJsonSchemaExtrasAsDescription: true }));
}

//#endregion
exports.getConfigTypeSchema = getConfigTypeSchema;
exports.getInputTypeSchema = getInputTypeSchema;
exports.getOutputTypeSchema = getOutputTypeSchema;
exports.getStateTypeSchema = getStateTypeSchema;
exports.getUpdateTypeSchema = getUpdateTypeSchema;
//# sourceMappingURL=schema.cjs.map