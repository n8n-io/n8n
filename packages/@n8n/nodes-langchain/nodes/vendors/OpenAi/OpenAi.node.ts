import {
	type IVersionedNodeType,
	VersionedNodeType,
	type INodeTypeBaseDescription,
} from 'n8n-workflow';

import { prettifyOperation } from './helpers/description';
import { OpenAiV1 } from './v1/OpenAiV1.node';
import { OpenAiV2 } from './v2/OpenAiV2.node';

export class OpenAi extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'OpenAI',
			name: 'openAi',
			icon: { light: 'file:openAi.svg', dark: 'file:openAi.dark.svg' },
			group: ['transform'],
			defaultVersion: 2.1,
			subtitle: `={{(${prettifyOperation})($parameter.resource, $parameter.operation)}}`,
			description: 'Message an assistant or GPT, analyze images, generate audio, etc.',
			codex: {
				alias: [
					'LangChain',
					'ChatGPT',
					'Sora',
					'DallE',
					'whisper',
					'audio',
					'transcribe',
					'tts',
					'assistant',
				],
				categories: ['AI'],
				subcategories: {
					AI: ['Agents', 'Miscellaneous', 'Root Nodes'],
				},
				resources: {
					primaryDocumentation: [
						{
							url: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-langchain.openai/',
						},
					],
				},
			},
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new OpenAiV1(baseDescription),
			1.1: new OpenAiV1(baseDescription),
			1.2: new OpenAiV1(baseDescription),
			1.3: new OpenAiV1(baseDescription),
			1.4: new OpenAiV1(baseDescription),
			1.5: new OpenAiV1(baseDescription),
			1.6: new OpenAiV1(baseDescription),
			1.7: new OpenAiV1(baseDescription),
			1.8: new OpenAiV1(baseDescription),
			2: new OpenAiV2(baseDescription),
			2.1: new OpenAiV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
