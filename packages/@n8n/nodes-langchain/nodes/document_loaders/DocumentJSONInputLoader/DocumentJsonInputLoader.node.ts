/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';

import { logWrapper } from '../../../utils/logWrapper';
import { N8nJsonLoader } from '../../../utils/N8nJsonLoader';

export class DocumentJsonInputLoader implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Workflow Input to JSON Document',
		name: 'documentJsonInputLoader',
		icon: 'file:json.svg',
		group: ['transform'],
		version: 1,
		description: 'Converts workflow JSON data to Document object(s)',
		defaults: {
			name: 'Workflow Input to JSON Document',
			// eslint-disable-next-line n8n-nodes-base/node-class-description-non-core-color-present
			color: '#500080',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Document Loaders'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			{
				displayName: 'Text Splitter',
				maxConnections: 1,
				type: 'textSplitter',
			},
		],
		inputNames: ['Text Splitter'],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['document'],
		outputNames: ['Document'],
		properties: [
			{
				displayName: 'Pointers',
				name: 'pointers',
				type: 'string',
				default: '',
				description: 'Pointers to extract from JSON, e.g. "/text" or "/text, /meta/title"',
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
