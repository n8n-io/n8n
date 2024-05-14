import { Post, RestController } from '@/decorators';
import { AIRequest } from '@/requests';
import { AIService } from '@/services/ai.service';
import { NodeTypes } from '@/NodeTypes';
import { FailedDependencyError } from '@/errors/response-errors/failed-dependency.error';
import express, { response } from 'express';
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
import { AIMessage, HumanMessage } from '@langchain/core/messages';

const memorySessions = new Map<string, ChatMessageHistory>();

const errorSuggestionSchema = z.object({
	suggestion: z.object({
		title: z.string().describe('The title of the suggestion'),
		description: z.string().describe('Concise description of the suggestion'),
		// followUpQuestion: z.string().describe('The follow-up question to be asked to the user'),
		// followUpAction: z.string().describe('The follow-up action to be taken by the user'),
		codeDiff: z
			.string()
			.optional()
			.describe(`Return edits similar to unified diffs that 'diff -U0' would produce.`),
	}),
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

	@Post('/debug-chat/apply-code-suggestion', { skipAuth: true })
	async applyCodeSuggestion(req: AIRequest.DebugChat, res: express.Response) {
		const { sessionId } = req.body;

		const model = new ChatOpenAI({
			temperature: 0.1,
			openAIApiKey: process.env.N8N_AI_OPENAI_API_KEY,
			modelName: 'gpt-4-turbo',
		});

		const modelWithOutputParser = model.bind({
			functions: [
				{
					name: 'output_formatter',
					description: 'Should always be used to properly format output',
					parameters: zodToJsonSchema(
						z.object({
							codeSnippet: z.string().describe('The code with the diff applied'),
						}),
					),
				},
			],
			function_call: { name: 'output_formatter' },
		});

		const outputParser = new JsonOutputFunctionsParser();

		let chatMessageHistory = memorySessions.get(sessionId);

		let isFollowUpQuestion = false;

		if (!chatMessageHistory) {
			chatMessageHistory = new ChatMessageHistory();
			memorySessions.set(sessionId, chatMessageHistory);
		} else {
			isFollowUpQuestion = true;
		}

		let chainStream;

		// messages.inputVariables;

		const prompt = ChatPromptTemplate.fromMessages([
			new MessagesPlaceholder('history'),
			[
				'human',
				'You are diligent and tireless! You NEVER leave comments describing code without implementing it! You always COMPLETELY IMPLEMENT the needed code!',
			],
			['human', 'Apply the diff to the original code'],
		]);

		await chatMessageHistory.addMessage(new HumanMessage('Apply the diff to the original code'));

		const chain = prompt.pipe(modelWithOutputParser).pipe(outputParser);

		const chainWithHistory = new RunnableWithMessageHistory({
			runnable: chain,
			getMessageHistory: async () => chatMessageHistory,
			inputMessagesKey: 'question',
			historyMessagesKey: 'history',
		});

		const response = await chainWithHistory.invoke({}, { configurable: { sessionId } });

		return response;
	}

	@Post('/debug-chat', { skipAuth: true })
	async debugChat(req: AIRequest.DebugChat, res: express.Response) {
		const { sessionId, text, schemas, nodes, parameters, error } = req.body;

		const model = new ChatOpenAI({
			temperature: 0,
			openAIApiKey: process.env.N8N_AI_OPENAI_API_KEY,
			modelName: 'gpt-4-turbo',
			streaming: true,
		});

		const modelWithOutputParser = model.bind({
			functions: [
				{
					name: 'output_formatter',
					description: 'Should always be used to properly format output',
					parameters: zodToJsonSchema(errorSuggestionSchema),
				},
			],
			function_call: { name: 'output_formatter' },
		});

		const outputParser = new JsonOutputFunctionsParser();

		let chatMessageHistory = memorySessions.get(sessionId);

		let isFollowUpQuestion = false;

		if (!chatMessageHistory) {
			chatMessageHistory = new ChatMessageHistory();
			memorySessions.set(sessionId, chatMessageHistory);
		} else {
			isFollowUpQuestion = true;
		}

		let chainStream;

		if (!isFollowUpQuestion) {
			const systemMessage = SystemMessagePromptTemplate.fromTemplate(`

			You're an assistant n8n expert assistant. Your role is to help users fix issues with coding in the n8n code node.

			Provide ONE suggestion. The suggestion should include a title, description, and code diff between the original code and the suggested code solution by you. If the suggestion is related to the wrong run mode, do not provide a code diff.

			## Code diff rules

			Return unified diffs that 'diff -U0' (Linux utility) would produce.

			Indentation matters in the diffs!

			Think carefully and make sure you include and mark all lines that need to be removed or changed as '-' lines.
			Make sure you mark all new or modified lines with '+'.

			Do not include in the code diff code that did not change

			Start a new hunk for each section of the suggested code that needs changes.

			### Context about how the code node in n8n works.

			The code node uses $now and $today to work with dates. Both methods are wrapper around the Luxon library

			$now:	A Luxon object containing the current timestamp. Equivalent to DateTime.now().

			$today: A Luxon object containing the current timestamp, rounded down to the day.

			The code node does not allow the use of import or require.

			The code node does not allow to make http requests or accessing the file system.

			The code node support two run modes:

			1. runOnceForAllItems: The code in the code node executes once, regardless of how many input items there are. In this mode you can access all input items using "items". in this mode you CAN'T use "item" to access the input data.

			2. runOnceForEachItem: The code in the code node run for every input item. In this mode you can access each input item using "item". In this mode you CAN'T use "items" to access the input data. The output in this mode should be always a single object.


			## Workflow context

			### Run mode: {runMode}

			### Language: {language}

		`);

			const systemMessageFormatted = await systemMessage.format({
				nodes,
				schemas: JSON.stringify(schemas),
				runMode: parameters!.mode,
				language: parameters!.language,
				code: parameters!.jsCode,
			});

			// messages.inputVariables;

			// const messagesToSave = [
			// 	systemMessageFormatted,
			// 	['human','{question} \n\n Error: {error}'],
			// ];

			//cons aja = "1";\n\nreturn { name: "ricardo" };\n, the correct diff should be: ```diff\n- cons aja = "1";\n+ const aja = "1";\n\n```

			const prompt = ChatPromptTemplate.fromMessages([
				systemMessageFormatted,

				['human', '{question} \n\n Error: {error}'],
			]);

			await chatMessageHistory.addMessage(systemMessageFormatted);
			await chatMessageHistory.addMessage(
				new HumanMessage(
					`Please suggest solutions for the error below: \n\n Error: ${JSON.stringify(error)}`,
				),
			);

			const chain = prompt.pipe(modelWithOutputParser).pipe(outputParser);

			const chainWithHistory = new RunnableWithMessageHistory({
				runnable: chain,
				getMessageHistory: async () => chatMessageHistory,
				inputMessagesKey: 'question',
				historyMessagesKey: 'history',
			});

			// const humanMessage = await HumanMessagePromptTemplate.fromTemplate(
			// 	`'{question} \n\n Error: {error}`,
			// ).format({
			// 	question: text ?? 'Please suggest solutions for the error below',
			// 	error: JSON.stringify(error),
			// });

			// await chatMessageHistory.addMessage(humanMessage);

			chainStream = await chainWithHistory.stream(
				{
					question:
						'Please suggest solutions for the error below and analyze the code to make sure there are not other errors',
					error: JSON.stringify(error),
				},
				{ configurable: { sessionId } },
			);
		} else {
			// messages.inputVariables;

			const prompt = ChatPromptTemplate.fromMessages([
				new MessagesPlaceholder('history'),
				['human', '{question}'],
			]);

			await chatMessageHistory.addMessage(new HumanMessage(`${text}`));

			const chain = prompt.pipe(modelWithOutputParser).pipe(outputParser);

			const chainWithHistory = new RunnableWithMessageHistory({
				runnable: chain,
				getMessageHistory: async () => chatMessageHistory,
				inputMessagesKey: 'question',
				historyMessagesKey: 'history',
			});

			chainStream = await chainWithHistory.stream(
				{
					question: error?.text ?? '',
				},
				{ configurable: { sessionId } },
			);
		}

		let data = '';
		try {
			for await (const output of chainStream) {
				// console.log('🚀 ~ AIController ~ forawait ~ output:', output);
				data = JSON.stringify(output) + '\n';
				res.write(data);
			}
			await chatMessageHistory.addMessage(new AIMessage(JSON.stringify(data)));
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
