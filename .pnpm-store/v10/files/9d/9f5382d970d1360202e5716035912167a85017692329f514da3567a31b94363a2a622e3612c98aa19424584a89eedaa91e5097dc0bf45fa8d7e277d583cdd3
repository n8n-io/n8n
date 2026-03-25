import { import_map_exports } from "./import_map.js";
import { optionalImportEntrypoints } from "./import_constants.js";
import { load as load$1 } from "@langchain/core/load";

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
async function load(text, secretsMap = {}, optionalImportsMap = {}) {
	return load$1(text, {
		secretsMap,
		optionalImportsMap,
		optionalImportEntrypoints,
		importMap: import_map_exports
	});
}

//#endregion
export { load };
//# sourceMappingURL=index.js.map