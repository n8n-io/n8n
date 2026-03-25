import type { Request, RequestUrl, Warnings } from "../parse.js";
import type { Request as HARRequest } from "har-format";
export declare const supportedArgs: Set<string>;
export declare function _requestAndUrlToHar(request: Request, url: RequestUrl, warnings?: Warnings): HARRequest;
export declare function _toHarString(requests: Request[], warnings?: Warnings): string;
export declare function toHarStringWarn(curlCommand: string | string[], warnings?: Warnings): [string, Warnings];
export declare function toHarString(curlCommand: string | string[]): string;
