import { BaseMessage, BaseMessageChunk } from "./messages/base.js";

//#region src/outputs.d.ts
declare const RUN_KEY = "__run";
/**
 * Output of a single generation.
 */
interface Generation {
  /**
   * Generated text output
   */
  text: string;
  /**
   * Raw generation info response from the provider.
   * May include things like reason for finishing (e.g. in {@link OpenAI})
   */
  generationInfo?: Record<string, any>;
}
type GenerationChunkFields = {
  text: string;
  generationInfo?: Record<string, any>;
};
/**
 * Chunk of a single generation. Used for streaming.
 */
declare class GenerationChunk implements Generation {
  text: string;
  generationInfo?: Record<string, any>;
  constructor(fields: GenerationChunkFields);
  concat(chunk: GenerationChunk): GenerationChunk;
}
/**
 * Contains all relevant information returned by an LLM.
 */
type LLMResult = {
  /**
   * List of the things generated. Each input could have multiple {@link Generation | generations}, hence this is a list of lists.
   */
  generations: Generation[][];
  /**
   * Dictionary of arbitrary LLM-provider specific output.
   */
  llmOutput?: Record<string, any>;
  /**
   * Dictionary of run metadata
   */
  [RUN_KEY]?: Record<string, any>;
};
interface ChatGeneration extends Generation {
  message: BaseMessage;
}
type ChatGenerationChunkFields = GenerationChunkFields & {
  message: BaseMessageChunk;
};
declare class ChatGenerationChunk extends GenerationChunk implements ChatGeneration {
  message: BaseMessageChunk;
  constructor(fields: ChatGenerationChunkFields);
  concat(chunk: ChatGenerationChunk): ChatGenerationChunk;
}
interface ChatResult {
  generations: ChatGeneration[];
  llmOutput?: Record<string, any>;
}
//#endregion
export { ChatGeneration, ChatGenerationChunk, ChatGenerationChunkFields, ChatResult, Generation, GenerationChunk, GenerationChunkFields, LLMResult, RUN_KEY };
//# sourceMappingURL=outputs.d.ts.map