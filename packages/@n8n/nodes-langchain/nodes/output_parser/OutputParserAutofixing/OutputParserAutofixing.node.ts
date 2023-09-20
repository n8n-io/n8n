/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';
import { OutputFixingParser } from 'langchain/output_parsers';
import type { BaseOutputParser } from 'langchain/schema/output_parser';
import type { BaseLanguageModel } from 'langchain/base_language';
import { logWrapper } from '../../../utils/logWrapper';

export class OutputParserAutofixing implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Auto-fixing Output Parser',
		name: 'outputParserAutofixing',
		icon: 'fa:tools',
		group: ['transform'],
		version: 1,
		description: 'Tries to automatically fix fixReturn a list of comma separated values',
		defaults: {
			name: 'Auto-fixing Output Parser',
		},

		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Output Parsers'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			{
				displayName: 'Model',
				maxConnections: 1,
				type: 'languageModel',
				required: true,
			},
			{
				displayName: 'Output Parser',
				maxConnections: 1,
				required: true,
				type: 'outputParser',
			},
		],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['outputParser'],
		outputNames: ['Output Parser'],
		properties: [],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		const model = (await this.getInputConnectionData('languageModel', 0)) as BaseLanguageModel;
		const outputParser = (await this.getInputConnectionData('outputParser', 0)) as BaseOutputParser;

		const parser = OutputFixingParser.fromLLM(model, outputParser);

		return {
			response: logWrapper(parser, this),
		};
	}
}
