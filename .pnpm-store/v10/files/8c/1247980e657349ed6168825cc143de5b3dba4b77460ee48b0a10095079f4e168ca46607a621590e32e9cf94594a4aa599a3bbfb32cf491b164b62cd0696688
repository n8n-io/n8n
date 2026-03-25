import { GeminiGroundingChunk, GeminiGroundingMetadata, GeminiGroundingSupport } from "./types.js";
import { ChatGeneration, Generation } from "@langchain/core/outputs";
import { Callbacks } from "@langchain/core/callbacks/manager";
import { BaseLLMOutputParser } from "@langchain/core/output_parsers";

//#region src/output_parsers.d.ts
type Generations = Generation[] | ChatGeneration[];
type GroundingInfo = {
  metadata: GeminiGroundingMetadata;
  supports: GeminiGroundingSupport[];
};
declare abstract class BaseGoogleSearchOutputParser extends BaseLLMOutputParser<string> {
  lc_namespace: string[];
  protected generationToGroundingInfo(generation: Generation | ChatGeneration): GroundingInfo | undefined;
  protected generationsToGroundingInfo(generations: Generations): GroundingInfo | undefined;
  protected generationToString(generation: Generation | ChatGeneration): string;
  protected generationsToString(generations: Generations): string;
  protected abstract segmentPrefix(grounding: GroundingInfo, support: GeminiGroundingSupport, index: number): string | undefined;
  protected abstract segmentSuffix(grounding: GroundingInfo, support: GeminiGroundingSupport, index: number): string | undefined;
  protected annotateSegment(text: string, grounding: GroundingInfo, support: GeminiGroundingSupport, index: number): string;
  protected annotateTextSegments(text: string, grounding: GroundingInfo): string;
  protected abstract textPrefix(text: string, grounding: GroundingInfo): string | undefined;
  protected abstract textSuffix(text: string, grounding: GroundingInfo): string | undefined;
  /**
   * Google requires us to
   * "Display the Search Suggestion exactly as provided without any modifications"
   * So this will typically be called from the textSuffix() method to get
   * a string that renders HTML.
   * See https://ai.google.dev/gemini-api/docs/grounding/search-suggestions
   * @param grounding
   */
  protected searchSuggestion(grounding: GroundingInfo): string;
  protected annotateText(text: string, grounding: GroundingInfo): string;
  parseResult(generations: Generations, _callbacks?: Callbacks): Promise<string>;
}
declare class SimpleGoogleSearchOutputParser extends BaseGoogleSearchOutputParser {
  protected segmentPrefix(_grounding: GroundingInfo, _support: GeminiGroundingSupport, _index: number): string | undefined;
  protected segmentSuffix(_grounding: GroundingInfo, support: GeminiGroundingSupport, _index: number): string | undefined;
  protected textPrefix(_text: string, _grounding: GroundingInfo): string;
  protected chunkToString(chunk: GeminiGroundingChunk, index: number): string;
  protected textSuffix(_text: string, grounding: GroundingInfo): string;
}
declare class MarkdownGoogleSearchOutputParser extends BaseGoogleSearchOutputParser {
  protected segmentPrefix(_grounding: GroundingInfo, _support: GeminiGroundingSupport, _index: number): string | undefined;
  protected chunkLink(grounding: GroundingInfo, index: number): string;
  protected segmentSuffix(grounding: GroundingInfo, support: GeminiGroundingSupport, _index: number): string | undefined;
  protected textPrefix(_text: string, _grounding: GroundingInfo): string | undefined;
  protected chunkSuffixLink(chunk: GeminiGroundingChunk, index: number): string;
  protected textSuffix(_text: string, grounding: GroundingInfo): string | undefined;
}
//#endregion
export { BaseGoogleSearchOutputParser, MarkdownGoogleSearchOutputParser, SimpleGoogleSearchOutputParser };
//# sourceMappingURL=output_parsers.d.ts.map