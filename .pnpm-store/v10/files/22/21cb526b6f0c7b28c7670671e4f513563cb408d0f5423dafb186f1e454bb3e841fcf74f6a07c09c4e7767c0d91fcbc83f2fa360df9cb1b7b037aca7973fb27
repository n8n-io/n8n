const require_runtime = require('../_virtual/_rolldown/runtime.cjs');
let _langchain_langgraph = require("@langchain/langgraph");
let _langchain_langgraph_zod = require("@langchain/langgraph/zod");
let _langchain_core_utils_types = require("@langchain/core/utils/types");

//#region src/agents/annotation.ts
function createAgentState(hasStructuredResponse = true, stateSchema, middlewareList = []) {
	/**
	* Collect fields from state schemas
	*/
	const stateFields = { jumpTo: new _langchain_langgraph.UntrackedValue() };
	const inputFields = {};
	const outputFields = {};
	const applySchema = (schema) => {
		if (_langchain_langgraph.StateSchema.isInstance(schema)) {
			for (const [key, field] of Object.entries(schema.fields)) if (!(key in stateFields)) {
				stateFields[key] = field;
				if (key.startsWith("_")) continue;
				if (_langchain_langgraph.ReducedValue.isInstance(field)) {
					inputFields[key] = field.inputSchema || field.valueSchema;
					outputFields[key] = field.valueSchema;
				} else {
					inputFields[key] = field;
					outputFields[key] = field;
				}
			}
			return;
		}
		const shape = (0, _langchain_core_utils_types.getInteropZodObjectShape)(schema);
		for (const [key, fieldSchema] of Object.entries(shape)) {
			const isPrivate = key.startsWith("_");
			if (!(key in stateFields)) {
				if ((0, _langchain_core_utils_types.isZodSchemaV4)(fieldSchema)) {
					const meta = _langchain_langgraph_zod.schemaMetaRegistry.get(fieldSchema);
					if (meta?.reducer) {
						if (meta.reducer.schema) {
							stateFields[key] = new _langchain_langgraph.ReducedValue(fieldSchema, {
								inputSchema: meta.reducer.schema,
								reducer: meta.reducer.fn
							});
							if (!isPrivate) {
								inputFields[key] = meta.reducer.schema;
								outputFields[key] = fieldSchema;
							}
						} else {
							stateFields[key] = new _langchain_langgraph.ReducedValue(fieldSchema, { reducer: meta.reducer.fn });
							if (!isPrivate) {
								inputFields[key] = fieldSchema;
								outputFields[key] = fieldSchema;
							}
						}
						continue;
					}
				}
				stateFields[key] = fieldSchema;
				if (!isPrivate) {
					inputFields[key] = fieldSchema;
					outputFields[key] = fieldSchema;
				}
			}
		}
	};
	/**
	* Add state schema properties from user-provided schema.
	* Supports both StateSchema and Zod v3/v4 objects.
	*/
	if (stateSchema && (_langchain_langgraph.StateSchema.isInstance(stateSchema) || (0, _langchain_core_utils_types.isInteropZodObject)(stateSchema))) applySchema(stateSchema);
	/**
	* Add state schema properties from middleware.
	* Supports both StateSchema and Zod v3/v4 objects.
	*/
	for (const middleware of middlewareList) if (middleware.stateSchema && (_langchain_langgraph.StateSchema.isInstance(middleware.stateSchema) || (0, _langchain_core_utils_types.isInteropZodObject)(middleware.stateSchema))) applySchema(middleware.stateSchema);
	if (hasStructuredResponse) outputFields.structuredResponse = new _langchain_langgraph.UntrackedValue();
	/**
	* Create StateSchema instances for state, input, and output.
	* Using MessagesValue provides the proper message reducer behavior.
	*/
	return {
		state: new _langchain_langgraph.StateSchema({
			messages: _langchain_langgraph.MessagesValue,
			...stateFields
		}),
		input: new _langchain_langgraph.StateSchema({
			messages: _langchain_langgraph.MessagesValue,
			...inputFields
		}),
		output: new _langchain_langgraph.StateSchema({
			messages: _langchain_langgraph.MessagesValue,
			...outputFields
		})
	};
}

//#endregion
exports.createAgentState = createAgentState;
//# sourceMappingURL=annotation.cjs.map