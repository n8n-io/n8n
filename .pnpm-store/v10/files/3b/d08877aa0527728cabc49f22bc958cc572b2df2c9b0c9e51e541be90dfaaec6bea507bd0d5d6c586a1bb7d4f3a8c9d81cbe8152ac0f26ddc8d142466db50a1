import { __export, __reExport } from "../../_virtual/rolldown_runtime.cjs";
import { AssemblyAIOptions, assemblyai_types_d_exports } from "../../types/assemblyai-types.cjs";
import { Document } from "@langchain/core/documents";
import { BaseDocumentLoader } from "@langchain/core/document_loaders/base";
import { AssemblyAI, CreateTranscriptParameters, SubtitleFormat, TranscribeParams, Transcript, TranscriptParagraph, TranscriptSentence } from "assemblyai";

//#region src/document_loaders/web/assemblyai.d.ts

/**
 * Base class for AssemblyAI loaders.
 */
declare abstract class AssemblyAILoader extends BaseDocumentLoader {
  protected client: AssemblyAI;
  /**
   * Create a new AssemblyAI loader.
   * @param assemblyAIOptions The options to configure the AssemblyAI loader.
   * Configure the `assemblyAIOptions.apiKey` with your AssemblyAI API key, or configure it as the `ASSEMBLYAI_API_KEY` environment variable.
   */
  constructor(assemblyAIOptions?: AssemblyAIOptions);
}
declare abstract class CreateTranscriptLoader extends AssemblyAILoader {
  protected transcribeParams?: TranscribeParams | CreateTranscriptParameters;
  protected transcriptId?: string;
  /**
   * Transcribe audio or retrieve an existing transcript by its ID.
   * @param params The parameters to transcribe audio, or the ID of the transcript to retrieve.
   * @param assemblyAIOptions The options to configure the AssemblyAI loader.
   * Configure the `assemblyAIOptions.apiKey` with your AssemblyAI API key, or configure it as the `ASSEMBLYAI_API_KEY` environment variable.
   */
  constructor(params: TranscribeParams | CreateTranscriptParameters | string, assemblyAIOptions?: AssemblyAIOptions);
  protected transcribeOrGetTranscript(): Promise<Transcript>;
}
/**
 * Transcribe audio and load the transcript as a document using AssemblyAI.
 */
declare class AudioTranscriptLoader extends CreateTranscriptLoader {
  /**
   * Transcribe audio and load the transcript as a document using AssemblyAI.
   * @returns A promise that resolves to a single document containing the transcript text
   * as the page content, and the transcript object as the metadata.
   */
  load(): Promise<Document<Transcript>[]>;
}
/**
 * Transcribe audio and load the paragraphs of the transcript, creating a document for each paragraph.
 */
declare class AudioTranscriptParagraphsLoader extends CreateTranscriptLoader {
  /**
   * Transcribe audio and load the paragraphs of the transcript, creating a document for each paragraph.
   * @returns A promise that resolves to an array of documents, each containing a paragraph of the transcript.
   */
  load(): Promise<Document<TranscriptParagraph>[]>;
}
/**
 * Transcribe audio and load the sentences of the transcript, creating a document for each sentence.
 */
declare class AudioTranscriptSentencesLoader extends CreateTranscriptLoader {
  /**
   * Transcribe audio and load the sentences of the transcript, creating a document for each sentence.
   * @returns A promise that resolves to an array of documents, each containing a sentence of the transcript.
   */
  load(): Promise<Document<TranscriptSentence>[]>;
}
/**
 * Transcribe audio and load subtitles for the transcript as `srt` or `vtt` format.
 */
declare class AudioSubtitleLoader extends CreateTranscriptLoader {
  private subtitleFormat;
  /**
   * Create a new AudioSubtitleLoader.
   * @param transcribeParams The parameters to transcribe audio.
   * @param subtitleFormat The format of the subtitles, either `srt` or `vtt`.
   * @param assemblyAIOptions The options to configure the AssemblyAI loader.
   * Configure the `assemblyAIOptions.apiKey` with your AssemblyAI API key, or configure it as the `ASSEMBLYAI_API_KEY` environment variable.
   */
  constructor(transcribeParams: TranscribeParams | CreateTranscriptParameters, subtitleFormat: SubtitleFormat, assemblyAIOptions?: AssemblyAIOptions);
  /**
   * Create a new AudioSubtitleLoader.
   * @param transcriptId The ID of the transcript to retrieve.
   * @param subtitleFormat The format of the subtitles, either `srt` or `vtt`.
   * @param assemblyAIOptions The options to configure the AssemblyAI loader.
   * Configure the `assemblyAIOptions.apiKey` with your AssemblyAI API key, or configure it as the `ASSEMBLYAI_API_KEY` environment variable.
   */
  constructor(transcriptId: string, subtitleFormat: SubtitleFormat, assemblyAIOptions?: AssemblyAIOptions);
  /**
   * Transcribe audio and load subtitles for the transcript as `srt` or `vtt` format.
   * @returns A promise that resolves a document containing the subtitles as the page content.
   */
  load(): Promise<Document[]>;
}
//#endregion
export { AssemblyAIOptions, AudioSubtitleLoader, AudioTranscriptLoader, AudioTranscriptParagraphsLoader, AudioTranscriptSentencesLoader };
//# sourceMappingURL=assemblyai.d.cts.map