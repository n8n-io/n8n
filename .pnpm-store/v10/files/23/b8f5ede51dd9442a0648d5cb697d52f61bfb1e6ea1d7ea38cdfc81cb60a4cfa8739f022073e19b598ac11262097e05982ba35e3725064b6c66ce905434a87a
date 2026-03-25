import { BinaryOperatorAggregate } from "../channels/binop.js";
import { LastValue } from "../channels/last_value.js";
import { isStandardSchema } from "./types.js";
import { getJsonSchemaFromSchema, getSchemaDefaultGetter } from "./adapter.js";
import { UntrackedValueChannel } from "../channels/untracked_value.js";
import "../channels/index.js";
import { ReducedValue } from "./values/reduced.js";
import { UntrackedValue } from "./values/untracked.js";

//#region src/state/schema.ts
const STATE_SCHEMA_SYMBOL = Symbol.for("langgraph.state.state_schema");
/**
* StateSchema provides a unified API for defining LangGraph state schemas.
*
* @example
* ```ts
* import { z } from "zod";
* import { StateSchema, ReducedValue, MessagesValue } from "@langchain/langgraph";
*
* const AgentState = new StateSchema({
*   // Prebuilt messages value
*   messages: MessagesValue,
*   // Basic LastValue channel from any standard schema
*   currentStep: z.string(),
*   // LastValue with native default
*   count: z.number().default(0),
*   // ReducedValue for fields needing reducers
*   history: new ReducedValue(
*     z.array(z.string()).default(() => []),
*     {
*       inputSchema: z.string(),
*       reducer: (current, next) => [...current, next],
*     }
*   ),
* });
*
* // Extract types
* type State = typeof AgentState.State;
* type Update = typeof AgentState.Update;
*
* // Use in StateGraph
* const graph = new StateGraph(AgentState);
* ```
*/
var StateSchema = class {
	/**
	* Symbol for runtime identification.
	* @internal Used by isInstance for runtime type checking
	*/
	[STATE_SCHEMA_SYMBOL] = true;
	constructor(fields) {
		this.fields = fields;
	}
	/**
	* Get the channel definitions for use with StateGraph.
	* This converts the StateSchema fields into BaseChannel instances.
	*/
	getChannels() {
		const channels = {};
		for (const [key, value] of Object.entries(this.fields)) if (ReducedValue.isInstance(value)) {
			const defaultGetter = getSchemaDefaultGetter(value.valueSchema);
			channels[key] = new BinaryOperatorAggregate(value.reducer, defaultGetter);
		} else if (UntrackedValue.isInstance(value)) {
			const defaultGetter = value.schema ? getSchemaDefaultGetter(value.schema) : void 0;
			channels[key] = new UntrackedValueChannel({
				guard: value.guard,
				initialValueFactory: defaultGetter
			});
		} else if (isStandardSchema(value)) channels[key] = new LastValue(getSchemaDefaultGetter(value));
		else throw new Error(`Invalid state field "${key}": must be a schema, ReducedValue, UntrackedValue, or ManagedValue`);
		return channels;
	}
	/**
	* Get the JSON schema for the full state type.
	* Used by Studio and API for schema introspection.
	*/
	getJsonSchema() {
		const properties = {};
		const required = [];
		for (const [key, value] of Object.entries(this.fields)) {
			let fieldSchema;
			if (ReducedValue.isInstance(value)) {
				fieldSchema = getJsonSchemaFromSchema(value.valueSchema);
				if (value.jsonSchemaExtra) fieldSchema = {
					...fieldSchema ?? {},
					...value.jsonSchemaExtra
				};
			} else if (UntrackedValue.isInstance(value)) fieldSchema = value.schema ? getJsonSchemaFromSchema(value.schema) : void 0;
			else if (isStandardSchema(value)) fieldSchema = getJsonSchemaFromSchema(value);
			if (fieldSchema) {
				properties[key] = fieldSchema;
				let hasDefault = false;
				if (ReducedValue.isInstance(value)) hasDefault = getSchemaDefaultGetter(value.valueSchema) !== void 0;
				else if (UntrackedValue.isInstance(value)) hasDefault = value.schema ? getSchemaDefaultGetter(value.schema) !== void 0 : false;
				else hasDefault = getSchemaDefaultGetter(value) !== void 0;
				if (!hasDefault) required.push(key);
			}
		}
		return {
			type: "object",
			properties,
			required: required.length > 0 ? required : void 0
		};
	}
	/**
	* Get the JSON schema for the update/input type.
	* All fields are optional in updates.
	*/
	getInputJsonSchema() {
		const properties = {};
		for (const [key, value] of Object.entries(this.fields)) {
			let fieldSchema;
			if (ReducedValue.isInstance(value)) fieldSchema = getJsonSchemaFromSchema(value.inputSchema);
			else if (UntrackedValue.isInstance(value)) fieldSchema = value.schema ? getJsonSchemaFromSchema(value.schema) : void 0;
			else if (isStandardSchema(value)) fieldSchema = getJsonSchemaFromSchema(value);
			if (fieldSchema) properties[key] = fieldSchema;
		}
		return {
			type: "object",
			properties
		};
	}
	/**
	* Get the list of channel keys (excluding managed values).
	*/
	getChannelKeys() {
		return Object.entries(this.fields).map(([key]) => key);
	}
	/**
	* Get all keys (channels + managed values).
	*/
	getAllKeys() {
		return Object.keys(this.fields);
	}
	/**
	* Validate input data against the schema.
	* This validates each field using its corresponding schema.
	*
	* @param data - The input data to validate
	* @returns The validated data with coerced types
	*/
	async validateInput(data) {
		if (data == null || typeof data !== "object") return data;
		const result = {};
		for (const [key, value] of Object.entries(data)) {
			const fieldDef = this.fields[key];
			if (fieldDef === void 0) {
				result[key] = value;
				continue;
			}
			let schema;
			if (ReducedValue.isInstance(fieldDef)) schema = fieldDef.inputSchema;
			else if (UntrackedValue.isInstance(fieldDef)) schema = fieldDef.schema;
			else if (isStandardSchema(fieldDef)) schema = fieldDef;
			if (schema) {
				const validationResult = await schema["~standard"].validate(value);
				if (validationResult.issues) throw new Error(`Validation failed for field "${key}": ${JSON.stringify(validationResult.issues)}`);
				result[key] = validationResult.value;
			} else result[key] = value;
		}
		return result;
	}
	static isInstance(value) {
		return typeof value === "object" && value !== null && STATE_SCHEMA_SYMBOL in value && value[STATE_SCHEMA_SYMBOL] === true;
	}
};

//#endregion
export { StateSchema };
//# sourceMappingURL=schema.js.map