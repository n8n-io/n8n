import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	text: 'message';
	image: 'analyze';
};

export type MoonshotType = AllEntities<NodeMap>;
