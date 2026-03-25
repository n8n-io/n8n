Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
const require_runtime = require('../_virtual/_rolldown/runtime.cjs');
const require_import_constants = require('./import_constants.cjs');
const require_import_map = require('./import_map.cjs');
let _langchain_core_load = require("@langchain/core/load");

//#region src/load/index.ts
/**
* Load a LangChain module from a serialized text representation.
* NOTE: This functionality is currently in beta.
* Loaded classes may change independently of semver.
*
* **WARNING — insecure deserialization risk.** This function instantiates
* classes and invokes constructors based on the contents of `text`. Never
* call this on untrusted or user-supplied input. Only deserialize data that
* originates from a trusted source you control.
*
* See `@langchain/core/load` {@link LoadOptions} for detailed security
* guidance on `secretsFromEnv`, `secretsMap`, and import maps.
*
* @param text Serialized text representation of the module.
* @param secretsMap
* @param optionalImportsMap
* @param additionalImportsMap
* @param secretsFromEnv
* @returns A loaded instance of a LangChain module.
*/
async function load(text, secretsMap = {}, optionalImportsMap = {}, additionalImportsMap = {}, secretsFromEnv) {
	return (0, _langchain_core_load.load)(text, {
		secretsMap,
		optionalImportsMap,
		optionalImportEntrypoints: require_import_constants.optionalImportEntrypoints,
		importMap: {
			...require_import_map.import_map_exports,
			...additionalImportsMap
		},
		secretsFromEnv
	});
}

//#endregion
exports.load = load;
//# sourceMappingURL=index.cjs.map