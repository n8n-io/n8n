import type { Request, Warnings } from "../parse.js";
import type { AuthType } from "../Request.js";
export declare const supportedArgs: Set<string>;
export type JSONOutput = {
    url: string;
    raw_url: string;
    method: string;
    cookies?: {
        [key: string]: string;
    };
    headers?: {
        [key: string]: string | null;
    };
    queries?: {
        [key: string]: string | string[];
    };
    data?: {
        [key: string]: string;
    } | string | any;
    files?: {
        [key: string]: string;
    };
    insecure?: boolean;
    compressed?: boolean;
    include?: boolean;
    auth?: {
        user: string;
        password: string;
    };
    auth_type?: AuthType;
    aws_sigv4?: string;
    delegation?: string;
    follow_redirects?: boolean;
    max_redirects?: number;
    proxy?: string;
    timeout?: number;
    connect_timeout?: number;
    output?: string;
};
export declare function _toJsonObject(requests: Request[], warnings?: Warnings): JSONOutput;
export declare function toJsonObjectWarn(curlCommand: string | string[], warnings?: Warnings): [JSONOutput, Warnings];
export declare function toJsonObject(curlCommand: string | string[]): JSONOutput;
export declare function _toJsonString(requests: Request[], warnings?: Warnings): string;
export declare function toJsonStringWarn(curlCommand: string | string[], warnings?: Warnings): [string, Warnings];
export declare function toJsonString(curlCommand: string | string[]): string;
