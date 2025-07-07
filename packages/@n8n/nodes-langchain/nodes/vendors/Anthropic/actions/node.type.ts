import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	text: 'message';
	image: 'analyze';
	document: 'analyze';
	file: 'upload' | 'delete' | 'get' | 'list';
};

export type AnthropicType = AllEntities<NodeMap>;
