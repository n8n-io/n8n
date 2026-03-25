import { IUri } from "./IUri.js";
/**
 * Url object class which can perform various transformations on url strings.
 */
export declare class UrlString {
    private _urlString;
    get urlString(): string;
    constructor(url: string);
    /**
     * Ensure urls are lower case and end with a / character.
     * @param url
     */
    static canonicalizeUri(url: string): string;
    /**
     * Throws if urlString passed is not a valid authority URI string.
     */
    validateAsUri(): void;
    /**
     * Given a url and a query string return the url with provided query string appended
     * @param url
     * @param queryString
     */
    static appendQueryString(url: string, queryString: string): string;
    /**
     * Returns a url with the hash removed
     * @param url
     */
    static removeHashFromUrl(url: string): string;
    /**
     * Given a url like https://a:b/common/d?e=f#g, and a tenantId, returns https://a:b/tenantId/d
     * @param href The url
     * @param tenantId The tenant id to replace
     */
    replaceTenantPath(tenantId: string): UrlString;
    /**
     * Parses out the components from a url string.
     * @returns An object with the various components. Please cache this value insted of calling this multiple times on the same url.
     */
    getUrlComponents(): IUri;
    static getDomainFromUrl(url: string): string;
    static getAbsoluteUrl(relativeUrl: string, baseUrl: string): string;
    static constructAuthorityUriFromObject(urlObject: IUri): UrlString;
    /**
     * Check if the hash of the URL string contains known properties
     * @deprecated This API will be removed in a future version
     */
    static hashContainsKnownProperties(response: string): boolean;
}
//# sourceMappingURL=UrlString.d.ts.map