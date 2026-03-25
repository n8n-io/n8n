import { ZeroShotAgent } from "./mrkl/index.js";
import { AgentExecutor } from "./executor.js";
import { BufferMemory } from "../memory/buffer_memory.js";
import { ChatAgent } from "./chat/index.js";
import { ChatConversationalAgent } from "./chat_convo/index.js";
import { StructuredChatAgent } from "./structured_chat/index.js";
import { OpenAIAgent } from "./openai_functions/index.js";
import { XMLAgent } from "./xml/index.js";

//#region src/agents/initialize.ts
const initializeAgentExecutor = async (tools, llm, _agentType, _verbose, _callbackManager) => {
	const agentType = _agentType ?? "zero-shot-react-description";
	const verbose = _verbose;
	const callbackManager = _callbackManager;
	switch (agentType) {
		case "zero-shot-react-description": return AgentExecutor.fromAgentAndTools({
			agent: ZeroShotAgent.fromLLMAndTools(llm, tools),
			tools,
			returnIntermediateSteps: true,
			verbose,
			callbackManager
		});
		case "chat-zero-shot-react-description": return AgentExecutor.fromAgentAndTools({
			agent: ChatAgent.fromLLMAndTools(llm, tools),
			tools,
			returnIntermediateSteps: true,
			verbose,
			callbackManager
		});
		case "chat-conversational-react-description": return AgentExecutor.fromAgentAndTools({
			agent: ChatConversationalAgent.fromLLMAndTools(llm, tools),
			tools,
			verbose,
			callbackManager
		});
		default: throw new Error("Unknown agent type");
	}
};
async function initializeAgentExecutorWithOptions(tools, llm, options = { agentType: llm._modelType() === "base_chat_model" ? "chat-zero-shot-react-description" : "zero-shot-react-description" }) {
	switch (options.agentType) {
		case "zero-shot-react-description": {
			const { agentArgs, tags,...rest } = options;
			return AgentExecutor.fromAgentAndTools({
				tags: [...tags ?? [], "zero-shot-react-description"],
				agent: ZeroShotAgent.fromLLMAndTools(llm, tools, agentArgs),
				tools,
				...rest
			});
		}
		case "chat-zero-shot-react-description": {
			const { agentArgs, tags,...rest } = options;
			return AgentExecutor.fromAgentAndTools({
				tags: [...tags ?? [], "chat-zero-shot-react-description"],
				agent: ChatAgent.fromLLMAndTools(llm, tools, agentArgs),
				tools,
				...rest
			});
		}
		case "chat-conversational-react-description": {
			const { agentArgs, memory, tags,...rest } = options;
			const executor = AgentExecutor.fromAgentAndTools({
				tags: [...tags ?? [], "chat-conversational-react-description"],
				agent: ChatConversationalAgent.fromLLMAndTools(llm, tools, agentArgs),
				tools,
				memory: memory ?? new BufferMemory({
					returnMessages: true,
					memoryKey: "chat_history",
					inputKey: "input",
					outputKey: "output"
				}),
				...rest
			});
			return executor;
		}
		case "xml": {
			const { agentArgs, tags,...rest } = options;
			const executor = AgentExecutor.fromAgentAndTools({
				tags: [...tags ?? [], "xml"],
				agent: XMLAgent.fromLLMAndTools(llm, tools, agentArgs),
				tools,
				...rest
			});
			return executor;
		}
		case "structured-chat-zero-shot-react-description": {
			const { agentArgs, memory, tags,...rest } = options;
			const executor = AgentExecutor.fromAgentAndTools({
				tags: [...tags ?? [], "structured-chat-zero-shot-react-description"],
				agent: StructuredChatAgent.fromLLMAndTools(llm, tools, agentArgs),
				tools,
				memory,
				...rest
			});
			return executor;
		}
		case "openai-functions": {
			const { agentArgs, memory, tags,...rest } = options;
			const executor = AgentExecutor.fromAgentAndTools({
				tags: [...tags ?? [], "openai-functions"],
				agent: OpenAIAgent.fromLLMAndTools(llm, tools, agentArgs),
				tools,
				memory: memory ?? new BufferMemory({
					returnMessages: true,
					memoryKey: "chat_history",
					inputKey: "input",
					outputKey: "output"
				}),
				...rest
			});
			return executor;
		}
		default: throw new Error("Unknown agent type");
	}
}

//#endregion
export { initializeAgentExecutor, initializeAgentExecutorWithOptions };
//# sourceMappingURL=initialize.js.map