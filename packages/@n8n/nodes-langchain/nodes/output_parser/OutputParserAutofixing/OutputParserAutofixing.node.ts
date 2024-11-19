import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import { PromptTemplate } from '@langchain/core/prompts';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import type {
	ISupplyDataFunctions,
	INodeType,
	INodeTypeDescription,
	SupplyData,
} from 'n8n-workflow';

import { NAIVE_FIX_PROMPT } from './prompt';
import {
	N8nOutputFixingParser,
	type N8nStructuredOutputParser,
} from '../../../utils/output_parsers/N8nOutputParser';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';

export class OutputParserAutofixing implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Auto-fixing Output Parser',
		name: 'outputParserAutofixing',
		icon: 'fa:tools',
		group: ['transform'],
		version: 1,
		description: 'Automatically fix the output if it is not in the correct format',
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
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			{
				displayName: 'Model',
				maxConnections: 1,
				type: NodeConnectionType.AiLanguageModel,
				required: true,
			},
			{
				displayName: 'Output Parser',
				maxConnections: 1,
				required: true,
				type: NodeConnectionType.AiOutputParser,
			},
		],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiOutputParser],
		outputNames: ['Output Parser'],
		properties: [
			{
				displayName:
					'This node wraps another output parser. If the first one fails it calls an LLM to fix the format',
				name: 'info',
				type: 'notice',
				default: '',
			},
			getConnectionHintNoticeField([NodeConnectionType.AiChain, NodeConnectionType.AiAgent]),
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
			NodeConnectionType.AiLanguageModel,
			itemIndex,
		)) as BaseLanguageModel;
		const outputParser = (await this.getInputConnectionData(
			NodeConnectionType.AiOutputParser,
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
