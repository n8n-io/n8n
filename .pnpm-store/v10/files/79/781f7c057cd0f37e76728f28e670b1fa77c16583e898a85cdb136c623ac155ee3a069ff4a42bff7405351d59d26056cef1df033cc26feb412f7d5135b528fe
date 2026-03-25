
//#region src/tools/imageGeneration.ts
/**
* Converts input mask options to the API format.
*/
function convertInputImageMask(mask) {
	if (!mask) return void 0;
	return {
		image_url: mask.imageUrl,
		file_id: mask.fileId
	};
}
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
function imageGeneration(options) {
	return {
		type: "image_generation",
		action: options?.action,
		background: options?.background,
		input_fidelity: options?.inputFidelity,
		input_image_mask: convertInputImageMask(options?.inputImageMask),
		model: options?.model,
		moderation: options?.moderation,
		output_compression: options?.outputCompression,
		output_format: options?.outputFormat,
		partial_images: options?.partialImages,
		quality: options?.quality,
		size: options?.size
	};
}

//#endregion
exports.imageGeneration = imageGeneration;
//# sourceMappingURL=imageGeneration.cjs.map