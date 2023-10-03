/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '../../../utils/logWrapper';
import { N8nJsonLoader } from '../../../utils/N8nJsonLoader';

export class DocumentJsonInputLoader implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'JSON Input Loader',
		name: 'documentJsonInputLoader',
		icon: 'file:json.svg',
		group: ['transform'],
		version: 1,
		description: 'Use JSON data from a previous step in the workflow',
		defaults: {
			name: 'JSON Input Loader',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Document Loaders'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.documentjsoninputloader/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			{
				displayName: 'Text Splitter',
				maxConnections: 1,
				type: NodeConnectionType.AiTextSplitter,
			},
		],
		inputNames: ['Text Splitter'],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiDocument],
		outputNames: ['Document'],
		properties: [
			{
				displayName: 'Data Path',
				name: 'pointers',
				type: 'string',
				default: '',
				// We can't use `requiresDataPath: 'single'` because this is config node so we disable expression for this field
				noDataExpression: true,
				description:
					'Name of the field to set the value of. Supports dot-notation. Example: data.person[0].name',
			},
		],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		this.logger.verbose('Supply Data for JSON Input Loader');
		const processor = new N8nJsonLoader(this);

		return {
			response: logWrapper(processor, this),
		};
	}
}
