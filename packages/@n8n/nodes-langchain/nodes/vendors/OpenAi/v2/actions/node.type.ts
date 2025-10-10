import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	audio: 'generate' | 'transcribe' | 'translate';
	file: 'upload' | 'deleteFile' | 'list';
	image: 'generate' | 'analyze';
	text: 'message' | 'classify';
	conversation: 'create' | 'get' | 'update' | 'remove';
	video: 'generate';
};

export type OpenAiType = AllEntities<NodeMap>;
