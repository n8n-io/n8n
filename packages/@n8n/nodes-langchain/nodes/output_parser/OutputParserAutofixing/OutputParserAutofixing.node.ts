import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { PromptTemplate } from '@langchain/core/prompts';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import type {
	ISupplyDataFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
} from 'n8n-workflow';

import {
	N8nOutputFixingParser,
	type N8nStructuredOutputParser,
} from '@utils/output_parsers/N8nOutputParser';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { NAIVE_FIX_PROMPT } from './prompt';

export class OutputParserAutofixing implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Auto-fixing Output Parser',
		name: 'outputParserAutofixing',
		icon: 'fa:tools',
		iconColor: 'black',
		group: ['transform'],
		version: 1,
		description: 'Deprecated, use structured output parser',
		defaults: {
			name: 'Auto-fixing Output Parser',
		},

		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Output Parsers'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.outputparserautofixing/',
					},
				],
			},
		},

		inputs: [
			{
				displayName: 'Model',
				maxConnections: 1,
				type: NodeConnectionTypes.AiLanguageModel,
				required: true,
			},
			{
				displayName: 'Output Parser',
				maxConnections: 1,
				required: true,
				type: NodeConnectionTypes.AiOutputParser,
			},
		],

		outputs: [NodeConnectionTypes.AiOutputParser],
		outputNames: ['Output Parser'],
		properties: [
			{
				displayName:
					'This node wraps another output parser. If the first one fails it calls an LLM to fix the format',
				name: 'info',
				type: 'notice',
				default: '',
			},
			getConnectionHintNoticeField([NodeConnectionTypes.AiChain, NodeConnectionTypes.AiAgent]),
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Retry Prompt',
						name: 'prompt',
						type: 'string',
						default: NAIVE_FIX_PROMPT,
						typeOptions: {
							rows: 10,
						},
						hint: 'Should include "{error}", "{instructions}", and "{completion}" placeholders',
						description:
							'Prompt template used for fixing the output. Uses placeholders: "{instructions}" for parsing rules, "{completion}" for the failed attempt, and "{error}" for the validation error message.',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const model = (await this.getInputConnectionData(
			NodeConnectionTypes.AiLanguageModel,
			itemIndex,
		)) as BaseLanguageModel;
		const outputParser = (await this.getInputConnectionData(
			NodeConnectionTypes.AiOutputParser,
			itemIndex,
		)) as N8nStructuredOutputParser;
		const prompt = this.getNodeParameter('options.prompt', itemIndex, NAIVE_FIX_PROMPT) as string;

		if (prompt.length === 0 || !prompt.includes('{error}')) {
			throw new NodeOperationError(
				this.getNode(),
				'Auto-fixing parser prompt has to contain {error} placeholder',
			);
		}
		const parser = new N8nOutputFixingParser(
			this,
			model,
			outputParser,
			PromptTemplate.fromTemplate(prompt),
		);

		return {
			response: parser,
		};
	}
}
