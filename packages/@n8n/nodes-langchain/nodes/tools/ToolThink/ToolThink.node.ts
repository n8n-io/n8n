/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { DynamicTool } from 'langchain/tools';
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

const thinkingTool = new DynamicTool({
	name: 'thinking_tool',
	description:
		'Use the tool to think about something. It will not obtain new information or change the database, but just append the thought to the log. Use it when complex reasoning or some cache memory is needed.',
	func: async (subject: string) => {
		return subject;
	},
});

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
			response: logWrapper(thinkingTool, this),
		};
	}
}
