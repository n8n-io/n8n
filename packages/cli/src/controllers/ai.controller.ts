import { Post, RestController } from '@/decorators';
import { AIRequest } from '@/requests';
import { AIService } from '@/services/ai.service';
import { NodeTypes } from '@/NodeTypes';
import { FailedDependencyError } from '@/errors/response-errors/failed-dependency.error';
import express from 'express';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatMessageHistory } from 'langchain/stores/message/in_memory';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
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
		}),
	),
});

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
		const { sessionId, text } = req.body;

		let chatMessageHistory = memorySessions.get(sessionId);
		if (!chatMessageHistory) {
			chatMessageHistory = new ChatMessageHistory();
			memorySessions.set(sessionId, chatMessageHistory);

			await chatMessageHistory.addMessage(
				new SystemMessage(
					"You're an assistant n8n expert assistant. Your role is to help users with n8n-related questions. You can answer questions, provide suggestions, and help users troubleshoot issues. You can also ask questions to gather more information. Please provide a concise a helpful suggestions without going too much into detail. Always provide at least 3 suggestions!",
				),
			);
		}

		const model = new ChatOpenAI({
			temperature: 0.3,
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
			['human', '{question}'],
		]);

		const chain = prompt.pipe(modelWithOutputParser).pipe(outputParser);

		const chainWithHistory = new RunnableWithMessageHistory({
			runnable: chain,
			getMessageHistory: async () => chatMessageHistory,
			inputMessagesKey: 'question',
			historyMessagesKey: 'history',
		});
		await chatMessageHistory.addMessage(new HumanMessage(text));

		const chainStream = await chainWithHistory.stream(
			{ question: text },
			{ configurable: { sessionId } },
		);

		try {
			for await (const output of chainStream) {
				// console.log('🚀 ~ AIController ~ forawait ~ output:', output);
				res.write(JSON.stringify(output) + '\n');
			}
			console.log('Final messages: ', chatMessageHistory.getMessages());
			// res.end('__END__');
		} catch (error) {
			console.error('Error during streaming:', error);
			res.end(JSON.stringify({ error: 'An error occurred during streaming' }) + '\n');
		}

		// Handle client closing the connection
		req.on('close', () => {
			res.end();
		});
	}
}
