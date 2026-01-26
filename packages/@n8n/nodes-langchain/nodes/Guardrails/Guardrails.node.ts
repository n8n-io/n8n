import {
	VersionedNodeType,
	type INodeTypeBaseDescription,
	type IVersionedNodeType,
} from 'n8n-workflow';

import { GuardrailsV1 } from './v1/GuardrailsV1.node';
import { GuardrailsV2 } from './v2/GuardrailsV2.node';

export class Guardrails extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Guardrails',
			name: 'guardrails',
			icon: 'file:guardrails.svg',
			group: ['transform'],
			defaultVersion: 2,
			description:
				'Safeguard AI models from malicious input or prevent them from generating undesirable responses',
			codex: {
				alias: ['LangChain', 'Guardrails', 'PII', 'Secret', 'Injection', 'Sanitize'],
				categories: ['AI'],
				subcategories: {
					AI: ['Agents', 'Miscellaneous', 'Root Nodes'],
				},
				resources: {
					primaryDocumentation: [
						{
							url: 'https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-langchain.guardrails/',
						},
					],
				},
			},
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new GuardrailsV1(baseDescription),
			2: new GuardrailsV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
