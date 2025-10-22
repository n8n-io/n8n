import type { BestPracticesDocument } from '@/types/best-practices';
import { WorkflowTechnique } from '@/types/categorization';

export class ContentGenerationBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.CONTENT_GENERATION;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Content Generation Workflows

## Workflow Design

Break complex tasks into sequential steps (e.g., generate text, create image, compose video) for modularity and easier troubleshooting.

## Content-Specific Guidance

For text generation, validate and sanitize input/output to avoid malformed data. When generating images, prefer binary data over URLs for uploads to avoid media type errors.

For audio and video files, especially large ones, warn the user they need to set N8N_DEFAULT_BINARY_DATA_MODE=filesystem to avoid memory issues and enable disk-based storage.
This prevents workflows from crashing due to memory constraints when processing large media files.

## Recommended Nodes

### OpenAI

Purpose: GPT-based text generation, DALL-E image generation, text-to-speech (TTS), and audio transcription

### xAI Grok Chat Model

Purpose: Conversational AI and text generation

### Google Gemini

Purpose: Image analysis and generation, video generation from text prompts, multimodal content creation

### ElevenLabs

Purpose: Natural-sounding AI voice generation

### HTTP Request

Purpose: Integrating with other LLM and content generation APIs (e.g., Jasper, Writesonic, Anthropic, HuggingFace)

### Edit Image

Purpose: Manipulating images - resize, crop, rotate, and format conversion

Pitfalls:

- Ensure input is valid binary image data
- Check output format compatibility with downstream nodes

### Markdown

Purpose: Formatting and converting text to HTML or Markdown reports

### Facebook Graph API

Purpose: Uploading videos and images to Instagram and Facebook

Pitfalls:

- Use binary data fields rather than URLs for media uploads to prevent "media type" errors
- Verify page IDs and access tokens have correct permissions

### Wait

Purpose: Handling delays in video processing/uploading and respecting API rate limits

## Common Pitfalls to Avoid

Binary Data Handling: For media uploads, use binary fields rather than URLs to prevent "media type" errors, especially with Facebook and Instagram APIs. Download media to binary data first, then upload from binary rather than passing URLs.

Async Processing: For long-running content generation tasks (especially video), implement proper wait/polling mechanisms. Don't assume instant completion - many AI services process requests asynchronously.
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
