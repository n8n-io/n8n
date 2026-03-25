import { AuthorizeResponse } from "../response/AuthorizeResponse.js";
import { StringDict } from "./MsalTypes.js";
/**
 * Parses hash string from given string. Returns empty string if no hash symbol is found.
 * @param hashString
 */
export declare function stripLeadingHashOrQuery(responseString: string): string;
/**
 * Returns URL hash as server auth code response object.
 */
export declare function getDeserializedResponse(responseString: string): AuthorizeResponse | null;
/**
 * Utility to create a URL from the params map
 */
export declare function mapToQueryString(parameters: Map<string, string>, encodeExtraParams?: boolean, extraQueryParameters?: StringDict): string;
/**
 * Normalizes URLs for comparison by removing hash, canonicalizing,
 * and ensuring consistent URL encoding in query parameters.
 * This fixes redirect loops when URLs contain encoded characters like apostrophes (%27).
 * @param url - URL to normalize
 * @returns Normalized URL string for comparison
 */
export declare function normalizeUrlForComparison(url: string): string;
//# sourceMappingURL=UrlUtils.d.ts.map