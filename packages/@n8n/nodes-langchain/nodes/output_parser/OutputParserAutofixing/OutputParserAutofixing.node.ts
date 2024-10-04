/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { Callbacks } from '@langchain/core/callbacks/manager';
import type { BaseLanguageModel } from '@langchain/core/language_models/base';
import type { AIMessage } from '@langchain/core/messages';
import { BaseOutputParser } from '@langchain/core/output_parsers';
import {
	IDataObject,
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';

import { NAIVE_FIX_PROMPT } from './prompt';
import { logWrapper } from '../../../utils/logWrapper';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';
import { logAiEvent } from '../../../utils/helpers';

class N8nOutputFixingParser extends BaseOutputParser {
	private context: IExecuteFunctions;

	private model: BaseLanguageModel;

	private outputParser: BaseOutputParser;

	lc_namespace = ['langchain', 'output_parsers', 'fix'];

	constructor(
		context: IExecuteFunctions,
		model: BaseLanguageModel,
		outputParser: BaseOutputParser,
	) {
		super();
		this.context = context;
		this.model = model;
		this.outputParser = outputParser;
	}

	getRetryChain() {
		return NAIVE_FIX_PROMPT.pipe(this.model);
	}

	async parse(completion: string, callbacks?: Callbacks) {
		console.log('🚀 ~ N8nOutputFixingParser ~ parse ~ completion:', completion);
		try {
			const response = (await this.outputParser.parse(completion, callbacks)) as IDataObject;
			void logAiEvent(this.context, 'ai-output-parsed', { text: completion, response });

			// this.context.addOutputData(NodeConnectionType.AiOutputParser, index, [
			// 	[{ json: { action: 'parse', response } }],
			// ]);

			return response;
		} catch (error) {
			const { index } = this.context.addInputData(NodeConnectionType.AiOutputParser, [
				[{ json: { action: 'parse', text: completion } }],
			]);
			try {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				const result = (await this.getRetryChain().invoke({
					completion,
					error,
					instructions: this.getFormatInstructions(),
				})) as AIMessage;

				const resultText = result.content.toString();
				return await this.outputParser.parse(resultText, callbacks);
			} catch (e) {
				void logAiEvent(this.context, 'ai-output-parsed', {
					text: completion,
					response: e.message ?? e,
				});

				this.context.addOutputData(NodeConnectionType.AiOutputParser, index, e);
				throw e;
			}
		}
	}

	/**
	 * Method to get the format instructions for the parser.
	 * @returns The format instructions for the parser.
	 */
	getFormatInstructions() {
		return this.outputParser.getFormatInstructions();
	}
}

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
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		const model = (await this.getInputConnectionData(
			NodeConnectionType.AiLanguageModel,
			itemIndex,
		)) as BaseLanguageModel;
		const outputParser = (await this.getInputConnectionData(
			NodeConnectionType.AiOutputParser,
			itemIndex,
		)) as BaseOutputParser;

		const parser = new N8nOutputFixingParser(this, model, outputParser);

		return {
			response: logWrapper(parser, this),
		};
	}
}
