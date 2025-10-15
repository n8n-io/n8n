import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import type { Tool } from 'langchain/tools';
import { DynamicStructuredTool } from 'langchain/tools';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { z } from 'zod';

import { GuardrailError, type GuardrailResult, type LLMConfig } from '../actions/types';

export async function getChatModel(this: IExecuteFunctions): Promise<BaseChatModel> {
	const model = await this.getInputConnectionData(NodeConnectionTypes.AiLanguageModel, 0);
	if (Array.isArray(model)) {
		return model[0] as BaseChatModel;
	}
	return model as BaseChatModel;
}

/**
 * Creates an agent executor with the given configuration
 */
function createAgent(
	model: BaseChatModel,
	prompt: ChatPromptTemplate,
	tools: Array<DynamicStructuredTool | Tool>,
) {
	const agent = createToolCallingAgent({
		llm: model,
		tools,
		prompt,
		streamRunnable: false,
	});

	return agent;
}

/**
 * Assemble a complete LLM prompt with instructions and response schema.
 *
 * Incorporates the supplied system prompt and specifies the required JSON response fields.
 *
 * @param systemPrompt - The instructions describing analysis criteria.
 * @returns Formatted prompt string for LLM input.
 */
function buildFullPrompt(systemPrompt: string, toolName: string): string {
	const template = `
${systemPrompt}

Respond with a json object containing:
- "flagged": boolean (true if detected and false otherwise)
- "confidence": float (0.0 to 1.0)

Only respond with the json object and call the ${toolName} tool, nothing else.

**IMPORTANT:**
You must call a ${toolName} with a confidence score reflecting how likely the input is violative of the guardrail:
- 1.0 = Certain violative
- 0.0 = Certain not violative
- Use the full range [0.0 - 1.0] to reflect your level of certainty

Analyze the following text according to the instructions above.
`;
	return template.trim();
}

async function runLLM(
	name: string,
	model: BaseChatModel,
	prompt: string,
	inputText: string,
): Promise<{ confidenceScore: number; flagged: boolean }> {
	let confidenceScore: number | undefined;
	let flagged: boolean | undefined;

	// 1. Create the submitGuardrailResult tool
	const submitGuardrailResultTool = new DynamicStructuredTool({
		name: 'submitGuardrailResult',
		description: 'Submit the guardrail analysis result with confidence score and flagged status',
		schema: z.object({
			confidenceScore: z.number().min(0).max(1).describe('Confidence score between 0.0 and 1.0'),
			flagged: z
				.boolean()
				.describe('Whether the input violates the guardrail (true) or not (false)'),
		}),
		func: async (input) => {
			const { confidenceScore: score, flagged: flag } = input;
			confidenceScore = score;
			flagged = flag;
			return `Analysis complete. Confidence: ${score}, Flagged: ${flag}`;
		},
	});

	// 2. Create agent with tool and full prompt
	const fullPrompt = buildFullPrompt(prompt, 'submitGuardrailResult');
	const chatPrompt = ChatPromptTemplate.fromMessages([
		['system', '{system_message}'],
		['human', '{input}'],
		['placeholder', '{agent_scratchpad}'],
	]);

	if (model.bindTools) {
		model.bindTools([submitGuardrailResultTool]);
	} else {
		throw new Error('Model does not support tools');
	}

	const tools = [submitGuardrailResultTool];
	const agent = createAgent(model, chatPrompt, tools);
	const agentExecutor = new AgentExecutor({ agent, tools });

	// 3. Execute the agent with proper input structure
	try {
		await agentExecutor.invoke({
			steps: [],
			input: inputText,
			system_message: fullPrompt,
		});

		if (confidenceScore !== undefined && flagged !== undefined) {
			return { confidenceScore, flagged };
		} else {
			throw new Error('Agent did not call submitGuardrailResult tool');
		}
	} catch (error) {
		throw new GuardrailError(
			name,
			`Guardrail validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
			error?.description,
		);
	}
}

export async function runLLMValidation(
	name: string,
	model: BaseChatModel,
	prompt: string,
	inputText: string,
	threshold: number,
): Promise<GuardrailResult> {
	try {
		const result = await runLLM(name, model, prompt, inputText);
		const triggered = result.flagged && result.confidenceScore >= threshold;
		return {
			guardrailName: name,
			tripwireTriggered: triggered,
			executionFailed: false,
			confidenceScore: result.confidenceScore,
			info: {},
		};
	} catch (error) {
		return {
			guardrailName: name,
			tripwireTriggered: true,
			executionFailed: true,
			originalException: error as Error,
			info: {},
		};
	}
}

export const createLLMCheckFn = (name: string, { model, prompt, threshold }: LLMConfig) => {
	return async (input: string) => await runLLMValidation(name, model, prompt, input, threshold);
};
