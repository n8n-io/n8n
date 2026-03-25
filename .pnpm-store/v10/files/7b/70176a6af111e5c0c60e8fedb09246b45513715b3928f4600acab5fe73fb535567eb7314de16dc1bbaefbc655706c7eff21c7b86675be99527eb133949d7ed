const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_import_constants = require('./import_constants.cjs');
const require_import_map = require('./import_map.cjs');
const __langchain_core_load = require_rolldown_runtime.__toESM(require("@langchain/core/load"));

//#region src/load/index.ts
/**
* Load a LangChain module from a serialized text representation.
* NOTE: This functionality is currently in beta.
* Loaded classes may change independently of semver.
* @param text Serialized text representation of the module.
* @param secretsMap
* @param optionalImportsMap
* @returns A loaded instance of a LangChain module.
*/
async function load(text, secretsMap = {}, optionalImportsMap = {}, additionalImportsMap = {}) {
	return (0, __langchain_core_load.load)(text, {
		secretsMap,
		optionalImportsMap,
		optionalImportEntrypoints: require_import_constants.optionalImportEntrypoints,
		importMap: {
			...require_import_map.import_map_exports,
			...additionalImportsMap
		}
	});
}

//#endregion
exports.load = load;
//# sourceMappingURL=index.cjs.map