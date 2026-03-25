const require_base = require('../../chains/base.cjs');
const require_llm_chain = require('../../chains/llm_chain.cjs');
const require_executor = require('../../agents/executor.cjs');
const require_index = require('../../agents/chat/index.cjs');
const require_index$1 = require('../../agents/structured_chat/index.cjs');
require('../../agents/index.cjs');
const require_base$1 = require('./base.cjs');
const require_prompt = require('./prompt.cjs');
const require_outputParser = require('./outputParser.cjs');

//#region src/experimental/plan_and_execute/agent_executor.ts
/**
* A utility function to distiguish a dynamicstructuredtool over other tools.
* @param tool the tool to test
* @returns bool
*/
function isDynamicStructuredTool(tool) {
	return typeof tool.constructor.lc_name === "function" && tool.constructor.lc_name() === "DynamicStructuredTool";
}
/**
* Class representing a plan-and-execute agent executor. This agent
* decides on the full sequence of actions upfront, then executes them all
* without updating the plan. This is suitable for complex or long-running
* tasks that require maintaining long-term objectives and focus.
*/
var PlanAndExecuteAgentExecutor = class PlanAndExecuteAgentExecutor extends require_base.BaseChain {
	static lc_name() {
		return "PlanAndExecuteAgentExecutor";
	}
	planner;
	stepExecutor;
	stepContainer = new require_base$1.ListStepContainer();
	inputKey = "input";
	outputKey = "output";
	constructor(input) {
		super(input);
		this.planner = input.planner;
		this.stepExecutor = input.stepExecutor;
		this.stepContainer = input.stepContainer ?? this.stepContainer;
		this.inputKey = input.inputKey ?? this.inputKey;
		this.outputKey = input.outputKey ?? this.outputKey;
	}
	get inputKeys() {
		return [this.inputKey];
	}
	get outputKeys() {
		return [this.outputKey];
	}
	/**
	* Static method that returns a default planner for the agent. It creates
	* a new LLMChain with a given LLM and a fixed prompt, and uses it to
	* create a new LLMPlanner with a PlanOutputParser.
	* @param llm The Large Language Model (LLM) used to generate responses.
	* @returns A new LLMPlanner instance.
	*/
	static async getDefaultPlanner({ llm, tools }) {
		const plannerLlmChain = new require_llm_chain.LLMChain({
			llm,
			prompt: await require_prompt.getPlannerChatPrompt(tools)
		});
		return new require_base$1.LLMPlanner(plannerLlmChain, new require_outputParser.PlanOutputParser());
	}
	/**
	* Static method that returns a default step executor for the agent. It
	* creates a new ChatAgent from a given LLM and a set of tools, and uses
	* it to create a new ChainStepExecutor.
	* @param llm The Large Language Model (LLM) used to generate responses.
	* @param tools The set of tools used by the agent.
	* @param humanMessageTemplate The template for human messages. If not provided, a default template is used.
	* @returns A new ChainStepExecutor instance.
	*/
	static getDefaultStepExecutor({ llm, tools, humanMessageTemplate = require_prompt.DEFAULT_STEP_EXECUTOR_HUMAN_CHAT_MESSAGE_TEMPLATE }) {
		let agent;
		if (tools.length > 0 && isDynamicStructuredTool(tools[0])) {
			agent = require_index$1.StructuredChatAgent.fromLLMAndTools(llm, tools, {
				humanMessageTemplate,
				inputVariables: [
					"previous_steps",
					"current_step",
					"agent_scratchpad"
				]
			});
			return new require_base$1.ChainStepExecutor(require_executor.AgentExecutor.fromAgentAndTools({
				agent,
				tools
			}));
		}
		agent = require_index.ChatAgent.fromLLMAndTools(llm, tools, { humanMessageTemplate });
		return new require_base$1.ChainStepExecutor(require_executor.AgentExecutor.fromAgentAndTools({
			agent,
			tools
		}));
	}
	/**
	* Static method that creates a new PlanAndExecuteAgentExecutor from a
	* given LLM, a set of tools, and optionally a human message template. It
	* uses the getDefaultPlanner and getDefaultStepExecutor methods to create
	* the planner and step executor for the new agent executor.
	* @param llm The Large Language Model (LLM) used to generate responses.
	* @param tools The set of tools used by the agent.
	* @param humanMessageTemplate The template for human messages. If not provided, a default template is used.
	* @returns A new PlanAndExecuteAgentExecutor instance.
	*/
	static async fromLLMAndTools({ llm, tools, humanMessageTemplate }) {
		const executor = new PlanAndExecuteAgentExecutor({
			planner: await PlanAndExecuteAgentExecutor.getDefaultPlanner({
				llm,
				tools
			}),
			stepExecutor: PlanAndExecuteAgentExecutor.getDefaultStepExecutor({
				llm,
				tools,
				humanMessageTemplate
			})
		});
		return executor;
	}
	/** @ignore */
	async _call(inputs, runManager) {
		const plan = await this.planner.plan(inputs.input, runManager?.getChild());
		if (!plan.steps?.length) throw new Error("Could not create and parse a plan to answer your question - please try again.");
		plan.steps[plan.steps.length - 1].text += ` The original question was: ${inputs.input}.`;
		for (const step of plan.steps) {
			const newInputs = {
				...inputs,
				previous_steps: JSON.stringify(this.stepContainer.getSteps()),
				current_step: step.text
			};
			const response = await this.stepExecutor.step(newInputs, runManager?.getChild());
			this.stepContainer.addStep(step, response);
		}
		return { [this.outputKey]: this.stepContainer.getFinalResponse() };
	}
	_chainType() {
		return "agent_executor";
	}
	serialize() {
		throw new Error("Cannot serialize an AgentExecutor");
	}
};

//#endregion
exports.PlanAndExecuteAgentExecutor = PlanAndExecuteAgentExecutor;
//# sourceMappingURL=agent_executor.cjs.map