import type { AgentAction, AgentFinish } from '@langchain/core/agents';
import { BaseMessage, HumanMessage } from '@langchain/core/messages';
import type { BaseMessagePromptTemplateLike } from '@langchain/core/prompts';
import {
	AIMessagePromptTemplate,
	ChatPromptTemplate,
	HumanMessagePromptTemplate,
	PromptTemplate,
	SystemMessagePromptTemplate,
} from '@langchain/core/prompts';
import type { IExecuteFunctions } from 'n8n-workflow';
import { OperationalError } from 'n8n-workflow';

import { isChatInstance } from '@n8n/ai-utilities';
import type { N8nOutputParser } from '@utils/output_parsers/N8nOutputParser';

import { createImageMessage } from './imageUtils';
import type { MessageTemplate, PromptParams } from './types';

/**
 * Creates a basic query template that may include format instructions
 */
function buildQueryTemplate(formatInstructions?: string): PromptTemplate {
	return new PromptTemplate({
		template: `{query}${formatInstructions ? '\n{formatInstructions}' : ''}`,
		inputVariables: ['query'],
		partialVariables: formatInstructions ? { formatInstructions } : undefined,
	});
}

/**
 * Process an array of message templates into LangChain message objects
 */
async function processMessageTemplates({
	context,
	itemIndex,
	messages,
}: {
	context: IExecuteFunctions;
	itemIndex: number;
	messages: MessageTemplate[];
}): Promise<BaseMessagePromptTemplateLike[]> {
	return await Promise.all(
		messages.map(async (message) => {
			// Find the appropriate message class based on type
			const messageClass = [
				SystemMessagePromptTemplate,
				AIMessagePromptTemplate,
				HumanMessagePromptTemplate,
			].find((m) => m.lc_name() === message.type);

			if (!messageClass) {
				throw new OperationalError('Invalid message type', {
					extra: { messageType: message.type },
				});
			}

			// Handle image messages specially for human messages
			if (messageClass === HumanMessagePromptTemplate && message.messageType !== 'text') {
				return await createImageMessage({ context, itemIndex, message });
			}

			// Process text messages
			// Escape curly braces in the message to prevent LangChain from treating them as variables
			return messageClass.fromTemplate(
				(message.message || '').replace(/[{}]/g, (match) => match + match),
			);
		}),
	);
}

/**
 * Finalizes the prompt template by adding or updating the query in the message chain
 */
async function finalizePromptTemplate({
	parsedMessages,
	queryTemplate,
	query,
}: {
	parsedMessages: BaseMessagePromptTemplateLike[];
	queryTemplate: PromptTemplate;
	query?: string;
}): Promise<ChatPromptTemplate> {
	// Check if the last message is a human message with multi-content array
	const lastMessage = parsedMessages[parsedMessages.length - 1];

	if (lastMessage instanceof HumanMessage && Array.isArray(lastMessage.content)) {
		// Add the query to the existing human message content
		const humanMessage = new HumanMessagePromptTemplate(queryTemplate);

		// Format the message with the query and add the content synchronously
		const formattedMessage = await humanMessage.format({ query });

		// Create a new array with the existing content plus the new item
		if (Array.isArray(lastMessage.content)) {
			// Clone the current content array and add the new item
			const updatedContent = [
				...lastMessage.content,
				{
					text: formattedMessage.content.toString(),
					type: 'text',
				},
			];

			// Replace the content with the updated array
			lastMessage.content = updatedContent;
		}
	} else {
		// Otherwise, add a new human message with the query
		parsedMessages.push(new HumanMessagePromptTemplate(queryTemplate));
	}

	return ChatPromptTemplate.fromMessages(parsedMessages);
}

/**
 * Builds the appropriate prompt template based on model type (chat vs completion)
 * and provided messages
 */
export async function createPromptTemplate({
	context,
	itemIndex,
	llm,
	messages,
	formatInstructions,
	query,
}: PromptParams) {
	// Create base query template
	const queryTemplate = buildQueryTemplate(formatInstructions);

	// For non-chat models, just return the query template
	if (!isChatInstance(llm)) {
		return queryTemplate;
	}

	// For chat models, process the messages if provided
	const parsedMessages = messages?.length
		? await processMessageTemplates({ context, itemIndex, messages })
		: [];

	// Add or update the query in the message chain
	return await finalizePromptTemplate({
		parsedMessages,
		queryTemplate,
		query,
	});
}

const isMessage = (message: unknown): message is BaseMessage => {
	return message instanceof BaseMessage;
};

const isAgentFinish = (value: unknown): value is AgentFinish => {
	return typeof value === 'object' && value !== null && 'returnValues' in value;
};

export const getAgentStepsParser =
	(outputParser: N8nOutputParser) =>
	async (
		steps: AgentFinish | BaseMessage | AgentAction[] | string,
	): Promise<string | Record<string, unknown>> => {
		if (typeof steps === 'string') {
			return (await outputParser.parse(steps)) as Record<string, unknown>;
		}

		// Check if the steps contain the 'format_final_json_response' tool invocation.
		if (Array.isArray(steps)) {
			const responseParserTool = steps.find((step) => step.tool === 'format_final_json_response');
			if (responseParserTool) {
				const toolInput = responseParserTool.toolInput;
				// Ensure the tool input is a string
				const parserInput = toolInput instanceof Object ? JSON.stringify(toolInput) : toolInput;
				const parsedOutput = (await outputParser.parse(parserInput)) as Record<string, unknown>;
				return parsedOutput;
			}
		}

		if (typeof steps === 'object' && isMessage(steps)) {
			const output = steps.text;

			const parsedOutput = (await outputParser.parse(output)) as Record<string, unknown>;
			return parsedOutput;
		}

		if (isAgentFinish(steps)) {
			const returnValues = steps.returnValues;
			const parsedOutput = (await outputParser.parse(JSON.stringify(returnValues))) as Record<
				string,
				unknown
			>;
			return parsedOutput;
		}

		throw new Error('Failed to parse agent steps');
	};
