const require_runtime = require('../../_virtual/_rolldown/runtime.cjs');
let _langchain_langgraph = require("@langchain/langgraph");
let _langchain_core_utils_types = require("@langchain/core/utils/types");
let zod_v4 = require("zod/v4");

//#region src/agents/nodes/utils.ts
/**
* Helper function to initialize middleware state defaults.
* This is used to ensure all middleware state properties are initialized.
*
* Private properties (starting with _) are automatically made optional since
* users cannot provide them when invoking the agent.
*/
async function initializeMiddlewareStates(middlewareList, state) {
	const middlewareStates = {};
	for (const middleware of middlewareList) {
		/**
		* skip middleware if it doesn't have a state schema
		*/
		if (!middleware.stateSchema) continue;
		let zodSchema = middleware.stateSchema;
		if (_langchain_langgraph.StateSchema.isInstance(middleware.stateSchema)) {
			const zodShape = {};
			for (const [key, field] of Object.entries(middleware.stateSchema.fields)) if (_langchain_langgraph.ReducedValue.isInstance(field)) zodShape[key] = field.inputSchema || field.valueSchema;
			else zodShape[key] = field;
			zodSchema = zod_v4.z.object(zodShape);
		}
		const parseResult = await (0, _langchain_core_utils_types.interopSafeParseAsync)((0, _langchain_core_utils_types.interopZodObjectMakeFieldsOptional)(zodSchema, (key) => key.startsWith("_")), state);
		if (parseResult.success) {
			Object.assign(middlewareStates, parseResult.data);
			continue;
		}
		/**
		* If safeParse fails, there are required public fields missing.
		* Note: Zod v3 uses message "Required", Zod v4 uses "Invalid input: expected X, received undefined"
		*/
		const requiredFields = parseResult.error.issues.filter((issue) => issue.code === "invalid_type").map((issue) => `  - ${issue.path.join(".")}: Required`).join("\n");
		throw new Error(`Middleware "${middleware.name}" has required state fields that must be initialized:\n${requiredFields}\n\nTo fix this, either:\n1. Provide default values in your middleware's state schema using .default():\n   stateSchema: z.object({\n     myField: z.string().default("default value")\n   })\n\n2. Or make the fields optional using .optional():\n   stateSchema: z.object({\n     myField: z.string().optional()\n   })\n\n3. Or ensure you pass these values when invoking the agent:\n   agent.invoke({\n     messages: [...],\n     ${parseResult.error.issues[0]?.path.join(".")}: "value"\n   })`);
	}
	return middlewareStates;
}
/**
* Users can define private and public state for a middleware. Private state properties start with an underscore.
* This function will return the private state properties from the state schema, making all of them optional.
* @param stateSchema - The middleware state schema
* @returns A new schema containing only the private properties (underscore-prefixed), all made optional
*/
function derivePrivateState(stateSchema) {
	const builtInStateSchema = {
		messages: zod_v4.z.custom(() => []),
		structuredResponse: zod_v4.z.any().optional()
	};
	if (!stateSchema) return zod_v4.z.object(builtInStateSchema);
	let shape;
	if (_langchain_langgraph.StateSchema.isInstance(stateSchema)) {
		shape = {};
		for (const [key, field] of Object.entries(stateSchema.fields)) if (_langchain_langgraph.ReducedValue.isInstance(field)) shape[key] = field.inputSchema || field.valueSchema;
		else shape[key] = field;
	} else shape = stateSchema.shape;
	const privateShape = { ...builtInStateSchema };
	for (const [key, value] of Object.entries(shape)) if (key.startsWith("_")) privateShape[key] = value.optional();
	else privateShape[key] = value;
	return zod_v4.z.object(privateShape);
}
/**
* Converts any supported schema type (ZodObject, StateSchema, AnnotationRoot) to a partial Zod object.
* This is useful for parsing state loosely where all fields are optional.
*
* @param schema - The schema to convert (InteropZodObject, StateSchema, or AnnotationRoot)
* @returns A partial Zod object schema where all fields are optional
*/
function toPartialZodObject(schema) {
	if ((0, _langchain_core_utils_types.isInteropZodObject)(schema)) return (0, _langchain_core_utils_types.interopZodObjectPartial)(schema);
	if (_langchain_langgraph.StateSchema.isInstance(schema)) {
		const partialShape = {};
		for (const [key, field] of Object.entries(schema.fields)) {
			let fieldSchema;
			if (_langchain_langgraph.ReducedValue.isInstance(field)) fieldSchema = field.inputSchema || field.valueSchema;
			else fieldSchema = field;
			partialShape[key] = (0, _langchain_core_utils_types.isZodSchemaV4)(fieldSchema) ? fieldSchema.optional() : zod_v4.z.any().optional();
		}
		return zod_v4.z.object(partialShape);
	}
	return zod_v4.z.object({});
}
function parseJumpToTarget(target) {
	if (!target) return;
	/**
	* if target is already a valid jump target, return it
	*/
	if ([
		"model_request",
		"tools",
		_langchain_langgraph.END
	].includes(target)) return target;
	if (target === "model") return "model_request";
	if (target === "tools") return "tools";
	if (target === "end") return _langchain_langgraph.END;
	throw new Error(`Invalid jump target: ${target}, must be "model", "tools" or "end".`);
}
/**
* `config` always contains a signal from LangGraphs Pregel class.
* To ensure we acknowledge the abort signal from the user, we merge it
* with the signal from the ToolNode.
*
* @param signals - The signals to merge.
* @returns The merged signal.
*/
function mergeAbortSignals(...signals) {
	return AbortSignal.any(signals.filter((maybeSignal) => maybeSignal !== null && maybeSignal !== void 0 && typeof maybeSignal === "object" && "aborted" in maybeSignal && typeof maybeSignal.aborted === "boolean"));
}

//#endregion
exports.derivePrivateState = derivePrivateState;
exports.initializeMiddlewareStates = initializeMiddlewareStates;
exports.mergeAbortSignals = mergeAbortSignals;
exports.parseJumpToTarget = parseJumpToTarget;
exports.toPartialZodObject = toPartialZodObject;
//# sourceMappingURL=utils.cjs.map