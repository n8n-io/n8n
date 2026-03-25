import { OpenAI as OpenAI$1 } from "openai";
import { ServerTool } from "@langchain/core/tools";

//#region src/tools/imageGeneration.d.ts

/**
 * Optional mask for inpainting. Allows you to specify areas of the image
 * that should be regenerated.
 */
interface ImageGenerationInputMask {
  /**
   * Base64-encoded mask image URL.
   */
  imageUrl?: string;
  /**
   * File ID for the mask image (uploaded via OpenAI File API).
   */
  fileId?: string;
}
/**
 * Options for the Image Generation tool.
 */
interface ImageGenerationOptions {
  /**
   * Whether to generate a new image or edit an existing image.
   * - `generate`: Generate a new image from scratch
   * - `edit`: Edit an existing image
   * - `auto`: Let the model decide based on the input
   * @default "auto"
   */
  action?: "generate" | "edit" | "auto";
  /**
   * Background type for the generated image.
   * - `transparent`: Generate image with transparent background
   * - `opaque`: Generate image with opaque background
   * - `auto`: Let the model decide based on the prompt
   * @default "auto"
   */
  background?: "transparent" | "opaque" | "auto";
  /**
   * Control how much effort the model will exert to match the style and features,
   * especially facial features, of input images. This parameter is only supported
   * for `gpt-image-1`. Unsupported for `gpt-image-1-mini`.
   * - `high`: Higher fidelity to input images
   * - `low`: Lower fidelity to input images
   * @default "low"
   */
  inputFidelity?: "high" | "low";
  /**
   * Optional mask for inpainting. Use this to specify areas of an image
   * that should be regenerated.
   */
  inputImageMask?: ImageGenerationInputMask;
  /**
   * The image generation model to use.
   * @default "gpt-image-1"
   */
  model?: "gpt-image-1" | "gpt-image-1-mini" | "gpt-image-1.5";
  /**
   * Moderation level for the generated image.
   * - `auto`: Standard moderation
   * - `low`: Less restrictive moderation
   * @default "auto"
   */
  moderation?: "auto" | "low";
  /**
   * Compression level for the output image (0-100).
   * Only applies to JPEG and WebP formats.
   * @default 100
   */
  outputCompression?: number;
  /**
   * The output format of the generated image.
   * @default "png"
   */
  outputFormat?: "png" | "webp" | "jpeg";
  /**
   * Number of partial images to generate in streaming mode (0-3).
   * When set, the model will return partial images as they are generated,
   * providing faster visual feedback.
   * @default 0
   */
  partialImages?: number;
  /**
   * The quality of the generated image.
   * - `low`: Faster generation, lower quality
   * - `medium`: Balanced generation time and quality
   * - `high`: Slower generation, higher quality
   * - `auto`: Let the model decide based on the prompt
   * @default "auto"
   */
  quality?: "low" | "medium" | "high" | "auto";
  /**
   * The size of the generated image.
   * - `1024x1024`: Square format
   * - `1024x1536`: Portrait format
   * - `1536x1024`: Landscape format
   * - `auto`: Let the model decide based on the prompt
   * @default "auto"
   */
  size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
}
/**
 * OpenAI Image Generation tool type for the Responses API.
 */
type ImageGenerationTool = OpenAI$1.Responses.Tool.ImageGeneration;
/**
 * Creates an Image Generation tool that allows models to generate or edit images
 * using text prompts and optional image inputs.
 *
 * The image generation tool leverages the GPT Image model and automatically
 * optimizes text inputs for improved performance. When included in a request,
 * the model can decide when and how to generate images as part of the conversation.
 *
 * **Key Features**:
 * - Generate images from text descriptions
 * - Edit existing images with text instructions
 * - Multi-turn image editing by referencing previous responses
 * - Configurable output options (size, quality, format)
 * - Streaming support for partial image generation
 *
 * **Prompting Tips**:
 * - Use terms like "draw" or "edit" in your prompt for best results
 * - For combining images, say "edit the first image by adding this element" instead of "combine"
 *
 * @see {@link https://platform.openai.com/docs/guides/tools-image-generation | OpenAI Image Generation Documentation}
 *
 * @param options - Configuration options for the Image Generation tool
 * @returns An Image Generation tool definition to be passed to the OpenAI Responses API
 *
 * @example
 * ```typescript
 * import { ChatOpenAI, tools } from "@langchain/openai";
 *
 * const model = new ChatOpenAI({ model: "gpt-4o" });
 *
 * // Basic usage - generate an image
 * const response = await model.invoke(
 *   "Generate an image of a gray tabby cat hugging an otter with an orange scarf",
 *   { tools: [tools.imageGeneration()] }
 * );
 *
 * // Access the generated image
 * const imageData = response.additional_kwargs.tool_outputs?.find(
 *   (output) => output.type === "image_generation_call"
 * );
 * if (imageData?.result) {
 *   // imageData.result contains the base64-encoded image
 *   const fs = await import("fs");
 *   fs.writeFileSync("output.png", Buffer.from(imageData.result, "base64"));
 * }
 *
 * // With custom options
 * const response = await model.invoke(
 *   "Draw a beautiful sunset over mountains",
 *   {
 *     tools: [tools.imageGeneration({
 *       size: "1536x1024",      // Landscape format
 *       quality: "high",        // Higher quality output
 *       outputFormat: "jpeg",   // JPEG format
 *       outputCompression: 90,  // 90% compression
 *     })]
 *   }
 * );
 *
 * // With transparent background
 * const response = await model.invoke(
 *   "Create a logo with a transparent background",
 *   {
 *     tools: [tools.imageGeneration({
 *       background: "transparent",
 *       outputFormat: "png",
 *     })]
 *   }
 * );
 *
 * // Force the model to use image generation
 * const response = await model.invoke(
 *   "A serene lake at dawn",
 *   {
 *     tools: [tools.imageGeneration()],
 *     tool_choice: { type: "image_generation" },
 *   }
 * );
 *
 * // Enable streaming with partial images
 * const response = await model.invoke(
 *   "Draw a detailed fantasy castle",
 *   {
 *     tools: [tools.imageGeneration({
 *       partialImages: 2,  // Get 2 partial images during generation
 *     })]
 *   }
 * );
 * ```
 *
 * @remarks
 * - Supported models: gpt-4o, gpt-4o-mini, gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, o3
 * - The image generation process always uses `gpt-image-1` model internally
 * - The model will automatically revise prompts for improved performance
 * - Access the revised prompt via `revised_prompt` field in the output
 * - Multi-turn editing is supported by passing previous response messages
 */
declare function imageGeneration(options?: ImageGenerationOptions): ServerTool;
//#endregion
export { ImageGenerationInputMask, ImageGenerationOptions, ImageGenerationTool, imageGeneration };
//# sourceMappingURL=imageGeneration.d.ts.map