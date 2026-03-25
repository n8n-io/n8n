//#region src/language_models/profile.d.ts
/**
 * Represents the capabilities and constraints of a language model.
 *
 * This interface defines the various features and limitations that a model may have,
 * including input/output constraints, multimodal support, and advanced capabilities
 * like tool calling and structured output.
 */
interface ModelProfile {
  /**
   * Maximum number of tokens that can be included in the input context window.
   *
   * This represents the total token budget for the model's input, including
   * the prompt, system messages, conversation history, and any other context.
   *
   * @example
   * ```typescript
   * const profile: ModelProfile = {
   *   maxInputTokens: 128000 // Model supports up to 128k tokens
   * };
   * ```
   */
  maxInputTokens?: number;
  /**
   * Whether the model supports image inputs.
   *
   * When `true`, the model can process images as part of its input, enabling
   * multimodal interactions where visual content can be analyzed alongside text.
   *
   * @see {@link imageUrlInputs} for URL-based image input support
   */
  imageInputs?: boolean;
  /**
   * Whether the model supports image URL inputs.
   *
   * When `true`, the model can accept URLs pointing to images rather than
   * requiring the image data to be embedded directly in the request. This can
   * be more efficient for large images or when images are already hosted.
   *
   * @see {@link imageInputs} for direct image input support
   */
  imageUrlInputs?: boolean;
  /**
   * Whether the model supports PDF document inputs.
   *
   * When `true`, the model can process PDF files as input, allowing it to
   * analyze document content, extract information, or answer questions about
   * PDF documents.
   */
  pdfInputs?: boolean;
  /**
   * Whether the model supports audio inputs.
   *
   * When `true`, the model can process audio data as input, enabling
   * capabilities like speech recognition, audio analysis, or multimodal
   * interactions involving sound.
   */
  audioInputs?: boolean;
  /**
   * Whether the model supports video inputs.
   *
   * When `true`, the model can process video data as input, enabling
   * capabilities like video analysis, scene understanding, or multimodal
   * interactions involving moving images.
   */
  videoInputs?: boolean;
  /**
   * Whether the model supports image content in tool messages.
   *
   * When `true`, tool responses can include images that the model can process
   * and reason about. This enables workflows where tools return visual data
   * that the model needs to interpret.
   */
  imageToolMessage?: boolean;
  /**
   * Whether the model supports PDF content in tool messages.
   *
   * When `true`, tool responses can include PDF documents that the model can
   * process and reason about. This enables workflows where tools return
   * document data that the model needs to interpret.
   */
  pdfToolMessage?: boolean;
  /**
   * Maximum number of tokens the model can generate in its output.
   *
   * This represents the upper limit on the length of the model's response.
   * The actual output may be shorter depending on the completion criteria
   * (e.g., natural stopping point, stop sequences).
   *
   * @example
   * ```typescript
   * const profile: ModelProfile = {
   *   maxOutputTokens: 4096 // Model can generate up to 4k tokens
   * };
   * ```
   */
  maxOutputTokens?: number;
  /**
   * Whether the model supports reasoning or chain-of-thought output.
   *
   * When `true`, the model can produce explicit reasoning steps or
   * chain-of-thought explanations as part of its output. This is useful
   * for understanding the model's decision-making process and improving
   * transparency in complex reasoning tasks.
   */
  reasoningOutput?: boolean;
  /**
   * Whether the model can generate image outputs.
   *
   * When `true`, the model can produce images as part of its response,
   * enabling capabilities like image generation, editing, or visual
   * content creation.
   */
  imageOutputs?: boolean;
  /**
   * Whether the model can generate audio outputs.
   *
   * When `true`, the model can produce audio data as part of its response,
   * enabling capabilities like text-to-speech, audio generation, or
   * sound synthesis.
   */
  audioOutputs?: boolean;
  /**
   * Whether the model can generate video outputs.
   *
   * When `true`, the model can produce video data as part of its response,
   * enabling capabilities like video generation, editing, or visual
   * content creation with motion.
   */
  videoOutputs?: boolean;
  /**
   * Whether the model supports tool calling (function calling).
   *
   * When `true`, the model can invoke external tools or functions during
   * its reasoning process. The model can decide which tools to call,
   * with what arguments, and can incorporate the tool results into its
   * final response.
   *
   * @see {@link toolChoice} for controlling tool selection behavior
   * @see {@link https://docs.langchain.com/oss/javascript/langchain/models#tool-calling}
   */
  toolCalling?: boolean;
  /**
   * Whether the model supports tool choice control.
   *
   * When `true`, the caller can specify how the model should select tools,
   * such as forcing the use of a specific tool, allowing any tool, or
   * preventing tool use entirely. This provides fine-grained control over
   * the model's tool-calling behavior.
   *
   * @see {@link toolCalling} for basic tool calling support
   */
  toolChoice?: boolean;
  /**
   * Whether the model supports structured output generation.
   *
   * When `true`, the model can generate responses that conform to a
   * specified schema or structure (e.g., JSON with a particular format).
   * This is useful for ensuring the model's output can be reliably parsed
   * and processed programmatically.
   *
   * @example
   * ```typescript
   * // Model can be instructed to return JSON matching a schema
   * const profile: ModelProfile = {
   *   structuredOutput: true
   * };
   * ```
   */
  structuredOutput?: boolean;
}
//#endregion
export { ModelProfile };
//# sourceMappingURL=profile.d.cts.map