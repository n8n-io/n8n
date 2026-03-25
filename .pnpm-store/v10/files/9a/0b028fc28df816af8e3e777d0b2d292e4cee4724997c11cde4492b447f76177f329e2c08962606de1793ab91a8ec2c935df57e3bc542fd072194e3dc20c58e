import { META_EXTRAS_DESCRIPTION_PREFIX, schemaMetaRegistry } from "./meta.js";
import { toJsonSchema } from "@langchain/core/utils/json_schema";

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
		if ("description" in output && typeof output.description === "string" && output.description.startsWith(META_EXTRAS_DESCRIPTION_PREFIX)) {
			const strMeta = output.description.slice(META_EXTRAS_DESCRIPTION_PREFIX.length);
			delete output.description;
			Object.assign(output, JSON.parse(strMeta));
		}
		return output;
	}
	return schema;
}
function toJsonSchema$1(schema) {
	return applyJsonSchemaExtrasFromDescription(toJsonSchema(schema));
}
/**
* Get the state schema for a graph.
* @param graph - The graph to get the state schema for.
* @returns The state schema for the graph.
*/
function getStateTypeSchema(graph, registry = schemaMetaRegistry) {
	if (!isGraphWithZodLike(graph)) return void 0;
	const schemaDef = graph.builder._schemaRuntimeDefinition;
	if (!schemaDef) return void 0;
	return toJsonSchema$1(registry.getExtendedChannelSchemas(schemaDef, { withJsonSchemaExtrasAsDescription: true }));
}
/**
* Get the update schema for a graph.
* @param graph - The graph to get the update schema for.
* @returns The update schema for the graph.
*/
function getUpdateTypeSchema(graph, registry = schemaMetaRegistry) {
	if (!isGraphWithZodLike(graph)) return void 0;
	const schemaDef = graph.builder._schemaRuntimeDefinition;
	if (!schemaDef) return void 0;
	return toJsonSchema$1(registry.getExtendedChannelSchemas(schemaDef, {
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
function getInputTypeSchema(graph, registry = schemaMetaRegistry) {
	if (!isGraphWithZodLike(graph)) return void 0;
	let schemaDef = graph.builder._inputRuntimeDefinition;
	if (schemaDef === PartialStateSchema) schemaDef = graph.builder._schemaRuntimeDefinition;
	if (!schemaDef) return void 0;
	return toJsonSchema$1(registry.getExtendedChannelSchemas(schemaDef, {
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
function getOutputTypeSchema(graph, registry = schemaMetaRegistry) {
	if (!isGraphWithZodLike(graph)) return void 0;
	const schemaDef = graph.builder._outputRuntimeDefinition;
	if (!schemaDef) return void 0;
	return toJsonSchema$1(registry.getExtendedChannelSchemas(schemaDef, { withJsonSchemaExtrasAsDescription: true }));
}
/**
* Get the config schema for a graph.
* @param graph - The graph to get the config schema for.
* @returns The config schema for the graph.
*/
function getConfigTypeSchema(graph, registry = schemaMetaRegistry) {
	if (!isGraphWithZodLike(graph)) return void 0;
	const configDef = graph.builder._configRuntimeSchema;
	if (!configDef) return void 0;
	return toJsonSchema$1(registry.getExtendedChannelSchemas(configDef, { withJsonSchemaExtrasAsDescription: true }));
}

//#endregion
export { getConfigTypeSchema, getInputTypeSchema, getOutputTypeSchema, getStateTypeSchema, getUpdateTypeSchema };
//# sourceMappingURL=schema.js.map