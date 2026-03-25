import { Tool } from "@langchain/core/tools";
import * as _langchain_core_load_serializable3 from "@langchain/core/load/serializable";

//#region src/tools/bingserpapi.d.ts

/**
 * A tool for web search functionality using Bing's search engine. It
 * extends the base `Tool` class and implements the `_call` method to
 * perform the search operation. Requires an API key for Bing's search
 * engine, which can be set in the environment variables. Also accepts
 * additional parameters for the search query.
 */
declare class BingSerpAPI extends Tool {
  static lc_name(): string;
  /**
   * Not implemented. Will throw an error if called.
   */
  toJSON(): _langchain_core_load_serializable3.SerializedNotImplemented;
  name: string;
  description: string;
  key: string;
  params: Record<string, string>;
  constructor(apiKey?: string | undefined, params?: Record<string, string>);
  /** @ignore */
  _call(input: string): Promise<string>;
}
//#endregion
export { BingSerpAPI };
//# sourceMappingURL=bingserpapi.d.cts.map