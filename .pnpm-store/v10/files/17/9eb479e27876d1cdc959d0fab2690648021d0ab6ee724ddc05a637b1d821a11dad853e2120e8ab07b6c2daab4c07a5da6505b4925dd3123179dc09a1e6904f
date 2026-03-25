import { ensureConfig } from "./config.js";
import { concat } from "../utils/stream.js";
import { Runnable, RunnableAssign, RunnableMap } from "./base.js";
//#region src/runnables/passthrough.ts
/**
* A runnable to passthrough inputs unchanged or with additional keys.
*
* This runnable behaves almost like the identity function, except that it
* can be configured to add additional keys to the output, if the input is
* an object.
*
* The example below demonstrates how to use `RunnablePassthrough to
* passthrough the input from the `.invoke()`
*
* @example
* ```typescript
* const chain = RunnableSequence.from([
*   {
*     question: new RunnablePassthrough(),
*     context: async () => loadContextFromStore(),
*   },
*   prompt,
*   llm,
*   outputParser,
* ]);
* const response = await chain.invoke(
*   "I can pass a single string instead of an object since I'm using `RunnablePassthrough`."
* );
* ```
*/
var RunnablePassthrough = class extends Runnable {
	static lc_name() {
		return "RunnablePassthrough";
	}
	lc_namespace = ["langchain_core", "runnables"];
	lc_serializable = true;
	func;
	constructor(fields) {
		super(fields);
		if (fields) this.func = fields.func;
	}
	async invoke(input, options) {
		const config = ensureConfig(options);
		if (this.func) await this.func(input, config);
		return this._callWithConfig((input) => Promise.resolve(input), input, config);
	}
	async *transform(generator, options) {
		const config = ensureConfig(options);
		let finalOutput;
		let finalOutputSupported = true;
		for await (const chunk of this._transformStreamWithConfig(generator, (input) => input, config)) {
			yield chunk;
			if (finalOutputSupported) if (finalOutput === void 0) finalOutput = chunk;
			else try {
				finalOutput = concat(finalOutput, chunk);
			} catch {
				finalOutput = void 0;
				finalOutputSupported = false;
			}
		}
		if (this.func && finalOutput !== void 0) await this.func(finalOutput, config);
	}
	/**
	* A runnable that assigns key-value pairs to the input.
	*
	* The example below shows how you could use it with an inline function.
	*
	* @example
	* ```typescript
	* const prompt =
	*   PromptTemplate.fromTemplate(`Write a SQL query to answer the question using the following schema: {schema}
	* Question: {question}
	* SQL Query:`);
	*
	* // The `RunnablePassthrough.assign()` is used here to passthrough the input from the `.invoke()`
	* // call (in this example it's the question), along with any inputs passed to the `.assign()` method.
	* // In this case, we're passing the schema.
	* const sqlQueryGeneratorChain = RunnableSequence.from([
	*   RunnablePassthrough.assign({
	*     schema: async () => db.getTableInfo(),
	*   }),
	*   prompt,
	*   new ChatOpenAI({ model: "gpt-4o-mini" }).withConfig({ stop: ["\nSQLResult:"] }),
	*   new StringOutputParser(),
	* ]);
	* const result = await sqlQueryGeneratorChain.invoke({
	*   question: "How many employees are there?",
	* });
	* ```
	*/
	static assign(mapping) {
		return new RunnableAssign(new RunnableMap({ steps: mapping }));
	}
};
//#endregion
export { RunnablePassthrough };

//# sourceMappingURL=passthrough.js.map