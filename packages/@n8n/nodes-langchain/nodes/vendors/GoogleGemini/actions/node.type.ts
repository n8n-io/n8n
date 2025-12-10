import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	text: 'message';
	image: 'analyze' | 'generate';
	video: 'analyze' | 'generate' | 'download';
	audio: 'transcribe' | 'analyze';
	document: 'analyze';
	file: 'createStore' | 'uploadToStore' | 'upload';
};

export type GoogleGeminiType = AllEntities<NodeMap>;
