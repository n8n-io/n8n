import { LastValue } from "../channels/last_value.js";
import { CONFIG_KEY_PREVIOUS_STATE, END, PREVIOUS, START, TAG_HIDDEN } from "../constants.js";
import { RunnableCallable, isAsyncGeneratorFunction, isGeneratorFunction } from "../utils.js";
import { ChannelWrite, PASSTHROUGH } from "../pregel/write.js";
import { PregelNode } from "../pregel/read.js";
import { call, getRunnableForEntrypoint } from "../pregel/call.js";
import { Pregel } from "../pregel/index.js";
import { EphemeralValue } from "../channels/ephemeral_value.js";
import { AsyncLocalStorageProviderSingleton } from "@langchain/core/singletons";

//#region src/func/index.ts
/**
* Define a LangGraph task using the `task` function.
*
* Tasks can only be called from within an {@link entrypoint} or from within a StateGraph.
* A task can be called like a regular function with the following differences:
*
* - When a checkpointer is enabled, the function inputs and outputs must be serializable.
* - The wrapped function can only be called from within an entrypoint or StateGraph.
* - Calling the function produces a promise. This makes it easy to parallelize tasks.
*
* @typeParam ArgsT - The type of arguments the task function accepts
* @typeParam OutputT - The type of value the task function returns
* @param optionsOrName - Either an {@link TaskOptions} object, or a string for the name of the task
* @param func - The function that executes this task
* @returns A proxy function that accepts the same arguments as the original and always returns the result as a Promise
*
* @example basic example
* ```typescript
* const addOne = task("add", async (a: number) => a + 1);
*
* const workflow = entrypoint("example", async (numbers: number[]) => {
*   const promises = numbers.map(n => addOne(n));
*   const results = await Promise.all(promises);
*   return results;
* });
*
* // Call the entrypoint
* await workflow.invoke([1, 2, 3]); // Returns [2, 3, 4]
* ```
*
* @example using a retry policy
* ```typescript
* const addOne = task({
*     name: "add",
*     retry: { maxAttempts: 3 }
*   },
*   async (a: number) => a + 1
* );
*
* const workflow = entrypoint("example", async (numbers: number[]) => {
*   const promises = numbers.map(n => addOne(n));
*   const results = await Promise.all(promises);
*   return results;
* });
* ```
* @category Functional API
*/
function task(optionsOrName, func) {
	const options = typeof optionsOrName === "string" ? {
		name: optionsOrName,
		retry: void 0,
		cachePolicy: void 0
	} : optionsOrName;
	const { name, retry } = options;
	if (isAsyncGeneratorFunction(func) || isGeneratorFunction(func)) throw new Error("Generators are disallowed as tasks. For streaming responses, use config.write.");
	const cachePolicy = options.cachePolicy ?? ("cache" in options ? options.cache : void 0);
	let cache;
	if (typeof cachePolicy === "boolean") cache = cachePolicy ? {} : void 0;
	else cache = cachePolicy;
	return (...args) => {
		return call({
			func,
			name,
			retry,
			cache
		}, ...args);
	};
}
/**
* Define a LangGraph workflow using the `entrypoint` function.
*
* ### Function signature
*
* The wrapped function must accept at most **two parameters**. The first parameter
* is the input to the function. The second (optional) parameter is a
* {@link LangGraphRunnableConfig} object. If you wish to pass multiple parameters to
* the function, you can pass them as an object.
*
* ### Helper functions
*
* #### Streaming
* To write data to the "custom" stream, use the {@link getWriter} function, or the
* {@link LangGraphRunnableConfig.writer} property.
*
* #### State management
* The {@link getPreviousState} function can be used to access the previous state
* that was returned from the last invocation of the entrypoint on the same thread id.
*
* If you wish to save state other than the return value, you can use the
* {@link entrypoint.final} function.
*
* @typeParam InputT - The type of input the entrypoint accepts
* @typeParam OutputT - The type of output the entrypoint produces
* @param optionsOrName - Either an {@link EntrypointOptions} object, or a string for the name of the entrypoint
* @param func - The function that executes this entrypoint
* @returns A {@link Pregel} instance that can be run to execute the workflow
*
* @example Using entrypoint and tasks
* ```typescript
* import { task, entrypoint } from "@langchain/langgraph";
* import { MemorySaver } from "@langchain/langgraph-checkpoint";
* import { interrupt, Command } from "@langchain/langgraph";
*
* const composeEssay = task("compose", async (topic: string) => {
*   await new Promise(r => setTimeout(r, 1000)); // Simulate slow operation
*   return `An essay about ${topic}`;
* });
*
* const reviewWorkflow = entrypoint({
*   name: "review",
*   checkpointer: new MemorySaver()
* }, async (topic: string) => {
*   const essay = await composeEssay(topic);
*   const humanReview = await interrupt({
*     question: "Please provide a review",
*     essay
*   });
*   return {
*     essay,
*     review: humanReview
*   };
* });
*
* // Example configuration for the workflow
* const config = {
*   configurable: {
*     thread_id: "some_thread"
*   }
* };
*
* // Topic for the essay
* const topic = "cats";
*
* // Stream the workflow to generate the essay and await human review
* for await (const result of reviewWorkflow.stream(topic, config)) {
*   console.log(result);
* }
*
* // Example human review provided after the interrupt
* const humanReview = "This essay is great.";
*
* // Resume the workflow with the provided human review
* for await (const result of reviewWorkflow.stream(new Command({ resume: humanReview }), config)) {
*   console.log(result);
* }
* ```
*
* @example Accessing the previous return value
* ```typescript
* import { entrypoint, getPreviousState } from "@langchain/langgraph";
* import { MemorySaver } from "@langchain/langgraph-checkpoint";
*
* const accumulator = entrypoint({
*   name: "accumulator",
*   checkpointer: new MemorySaver()
* }, async (input: string) => {
*   const previous = getPreviousState<number>();
*   return previous !== undefined ? `${previous } ${input}` : input;
* });
*
* const config = {
*   configurable: {
*     thread_id: "some_thread"
*   }
* };
* await accumulator.invoke("hello", config); // returns "hello"
* await accumulator.invoke("world", config); // returns "hello world"
* ```
*
* @example Using entrypoint.final to save a value
* ```typescript
* import { entrypoint, getPreviousState } from "@langchain/langgraph";
* import { MemorySaver } from "@langchain/langgraph-checkpoint";
*
* const myWorkflow = entrypoint({
*   name: "accumulator",
*   checkpointer: new MemorySaver()
* }, async (num: number) => {
*   const previous = getPreviousState<number>();
*
*   // This will return the previous value to the caller, saving
*   // 2 * num to the checkpoint, which will be used in the next invocation
*   // for the `previous` parameter.
*   return entrypoint.final({
*     value: previous ?? 0,
*     save: 2 * num
*   });
* });
*
* const config = {
*   configurable: {
*     thread_id: "some_thread"
*   }
* };
*
* await myWorkflow.invoke(3, config); // 0 (previous was undefined)
* await myWorkflow.invoke(1, config); // 6 (previous was 3 * 2 from the previous invocation)
* ```
* @category Functional API
*/
const entrypoint = function entrypoint$1(optionsOrName, func) {
	const { name, checkpointer, store, cache } = typeof optionsOrName === "string" ? {
		name: optionsOrName,
		checkpointer: void 0,
		store: void 0
	} : optionsOrName;
	if (isAsyncGeneratorFunction(func) || isGeneratorFunction(func)) throw new Error("Generators are disallowed as entrypoints. For streaming responses, use config.write.");
	const streamMode = "updates";
	const bound = getRunnableForEntrypoint(name, func);
	function isEntrypointFinal(value) {
		return typeof value === "object" && value !== null && "__lg_type" in value && value.__lg_type === "__pregel_final";
	}
	const pluckReturnValue = new RunnableCallable({
		name: "pluckReturnValue",
		func: (value) => {
			return isEntrypointFinal(value) ? value.value : value;
		}
	});
	const pluckSaveValue = new RunnableCallable({
		name: "pluckSaveValue",
		func: (value) => {
			return isEntrypointFinal(value) ? value.save : value;
		}
	});
	const entrypointNode = new PregelNode({
		bound,
		triggers: [START],
		channels: [START],
		writers: [new ChannelWrite([{
			channel: END,
			value: PASSTHROUGH,
			mapper: pluckReturnValue
		}, {
			channel: PREVIOUS,
			value: PASSTHROUGH,
			mapper: pluckSaveValue
		}], [TAG_HIDDEN])]
	});
	return new Pregel({
		name,
		checkpointer,
		nodes: { [name]: entrypointNode },
		channels: {
			[START]: new EphemeralValue(),
			[END]: new LastValue(),
			[PREVIOUS]: new LastValue()
		},
		inputChannels: START,
		outputChannels: END,
		streamChannels: END,
		streamMode,
		store,
		cache
	});
};
entrypoint.final = function final({ value, save }) {
	return {
		value,
		save,
		__lg_type: "__pregel_final"
	};
};
/**
* A helper utility function for use with the functional API that returns the previous
* state from the checkpoint from the last invocation of the current thread.
*
* This function allows workflows to access state that was saved in previous runs
* using {@link entrypoint.final}.
*
* @typeParam StateT - The type of the state that was previously saved
* @returns The previous saved state from the last invocation of the current thread
*
* @example
* ```typescript
* const previousState = getPreviousState<{ counter: number }>();
* const newCount = (previousState?.counter ?? 0) + 1;
* ```
* @category Functional API
*/
function getPreviousState() {
	const config = AsyncLocalStorageProviderSingleton.getRunnableConfig();
	return config.configurable?.[CONFIG_KEY_PREVIOUS_STATE];
}

//#endregion
export { entrypoint, getPreviousState, task };
//# sourceMappingURL=index.js.map