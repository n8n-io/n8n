import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	text: 'message';
	image: 'analyze' | 'generate';
	video: 'analyze' | 'generate' | 'download';
	audio: 'transcribe' | 'analyze';
	document: 'analyze';
	file: 'upload';
	fileSearch: 'createStore' | 'deleteStore' | 'listStores' | 'uploadToStore';
};

export type GoogleGeminiType = AllEntities<NodeMap>;
