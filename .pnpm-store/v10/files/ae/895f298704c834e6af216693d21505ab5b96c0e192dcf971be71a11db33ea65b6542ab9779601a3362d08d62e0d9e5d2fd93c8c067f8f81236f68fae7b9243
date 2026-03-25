import { Tool } from "@langchain/core/tools";

//#region src/tools/google_places.d.ts

/**
 * Interface for parameters required by GooglePlacesAPI class.
 */
interface GooglePlacesAPIParams {
  apiKey?: string;
}
/**
 * Tool that queries the Google Places API
 */
declare class GooglePlacesAPI extends Tool {
  static lc_name(): string;
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  name: string;
  protected apiKey: string;
  description: string;
  constructor(fields?: GooglePlacesAPIParams);
  _call(input: string): Promise<string>;
}
//#endregion
export { GooglePlacesAPI, GooglePlacesAPIParams };
//# sourceMappingURL=google_places.d.cts.map