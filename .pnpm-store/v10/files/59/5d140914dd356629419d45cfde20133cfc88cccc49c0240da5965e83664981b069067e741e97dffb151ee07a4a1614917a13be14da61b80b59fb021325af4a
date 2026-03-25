const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_llm_chain = require('../../chains/llm_chain.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));

//#region src/experimental/babyagi/task_creation.ts
/** Chain to generate tasks. */
var TaskCreationChain = class TaskCreationChain extends require_llm_chain.LLMChain {
	static lc_name() {
		return "TaskCreationChain";
	}
	/**
	* Creates a new TaskCreationChain instance. It takes an object of type
	* LLMChainInput as input, omitting the 'prompt' field. It uses the
	* PromptTemplate class to create a new prompt based on the task creation
	* template and the input variables. The new TaskCreationChain instance is
	* then created with this prompt and the remaining fields from the input
	* object.
	* @param fields An object of type LLMChainInput, omitting the 'prompt' field.
	* @returns A new instance of TaskCreationChain.
	*/
	static fromLLM(fields) {
		const taskCreationTemplate = "You are an task creation AI that uses the result of an execution agent to create new tasks with the following objective: {objective}, The last completed task has the result: {result}. This result was based on this task description: {task_description}. These are incomplete tasks: {incomplete_tasks}. Based on the result, create new tasks to be completed by the AI system that do not overlap with incomplete tasks. Return the tasks as an array.";
		const prompt = new __langchain_core_prompts.PromptTemplate({
			template: taskCreationTemplate,
			inputVariables: [
				"result",
				"task_description",
				"incomplete_tasks",
				"objective"
			]
		});
		return new TaskCreationChain({
			prompt,
			...fields
		});
	}
};

//#endregion
exports.TaskCreationChain = TaskCreationChain;
//# sourceMappingURL=task_creation.cjs.map