import { MessagesValue, ReducedValue, StateSchema, UntrackedValue } from "@langchain/langgraph";
import { schemaMetaRegistry } from "@langchain/langgraph/zod";
import { getInteropZodObjectShape, isInteropZodObject, isZodSchemaV4 } from "@langchain/core/utils/types";

//#region src/agents/annotation.ts
function createAgentState(hasStructuredResponse = true, stateSchema, middlewareList = []) {
	/**
	* Collect fields from state schemas
	*/
	const stateFields = { jumpTo: new UntrackedValue() };
	const inputFields = {};
	const outputFields = {};
	const applySchema = (schema) => {
		if (StateSchema.isInstance(schema)) {
			for (const [key, field] of Object.entries(schema.fields)) if (!(key in stateFields)) {
				stateFields[key] = field;
				if (key.startsWith("_")) continue;
				if (ReducedValue.isInstance(field)) {
					inputFields[key] = field.inputSchema || field.valueSchema;
					outputFields[key] = field.valueSchema;
				} else {
					inputFields[key] = field;
					outputFields[key] = field;
				}
			}
			return;
		}
		const shape = getInteropZodObjectShape(schema);
		for (const [key, fieldSchema] of Object.entries(shape)) {
			const isPrivate = key.startsWith("_");
			if (!(key in stateFields)) {
				if (isZodSchemaV4(fieldSchema)) {
					const meta = schemaMetaRegistry.get(fieldSchema);
					if (meta?.reducer) {
						if (meta.reducer.schema) {
							stateFields[key] = new ReducedValue(fieldSchema, {
								inputSchema: meta.reducer.schema,
								reducer: meta.reducer.fn
							});
							if (!isPrivate) {
								inputFields[key] = meta.reducer.schema;
								outputFields[key] = fieldSchema;
							}
						} else {
							stateFields[key] = new ReducedValue(fieldSchema, { reducer: meta.reducer.fn });
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
	if (stateSchema && (StateSchema.isInstance(stateSchema) || isInteropZodObject(stateSchema))) applySchema(stateSchema);
	/**
	* Add state schema properties from middleware.
	* Supports both StateSchema and Zod v3/v4 objects.
	*/
	for (const middleware of middlewareList) if (middleware.stateSchema && (StateSchema.isInstance(middleware.stateSchema) || isInteropZodObject(middleware.stateSchema))) applySchema(middleware.stateSchema);
	if (hasStructuredResponse) outputFields.structuredResponse = new UntrackedValue();
	/**
	* Create StateSchema instances for state, input, and output.
	* Using MessagesValue provides the proper message reducer behavior.
	*/
	return {
		state: new StateSchema({
			messages: MessagesValue,
			...stateFields
		}),
		input: new StateSchema({
			messages: MessagesValue,
			...inputFields
		}),
		output: new StateSchema({
			messages: MessagesValue,
			...outputFields
		})
	};
}

//#endregion
export { createAgentState };
//# sourceMappingURL=annotation.js.map