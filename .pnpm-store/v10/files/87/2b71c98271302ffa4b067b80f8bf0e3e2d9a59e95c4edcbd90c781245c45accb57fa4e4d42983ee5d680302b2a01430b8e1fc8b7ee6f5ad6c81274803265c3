const require_constants = require('../constants.cjs');
const require_base = require('../channels/base.cjs');
const require_schema = require('../state/schema.cjs');
let _langchain_core_utils_types = require("@langchain/core/utils/types");

//#region src/graph/types.ts
/**
* Check if a value is a valid StateDefinitionInit type.
* Supports: StateSchema, InteropZodObject (Zod), AnnotationRoot, StateDefinition
*
* @internal
*/
function isStateDefinitionInit(value) {
	if (value == null) return false;
	if (require_schema.StateSchema.isInstance(value)) return true;
	if ((0, _langchain_core_utils_types.isInteropZodObject)(value)) return true;
	if (typeof value === "object" && "lc_graph_name" in value && value.lc_graph_name === "AnnotationRoot") return true;
	if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0 && Object.values(value).every((v) => typeof v === "function" || require_base.isBaseChannel(v))) return true;
	return false;
}
/**
* Check if a value is a StateGraphInit object (has state, stateSchema, or input with valid schema).
*
* @internal
*/
function isStateGraphInit(value) {
	if (typeof value !== "object" || value == null) return false;
	const obj = value;
	const hasState = "state" in obj && isStateDefinitionInit(obj.state);
	const hasStateSchema = "stateSchema" in obj && isStateDefinitionInit(obj.stateSchema);
	const hasInput = "input" in obj && isStateDefinitionInit(obj.input);
	if (!hasState && !hasStateSchema && !hasInput) return false;
	if ("input" in obj && obj.input != null && !isStateDefinitionInit(obj.input)) return false;
	if ("output" in obj && obj.output != null && !isStateDefinitionInit(obj.output)) return false;
	return true;
}

//#endregion
exports.isStateDefinitionInit = isStateDefinitionInit;
exports.isStateGraphInit = isStateGraphInit;
//# sourceMappingURL=types.cjs.map