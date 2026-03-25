import { __export } from "../../_virtual/rolldown_runtime.js";
import { DescribeExecutionAWSSfnTool, SendTaskSuccessAWSSfnTool, StartExecutionAWSSfnTool } from "../../tools/aws_sfn.js";
import { Toolkit } from "@langchain/core/tools";
import { renderTemplate } from "@langchain/core/prompts";
import { LLMChain } from "@langchain/classic/chains";
import { AgentExecutor, ZeroShotAgent } from "@langchain/classic/agents";

//#region src/agents/toolkits/aws_sfn.ts
var aws_sfn_exports = {};
__export(aws_sfn_exports, {
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
var AWSSfnToolkit = class extends Toolkit {
	tools;
	stateMachineArn;
	asl;
	constructor(args) {
		super();
		this.stateMachineArn = args.stateMachineArn;
		if (args.asl) this.asl = args.asl;
		this.tools = [
			new StartExecutionAWSSfnTool({
				name: args.name,
				description: StartExecutionAWSSfnTool.formatDescription(args.name, args.description),
				stateMachineArn: args.stateMachineArn
			}),
			new DescribeExecutionAWSSfnTool(Object.assign(args.region ? { region: args.region } : {}, args.accessKeyId && args.secretAccessKey ? {
				accessKeyId: args.accessKeyId,
				secretAccessKey: args.secretAccessKey
			} : {})),
			new SendTaskSuccessAWSSfnTool(Object.assign(args.region ? { region: args.region } : {}, args.accessKeyId && args.secretAccessKey ? {
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
	const formattedPrefix = renderTemplate(prefix, "f-string", {});
	const prompt = ZeroShotAgent.createPrompt(tools, {
		prefix: formattedPrefix,
		suffix,
		inputVariables
	});
	const chain = new LLMChain({
		prompt,
		llm
	});
	const agent = new ZeroShotAgent({
		llmChain: chain,
		allowedTools: tools.map((t) => t.name)
	});
	return AgentExecutor.fromAgentAndTools({
		agent,
		tools,
		returnIntermediateSteps: true
	});
}

//#endregion
export { AWSSfnToolkit, SFN_PREFIX, SFN_SUFFIX, aws_sfn_exports, createAWSSfnAgent };
//# sourceMappingURL=aws_sfn.js.map