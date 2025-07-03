import { distance } from 'fastest-levenshtein';
import { NodeOperationError, UserError } from 'n8n-workflow';
import type {
	FieldType,
	INodeParameters,
	AssignmentCollectionValue,
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
} from 'n8n-workflow';
import { z } from 'zod';
import { StructuredOutputParser } from 'langchain/output_parsers';
import {
	ChatPromptTemplate,
	SystemMessagePromptTemplate,
	HumanMessagePromptTemplate,
} from '@langchain/core/prompts';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';

import { getGoogleSheet, getSheet } from './evaluationTriggerUtils';
import { composeReturnItem, validateEntry } from '../../Set/v2/helpers/utils';
import {
	CORRECTNESS_PROMPT,
	CORRECTNESS_INPUT_PROMPT,
	HELPFULNESS_PROMPT,
	HELPFULNESS_INPUT_PROMPT,
} from '../Evaluation/CannedMetricPrompts.ee';

export async function setOutput(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const evaluationNode = this.getNode();
	const parentNodes = this.getParentNodes(evaluationNode.name);

	const evalTrigger = parentNodes.find((node) => node.type === 'n8n-nodes-base.evaluationTrigger');
	const evalTriggerOutput = evalTrigger
		? this.evaluateExpression(`{{ $('${evalTrigger?.name}').isExecuted }}`, 0)
		: undefined;

	if (!evalTrigger || !evalTriggerOutput) {
		this.addExecutionHints({
			message: "No outputs were set since the execution didn't start from an evaluation trigger",
			location: 'outputPane',
		});
		return [this.getInputData()];
	}

	const outputFields = this.getNodeParameter('outputs.values', 0, []) as Array<{
		outputName: string;
		outputValue: string;
	}>;

	if (outputFields.length === 0) {
		throw new UserError('No outputs to set', {
			description: 'Add outputs to write back to the Google Sheet using the ‘Add Output’ button',
		});
	}

	const googleSheetInstance = getGoogleSheet.call(this);
	const googleSheet = await getSheet.call(this, googleSheetInstance);

	const evaluationTrigger = this.evaluateExpression(
		`{{ $('${evalTrigger.name}').first().json }}`,
		0,
	) as IDataObject;

	const rowNumber =
		evaluationTrigger.row_number === 'row_number' ? 1 : evaluationTrigger.row_number;

	const columnNames = Object.keys(evaluationTrigger).filter(
		(key) => key !== 'row_number' && key !== '_rowsLeft',
	);

	outputFields.forEach(({ outputName }) => {
		if (!columnNames.includes(outputName)) {
			columnNames.push(outputName);
		}
	});

	await googleSheetInstance.updateRows(
		googleSheet.title,
		[columnNames],
		'RAW', // default value for Value Input Mode
		1, // header row
	);

	const outputs = outputFields.reduce((acc, { outputName, outputValue }) => {
		acc[outputName] = outputValue;
		return acc;
	}, {} as IDataObject);

	const preparedData = googleSheetInstance.prepareDataForUpdatingByRowNumber(
		[
			{
				row_number: rowNumber,
				...outputs,
			},
		],
		`${googleSheet.title}!A:Z`,
		[columnNames],
	);

	await googleSheetInstance.batchUpdate(
		preparedData.updateData,
		'RAW', // default value for Value Input Mode
	);

	return [this.getInputData()];
}

const metricHandlers = {
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
							description: `It’s currently '${assignment.value}'. Metrics must be numeric.`,
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

		if (!expectedTools || expectedTools.find((t) => t.trim() === '').length > 0) {
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
					intermediateSteps.filter((step) => step.action.tool === tool).length >= 1 ? 1 : 0,
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
			// First get the raw LLM response
			const response = await chain.invoke({
				systemPrompt,
				actual_answer: actualAnswer,
				expected_answer: expectedAnswer,
				format_instructions: formatInstructions,
			});

			const metricName = this.getNodeParameter('metricName', i, 'Correctness') as string;

			// Return the score as the main metric and include reasoning in the output
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

export async function setMetrics(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const items = this.getInputData();
	const metrics: INodeExecutionData[] = [];

	for (let i = 0; i < items.length; i++) {
		const metric = this.getNodeParameter('metric', i, {}) as keyof typeof metricHandlers;
		if (!metricHandlers.hasOwnProperty(metric)) {
			throw new NodeOperationError(this.getNode(), 'Unknown metric');
		}
		const newData = await metricHandlers[metric].call(this, i);

		const newItem: INodeExecutionData = {
			json: {},
			pairedItem: { item: i },
		};

		const returnItem = composeReturnItem.call(
			this,
			i,
			newItem,
			newData,
			{ dotNotation: false, include: 'none' },
			1,
		);
		metrics.push(returnItem);
	}

	return [metrics];
}

export async function checkIfEvaluating(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
	const evaluationExecutionResult: INodeExecutionData[] = [];
	const normalExecutionResult: INodeExecutionData[] = [];

	const evaluationNode = this.getNode();
	const parentNodes = this.getParentNodes(evaluationNode.name);

	const evalTrigger = parentNodes.find((node) => node.type === 'n8n-nodes-base.evaluationTrigger');
	const evalTriggerOutput = evalTrigger
		? this.evaluateExpression(`{{ $('${evalTrigger?.name}').isExecuted }}`, 0)
		: undefined;

	if (evalTriggerOutput) {
		return [this.getInputData(), normalExecutionResult];
	} else {
		return [evaluationExecutionResult, this.getInputData()];
	}
}

export function setOutputs(parameters: INodeParameters) {
	if (parameters.operation === 'checkIfEvaluating') {
		return [
			{ type: 'main', displayName: 'Evaluation' },
			{ type: 'main', displayName: 'Normal' },
		];
	}

	return [{ type: 'main' }];
}

export function setInputs(parameters: INodeParameters) {
	if (
		parameters.operation === 'setMetrics' &&
		['correctness', 'helpfulness'].includes(parameters.metric as string)
	) {
		return [
			{ type: 'main' },
			{ type: 'ai_languageModel', displayName: 'Model', maxConnections: 1 },
		];
	}

	return [{ type: 'main' }];
}
