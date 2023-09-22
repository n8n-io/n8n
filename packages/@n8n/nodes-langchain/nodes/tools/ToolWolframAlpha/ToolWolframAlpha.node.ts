/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';
import { WolframAlphaTool } from 'langchain/tools';
import { logWrapper } from '../../../utils/logWrapper';

export class ToolWolframAlpha implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Wolfram Alpha',
		name: 'toolWolframAlpha',
		icon: 'file:wolfram-alpha.svg',
		group: ['transform'],
		version: 1,
		description: "Connects to WolframAlpha's computational intelligence engine.",
		defaults: {
			name: 'Wolfram Alpha',
		},
		credentials: [
			{
				name: 'wolframAlphaApi',
				required: true,
			},
		],
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['tool'],
		outputNames: ['Tool'],
		properties: [],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		const credentials = await this.getCredentials('wolframAlphaApi');

		return {
			response: logWrapper(new WolframAlphaTool({ appid: credentials.appId as string }), this),
		};
	}
}
