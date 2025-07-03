import {
	ChatPromptTemplate,
	SystemMessagePromptTemplate,
	HumanMessagePromptTemplate,
} from '@langchain/core/prompts';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { distance } from 'fastest-levenshtein';
import { StructuredOutputParser } from 'langchain/output_parsers';
import { NodeOperationError } from 'n8n-workflow';
import type {
	FieldType,
	AssignmentCollectionValue,
	IDataObject,
	IExecuteFunctions,
} from 'n8n-workflow';
import { z } from 'zod';

import { validateEntry } from '../../Set/v2/helpers/utils';
import {
	CORRECTNESS_PROMPT,
	CORRECTNESS_INPUT_PROMPT,
	HELPFULNESS_PROMPT,
	HELPFULNESS_INPUT_PROMPT,
} from '../Evaluation/CannedMetricPrompts.ee';

export const metricHandlers = {
	async customMetrics(this: IExecuteFunctions, i: number): Promise<IDataObject> {
		const dataToSave = this.getNodeParameter('metrics', i, {}) as AssignmentCollectionValue;

		return Object.fromEntries(
			(dataToSave?.assignments ?? []).map((assignment) => {
				const assignmentValue =
					typeof assignment.value === 'number' ? assignment.value : Number(assignment.value);

				if (isNaN(assignmentValue)) {
					throw new NodeOperationError(
						this.getNode(),
						`Value for '${assignment.name}' isn't a number`,
						{
							description: `It's currently '${assignment.value}'. Metrics must be numeric.`,
						},
					);
				}

				if (!assignment.name || isNaN(assignmentValue)) {
					throw new NodeOperationError(this.getNode(), 'Metric name missing', {
						description: 'Make sure each metric you define has a name',
					});
				}

				const { name, value } = validateEntry(
					assignment.name,
					assignment.type as FieldType,
					assignmentValue,
					this.getNode(),
					i,
					false,
					1,
				);

				return [name, value];
			}),
		);
	},

	async toolsUsed(this: IExecuteFunctions, i: number): Promise<IDataObject> {
		const expectedTools: string[] = (
			this.getNodeParameter('expectedTools', i, {}) as { tools: Array<{ tool: string }> }
		)?.tools?.map((t) => t?.tool);

		const intermediateSteps = this.getNodeParameter('intermediateSteps', i, {}) as Array<{
			action: { tool: string };
		}>;

		if (!expectedTools || expectedTools.find((t) => t.trim() === '')?.length > 0) {
			throw new NodeOperationError(this.getNode(), 'Expected tool name missing', {
				description:
					'Make sure you add at least one expected tool and fill in the name for each expected tool',
			});
		}
		// TODO add proper check for intermediate steps!

		return Object.fromEntries(
			expectedTools.map((tool) => {
				return [
					`${tool} used`,
					intermediateSteps.filter((step) => step.action.tool === tool)?.length >= 1 ? 1 : 0,
				];
			}),
		);
	},

	async accuracy(this: IExecuteFunctions, i: number): Promise<IDataObject> {
		const expectedAnswer = (this.getNodeParameter('expectedAnswer', i, '') as string)
			.toString()
			.trim();
		const actualAnswer = (this.getNodeParameter('actualAnswer', i, '') as string).toString().trim();

		if (!expectedAnswer) {
			throw new NodeOperationError(this.getNode(), 'Expected answer is missing', {
				description: 'Make sure to fill in an expected answer',
			});
		}
		if (!actualAnswer) {
			throw new NodeOperationError(this.getNode(), 'Actual answer is missing', {
				description: 'Make sure to fill in an actual answer',
			});
		}

		const metricName = this.getNodeParameter('metricName', i, 'Accuracy') as string;

		return {
			[metricName]: expectedAnswer === actualAnswer ? 1 : 0,
		};
	},

	async stringSimilarity(this: IExecuteFunctions, i: number): Promise<IDataObject> {
		const expectedAnswer = (this.getNodeParameter('expectedAnswer', i, '') as string)
			.toString()
			.trim();
		const actualAnswer = (this.getNodeParameter('actualAnswer', i, '') as string).toString().trim();

		if (!expectedAnswer) {
			throw new NodeOperationError(this.getNode(), 'Expected answer is missing', {
				description: 'Make sure to fill in an expected answer',
			});
		}
		if (!actualAnswer) {
			throw new NodeOperationError(this.getNode(), 'Actual answer is missing', {
				description: 'Make sure to fill in an actual answer',
			});
		}

		const metricName = this.getNodeParameter('metricName', i, 'String similarity') as string;

		return {
			[metricName]: distance(expectedAnswer, actualAnswer),
		};
	},

	async helpfulness(this: IExecuteFunctions, i: number): Promise<IDataObject> {
		const userQuery = (this.getNodeParameter('userQuery', i, '') as string).toString().trim();
		const actualAnswer = (this.getNodeParameter('actualAnswer', i, '') as string).toString().trim();

		if (!userQuery) {
			throw new NodeOperationError(this.getNode(), 'User query is missing', {
				description: 'Make sure to fill in the user query in the User Query field',
			});
		}
		if (!actualAnswer) {
			throw new NodeOperationError(this.getNode(), 'Response is missing', {
				description: 'Make sure to fill in the response to evaluate in the Response field',
			});
		}

		// Get the connected LLM model
		const llm = (await this.getInputConnectionData('ai_languageModel', 0)) as BaseLanguageModel;

		if (!llm) {
			throw new NodeOperationError(this.getNode(), 'No language model connected', {
				description: 'Connect a language model to the Model input to use the helpfulness metric',
			});
		}

		// Get the system prompt and input prompt template, using defaults if not provided
		const systemPrompt = this.getNodeParameter('prompt', i, HELPFULNESS_PROMPT) as string;
		const inputPromptTemplate = this.getNodeParameter(
			'options.inputPrompt',
			i,
			HELPFULNESS_INPUT_PROMPT[0],
		) as string;

		// Define the expected response schema
		const responseSchema = z.object({
			extended_reasoning: z
				.string()
				.describe('detailed step-by-step analysis of the response helpfulness'),
			reasoning_summary: z.string().describe('one sentence summary of the response helpfulness'),
			score: z
				.number()
				.int()
				.min(1)
				.max(5)
				.describe('integer from 1 to 5 representing the helpfulness score'),
		});

		// Create structured output parser
		const parser = StructuredOutputParser.fromZodSchema(responseSchema);

		// Create LangChain prompt templates with format instructions
		const formatInstructions = parser.getFormatInstructions();
		const systemMessageTemplate = SystemMessagePromptTemplate.fromTemplate(
			'{systemPrompt}\n\n{format_instructions}',
		);
		const humanMessageTemplate = HumanMessagePromptTemplate.fromTemplate(inputPromptTemplate);

		// Create the chat prompt template
		const chatPrompt = ChatPromptTemplate.fromMessages([
			systemMessageTemplate,
			humanMessageTemplate,
		]);

		// Create and execute the chain
		const chain = chatPrompt.pipe(llm).pipe(parser);

		try {
			const response = await chain.invoke({
				systemPrompt,
				user_query: userQuery,
				actual_answer: actualAnswer,
				format_instructions: formatInstructions,
			});

			const metricName = this.getNodeParameter('metricName', i, 'Helpfulness') as string;

			// Return the score as the main metric
			return {
				[metricName]: response.score,
			};
		} catch (error) {
			throw new NodeOperationError(this.getNode(), 'Failed to evaluate helpfulness', {
				description: `Error from language model: ${error instanceof Error ? error.message : String(error)}`,
			});
		}
	},

	async correctness(this: IExecuteFunctions, i: number): Promise<IDataObject> {
		const expectedAnswer = (this.getNodeParameter('expectedAnswer', i, '') as string)
			.toString()
			.trim();
		const actualAnswer = (this.getNodeParameter('actualAnswer', i, '') as string).toString().trim();

		if (!expectedAnswer) {
			throw new NodeOperationError(this.getNode(), 'Expected answer is missing', {
				description: 'Make sure to fill in an expected answer',
			});
		}
		if (!actualAnswer) {
			throw new NodeOperationError(this.getNode(), 'Actual answer is missing', {
				description: 'Make sure to fill in an actual answer',
			});
		}

		// Get the connected LLM model
		const llm = (await this.getInputConnectionData('ai_languageModel', 0)) as BaseLanguageModel;

		if (!llm) {
			throw new NodeOperationError(this.getNode(), 'No language model connected', {
				description: 'Connect a language model to the Model input to use the correctness metric',
			});
		}

		// Get the system prompt and input prompt template, using defaults if not provided
		const systemPrompt = this.getNodeParameter('prompt', i, CORRECTNESS_PROMPT) as string;
		const inputPromptTemplate = this.getNodeParameter(
			'options.inputPrompt',
			i,
			CORRECTNESS_INPUT_PROMPT[0],
		) as string;

		// Define the expected response schema
		const responseSchema = z.object({
			extended_reasoning: z
				.string()
				.describe('detailed step-by-step analysis of factual accuracy and similarity'),
			reasoning_summary: z.string().describe('one sentence summary focusing on key differences'),
			score: z
				.number()
				.int()
				.min(1)
				.max(5)
				.describe('integer from 1 to 5 representing the similarity score'),
		});

		// Create structured output parser
		const parser = StructuredOutputParser.fromZodSchema(responseSchema);

		// Create LangChain prompt templates with format instructions
		const formatInstructions = parser.getFormatInstructions();
		const systemMessageTemplate = SystemMessagePromptTemplate.fromTemplate(
			'{systemPrompt}\n\n{format_instructions}',
		);
		const humanMessageTemplate = HumanMessagePromptTemplate.fromTemplate(inputPromptTemplate);

		// Create the chat prompt template
		const chatPrompt = ChatPromptTemplate.fromMessages([
			systemMessageTemplate,
			humanMessageTemplate,
		]);

		// Create and execute the chain
		const chain = chatPrompt.pipe(llm).pipe(parser);

		try {
			const response = await chain.invoke({
				systemPrompt,
				actual_answer: actualAnswer,
				expected_answer: expectedAnswer,
				format_instructions: formatInstructions,
			});

			const metricName = this.getNodeParameter('metricName', i, 'Correctness') as string;

			// Return the score as the main metric
			return {
				[metricName]: response.score,
			};
		} catch (error) {
			throw new NodeOperationError(this.getNode(), 'Failed to evaluate correctness', {
				description: `Error from language model: ${error instanceof Error ? error.message : String(error)}`,
			});
		}
	},
};
