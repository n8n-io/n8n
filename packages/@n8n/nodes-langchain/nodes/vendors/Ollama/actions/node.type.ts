import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	text: 'message';
	image: 'analyze';
};

export type OllamaType = AllEntities<NodeMap>;
