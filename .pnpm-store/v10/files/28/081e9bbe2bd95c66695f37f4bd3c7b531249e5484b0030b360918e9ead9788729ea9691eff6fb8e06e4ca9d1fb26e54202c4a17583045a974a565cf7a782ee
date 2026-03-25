import { Tool } from "@langchain/core/tools";

//#region src/tools/brave_search.d.ts

/**
 * Interface for the parameters required to instantiate a BraveSearch
 * instance.
 */
interface BraveSearchParams {
  apiKey?: string;
}
/**
 * Class for interacting with the Brave Search engine. It extends the Tool
 * class and requires an API key to function. The API key can be passed in
 * during instantiation or set as an environment variable named
 * 'BRAVE_SEARCH_API_KEY'.
 */
declare class BraveSearch extends Tool {
  static lc_name(): string;
  name: string;
  description: string;
  apiKey: string;
  constructor(fields?: BraveSearchParams);
  /** @ignore */
  _call(input: string): Promise<string>;
}
//#endregion
export { BraveSearch, BraveSearchParams };
//# sourceMappingURL=brave_search.d.cts.map