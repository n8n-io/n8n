import { Tool } from "@langchain/core/tools";

//#region src/tools/google_trends.d.ts

/**
 * Interface for parameters required by SERPGoogleTrendsTool class.
 */
interface SERPGoogleTrendsToolParams {
  apiKey?: string;
}
/**
 * Tool that queries the Google Trends API. Uses default interest over time.
 */
declare class SERPGoogleTrendsTool extends Tool {
  static lc_name(): string;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  name: string;
  protected apiKey: string;
  description: string;
  constructor(fields?: SERPGoogleTrendsToolParams);
  _call(query: string): Promise<string>;
}
//#endregion
export { SERPGoogleTrendsTool, SERPGoogleTrendsToolParams };
//# sourceMappingURL=google_trends.d.ts.map