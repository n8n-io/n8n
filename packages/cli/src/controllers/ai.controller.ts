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
			followUpQuestion: z.string().describe('The follow-up question to be asked to the user'),
			followUpAction: z.string().describe('The follow-up action to be taken by the user'),
			codeSnippet: z.string().optional().describe('The code snippet to be provided to the user'),
			userUsingWrongRunMode: z
				.boolean()
				.optional()
				.describe('Whether the user is using the wrong run mode'),
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

		const systemMessage = SystemMessagePromptTemplate.fromTemplate(`

				You're an assistant n8n expert assistant. Your role is to help users fix issues with coding in the n8n code node.

				Provide two suggestions. Each suggestion should include: title, description and a code snippet.

				If the suggestion is related to a wrong run mode, do not provide a code snippet.

				Provide a follow up action responding the follow-up question affirmatively. For example: Yes, I would like to try this solution.

				Make sure to end the suggestion with a follow-up question that should be answered by the user. For example: Would you like to try the solution in the code node?

				The code node uses $now and $today to work with dates. Both methods are wrapper around the Luxon library

				$now:	A Luxon object containing the current timestamp. Equivalent to DateTime.now().

				$today: A Luxon object containing the current timestamp, rounded down to the day.

				The code node does not allow the use of import or require.

				The code node does not allow to make http requests or accessing the file system.

				There are two modes:

				Run Once for All Items: this is the default. When your workflow runs, the code in the code node executes once, regardless of how many input items there are. In this mode you can access all input items using "items"

				Run Once for Each Item: choose this if you want your code to run for every input item. In this mode you can access each input item using "item"

				When mode is Run Once for each item, the code node cannot access the items to reference the input data.

				When suggesting fixes to expressions which are referencing other nodes(or input data), carefully check the provided schema, if the node contains the referenced data.

			## Workflow context

			### Workflow nodes:
				{nodes}

			### All workflow nodes schemas:
				{schemas}

			### Run mode: {runMode}

			### Language: {language}

			### User Provided Code: {code}

			`);

		const systemMessageFormatted = await systemMessage.format({
			nodes,
			schemas: JSON.stringify(schemas),
			runMode: parameters!.runMode,
			language: parameters!.language,
			code: parameters!.code,
		});

		const model = new ChatOpenAI({
			temperature: 0,
			openAIApiKey: process.env.N8N_AI_OPENAI_API_KEY,
			modelName: 'gpt-4',
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

		// messages.inputVariables;

		const prompt = ChatPromptTemplate.fromMessages([
			systemMessageFormatted,
			['human', '{question} \n\n Error: {error}'],
		]);

		const chain = prompt.pipe(modelWithOutputParser).pipe(outputParser);

		// const chainWithHistory = new RunnableWithMessageHistory({
		// 	runnable: chain,
		// 	getMessageHistory: async () => chatMessageHistory,
		// 	inputMessagesKey: 'question',
		// 	historyMessagesKey: 'history',
		// });

		const chainStream = await chain.stream({
			question: text ?? 'Please suggest solutions for the error below',
			error: JSON.stringify(error),
		});

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
