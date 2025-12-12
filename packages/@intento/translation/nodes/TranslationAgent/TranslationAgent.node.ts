import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { TranslationAgentV1 } from './v1/TranslationAgentV1.node';

export class TranslationAgent extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Translation Agent',
			name: 'translationAgent',
			group: ['transform'],
			description: 'Use Intento Translation Agent to translate text via NMT and LLM providers.',
			icon: {
				dark: 'file:translate_white.svg',
				light: 'file:translate_blue.svg',
			},
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new TranslationAgentV1(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
