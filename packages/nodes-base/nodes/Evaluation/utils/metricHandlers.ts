import {
	ChatPromptTemplate,
	SystemMessagePromptTemplate,
	HumanMessagePromptTemplate,
} from '@langchain/core/prompts';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { distance } from 'fastest-levenshtein';
import { NodeOperationError, nodeNameToToolName } from 'n8n-workflow';
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
		const expectedToolsParam = this.getNodeParameter('expectedTools', i, '');
		const expectedToolsString = (expectedToolsParam as string)?.trim() || '';
		const expectedTools: string[] = expectedToolsString
			? expectedToolsString
					.split(',')
					.map((tool) => tool.trim())
					.filter((tool) => tool !== '')
			: [];

		const intermediateSteps = this.getNodeParameter('intermediateSteps', i, {}) as Array<{
			action: { tool: string };
		}>;

		if (!expectedTools || expectedTools.length === 0) {
			throw new NodeOperationError(this.getNode(), 'Expected tool name missing', {
				description:
					'Make sure you add at least one expected tool name (comma-separated if multiple)',
			});
		}
		if (!intermediateSteps || !Array.isArray(intermediateSteps)) {
			throw new NodeOperationError(this.getNode(), 'Intermediate steps missing', {
				description:
					"Make sure to enable returning intermediate steps in your agent node's options, then map them in here",
			});
		}

		// Convert user-entered tool names to the format used in intermediate steps (case-insensitive)
		const normalizedExpectedTools = expectedTools.map((tool) =>
			nodeNameToToolName(tool).toLowerCase(),
		);

		// Calculate individual tool usage (1 if used, 0 if not used)
		const toolUsageScores = normalizedExpectedTools.map((normalizedTool) => {
			return intermediateSteps.some((step) => {
				// Handle malformed intermediate steps gracefully
				if (!step || !step.action || typeof step.action.tool !== 'string') {
					return false;
				}
				return step.action.tool.toLowerCase() === normalizedTool;
			})
				? 1
				: 0;
		});

		// Calculate the average of all tool usage scores
		const averageScore =
			toolUsageScores.reduce((sum: number, score: number) => sum + score, 0) /
			toolUsageScores.length;

		const metricName = this.getNodeParameter('options.metricName', i, 'Tools Used') as string;

		return {
			[metricName]: averageScore,
		};
	},

	async categorization(this: IExecuteFunctions, i: number): Promise<IDataObject> {
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

		const metricName = this.getNodeParameter('options.metricName', i, 'Categorization') as string;

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

		const metricName = this.getNodeParameter(
			'options.metricName',
			i,
			'String similarity',
		) as string;

		const editDistance = distance(expectedAnswer, actualAnswer);
		const longerStringLength = Math.max(expectedAnswer.length, actualAnswer.length);
		const similarity = longerStringLength === 0 ? 1 : 1 - editDistance / longerStringLength;

		return {
			[metricName]: similarity,
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

		// Create LangChain prompt templates
		const systemMessageTemplate = SystemMessagePromptTemplate.fromTemplate('{systemPrompt}');
		const humanMessageTemplate = HumanMessagePromptTemplate.fromTemplate(inputPromptTemplate);

		// Create the chat prompt template
		const chatPrompt = ChatPromptTemplate.fromMessages([
			systemMessageTemplate,
			humanMessageTemplate,
		]);

		// Create chain with structured output
		if (!llm.withStructuredOutput) {
			throw new NodeOperationError(
				this.getNode(),
				'Language model does not support structured output',
				{
					description:
						'The connected language model does not support structured output. Please use a compatible model.',
				},
			);
		}
		const chain = chatPrompt.pipe(llm.withStructuredOutput(responseSchema));

		try {
			const response = await chain.invoke({
				systemPrompt,
				user_query: userQuery,
				actual_answer: actualAnswer,
			});

			const metricName = this.getNodeParameter('options.metricName', i, 'Helpfulness') as string;

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

		// Create LangChain prompt templates
		const systemMessageTemplate = SystemMessagePromptTemplate.fromTemplate('{systemPrompt}');
		const humanMessageTemplate = HumanMessagePromptTemplate.fromTemplate(inputPromptTemplate);

		// Create the chat prompt template
		const chatPrompt = ChatPromptTemplate.fromMessages([
			systemMessageTemplate,
			humanMessageTemplate,
		]);

		// Create chain with structured output
		if (!llm.withStructuredOutput) {
			throw new NodeOperationError(
				this.getNode(),
				'Language model does not support structured output',
				{
					description:
						'The connected language model does not support structured output. Please use a compatible model.',
				},
			);
		}
		const chain = chatPrompt.pipe(llm.withStructuredOutput(responseSchema));

		try {
			const response = await chain.invoke({
				systemPrompt,
				actual_answer: actualAnswer,
				expected_answer: expectedAnswer,
			});

			const metricName = this.getNodeParameter('options.metricName', i, 'Correctness') as string;

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
