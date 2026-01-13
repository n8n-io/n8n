import type { NodeRecommendationDocument } from '../../../types/node-recommendations';
import { RecommendationCategory } from '../../../types/recommendation-category';

export const audioGenerationRecommendation: NodeRecommendationDocument = {
	category: RecommendationCategory.AUDIO_GENERATION,
	version: '1.0.0',
	recommendation: {
		defaultNode: '@n8n/n8n-nodes-langchain.openAi',
		operations: [
			'Generate Audio: Create speech from text using OpenAI TTS',
			'Transcribe a Recording: Convert audio to text using Whisper',
			'Translate a Recording: Transcribe and translate audio to English using Whisper',
		],
		reasoning:
			"OpenAI provides comprehensive audio capabilities: TTS for speech generation, Whisper for transcription and translation. Prefer OpenAI when user doesn't specify a provider.",
		alternatives: [
			{
				trigger: 'ElevenLabs',
				recommendation:
					'Use HTTP Request node with ElevenLabs API for natural-sounding voice generation',
			},
			{
				trigger: 'Gemini or Google',
				recommendation: 'Use Google Gemini for audio transcription capabilities',
			},
		],
	},
};
