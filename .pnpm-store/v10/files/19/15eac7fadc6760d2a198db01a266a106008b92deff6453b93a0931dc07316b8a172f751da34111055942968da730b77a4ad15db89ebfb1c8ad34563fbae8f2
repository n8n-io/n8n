import { SerializedLLMChain } from "../chains/serde.cjs";
import { LLMChain } from "../chains/llm_chain.cjs";
import { AgentAction, AgentFinish } from "@langchain/core/agents";
import { BaseMessage } from "@langchain/core/messages";
import { Runnable } from "@langchain/core/runnables";
import { BaseOutputParser } from "@langchain/core/output_parsers";
import { ChainValues } from "@langchain/core/utils/types";

//#region src/agents/types.d.ts

/**
 * Interface defining the input for creating an agent. It includes the
 * LLMChain instance, an optional output parser, and an optional list of
 * allowed tools.
 */
interface AgentInput {
  llmChain: LLMChain;
  outputParser: AgentActionOutputParser | undefined;
  allowedTools?: string[];
}
/**
 * Interface defining the input for creating a multi-action agent that uses
 * runnables. It includes the Runnable instance, and an optional list of
 * stop strings.
 */
interface RunnableMultiActionAgentInput {
  runnable: Runnable<ChainValues & {
    agent_scratchpad?: string | BaseMessage[];
    stop?: string[];
  }, AgentAction[] | AgentAction | AgentFinish>;
  streamRunnable?: boolean;
  defaultRunName?: string;
  stop?: string[];
}
/**
 * Abstract class representing an output parser specifically for agent
 * actions and finishes in LangChain. It extends the `BaseOutputParser`
 * class.
 */
declare abstract class AgentActionOutputParser extends BaseOutputParser<AgentAction | AgentFinish> {}
/**
 * Abstract class representing an output parser specifically for agents
 * that return multiple actions.
 */
declare abstract class AgentMultiActionOutputParser extends BaseOutputParser<AgentAction[] | AgentFinish> {}
/**
 * Type representing the stopping method for an agent. It can be either
 * 'force' or 'generate'.
 */
type StoppingMethod = "force" | "generate";
/**
 * Generic type representing a serialized agent in LangChain. It includes
 * the type of the agent, the serialized form of the LLMChain, and
 * additional properties specific to the agent type.
 */
type SerializedAgentT<TType extends string = string, FromLLMInput extends Record<string, unknown> = Record<string, unknown>, ConstructorInput extends AgentInput = AgentInput> = {
  _type: TType;
  llm_chain?: SerializedLLMChain;
} & (({
  load_from_llm_and_tools: true;
} & FromLLMInput) | ({
  load_from_llm_and_tools?: false;
} & ConstructorInput));
type SerializedFromLLMAndTools = {
  suffix?: string;
  prefix?: string;
  input_variables?: string[];
};
/**
 * Type representing a serialized ZeroShotAgent in LangChain. It extends
 * the `SerializedAgentT` type and includes additional properties specific
 * to the ZeroShotAgent.
 */
type SerializedZeroShotAgent = SerializedAgentT<"zero-shot-react-description", SerializedFromLLMAndTools, AgentInput>;
/**
 * Type representing a serialized agent in LangChain. It is currently
 * synonymous with `SerializedZeroShotAgent`.
 */
type SerializedAgent = SerializedZeroShotAgent;
//#endregion
export { AgentActionOutputParser, AgentInput, AgentMultiActionOutputParser, RunnableMultiActionAgentInput, SerializedAgent, SerializedAgentT, SerializedZeroShotAgent, StoppingMethod };
//# sourceMappingURL=types.d.cts.map