import { Post, RestController } from '@/decorators';
import { AIRequest } from '@/requests';
import { AIService } from '@/services/ai.service';
import { NodeTypes } from '@/NodeTypes';
import { FailedDependencyError } from '@/errors/response-errors/failed-dependency.error';
import express, { response } from 'express';
import { Pinecone } from '@pinecone-database/pinecone';
import { Calculator } from 'langchain/tools/calculator';
import { ChatMessageHistory } from 'langchain/stores/message/in_memory';
import { AgentExecutor, createReactAgent } from 'langchain/agents';
import {
	ChatPromptTemplate,
	MessagesPlaceholder,
	SystemMessagePromptTemplate,
} from '@langchain/core/prompts';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { JsonOutputFunctionsParser } from 'langchain/output_parsers';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { DynamicTool } from '@langchain/core/tools';
import { PineconeStore } from '@langchain/pinecone';
import { DuckDuckGoSearch } from '@langchain/community/tools/duckduckgo_search';
import {
	DEBUG_CONVERSATION_RULES,
	FREE_CHAT_CONVERSATION_RULES,
	REACT_CHAT_PROMPT,
} from '@/aiAssistant/prompts';

const memorySessions = new Map<string, ChatMessageHistory>();

const INTERNET_TOOL_SITES = ['https://community.n8n.io', 'https://blog.n8n.io', 'https://n8n.io'];

const getHumanMessages = (history: string[]) => {
	return history.filter((message, index) => message.startsWith('Human:'));
};

let chatHistory: string[] = [];

const stringifyHistory = (history: string[]) => history.join('\n');

const assistantModel = new ChatOpenAI({
	temperature: 0,
	openAIApiKey: process.env.N8N_AI_OPENAI_API_KEY,
	modelName: 'gpt-4-turbo',
});

const errorSuggestionSchema = z.object({
	suggestion: z.object({
		userQuestionRelatedToTheCurrentContext: z
			.boolean()
			.describe('Weather the question the user did, is related to the current context'),
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
						'Please suggest solutions for the error below and carefully look for other errors in the code. Remember that response should always match the original intent',
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

	@Post('/chat-with-assistant', { skipAuth: true })
	async chatWithAssistant(req: AIRequest.AskAssistant, res: express.Response) {
		const { message, newSession } = req.body;
		const response = await this.askAssistant(message);
		return response;
	}

	async searchDocsVectorStore(question: string) {
		// ----------------- Vector store -----------------
		const pc = new Pinecone({
			apiKey: process.env.N8N_AI_PINECONE_API_KEY ?? '',
		});
		const index = pc.Index('n8n-docs');
		const vectorStore = await PineconeStore.fromExistingIndex(
			new OpenAIEmbeddings({
				openAIApiKey: process.env.N8N_AI_OPENAI_API_KEY,
				modelName: 'text-embedding-3-large',
				dimensions: 3072,
			}),
			{
				pineconeIndex: index,
			},
		);
		// ----------------- Get top chunks matching query -----------------
		const results = await vectorStore.similaritySearch(question, 3);
		console.log('>> 🧰 << GOT THESE DOCUMENTS:');
		let out = '';
		// This will make sure that we don't repeat the same document in the output
		const documents: string[] = [];
		results.forEach((result, i) => {
			if (documents.includes(result.metadata.source)) {
				return;
			}
			documents.push(result.metadata.source);
			console.log('\t📃', result.metadata.source);
			out += `--- N8N DOCUMENTATION DOCUMENT ${i + 1} ---\n${result.pageContent}\n\n`;
		});
		if (results.length === 0) {
		}
		return out;
	}

	async askAssistant(message: string, debug?: boolean) {
		// ----------------- Tools -----------------
		const calculatorTool = new DynamicTool({
			name: 'calculator',
			description:
				'Performs arithmetic operations. Use this tool whenever you need to perform calculations.',
			func: async (input: string) => {
				console.log('>> 🧰 << calculatorTool:', input);
				const calculator = new Calculator();
				return await calculator.invoke(input);
			},
		});

		const n8nInfoTool = new DynamicTool({
			name: 'get_n8n_info',
			description: 'Has access to the most relevant pages from the official n8n documentation.',
			func: async (input: string) => {
				console.log('>> 🧰 << n8nInfoTool:', input);
				return (await this.searchDocsVectorStore(input)).toString();
			},
		});

		const internetSearchTool = new DynamicTool({
			name: 'internet_search',
			description: 'Searches the n8n internet sources for the answer to a question.',
			func: async (input: string) => {
				const searchQuery = `${input} site:${INTERNET_TOOL_SITES.join(' OR site:')}`;
				console.log('>> 🧰 << internetSearchTool:', searchQuery);
				const duckDuckGoSearchTool = new DuckDuckGoSearch({ maxResults: 10 });
				const response = await duckDuckGoSearchTool.invoke(searchQuery);
				try {
					const objectResponse: { link?: string }[] = JSON.parse(response);
					objectResponse.forEach((result) => {
						if (result.link) {
						}
					});
				} catch (error) {
					console.error('Error parsing search results', error);
				}
				console.log('>> 🧰 << duckDuckGoSearchTool:', response);
				return response;
			},
		});

		const tools = [calculatorTool, n8nInfoTool, internetSearchTool];

		const toolNames = tools.map((tool) => tool.name);
		// ----------------- Agent -----------------
		const chatPrompt = ChatPromptTemplate.fromTemplate(REACT_CHAT_PROMPT);
		// Different conversation rules for debug and free-chat modes
		const conversationRules = debug ? DEBUG_CONVERSATION_RULES : FREE_CHAT_CONVERSATION_RULES;
		const humanAskedForSuggestions = getHumanMessages(chatHistory).filter((message) => {
			return (
				message.includes('I need another suggestion') ||
				message.includes('I need more detailed instructions')
			);
		});

		// Hard-stop if human asks for too many suggestions
		if (humanAskedForSuggestions.length >= 3) {
			if (debug) {
				message =
					'I have asked for too many new suggestions. Please follow your conversation rules for this case.';
			}
		} else {
			message += ' Please only give me information from the official n8n sources.';
		}

		assistantModel.bind({
			functions: [
				{
					name: 'output_formatter',
					description: 'Should always be used to properly format output',
					parameters: zodToJsonSchema(
						z.object({
							stepByStepInstruction: z.string().describe('The step-by-step instructions to follow'),
						}),
					),
				},
			],
			function_call: { name: 'output_formatter' },
		});

		const agent = await createReactAgent({
			llm: assistantModel,
			tools,
			prompt: chatPrompt,
		});

		const agentExecutor = new AgentExecutor({
			agent,
			tools,
			returnIntermediateSteps: true,
		});

		console.log('\n>> 🤷 <<', message.trim());
		let _response = '';
		try {
			// TODO: Add streaming & LangSmith tracking
			const result = await agentExecutor.invoke({
				input: message,
				chat_history: stringifyHistory(chatHistory),
				conversation_rules: conversationRules,
				tool_names: toolNames,
			});
			_response = result.output;

			// console.log();
			// console.log('--------------------- 📋 INTERMEDIATE STEPS ------------------------------------');
			// result.intermediateSteps.forEach((step) => {
			// 	console.log('🦾', step.action.toString());
			// 	console.log('🧠', step.observation);
			// });
			// console.log('-----------------------------------------------------------------------------');
			// console.log();
		} catch (error) {
			// TODO: This can be handled by agentExecutor
			_response = error.toString().replace(/Error: Could not parse LLM output: /, '');
		}

		return _response;
	}
}
