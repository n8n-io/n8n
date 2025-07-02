import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	text: 'message';
	image: 'analyze' | 'generate';
	video: 'analyze' | 'generate';
	audio: 'transcribe' | 'analyze';
	document: 'analyze';
	file: 'upload';
};

export type GoogleGeminiType = AllEntities<NodeMap>;
