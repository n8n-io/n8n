const require_rolldown_runtime = require('../../_virtual/rolldown_runtime.cjs');
const require_tools_aws_sfn = require('../../tools/aws_sfn.cjs');
const __langchain_core_tools = require_rolldown_runtime.__toESM(require("@langchain/core/tools"));
const __langchain_core_prompts = require_rolldown_runtime.__toESM(require("@langchain/core/prompts"));
const __langchain_classic_chains = require_rolldown_runtime.__toESM(require("@langchain/classic/chains"));
const __langchain_classic_agents = require_rolldown_runtime.__toESM(require("@langchain/classic/agents"));

//#region src/agents/toolkits/aws_sfn.ts
var aws_sfn_exports = {};
require_rolldown_runtime.__export(aws_sfn_exports, {
	AWSSfnToolkit: () => AWSSfnToolkit,
	SFN_PREFIX: () => SFN_PREFIX,
	SFN_SUFFIX: () => SFN_SUFFIX,
	createAWSSfnAgent: () => createAWSSfnAgent
});
/**
* Class representing a toolkit for interacting with AWS Step Functions.
* It initializes the AWS Step Functions tools and provides them as tools
* for the agent.
* @example
* ```typescript
*
* const toolkit = new AWSSfnToolkit({
*   name: "onboard-new-client-workflow",
*   description:
*     "Onboard new client workflow. Can also be used to get status of any executing workflow or state machine.",
*   stateMachineArn:
*     "arn:aws:states:us-east-1:1234567890:stateMachine:my-state-machine",
*   region: "<your Sfn's region>",
*   accessKeyId: "<your access key id>",
*   secretAccessKey: "<your secret access key>",
* });
*
*
* const result = await toolkit.invoke({
*   input: "Onboard john doe (john@example.com) as a new client.",
* });
*
* ```
*/
var AWSSfnToolkit = class extends __langchain_core_tools.Toolkit {
	tools;
	stateMachineArn;
	asl;
	constructor(args) {
		super();
		this.stateMachineArn = args.stateMachineArn;
		if (args.asl) this.asl = args.asl;
		this.tools = [
			new require_tools_aws_sfn.StartExecutionAWSSfnTool({
				name: args.name,
				description: require_tools_aws_sfn.StartExecutionAWSSfnTool.formatDescription(args.name, args.description),
				stateMachineArn: args.stateMachineArn
			}),
			new require_tools_aws_sfn.DescribeExecutionAWSSfnTool(Object.assign(args.region ? { region: args.region } : {}, args.accessKeyId && args.secretAccessKey ? {
				accessKeyId: args.accessKeyId,
				secretAccessKey: args.secretAccessKey
			} : {})),
			new require_tools_aws_sfn.SendTaskSuccessAWSSfnTool(Object.assign(args.region ? { region: args.region } : {}, args.accessKeyId && args.secretAccessKey ? {
				accessKeyId: args.accessKeyId,
				secretAccessKey: args.secretAccessKey
			} : {}))
		];
	}
};
const SFN_PREFIX = `You are an agent designed to interact with AWS Step Functions state machines to execute and coordinate asynchronous workflows and tasks.
Given an input question, command, or task use the appropriate tool to execute a command to interact with AWS Step Functions and return the result.
You have access to tools for interacting with AWS Step Functions.
Given an input question, command, or task use the correct tool to complete the task.
Only use the below tools. Only use the information returned by the below tools to construct your final answer.

If the question does not seem related to AWS Step Functions or an existing state machine, just return "I don't know" as the answer.`;
const SFN_SUFFIX = `Begin!

Question: {input}
Thought: I should look at state machines within AWS Step Functions to see what actions I can perform.
{agent_scratchpad}`;
function createAWSSfnAgent(llm, toolkit, args) {
	const { prefix = SFN_PREFIX, suffix = SFN_SUFFIX, inputVariables = ["input", "agent_scratchpad"] } = args ?? {};
	const { tools } = toolkit;
	const formattedPrefix = (0, __langchain_core_prompts.renderTemplate)(prefix, "f-string", {});
	const prompt = __langchain_classic_agents.ZeroShotAgent.createPrompt(tools, {
		prefix: formattedPrefix,
		suffix,
		inputVariables
	});
	const chain = new __langchain_classic_chains.LLMChain({
		prompt,
		llm
	});
	const agent = new __langchain_classic_agents.ZeroShotAgent({
		llmChain: chain,
		allowedTools: tools.map((t) => t.name)
	});
	return __langchain_classic_agents.AgentExecutor.fromAgentAndTools({
		agent,
		tools,
		returnIntermediateSteps: true
	});
}

//#endregion
exports.AWSSfnToolkit = AWSSfnToolkit;
exports.SFN_PREFIX = SFN_PREFIX;
exports.SFN_SUFFIX = SFN_SUFFIX;
Object.defineProperty(exports, 'aws_sfn_exports', {
  enumerable: true,
  get: function () {
    return aws_sfn_exports;
  }
});
exports.createAWSSfnAgent = createAWSSfnAgent;
//# sourceMappingURL=aws_sfn.cjs.map