import { BinaryOperatorAggregate } from "../../channels/binop.js";
import { LastValue } from "../../channels/last_value.js";
import { extendInteropZodObject, getInteropZodDefaultGetter, getInteropZodObjectShape, getSchemaDescription, interopZodObjectPartial, isZodSchemaV3 } from "@langchain/core/utils/types";

//#region src/graph/zod/meta.ts
const META_EXTRAS_DESCRIPTION_PREFIX = "lg:";
/**
* A registry for storing and managing metadata associated with schemas.
* This class provides methods to get, extend, remove, and check metadata for a given schema.
*/
var SchemaMetaRegistry = class {
	/**
	* Internal map storing schema metadata.
	* @internal
	*/
	_map = /* @__PURE__ */ new WeakMap();
	/**
	* Cache for extended schfemas.
	* @internal
	*/
	_extensionCache = /* @__PURE__ */ new Map();
	/**
	* Retrieves the metadata associated with a given schema.
	* @template TValue The value type of the schema.
	* @template TUpdate The update type of the schema (defaults to TValue).
	* @param schema The schema to retrieve metadata for.
	* @returns The associated SchemaMeta, or undefined if not present.
	*/
	get(schema) {
		return this._map.get(schema);
	}
	/**
	* Extends or sets the metadata for a given schema.
	* @template TValue The value type of the schema.
	* @template TUpdate The update type of the schema (defaults to TValue).
	* @param schema The schema to extend metadata for.
	* @param predicate A function that receives the existing metadata (or undefined) and returns the new metadata.
	*/
	extend(schema, predicate) {
		const existingMeta = this.get(schema);
		this._map.set(schema, predicate(existingMeta));
	}
	/**
	* Removes the metadata associated with a given schema.
	* @param schema The schema to remove metadata for.
	* @returns The SchemaMetaRegistry instance (for chaining).
	*/
	remove(schema) {
		this._map.delete(schema);
		return this;
	}
	/**
	* Checks if metadata exists for a given schema.
	* @param schema The schema to check.
	* @returns True if metadata exists, false otherwise.
	*/
	has(schema) {
		return this._map.has(schema);
	}
	/**
	* Returns a mapping of channel instances for each property in the schema
	* using the associated metadata in the registry.
	*
	* This is used to create the `channels` object that's passed to the `Graph` constructor.
	*
	* @template T The shape of the schema.
	* @param schema The schema to extract channels from.
	* @returns A mapping from property names to channel instances.
	*/
	getChannelsForSchema(schema) {
		const channels = {};
		const shape = getInteropZodObjectShape(schema);
		for (const [key, channelSchema] of Object.entries(shape)) {
			const meta = this.get(channelSchema);
			if (meta?.reducer) channels[key] = new BinaryOperatorAggregate(meta.reducer.fn, meta.default);
			else channels[key] = new LastValue();
		}
		return channels;
	}
	/**
	* Returns a modified schema that introspectively looks at all keys of the provided
	* object schema, and applies the augmentations based on meta provided with those keys
	* in the registry and the selectors provided in the `effects` parameter.
	*
	* This assumes that the passed in schema is the "root" schema object for a graph where
	* the keys of the schema are the channels of the graph. Because we need to represent
	* the input of a graph in a couple of different ways, the `effects` parameter allows
	* us to apply those augmentations based on pre determined conditions.
	*
	* @param schema The root schema object to extend.
	* @param effects The effects that are being applied.
	* @returns The extended schema.
	*/
	getExtendedChannelSchemas(schema, effects) {
		if (Object.keys(effects).length === 0) return schema;
		const cacheKey = Object.entries(effects).filter(([, v]) => v === true).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}:${v}`).join("|");
		const cache = this._extensionCache.get(cacheKey) ?? /* @__PURE__ */ new WeakMap();
		if (cache.has(schema)) return cache.get(schema);
		let modifiedSchema = schema;
		if (effects.withReducerSchema || effects.withJsonSchemaExtrasAsDescription) {
			const newShapeEntries = Object.entries(getInteropZodObjectShape(schema)).map(([key, schema$1]) => {
				const meta = this.get(schema$1);
				let outputSchema = effects.withReducerSchema ? meta?.reducer?.schema ?? schema$1 : schema$1;
				if (effects.withJsonSchemaExtrasAsDescription && meta?.jsonSchemaExtra) {
					const description = getSchemaDescription(outputSchema) ?? getSchemaDescription(schema$1);
					const strExtras = JSON.stringify({
						...meta.jsonSchemaExtra,
						description
					});
					outputSchema = outputSchema.describe(`${META_EXTRAS_DESCRIPTION_PREFIX}${strExtras}`);
				}
				return [key, outputSchema];
			});
			modifiedSchema = extendInteropZodObject(schema, Object.fromEntries(newShapeEntries));
			if (isZodSchemaV3(modifiedSchema)) modifiedSchema._def.unknownKeys = "strip";
		}
		if (effects.asPartial) modifiedSchema = interopZodObjectPartial(modifiedSchema);
		cache.set(schema, modifiedSchema);
		this._extensionCache.set(cacheKey, cache);
		return modifiedSchema;
	}
};
const schemaMetaRegistry = new SchemaMetaRegistry();
function withLangGraph(schema, meta) {
	if (meta.reducer && !meta.default) {
		const defaultValueGetter = getInteropZodDefaultGetter(schema);
		if (defaultValueGetter != null) meta.default = defaultValueGetter;
	}
	if (meta.reducer) {
		const schemaWithReducer = Object.assign(schema, { lg_reducer_schema: meta.reducer?.schema ?? schema });
		schemaMetaRegistry.extend(schemaWithReducer, () => meta);
		return schemaWithReducer;
	} else {
		schemaMetaRegistry.extend(schema, () => meta);
		return schema;
	}
}

//#endregion
export { META_EXTRAS_DESCRIPTION_PREFIX, SchemaMetaRegistry, schemaMetaRegistry, withLangGraph };
//# sourceMappingURL=meta.js.map