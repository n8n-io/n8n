import { END } from "../constants.js";
import { isBaseChannel } from "../channels/base.js";
import { StateSchema } from "../state/schema.js";
import { isInteropZodObject } from "@langchain/core/utils/types";

//#region src/graph/types.ts
/**
* Check if a value is a valid StateDefinitionInit type.
* Supports: StateSchema, InteropZodObject (Zod), AnnotationRoot, StateDefinition
*
* @internal
*/
function isStateDefinitionInit(value) {
	if (value == null) return false;
	if (StateSchema.isInstance(value)) return true;
	if (isInteropZodObject(value)) return true;
	if (typeof value === "object" && "lc_graph_name" in value && value.lc_graph_name === "AnnotationRoot") return true;
	if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0 && Object.values(value).every((v) => typeof v === "function" || isBaseChannel(v))) return true;
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
export { isStateDefinitionInit, isStateGraphInit };
//# sourceMappingURL=types.js.map