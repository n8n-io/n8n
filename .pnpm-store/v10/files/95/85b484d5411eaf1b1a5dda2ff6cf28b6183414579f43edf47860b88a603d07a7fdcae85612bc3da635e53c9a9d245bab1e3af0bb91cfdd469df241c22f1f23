const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));

//#region src/experimental/plan_and_execute/prompt.ts
const PLANNER_SYSTEM_PROMPT_MESSAGE_TEMPLATE = [
	`Let's first understand the problem and devise a plan to solve the problem.`,
	`Please output the plan starting with the header "Plan:"`,
	`followed by a numbered list of steps.`,
	`Please make the plan the minimum number of steps required`,
	`to answer the query or complete the task accurately and precisely.`,
	`You have a set of tools at your disposal to help you with this task:`,
	"",
	"{toolStrings}",
	"",
	`You must consider these tools when coming up with your plan.`,
	`If the task is a question, the final step in the plan must be the following: "Given the above steps taken,`,
	`please respond to the original query."`,
	`At the end of your plan, say "<END_OF_PLAN>"`
].join(" ");
const DEFAULT_STEP_EXECUTOR_HUMAN_CHAT_MESSAGE_TEMPLATE = `Previous steps: {previous_steps}

Current objective: {current_step}

{agent_scratchpad}

You may extract and combine relevant data from your previous steps when responding to me.`;
/**
* Add the tool descriptions to the planning system prompt in
* order to get a better suited plan that makes efficient use
* of the tools
* @param tools the tools available to the `planner`
* @returns
*/
const getPlannerChatPrompt = async (tools) => {
	const toolStrings = tools.map((tool) => `${tool.name}: ${tool.description}`).join("\n");
	return /* @__PURE__ */ __langchain_core_prompts.ChatPromptTemplate.fromMessages([__langchain_core_prompts.SystemMessagePromptTemplate.fromTemplate(PLANNER_SYSTEM_PROMPT_MESSAGE_TEMPLATE), __langchain_core_prompts.HumanMessagePromptTemplate.fromTemplate(`{input}`)]).partial({ toolStrings });
};

//#endregion
exports.DEFAULT_STEP_EXECUTOR_HUMAN_CHAT_MESSAGE_TEMPLATE = DEFAULT_STEP_EXECUTOR_HUMAN_CHAT_MESSAGE_TEMPLATE;
exports.PLANNER_SYSTEM_PROMPT_MESSAGE_TEMPLATE = PLANNER_SYSTEM_PROMPT_MESSAGE_TEMPLATE;
exports.getPlannerChatPrompt = getPlannerChatPrompt;
//# sourceMappingURL=prompt.cjs.map