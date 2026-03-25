const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_meta = require('./meta.cjs');
const __langchain_core_utils_types = require_rolldown_runtime.__toESM(require("@langchain/core/utils/types"));
const zod_v4_core = require_rolldown_runtime.__toESM(require("zod/v4/core"));

//#region src/graph/zod/zod-registry.ts
/**
* A Zod v4-compatible meta registry that extends the base registry.
*
* This registry allows you to associate and retrieve metadata for Zod schemas,
* leveraging the base registry for storage. It is compatible with Zod v4 and
* interoperates with the base registry to ensure consistent metadata management
* across different Zod versions.
*
* @template Meta - The type of metadata associated with each schema.
* @template Schema - The Zod schema type.
*/
var LanggraphZodMetaRegistry = class extends zod_v4_core.$ZodRegistry {
	/**
	* Creates a new LanggraphZodMetaRegistry instance.
	*
	* @param parent - The base SchemaMetaRegistry to use for metadata storage.
	*/
	constructor(parent) {
		super();
		this.parent = parent;
		this._map = this.parent._map;
	}
	add(schema, ..._meta) {
		const firstMeta = _meta[0];
		if (firstMeta && !firstMeta?.default) {
			const defaultValueGetter = (0, __langchain_core_utils_types.getInteropZodDefaultGetter)(schema);
			if (defaultValueGetter != null) firstMeta.default = defaultValueGetter;
		}
		return super.add(schema, ..._meta);
	}
};
const registry = new LanggraphZodMetaRegistry(require_meta.schemaMetaRegistry);

//#endregion
exports.LanggraphZodMetaRegistry = LanggraphZodMetaRegistry;
exports.registry = registry;
//# sourceMappingURL=zod-registry.cjs.map