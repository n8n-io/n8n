import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	text: 'message';
	image: 'analyze' | 'generate';
	video: 'analyze' | 'generate' | 'download';
	audio: 'transcribe' | 'analyze';
	document: 'analyze';
	file: 'upload';
	cache: 'create' | 'delete' | 'get' | 'list' | 'update';
};

export type GoogleGeminiType = AllEntities<NodeMap>;
