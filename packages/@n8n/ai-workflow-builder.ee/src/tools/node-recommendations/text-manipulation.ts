import type { NodeRecommendationDocument } from '@/types/node-recommendations';
import { RecommendationCategory } from '@/types/recommendation-category';

export class TextManipulationRecommendation implements NodeRecommendationDocument {
	readonly category = RecommendationCategory.TEXT_MANIPULATION;
	readonly version = '1.0.0';

	private readonly recommendation = `<category name="text_manipulation">
<default_node>@n8n/n8n-nodes-langchain.agent</default_node>
<display_name>AI Agent</display_name>
<reasoning>Default for AI text manipulation tasks (summarization, analysis, extraction, classification, chat). Connect with OpenAI Chat Model as new users get free credits for it.</reasoning>
<required_connections>
  <connection type="ai_languageModel">@n8n/n8n-nodes-langchain.lmChatOpenAi</connection>
</required_connections>
<provider_alternatives>
  <alternative trigger="Anthropic or Claude">Use @n8n/n8n-nodes-langchain.lmChatAnthropic instead of lmChatOpenAi</alternative>
  <alternative trigger="Google or Gemini">Use @n8n/n8n-nodes-langchain.lmChatGoogleGemini instead of lmChatOpenAi</alternative>
  <alternative trigger="xAI or Grok">Use @n8n/n8n-nodes-langchain.lmChatXAiGrok instead of lmChatOpenAi</alternative>
</provider_alternatives>
<important>Do NOT use provider-specific nodes directly (like n8n-nodes-langchain.googleGemini). Always use AI Agent with the appropriate chat model connected.</important>
</category>`;

	getRecommendation(): string {
		return this.recommendation;
	}
}
