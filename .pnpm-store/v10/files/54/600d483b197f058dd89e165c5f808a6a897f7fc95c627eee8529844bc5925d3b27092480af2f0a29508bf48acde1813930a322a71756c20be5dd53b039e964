/// <reference types="node" />
export default api;
export type domainToASCII = typeof import("url").domainToASCII;
export type domainToUnicode = typeof import("url").domainToUnicode;
export type pathToFileURL = typeof import("url").pathToFileURL;
export type fileURLToPath = typeof import("url").fileURLToPath;
export type URLFormatOptions = import('url').URLFormatOptions;
export type UrlObject = import('url').UrlObject;
export type formatImport = typeof format;
export type parseImport = typeof parse;
export type resolveImport = typeof resolve;
export type UrlImport = import('url').Url;
declare namespace api {
    export { formatImportWithOverloads as format };
    export { parseImport as parse };
    export { resolveImport as resolve };
    export { resolveObject };
    export { UrlImport as Url };
    export { URL };
    export { URLSearchParams };
    export { domainToASCII };
    export { domainToUnicode };
    export { pathToFileURL };
    export { fileURLToPath };
}
declare const formatImportWithOverloads: ((urlObject: URL, options?: URLFormatOptions) => string) & ((urlObject: UrlObject | string, options?: never) => string);
declare const parseImport: typeof parse;
declare const resolveImport: typeof resolve;
declare const UrlImport: Url;
export const URL: {
    new (url: string | URL, base?: string | URL | undefined): URL;
    prototype: URL;
    createObjectURL(obj: Blob | MediaSource): string;
    revokeObjectURL(url: string): void;
};
export const URLSearchParams: {
    new (init?: string | URLSearchParams | string[][] | Record<string, string> | undefined): URLSearchParams;
    prototype: URLSearchParams;
    toString(): string;
};
export const domainToASCII: domainToASCII;
export const domainToUnicode: domainToUnicode;
export const pathToFileURL: (url: string) => URL;
export const fileURLToPath: typeof import("url").fileURLToPath & ((path: string | URL) => string);
import { format } from "url";
import { parse } from "url";
import { resolve } from "url";
import { Url } from "url";
export { formatImportWithOverloads as format, parseImport as parse, resolveImport as resolve, resolveObject, UrlImport as Url };
//# sourceMappingURL=url.d.ts.map