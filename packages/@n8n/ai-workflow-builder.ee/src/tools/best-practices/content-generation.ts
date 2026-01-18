import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class ContentGenerationBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.CONTENT_GENERATION;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Content Generation Workflows

## Workflow Design

Break complex tasks into sequential steps (e.g., generate text, create image, compose video) for modularity and easier troubleshooting.

## Node Selection Guidelines

Always prefer built-in n8n nodes over HTTP Request nodes when a dedicated node exists for the service or API you need to integrate with. Built-in nodes provide:
- Pre-configured authentication handling
- Optimized data structures and field mappings
- Better error handling and user experience
- Simplified setup without manual API configuration

Only use HTTP Request nodes when no built-in node exists for the service, or when you need to access an API endpoint not covered by the built-in node's operations.

## Multi-Modal Content Generation - MANDATORY

When the user's request involves specific generative AI models or media-focused platforms, the workflow MUST include the appropriate media generation node from a
provider-specific node. The finished workflow MUST contain the relevant video, audio, or image generation capability.

Prompts that require multi-modal generation nodes:

Video Generation:
- Model mentions: Sora, Nano Banana, Veo, Runway, Pika
- Platform mentions: YouTube content, TikTok videos, Instagram Reels, video ads, short-form video
- Task mentions: generate video, create video, video from text, animate

Image Generation:
- Model mentions: DALL-E, Midjourney, Stable Diffusion, Imagen
- Platform mentions: thumbnails, social media graphics, product images, marketing visuals
- Task mentions: generate image, create artwork, design graphic, visualize

Audio Generation:
- Model mentions: ElevenLabs, text-to-speech, TTS
- Platform mentions: podcast audio, voiceovers, narration, audio content
- Task mentions: generate voice, create audio, synthesize speech, clone voice

If anything like the examples above are mentioned in the prompt, include the appropriate
provider node (OpenAI for DALL-E/Sora, Google Gemini for Nano Banana/Imagen, etc.)
with the media generation operation configured.

## Content-Specific Guidance

For text generation, validate and sanitize input/output to avoid malformed data. When generating images, prefer binary data over URLs for uploads to avoid media type errors.

## Recommended Nodes

### OpenAI (@n8n/n8n-nodes-langchain.openAi)

Purpose: GPT-based text generation, DALL-E image generation, text-to-speech (TTS), and audio transcription, SORA for video generation

### xAI Grok Chat Model (@n8n/n8n-nodes-langchain.lmChatXAiGrok)

Purpose: Conversational AI and text generation

### Google Gemini Chat Model (@n8n/n8n-nodes-langchain.lmChatGoogleGemini)

Purpose: Image analysis and generation, video generation from text prompts using nano banana, multimodal content creation

### ElevenLabs

Purpose: Natural-sounding AI voice generation

Note: Use HTTP Request node or a community node to integrate with ElevenLabs API

### HTTP Request (n8n-nodes-base.httpRequest)

Purpose: Integrating with other LLM and content generation APIs (e.g., Jasper, Writesonic, Anthropic, HuggingFace)

### Edit Image (n8n-nodes-base.editImage)

Purpose: Manipulating images - resize, crop, rotate, and format conversion

Pitfalls:

- Ensure input is valid binary image data
- Check output format compatibility with downstream nodes

### Markdown (n8n-nodes-base.markdown)

Purpose: Formatting and converting text to HTML or Markdown reports

### Facebook Graph API (n8n-nodes-base.facebookGraphApi)

Purpose: Uploading videos and images to Instagram and Facebook

Pitfalls:

- Use binary data fields rather than URLs for media uploads to prevent "media type" errors
- Verify page IDs and access tokens have correct permissions

### Wait (n8n-nodes-base.wait)

Purpose: Handling delays in video processing/uploading and respecting API rate limits

## Common Pitfalls to Avoid

Binary Data Handling: For media uploads, use binary fields rather than URLs to prevent "media type" errors, especially with Facebook and Instagram APIs. Download media to binary data first, then upload from binary rather than passing URLs.

Async Processing: For long-running content generation tasks (especially video), implement proper wait/polling mechanisms. Don't assume instant completion - many AI services process requests asynchronously.
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
