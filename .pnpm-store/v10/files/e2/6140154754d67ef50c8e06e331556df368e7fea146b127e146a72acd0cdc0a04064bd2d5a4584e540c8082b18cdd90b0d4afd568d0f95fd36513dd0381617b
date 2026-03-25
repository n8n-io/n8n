import { ClientOptions, OpenAIClient } from "@langchain/openai";
import { Document } from "@langchain/core/documents";
import { BufferLoader } from "@langchain/classic/document_loaders/fs/buffer";

//#region src/document_loaders/fs/openai_whisper_audio.d.ts

/**
 * @example
 * ```typescript
 * const loader = new OpenAIWhisperAudio(
 *   "./src/document_loaders/example_data/test.mp3",
 * );
 * const docs = await loader.load();
 * console.log(docs);
 * ```
 */
declare class OpenAIWhisperAudio extends BufferLoader {
  private readonly openAIClient;
  private readonly transcriptionCreateParams?;
  constructor(filePathOrBlob: string | Blob, fields?: {
    clientOptions?: ClientOptions;
    transcriptionCreateParams?: Partial<OpenAIClient.Audio.TranscriptionCreateParams>;
  });
  protected parse(raw: Buffer, metadata: Record<string, string>): Promise<Document[]>;
}
//#endregion
export { OpenAIWhisperAudio };
//# sourceMappingURL=openai_whisper_audio.d.ts.map