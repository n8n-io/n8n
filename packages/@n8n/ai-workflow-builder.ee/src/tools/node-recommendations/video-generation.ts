import type { NodeRecommendationDocument } from '@/types/node-recommendations';
import { RecommendationCategory } from '@/types/recommendation-category';

export class VideoGenerationRecommendation implements NodeRecommendationDocument {
	readonly category = RecommendationCategory.VIDEO_GENERATION;
	readonly version = '1.0.0';

	private readonly recommendation = `<category name="video_generation">
<default_node>@n8n/n8n-nodes-langchain.openAi</default_node>
<display_name>OpenAI</display_name>
<operations>
  <operation name="Generate a Video">Create videos from text prompts using Sora</operation>
</operations>
<reasoning>OpenAI Sora is the default for video generation. Prefer OpenAI when user doesn't specify a provider.</reasoning>
<provider_alternatives>
  <alternative trigger="Google or Nano Banana or Veo">Use Google Gemini for video generation capabilities</alternative>
  <alternative trigger="Runway or Pika">Use HTTP Request node with the respective API</alternative>
</provider_alternatives>
<note>Video generation may require async processing with Wait nodes due to longer generation times.</note>
</category>`;

	getRecommendation(): string {
		return this.recommendation;
	}
}
