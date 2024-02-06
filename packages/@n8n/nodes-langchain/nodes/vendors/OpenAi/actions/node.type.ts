import type { AllEntities } from 'n8n-workflow';

type NodeMap = {
	assistant: 'messageAssistant' | 'createAssistant';
	audio: 'generateAudio' | 'transcribeRecording' | 'translateRecording';
	file: 'uploadFile' | 'deleteFile' | 'listFiles';
	image: 'generateImage' | 'analyzeImage';
	text: 'messageModel' | 'createModeration';
};

export type OpenAiType = AllEntities<NodeMap>;
