import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	text: 'message' | 'messageVision' | 'json';
	image: 'generate';
	file: 'analyze';
	audio: 'transcribe';
};

export type AiGatewayType = AllEntities<NodeMap>;
