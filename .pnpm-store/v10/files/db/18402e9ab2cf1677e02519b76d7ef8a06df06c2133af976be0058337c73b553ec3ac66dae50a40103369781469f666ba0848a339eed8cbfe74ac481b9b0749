import { ensureConfig } from "./config.js";
import { Runnable } from "./base.js";
//#region src/runnables/router.ts
/**
* A runnable that routes to a set of runnables based on Input['key'].
* Returns the output of the selected runnable.
* @example
* ```typescript
* import { RouterRunnable, RunnableLambda } from "@langchain/core/runnables";
*
* const router = new RouterRunnable({
*   runnables: {
*     toUpperCase: RunnableLambda.from((text: string) => text.toUpperCase()),
*     reverseText: RunnableLambda.from((text: string) =>
*       text.split("").reverse().join("")
*     ),
*   },
* });
*
* // Invoke the 'reverseText' runnable
* const result1 = router.invoke({ key: "reverseText", input: "Hello World" });
*
* // "dlroW olleH"
*
* // Invoke the 'toUpperCase' runnable
* const result2 = router.invoke({ key: "toUpperCase", input: "Hello World" });
*
* // "HELLO WORLD"
* ```
*/
var RouterRunnable = class extends Runnable {
	static lc_name() {
		return "RouterRunnable";
	}
	lc_namespace = ["langchain_core", "runnables"];
	lc_serializable = true;
	runnables;
	constructor(fields) {
		super(fields);
		this.runnables = fields.runnables;
	}
	async invoke(input, options) {
		const { key, input: actualInput } = input;
		const runnable = this.runnables[key];
		if (runnable === void 0) throw new Error(`No runnable associated with key "${key}".`);
		return runnable.invoke(actualInput, ensureConfig(options));
	}
	async batch(inputs, options, batchOptions) {
		const keys = inputs.map((input) => input.key);
		const actualInputs = inputs.map((input) => input.input);
		if (keys.find((key) => this.runnables[key] === void 0) !== void 0) throw new Error(`One or more keys do not have a corresponding runnable.`);
		const runnables = keys.map((key) => this.runnables[key]);
		const optionsList = this._getOptionsList(options ?? {}, inputs.length);
		const maxConcurrency = optionsList[0]?.maxConcurrency ?? batchOptions?.maxConcurrency;
		const batchSize = maxConcurrency && maxConcurrency > 0 ? maxConcurrency : inputs.length;
		const batchResults = [];
		for (let i = 0; i < actualInputs.length; i += batchSize) {
			const batchPromises = actualInputs.slice(i, i + batchSize).map((actualInput, i) => runnables[i].invoke(actualInput, optionsList[i]));
			const batchResult = await Promise.all(batchPromises);
			batchResults.push(batchResult);
		}
		return batchResults.flat();
	}
	async stream(input, options) {
		const { key, input: actualInput } = input;
		const runnable = this.runnables[key];
		if (runnable === void 0) throw new Error(`No runnable associated with key "${key}".`);
		return runnable.stream(actualInput, options);
	}
};
//#endregion
export { RouterRunnable };

//# sourceMappingURL=router.js.map