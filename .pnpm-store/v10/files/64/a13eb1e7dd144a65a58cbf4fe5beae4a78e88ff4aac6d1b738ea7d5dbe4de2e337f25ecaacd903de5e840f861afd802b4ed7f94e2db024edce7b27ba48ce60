export * from "./Resolve";
export * from "./Serialize";
export * from "./Parse";
export declare function equal(uriA: URIComponents | string, uriB: URIComponents | string): boolean;
export declare function normalize(uri: URIComponents): URIComponents;
export declare function normalize(uri: string): string;
export interface URIComponents {
    scheme?: string | undefined;
    userinfo?: string | undefined;
    host?: string | undefined;
    port?: number | string | undefined;
    path?: string | undefined;
    query?: string | undefined;
    fragment?: string | undefined;
    reference?: string | undefined;
    error?: string | undefined;
}
export interface URIOptions {
    scheme?: string | undefined;
    reference?: string | undefined;
    tolerant?: boolean | undefined;
    absolutePath?: boolean | undefined;
    iri?: boolean | undefined;
    unicodeSupport?: boolean | undefined;
    domainHost?: boolean | undefined;
}
