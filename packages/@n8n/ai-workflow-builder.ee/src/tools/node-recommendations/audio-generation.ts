import type { NodeRecommendationDocument } from '@/types/node-recommendations';
import { RecommendationCategory } from '@/types/recommendation-category';

export class AudioGenerationRecommendation implements NodeRecommendationDocument {
	readonly category = RecommendationCategory.AUDIO_GENERATION;
	readonly version = '1.0.0';

	private readonly recommendation = `<category name="audio_generation">
<default_node>@n8n/n8n-nodes-langchain.openAi</default_node>
<display_name>OpenAI</display_name>
<operations>
  <operation name="Generate Audio">Create speech from text using OpenAI TTS</operation>
  <operation name="Transcribe a Recording">Convert audio to text using Whisper</operation>
  <operation name="Translate a Recording">Transcribe and translate audio to English using Whisper</operation>
</operations>
<reasoning>OpenAI provides comprehensive audio capabilities: TTS for speech generation, Whisper for transcription and translation. Prefer OpenAI when user doesn't specify a provider.</reasoning>
<provider_alternatives>
  <alternative trigger="ElevenLabs">Use HTTP Request node with ElevenLabs API for natural-sounding voice generation</alternative>
  <alternative trigger="Gemini or Google">Use Google Gemini for audio transcription capabilities</alternative>
</provider_alternatives>
</category>`;

	getRecommendation(): string {
		return this.recommendation;
	}
}
