import { AgentTrajectoryEvaluator } from "../base.js";
import { EVAL_CHAT_PROMPT, TOOL_FREE_EVAL_CHAT_PROMPT } from "./prompt.js";
import { RUN_KEY } from "@langchain/core/outputs";
import { BaseLLMOutputParser } from "@langchain/core/output_parsers";

//#region src/evaluation/agents/trajectory.ts
/**
* A parser for the output of the TrajectoryEvalChain.
*/
var TrajectoryOutputParser = class extends BaseLLMOutputParser {
	static lc_name() {
		return "TrajectoryOutputParser";
	}
	lc_namespace = [
		"langchain",
		"evaluation",
		"agents"
	];
	parseResult(generations, _callbacks) {
		const { text } = generations[0];
		if (!text.includes("Score:")) throw new Error(`Could not find score in model eval output: ${text}`);
		let [reasoning, scoreStr] = text.split("Score:", 2);
		reasoning = reasoning.trim();
		scoreStr = scoreStr.trim();
		const scoreMatch = scoreStr.match(/(\d+(\.\d+)?)/);
		if (scoreMatch === null || scoreMatch[1].includes(".")) throw new Error(`Score is not an integer digit in the range 1-5: ${text}`);
		const score = +scoreMatch[1];
		if (score < 1 || score > 5) throw new Error(`Score is not a digit in the range 1-5: ${text}`);
		const normalizedScore = (score - 1) / 4;
		return Promise.resolve({
			reasoning,
			score: normalizedScore
		});
	}
};
/**
* A chain for evaluating ReAct style agents.
*
* This chain is used to evaluate ReAct style agents by reasoning about
* the sequence of actions taken and their outcomes.
*/
var TrajectoryEvalChain = class extends AgentTrajectoryEvaluator {
	static lc_name() {
		return "TrajectoryEvalChain";
	}
	criterionName;
	evaluationName = this.criterionName;
	requiresInput = true;
	requiresReference = false;
	outputParser = new TrajectoryOutputParser();
	static resolveTrajectoryPrompt(prompt, agentTools) {
		let _prompt;
		if (prompt) _prompt = prompt;
		else if (agentTools) _prompt = EVAL_CHAT_PROMPT;
		else _prompt = TOOL_FREE_EVAL_CHAT_PROMPT;
		return _prompt;
	}
	/**
	* Get the description of the agent tools.
	*
	* @returns The description of the agent tools.
	*/
	static toolsDescription(agentTools) {
		return agentTools.map((tool, i) => `Tool ${i + 1}: ${tool.name}\n Description: ${tool.description}`).join("\n\n");
	}
	/**
	* Create a new TrajectoryEvalChain.
	* @param llm
	* @param agentTools - The tools used by the agent.
	* @param chainOptions - The options for the chain.
	*/
	static async fromLLM(llm, agentTools, chainOptions) {
		let prompt = this.resolveTrajectoryPrompt(chainOptions?.prompt, agentTools);
		if (agentTools) {
			const toolDescriptions = this.toolsDescription(agentTools);
			prompt = await prompt.partial({ toolDescriptions });
		}
		const options = chainOptions;
		if (options) delete options.prompt;
		return new this({
			llm,
			prompt,
			...options
		});
	}
	_prepareOutput(result) {
		const parsed = result[this.outputKey];
		if (RUN_KEY in result && result[RUN_KEY]) parsed[RUN_KEY] = result[RUN_KEY];
		return parsed;
	}
	/**
	* Get the agent trajectory as a formatted string.
	*
	* @param steps - The agent trajectory.
	* @returns The formatted agent trajectory.
	*/
	getAgentTrajectory(steps) {
		return steps.map((step, i) => {
			const { action, observation } = step;
			return `Step ${i + 1}:\nTool used: ${action.tool}\nTool input: ${action.toolInput}\nTool output: ${observation}`;
		}).join("\n\n");
	}
	formatReference(reference) {
		if (!reference) return "";
		return `
The following is the expected answer. Use this to measure correctness:
[GROUND_TRUTH]
${reference}
[END_GROUND_TRUTH]
        `;
	}
	async _evaluateAgentTrajectory(args, callOptions, config) {
		const { input, prediction, reference, agentTrajectory } = args;
		const inputs = {
			question: input,
			agentTrajectory: this.getAgentTrajectory(agentTrajectory),
			answer: prediction,
			reference: this.formatReference(reference)
		};
		const result = await this.call({
			...inputs,
			...callOptions
		}, config);
		return this._prepareOutput(result);
	}
};

//#endregion
export { TrajectoryEvalChain, TrajectoryOutputParser };
//# sourceMappingURL=trajectory.js.map