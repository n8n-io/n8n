import { RunnableBinding } from "../runnables/base.js";
import { ChatPromptTemplate } from "./chat.js";
//#region src/prompts/structured.ts
function isWithStructuredOutput(x) {
	return typeof x === "object" && x != null && "withStructuredOutput" in x && typeof x.withStructuredOutput === "function";
}
function isRunnableBinding(x) {
	return typeof x === "object" && x != null && "lc_id" in x && Array.isArray(x.lc_id) && x.lc_id.join("/") === "langchain_core/runnables/RunnableBinding";
}
var StructuredPrompt = class StructuredPrompt extends ChatPromptTemplate {
	schema;
	method;
	lc_namespace = [
		"langchain_core",
		"prompts",
		"structured"
	];
	get lc_aliases() {
		return {
			...super.lc_aliases,
			schema: "schema_"
		};
	}
	constructor(input) {
		super(input);
		this.schema = input.schema;
		this.method = input.method;
	}
	pipe(coerceable) {
		if (isWithStructuredOutput(coerceable)) return super.pipe(coerceable.withStructuredOutput(this.schema));
		if (isRunnableBinding(coerceable) && isWithStructuredOutput(coerceable.bound)) return super.pipe(new RunnableBinding({
			bound: coerceable.bound.withStructuredOutput(this.schema, ...this.method ? [{ method: this.method }] : []),
			kwargs: coerceable.kwargs ?? {},
			config: coerceable.config,
			configFactories: coerceable.configFactories
		}));
		throw new Error(`Structured prompts need to be piped to a language model that supports the "withStructuredOutput()" method.`);
	}
	static fromMessagesAndSchema(promptMessages, schema, method) {
		return StructuredPrompt.fromMessages(promptMessages, {
			schema,
			method
		});
	}
};
//#endregion
export { StructuredPrompt };

//# sourceMappingURL=structured.js.map