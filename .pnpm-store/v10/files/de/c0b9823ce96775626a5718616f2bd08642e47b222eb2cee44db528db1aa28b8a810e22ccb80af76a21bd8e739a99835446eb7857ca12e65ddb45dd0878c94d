import { ConversationSummaryBufferMemory } from "../../../memory/summary_buffer.js";
import { initializeAgentExecutorWithOptions } from "../../initialize.js";
import { OpenAIAgentTokenBufferMemory } from "./token_buffer_memory.js";

//#region src/agents/toolkits/conversational_retrieval/openai_functions.ts
/**
* Asynchronous function that creates a conversational retrieval agent
* using a language model, tools, and options. It initializes the buffer
* memory based on the provided options and initializes the AgentExecutor
* with the tools, language model, and memory.
* @param llm Instance of ChatOpenAI used as the language model for the agent.
* @param tools Array of StructuredTool instances used by the agent.
* @param options Optional ConversationalRetrievalAgentOptions to customize the agent.
* @returns A Promise that resolves to an initialized AgentExecutor.
*/
async function createConversationalRetrievalAgent(llm, tools, options) {
	const { rememberIntermediateSteps = true, memoryKey = "chat_history", outputKey = "output", inputKey = "input", prefix, verbose } = options ?? {};
	let memory;
	if (rememberIntermediateSteps) memory = new OpenAIAgentTokenBufferMemory({
		memoryKey,
		llm,
		outputKey,
		inputKey
	});
	else memory = new ConversationSummaryBufferMemory({
		memoryKey,
		llm,
		maxTokenLimit: 12e3,
		returnMessages: true,
		outputKey,
		inputKey
	});
	const executor = await initializeAgentExecutorWithOptions(tools, llm, {
		agentType: "openai-functions",
		memory,
		verbose,
		returnIntermediateSteps: rememberIntermediateSteps,
		agentArgs: { prefix: prefix ?? `Do your best to answer the questions. Feel free to use any tools available to look up relevant information, only if necessary.` }
	});
	return executor;
}

//#endregion
export { createConversationalRetrievalAgent };
//# sourceMappingURL=openai_functions.js.map