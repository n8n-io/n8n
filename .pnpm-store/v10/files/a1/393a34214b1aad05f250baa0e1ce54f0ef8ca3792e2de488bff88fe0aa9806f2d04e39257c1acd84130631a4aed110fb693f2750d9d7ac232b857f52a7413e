const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_llm_chain = require('../../chains/llm_chain.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));

//#region src/experimental/babyagi/task_prioritization.ts
/** Chain to prioritize tasks. */
var TaskPrioritizationChain = class TaskPrioritizationChain extends require_llm_chain.LLMChain {
	static lc_name() {
		return "TaskPrioritizationChain";
	}
	/**
	* Static method to create a new TaskPrioritizationChain from a
	* BaseLanguageModel. It generates a prompt using the PromptTemplate class
	* and the task prioritization template, and returns a new instance of
	* TaskPrioritizationChain.
	* @param fields Object with fields used to initialize the chain, excluding the prompt.
	* @returns A new instance of TaskPrioritizationChain.
	*/
	static fromLLM(fields) {
		const taskPrioritizationTemplate = "You are a task prioritization AI tasked with cleaning the formatting of and reprioritizing the following tasks: {task_names}. Consider the ultimate objective of your team: {objective}. Do not remove any tasks. Return the result as a numbered list, like: #. First task #. Second task Start the task list with number {next_task_id}.";
		const prompt = new __langchain_core_prompts.PromptTemplate({
			template: taskPrioritizationTemplate,
			inputVariables: [
				"task_names",
				"next_task_id",
				"objective"
			]
		});
		return new TaskPrioritizationChain({
			prompt,
			...fields
		});
	}
};

//#endregion
exports.TaskPrioritizationChain = TaskPrioritizationChain;
//# sourceMappingURL=task_prioritization.cjs.map