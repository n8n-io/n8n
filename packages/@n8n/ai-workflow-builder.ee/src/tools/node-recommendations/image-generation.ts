import type { NodeRecommendationDocument } from '@/types/node-recommendations';
import { RecommendationCategory } from '@/types/recommendation-category';

export class ImageGenerationRecommendation implements NodeRecommendationDocument {
	readonly category = RecommendationCategory.IMAGE_GENERATION;
	readonly version = '1.0.0';

	private readonly recommendation = `<category name="image_generation">
<default_node>@n8n/n8n-nodes-langchain.openAi</default_node>
<display_name>OpenAI</display_name>
<operations>
  <operation name="Analyze Image">Analyze and describe image content using GPT-4 Vision</operation>
  <operation name="Generate an Image">Create images from text prompts using DALL-E</operation>
  <operation name="Edit Image">Modify existing images using DALL-E</operation>
</operations>
<reasoning>OpenAI provides comprehensive image capabilities: DALL-E for generation/editing, GPT-4 Vision for analysis. Prefer OpenAI when user doesn't specify a provider.</reasoning>
<provider_alternatives>
  <alternative trigger="Gemini or Google">Use @n8n/n8n-nodes-langchain.lmChatGoogleGemini for image analysis (Gemini has vision capabilities)</alternative>
  <alternative trigger="Stable Diffusion">Use HTTP Request node with Stability AI or similar API</alternative>
</provider_alternatives>
</category>`;

	getRecommendation(): string {
		return this.recommendation;
	}
}
