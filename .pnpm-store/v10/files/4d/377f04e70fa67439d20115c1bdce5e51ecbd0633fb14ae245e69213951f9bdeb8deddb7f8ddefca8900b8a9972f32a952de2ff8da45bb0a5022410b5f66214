import { ZeroShotAgent } from "./mrkl/index.cjs";
import { AgentExecutor, AgentExecutorInput } from "./executor.cjs";
import { ChatAgent } from "./chat/index.cjs";
import { ChatConversationalAgent } from "./chat_convo/index.cjs";
import { StringInputToolSchema } from "../langchain-core/dist/tools/types.cjs";
import { StructuredChatAgent } from "./structured_chat/index.cjs";
import { OpenAIAgent } from "./openai_functions/index.cjs";
import { XMLAgent } from "./xml/index.cjs";
import * as _langchain_core_language_models_base2 from "@langchain/core/language_models/base";
import { BaseLanguageModelInterface } from "@langchain/core/language_models/base";
import { CallbackManager } from "@langchain/core/callbacks/manager";
import { StructuredToolInterface, ToolInterface } from "@langchain/core/tools";

//#region src/agents/initialize.d.ts

/**
 * Represents the type of an agent in LangChain. It can be
 * "zero-shot-react-description", "chat-zero-shot-react-description", or
 * "chat-conversational-react-description".
 */
type AgentType = "zero-shot-react-description" | "chat-zero-shot-react-description" | "chat-conversational-react-description";
declare const initializeAgentExecutor: (tools: ToolInterface<StringInputToolSchema, any, any>[], llm: BaseLanguageModelInterface<any, _langchain_core_language_models_base2.BaseLanguageModelCallOptions>, _agentType?: AgentType | undefined, _verbose?: boolean | undefined, _callbackManager?: CallbackManager | undefined) => Promise<AgentExecutor>;
/**
 * @interface
 */
type InitializeAgentExecutorOptions = ({
  agentType: "zero-shot-react-description";
  agentArgs?: Parameters<typeof ZeroShotAgent.fromLLMAndTools>[2];
  memory?: never;
} & Omit<AgentExecutorInput, "agent" | "tools">) | ({
  agentType: "chat-zero-shot-react-description";
  agentArgs?: Parameters<typeof ChatAgent.fromLLMAndTools>[2];
  memory?: never;
} & Omit<AgentExecutorInput, "agent" | "tools">) | ({
  agentType: "chat-conversational-react-description";
  agentArgs?: Parameters<typeof ChatConversationalAgent.fromLLMAndTools>[2];
} & Omit<AgentExecutorInput, "agent" | "tools">) | ({
  agentType: "xml";
  agentArgs?: Parameters<typeof XMLAgent.fromLLMAndTools>[2];
} & Omit<AgentExecutorInput, "agent" | "tools">);
/**
 * @interface
 */
type InitializeAgentExecutorOptionsStructured = ({
  agentType: "structured-chat-zero-shot-react-description";
  agentArgs?: Parameters<typeof StructuredChatAgent.fromLLMAndTools>[2];
} & Omit<AgentExecutorInput, "agent" | "tools">) | ({
  agentType: "openai-functions";
  agentArgs?: Parameters<typeof OpenAIAgent.fromLLMAndTools>[2];
} & Omit<AgentExecutorInput, "agent" | "tools">);
/**
 * Initialize an agent executor with options.
 * @param tools Array of tools to use in the agent
 * @param llm LLM or ChatModel to use in the agent
 * @param options Options for the agent, including agentType, agentArgs, and other options for AgentExecutor.fromAgentAndTools
 * @returns AgentExecutor
 */
declare function initializeAgentExecutorWithOptions(tools: StructuredToolInterface[], llm: BaseLanguageModelInterface, options: InitializeAgentExecutorOptionsStructured): Promise<AgentExecutor>;
declare function initializeAgentExecutorWithOptions(tools: ToolInterface[], llm: BaseLanguageModelInterface, options?: InitializeAgentExecutorOptions): Promise<AgentExecutor>;
//#endregion
export { InitializeAgentExecutorOptions, InitializeAgentExecutorOptionsStructured, initializeAgentExecutor, initializeAgentExecutorWithOptions };
//# sourceMappingURL=initialize.d.cts.map