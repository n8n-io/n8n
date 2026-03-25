const require_index = require('./mrkl/index.cjs');
const require_executor = require('./executor.cjs');
const require_buffer_memory = require('../memory/buffer_memory.cjs');
const require_index$1 = require('./chat/index.cjs');
const require_index$2 = require('./chat_convo/index.cjs');
const require_index$3 = require('./structured_chat/index.cjs');
const require_index$4 = require('./openai_functions/index.cjs');
const require_index$5 = require('./xml/index.cjs');

//#region src/agents/initialize.ts
const initializeAgentExecutor = async (tools, llm, _agentType, _verbose, _callbackManager) => {
	const agentType = _agentType ?? "zero-shot-react-description";
	const verbose = _verbose;
	const callbackManager = _callbackManager;
	switch (agentType) {
		case "zero-shot-react-description": return require_executor.AgentExecutor.fromAgentAndTools({
			agent: require_index.ZeroShotAgent.fromLLMAndTools(llm, tools),
			tools,
			returnIntermediateSteps: true,
			verbose,
			callbackManager
		});
		case "chat-zero-shot-react-description": return require_executor.AgentExecutor.fromAgentAndTools({
			agent: require_index$1.ChatAgent.fromLLMAndTools(llm, tools),
			tools,
			returnIntermediateSteps: true,
			verbose,
			callbackManager
		});
		case "chat-conversational-react-description": return require_executor.AgentExecutor.fromAgentAndTools({
			agent: require_index$2.ChatConversationalAgent.fromLLMAndTools(llm, tools),
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
			return require_executor.AgentExecutor.fromAgentAndTools({
				tags: [...tags ?? [], "zero-shot-react-description"],
				agent: require_index.ZeroShotAgent.fromLLMAndTools(llm, tools, agentArgs),
				tools,
				...rest
			});
		}
		case "chat-zero-shot-react-description": {
			const { agentArgs, tags,...rest } = options;
			return require_executor.AgentExecutor.fromAgentAndTools({
				tags: [...tags ?? [], "chat-zero-shot-react-description"],
				agent: require_index$1.ChatAgent.fromLLMAndTools(llm, tools, agentArgs),
				tools,
				...rest
			});
		}
		case "chat-conversational-react-description": {
			const { agentArgs, memory, tags,...rest } = options;
			const executor = require_executor.AgentExecutor.fromAgentAndTools({
				tags: [...tags ?? [], "chat-conversational-react-description"],
				agent: require_index$2.ChatConversationalAgent.fromLLMAndTools(llm, tools, agentArgs),
				tools,
				memory: memory ?? new require_buffer_memory.BufferMemory({
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
			const executor = require_executor.AgentExecutor.fromAgentAndTools({
				tags: [...tags ?? [], "xml"],
				agent: require_index$5.XMLAgent.fromLLMAndTools(llm, tools, agentArgs),
				tools,
				...rest
			});
			return executor;
		}
		case "structured-chat-zero-shot-react-description": {
			const { agentArgs, memory, tags,...rest } = options;
			const executor = require_executor.AgentExecutor.fromAgentAndTools({
				tags: [...tags ?? [], "structured-chat-zero-shot-react-description"],
				agent: require_index$3.StructuredChatAgent.fromLLMAndTools(llm, tools, agentArgs),
				tools,
				memory,
				...rest
			});
			return executor;
		}
		case "openai-functions": {
			const { agentArgs, memory, tags,...rest } = options;
			const executor = require_executor.AgentExecutor.fromAgentAndTools({
				tags: [...tags ?? [], "openai-functions"],
				agent: require_index$4.OpenAIAgent.fromLLMAndTools(llm, tools, agentArgs),
				tools,
				memory: memory ?? new require_buffer_memory.BufferMemory({
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
exports.initializeAgentExecutor = initializeAgentExecutor;
exports.initializeAgentExecutorWithOptions = initializeAgentExecutorWithOptions;
//# sourceMappingURL=initialize.cjs.map