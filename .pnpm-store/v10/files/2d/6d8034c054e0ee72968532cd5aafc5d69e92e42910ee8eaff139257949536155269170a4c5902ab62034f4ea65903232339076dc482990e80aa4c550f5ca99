
//#region src/experimental/plan_and_execute/base.ts
/**
* Abstract class that defines the structure for a planner. Planners are
* responsible for generating a plan based on inputs.
*/
var BasePlanner = class {};
/**
* Abstract class that defines the structure for a step executor. Step
* executors are responsible for executing a step based on inputs.
*/
var BaseStepExecutor = class {};
/**
* Abstract class that defines the structure for a step container. Step
* containers are responsible for managing steps.
*/
var BaseStepContainer = class {};
/**
* Class that extends BaseStepContainer and provides an implementation for
* its methods. It maintains a list of steps and provides methods to add a
* step, get all steps, and get the final response.
*/
var ListStepContainer = class extends BaseStepContainer {
	steps = [];
	addStep(action, result) {
		this.steps.push({
			action,
			result
		});
	}
	getSteps() {
		return this.steps;
	}
	getFinalResponse() {
		return this.steps[this.steps.length - 1]?.result?.response;
	}
};
/**
* Class that extends BasePlanner and provides an implementation for the
* plan method. It uses an instance of LLMChain and an output parser to
* generate a plan.
*/
var LLMPlanner = class extends BasePlanner {
	constructor(llmChain, outputParser) {
		super();
		this.llmChain = llmChain;
		this.outputParser = outputParser;
	}
	async plan(inputs, runManager) {
		const output = await this.llmChain.run(inputs, runManager);
		return this.outputParser.parse(output);
	}
};
/**
* Class that extends BaseStepExecutor and provides an implementation for
* the step method. It uses an instance of BaseChain to execute a step.
*/
var ChainStepExecutor = class extends BaseStepExecutor {
	constructor(chain) {
		super();
		this.chain = chain;
	}
	async step(inputs, runManager) {
		const chainResponse = await this.chain.call(inputs, runManager);
		return { response: chainResponse.output };
	}
};

//#endregion
exports.BasePlanner = BasePlanner;
exports.BaseStepContainer = BaseStepContainer;
exports.BaseStepExecutor = BaseStepExecutor;
exports.ChainStepExecutor = ChainStepExecutor;
exports.LLMPlanner = LLMPlanner;
exports.ListStepContainer = ListStepContainer;
//# sourceMappingURL=base.cjs.map