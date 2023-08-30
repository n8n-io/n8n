/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';
import { Tool, ToolParams } from 'langchain/tools';
import { logWrapper } from '../../../utils/logWrapper';

export class WolframAlphaTool extends Tool {
  appid: string;

  name = "wolfram_alpha";

  description = `A wrapper around Wolfram Alpha. Useful for when you need to answer questions about Math, Science, Technology, Culture, Society and Everyday Life. Input should be a search query.`;

  constructor(fields: ToolParams & { appid: string }) {
    super(fields);

    this.appid = fields.appid;
  }

  get lc_namespace() {
    return [...super.lc_namespace, "wolframalpha"];
  }

  static lc_name() {
    return "WolframAlphaTool";
  }

  async _call(query: string): Promise<string> {
    const url = `https://www.wolframalpha.com/api/v1/llm-api?appid=${this.appid}&input=${query}`;
    const res = await fetch(url);

    return res.text();
  }
}

export class ToolWolframAlpha implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Wolfram Alpha',
		name: 'toolWolfram Alpha',
		icon: 'file:wolfram-alpha.png',
		group: ['transform'],
		version: 1,
		description: 'Connects to WolframAlpha\'s computational intelligence engine.',
		defaults: {
			name: 'Wolfram Alpha',
			// eslint-disable-next-line n8n-nodes-base/node-class-description-non-core-color-present
			color: '#400080',
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

		// const itemIndex = 0;

		// const options = this.getNodeParameter('options', itemIndex) as object;
		return {
			response: logWrapper(new WolframAlphaTool({ appid: credentials.appId as string}), this),
		};
	}
}
