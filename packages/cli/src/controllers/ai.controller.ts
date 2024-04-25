import { Post, RestController } from '@/decorators';
import { AIRequest } from '@/requests';
import { AIService } from '@/services/ai.service';
import { NodeTypes } from '@/NodeTypes';
import { FailedDependencyError } from '@/errors/response-errors/failed-dependency.error';
import express from 'express';
import { ChatMessageHistory } from 'langchain/stores/message/in_memory';
import {
	ChatPromptTemplate,
	MessagesPlaceholder,
	SystemMessagePromptTemplate,
} from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { JsonOutputFunctionsParser } from 'langchain/output_parsers';

const memorySessions = new Map<string, ChatMessageHistory>();

const suggestionTodos = z.array(
	z.object({
		title: z.string(),
		description: z.string(),
	}),
);

const errorSuggestionsSchema = z.object({
	suggestions: z.array(
		z.object({
			title: z.string().describe('The title of the suggestion'),
			description: z.string().describe('Concise description of the suggestion'),
			key: z.string(),
			todos: suggestionTodos,
			followUpQuestion: z.string().describe('The follow-up question to be asked to the user'),
			followUpAction: z.string().describe('The follow-up action to be taken by the user'),
		}),
	),
});

const stringifyAndTrim = (obj: object) => JSON.stringify(obj).trim();

@RestController('/ai')
export class AIController {
	constructor(
		private readonly aiService: AIService,
		private readonly nodeTypes: NodeTypes,
	) {}

	/**
	 * Suggest a solution for a given error using the AI provider.
	 */
	@Post('/debug-error')
	async debugError(req: AIRequest.DebugError): Promise<{ message: string }> {
		const { error } = req.body;

		let nodeType;
		if (error.node?.type) {
			nodeType = this.nodeTypes.getByNameAndVersion(error.node.type, error.node.typeVersion);
		}

		try {
			const message = await this.aiService.debugError(error, nodeType);
			return {
				message,
			};
		} catch (aiServiceError) {
			throw new FailedDependencyError(
				(aiServiceError as Error).message ||
					'Failed to debug error due to an issue with an external dependency. Please try again later.',
			);
		}
	}

	@Post('/debug-chat')
	async debugChat(req: AIRequest.DebugChat, res: express.Response) {
		const { sessionId, text, schemas, nodes, parameters, error } = req.body;

		let chatMessageHistory = memorySessions.get(sessionId);
		if (!chatMessageHistory) {
			chatMessageHistory = new ChatMessageHistory();
			memorySessions.set(sessionId, chatMessageHistory);

			const messages =
				SystemMessagePromptTemplate.fromTemplate(`You're an assistant n8n expert assistant. Your role is to help users with n8n-related questions.
			You can answer questions, provide suggestions, and help users troubleshoot issues. You can also
			ask questions to gather more information. Please provide a concise yet detailed, helpful suggestions. Always provide only one suggestion which is actionable and most relevant for the user. If you know the specific node parameter that might be causing the issue, you can provide a suggestion on how to fix it.
			Make sure to end the suggestion with a follow-up question that should be answered by the user. This question should be in the format of 'Would you like...?'. For example: 'Would you like me to provide more information on this?
			When suggesting fixes to expressions which are referencing other nodes(or input data), carefully check the provided schema, if the node contains the referenced data.
			Also, please provide a short follow-up answer that will be used as user's next step in the conversation.
			It should be in the form: 'Yes, help me ...' and must start with 'Yes, help me'. For example: 'Yes, help me fix this issue'

			## Workflow context

			### Workflow nodes:
				{nodes}

			### All workflow nodes schemas:
				{schemas}

			### Current node parameters:
				{parameters}
			`);

			const formattedMessage = await messages.format({
				nodes,
				schemas: JSON.stringify(schemas),
				parameters: JSON.stringify(parameters),
			});

			await chatMessageHistory.addMessage(formattedMessage);
		}

		const model = new ChatOpenAI({
			temperature: 0.8,
			openAIApiKey: process.env.N8N_AI_OPENAI_API_KEY,
			modelName: 'gpt-4-turbo-2024-04-09',
			streaming: true,
		});

		const modelWithOutputParser = model.bind({
			functions: [
				{
					name: 'output_formatter',
					description: 'Should always be used to properly format output',
					parameters: zodToJsonSchema(errorSuggestionsSchema),
				},
			],
			function_call: { name: 'output_formatter' },
		});

		const outputParser = new JsonOutputFunctionsParser();

		const prompt = ChatPromptTemplate.fromMessages([
			new MessagesPlaceholder('history'),
			['human', '{question} \n\n Error: {error}'],
		]);

		const chain = prompt.pipe(modelWithOutputParser).pipe(outputParser);

		const chainWithHistory = new RunnableWithMessageHistory({
			runnable: chain,
			getMessageHistory: async () => chatMessageHistory,
			inputMessagesKey: 'question',
			historyMessagesKey: 'history',
		});

		const chainStream = await chainWithHistory.stream(
			{
				question: text ?? 'Please suggest solutions for the error below',
				error: JSON.stringify(error),
			},
			{ configurable: { sessionId } },
		);

		try {
			for await (const output of chainStream) {
				// console.log('🚀 ~ AIController ~ forawait ~ output:', output);
				res.write(JSON.stringify(output) + '\n');
			}
			// console.log('Final messages: ', chatMessageHistory.getMessages());
			res.end('__END__');
		} catch (err) {
			console.error('Error during streaming:', err);
			res.end(JSON.stringify({ err: 'An error occurred during streaming' }) + '\n');
		}

		// Handle client closing the connection
		req.on('close', () => {
			res.end();
		});
	}
}
