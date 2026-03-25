import { Tool } from "@langchain/core/tools";

//#region src/tools/google_custom_search.d.ts

/**
 * Interface for parameters required by GoogleCustomSearch class.
 */
interface GoogleCustomSearchParams {
  apiKey?: string;
  googleCSEId?: string;
}
/**
 * Class that uses the Google Search API to perform custom searches.
 * Requires environment variables `GOOGLE_API_KEY` and `GOOGLE_CSE_ID` to
 * be set.
 */
declare class GoogleCustomSearch extends Tool {
  static lc_name(): string;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  name: string;
  protected apiKey: string;
  protected googleCSEId: string;
  description: string;
  constructor(fields?: GoogleCustomSearchParams);
  _call(input: string): Promise<string>;
}
//#endregion
export { GoogleCustomSearch, GoogleCustomSearchParams };
//# sourceMappingURL=google_custom_search.d.cts.map