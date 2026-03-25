import { SfnConfig } from "../../tools/aws_sfn.cjs";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { ToolInterface, Toolkit } from "@langchain/core/tools";
import { AgentExecutor, ZeroShotCreatePromptArgs } from "@langchain/classic/agents";

//#region src/agents/toolkits/aws_sfn.d.ts

/**
 * Interface for the arguments required to create an AWS Step Functions
 * toolkit.
 */
interface AWSSfnToolkitArgs {
  name: string;
  description: string;
  stateMachineArn: string;
  asl?: string;
  llm?: BaseLanguageModelInterface;
}
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
declare class AWSSfnToolkit extends Toolkit {
  tools: ToolInterface[];
  stateMachineArn: string;
  asl: string;
  constructor(args: AWSSfnToolkitArgs & SfnConfig);
}
declare const SFN_PREFIX = "You are an agent designed to interact with AWS Step Functions state machines to execute and coordinate asynchronous workflows and tasks.\nGiven an input question, command, or task use the appropriate tool to execute a command to interact with AWS Step Functions and return the result.\nYou have access to tools for interacting with AWS Step Functions.\nGiven an input question, command, or task use the correct tool to complete the task.\nOnly use the below tools. Only use the information returned by the below tools to construct your final answer.\n\nIf the question does not seem related to AWS Step Functions or an existing state machine, just return \"I don't know\" as the answer.";
declare const SFN_SUFFIX = "Begin!\n\nQuestion: {input}\nThought: I should look at state machines within AWS Step Functions to see what actions I can perform.\n{agent_scratchpad}";
interface AWSSfnCreatePromptArgs extends ZeroShotCreatePromptArgs {}
declare function createAWSSfnAgent(llm: BaseLanguageModelInterface, toolkit: AWSSfnToolkit, args?: AWSSfnCreatePromptArgs): AgentExecutor;
//#endregion
export { AWSSfnCreatePromptArgs, AWSSfnToolkit, AWSSfnToolkitArgs, SFN_PREFIX, SFN_SUFFIX, createAWSSfnAgent };
//# sourceMappingURL=aws_sfn.d.cts.map