Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_runtime = require("../_virtual/_rolldown/runtime.cjs");
const require_tracers_base = require("./base.cjs");
let ansi_styles = require("ansi-styles");
ansi_styles = require_runtime.__toESM(ansi_styles);
//#region src/tracers/console.ts
var console_exports = /* @__PURE__ */ require_runtime.__exportAll({ ConsoleCallbackHandler: () => ConsoleCallbackHandler });
function wrap(style, text) {
	return `${style.open}${text}${style.close}`;
}
function tryJsonStringify(obj, fallback) {
	try {
		return JSON.stringify(obj, null, 2);
	} catch {
		return fallback;
	}
}
function formatKVMapItem(value) {
	if (typeof value === "string") return value.trim();
	if (value === null || value === void 0) return value;
	return tryJsonStringify(value, value.toString());
}
function elapsed(run) {
	if (!run.end_time) return "";
	const elapsed = run.end_time - run.start_time;
	if (elapsed < 1e3) return `${elapsed}ms`;
	return `${(elapsed / 1e3).toFixed(2)}s`;
}
const { color } = ansi_styles.default;
/**
* A tracer that logs all events to the console. It extends from the
* `BaseTracer` class and overrides its methods to provide custom logging
* functionality.
* @example
* ```typescript
*
* const llm = new ChatAnthropic({
*   temperature: 0,
*   tags: ["example", "callbacks", "constructor"],
*   callbacks: [new ConsoleCallbackHandler()],
* });
*
* ```
*/
var ConsoleCallbackHandler = class extends require_tracers_base.BaseTracer {
	name = "console_callback_handler";
	/**
	* Method used to persist the run. In this case, it simply returns a
	* resolved promise as there's no persistence logic.
	* @param _run The run to persist.
	* @returns A resolved promise.
	*/
	persistRun(_run) {
		return Promise.resolve();
	}
	/**
	* Method used to get all the parent runs of a given run.
	* @param run The run whose parents are to be retrieved.
	* @returns An array of parent runs.
	*/
	getParents(run) {
		const parents = [];
		let currentRun = run;
		while (currentRun.parent_run_id) {
			const parent = this.runMap.get(currentRun.parent_run_id);
			if (parent) {
				parents.push(parent);
				currentRun = parent;
			} else break;
		}
		return parents;
	}
	/**
	* Method used to get a string representation of the run's lineage, which
	* is used in logging.
	* @param run The run whose lineage is to be retrieved.
	* @returns A string representation of the run's lineage.
	*/
	getBreadcrumbs(run) {
		const string = [...this.getParents(run).reverse(), run].map((parent, i, arr) => {
			const name = `${parent.execution_order}:${parent.run_type}:${parent.name}`;
			return i === arr.length - 1 ? wrap(ansi_styles.default.bold, name) : name;
		}).join(" > ");
		return wrap(color.grey, string);
	}
	/**
	* Method used to log the start of a chain run.
	* @param run The chain run that has started.
	* @returns void
	*/
	onChainStart(run) {
		const crumbs = this.getBreadcrumbs(run);
		console.log(`${wrap(color.green, "[chain/start]")} [${crumbs}] Entering Chain run with input: ${tryJsonStringify(run.inputs, "[inputs]")}`);
	}
	/**
	* Method used to log the end of a chain run.
	* @param run The chain run that has ended.
	* @returns void
	*/
	onChainEnd(run) {
		const crumbs = this.getBreadcrumbs(run);
		console.log(`${wrap(color.cyan, "[chain/end]")} [${crumbs}] [${elapsed(run)}] Exiting Chain run with output: ${tryJsonStringify(run.outputs, "[outputs]")}`);
	}
	/**
	* Method used to log any errors of a chain run.
	* @param run The chain run that has errored.
	* @returns void
	*/
	onChainError(run) {
		const crumbs = this.getBreadcrumbs(run);
		console.log(`${wrap(color.red, "[chain/error]")} [${crumbs}] [${elapsed(run)}] Chain run errored with error: ${tryJsonStringify(run.error, "[error]")}`);
	}
	/**
	* Method used to log the start of an LLM run.
	* @param run The LLM run that has started.
	* @returns void
	*/
	onLLMStart(run) {
		const crumbs = this.getBreadcrumbs(run);
		const inputs = "prompts" in run.inputs ? { prompts: run.inputs.prompts.map((p) => p.trim()) } : run.inputs;
		console.log(`${wrap(color.green, "[llm/start]")} [${crumbs}] Entering LLM run with input: ${tryJsonStringify(inputs, "[inputs]")}`);
	}
	/**
	* Method used to log the end of an LLM run.
	* @param run The LLM run that has ended.
	* @returns void
	*/
	onLLMEnd(run) {
		const crumbs = this.getBreadcrumbs(run);
		console.log(`${wrap(color.cyan, "[llm/end]")} [${crumbs}] [${elapsed(run)}] Exiting LLM run with output: ${tryJsonStringify(run.outputs, "[response]")}`);
	}
	/**
	* Method used to log any errors of an LLM run.
	* @param run The LLM run that has errored.
	* @returns void
	*/
	onLLMError(run) {
		const crumbs = this.getBreadcrumbs(run);
		console.log(`${wrap(color.red, "[llm/error]")} [${crumbs}] [${elapsed(run)}] LLM run errored with error: ${tryJsonStringify(run.error, "[error]")}`);
	}
	/**
	* Method used to log the start of a tool run.
	* @param run The tool run that has started.
	* @returns void
	*/
	onToolStart(run) {
		const crumbs = this.getBreadcrumbs(run);
		console.log(`${wrap(color.green, "[tool/start]")} [${crumbs}] Entering Tool run with input: "${formatKVMapItem(run.inputs.input)}"`);
	}
	/**
	* Method used to log the end of a tool run.
	* @param run The tool run that has ended.
	* @returns void
	*/
	onToolEnd(run) {
		const crumbs = this.getBreadcrumbs(run);
		console.log(`${wrap(color.cyan, "[tool/end]")} [${crumbs}] [${elapsed(run)}] Exiting Tool run with output: "${formatKVMapItem(run.outputs?.output)}"`);
	}
	/**
	* Method used to log any errors of a tool run.
	* @param run The tool run that has errored.
	* @returns void
	*/
	onToolError(run) {
		const crumbs = this.getBreadcrumbs(run);
		console.log(`${wrap(color.red, "[tool/error]")} [${crumbs}] [${elapsed(run)}] Tool run errored with error: ${tryJsonStringify(run.error, "[error]")}`);
	}
	/**
	* Method used to log the start of a retriever run.
	* @param run The retriever run that has started.
	* @returns void
	*/
	onRetrieverStart(run) {
		const crumbs = this.getBreadcrumbs(run);
		console.log(`${wrap(color.green, "[retriever/start]")} [${crumbs}] Entering Retriever run with input: ${tryJsonStringify(run.inputs, "[inputs]")}`);
	}
	/**
	* Method used to log the end of a retriever run.
	* @param run The retriever run that has ended.
	* @returns void
	*/
	onRetrieverEnd(run) {
		const crumbs = this.getBreadcrumbs(run);
		console.log(`${wrap(color.cyan, "[retriever/end]")} [${crumbs}] [${elapsed(run)}] Exiting Retriever run with output: ${tryJsonStringify(run.outputs, "[outputs]")}`);
	}
	/**
	* Method used to log any errors of a retriever run.
	* @param run The retriever run that has errored.
	* @returns void
	*/
	onRetrieverError(run) {
		const crumbs = this.getBreadcrumbs(run);
		console.log(`${wrap(color.red, "[retriever/error]")} [${crumbs}] [${elapsed(run)}] Retriever run errored with error: ${tryJsonStringify(run.error, "[error]")}`);
	}
	/**
	* Method used to log the action selected by the agent.
	* @param run The run in which the agent action occurred.
	* @returns void
	*/
	onAgentAction(run) {
		const agentRun = run;
		const crumbs = this.getBreadcrumbs(run);
		console.log(`${wrap(color.blue, "[agent/action]")} [${crumbs}] Agent selected action: ${tryJsonStringify(agentRun.actions[agentRun.actions.length - 1], "[action]")}`);
	}
};
//#endregion
exports.ConsoleCallbackHandler = ConsoleCallbackHandler;
Object.defineProperty(exports, "console_exports", {
	enumerable: true,
	get: function() {
		return console_exports;
	}
});

//# sourceMappingURL=console.cjs.map