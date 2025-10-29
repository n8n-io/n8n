import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { ChatPromptTemplate } from '@langchain/core/prompts';
import { RunnableSequence } from '@langchain/core/runnables';
import { type AgentRunnableSequence, createToolCallingAgent } from 'langchain/agents';
import type { BaseChatMemory } from 'langchain/memory';
import type { DynamicStructuredTool, Tool } from 'langchain/tools';

import type { N8nOutputParser } from '@utils/output_parsers/N8nOutputParser';

import { fixEmptyContentMessage, getAgentStepsParser } from '../../common';

/**
 * Creates an agent sequence with the given configuration.
 * The sequence includes the agent, output parser, and fallback logic.
 *
 * @param model - The primary chat model
 * @param tools - Array of tools available to the agent
 * @param prompt - The prompt template
 * @param _options - Additional options (maxIterations, returnIntermediateSteps)
 * @param outputParser - Optional output parser for structured responses
 * @param memory - Optional memory for conversation context
 * @param fallbackModel - Optional fallback model if primary fails
 * @returns AgentRunnableSequence ready for execution
 */
export function createAgentSequence(
	model: BaseChatModel,
	tools: Array<DynamicStructuredTool | Tool>,
	prompt: ChatPromptTemplate,
	_options: { maxIterations?: number; returnIntermediateSteps?: boolean },
	outputParser?: N8nOutputParser,
	memory?: BaseChatMemory,
	fallbackModel?: BaseChatModel | null,
) {
	const agent = createToolCallingAgent({
		llm: model,
		tools,
		prompt,
		streamRunnable: false,
	});

	let fallbackAgent: AgentRunnableSequence | undefined;
	if (fallbackModel) {
		fallbackAgent = createToolCallingAgent({
			llm: fallbackModel,
			tools,
			prompt,
			streamRunnable: false,
		});
	}
	const runnableAgent = RunnableSequence.from([
		fallbackAgent ? agent.withFallbacks([fallbackAgent]) : agent,
		getAgentStepsParser(outputParser, memory),
		fixEmptyContentMessage,
	]) as AgentRunnableSequence;

	runnableAgent.singleAction = true;
	runnableAgent.streamRunnable = false;

	return runnableAgent;
}
