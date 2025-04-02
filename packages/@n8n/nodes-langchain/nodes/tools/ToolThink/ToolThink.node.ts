/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { Tool } from '@langchain/core/tools';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

// A thinking tool, see https://www.anthropic.com/engineering/claude-think-tool
interface ThinkToolParams {
	subject: string;
}

class ThinkTool extends Tool {
	static lc_name(): string {
		return 'ThinkTool';
	}

	name = 'think';

	description =
		'Use the tool to think about something. It will not obtain new information or change the database, but just append the thought to the log. Use it when complex reasoning or some cache memory is needed.';

	protected subject: string;

	constructor(params?: ThinkToolParams) {
		super();
		this.subject = params?.subject ?? '';
	}

	async _call(input: string): Promise<string> {
		return input;
	}
}

export class ToolThink implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Think Tool',
		name: 'toolThink',
		icon: 'fa:brain',
		iconColor: 'black',
		group: ['transform'],
		version: 1,
		description: 'Invite the AI agent to do some thinking',
		defaults: {
			name: 'Think',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Tools'],
				Tools: ['Other Tools'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolthink/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionTypes.AiTool],
		outputNames: ['Tool'],
		properties: [getConnectionHintNoticeField([NodeConnectionTypes.AiAgent])],
	};

	async supplyData(this: ISupplyDataFunctions): Promise<SupplyData> {
		return {
			response: logWrapper(new ThinkTool(), this),
		};
	}
}
