/// <reference types="node" />
export interface Uri {
    scheme: string;
    authority: Authority | undefined;
    path: string;
    query: Query | undefined;
    fragment: string | undefined;
}
export interface HierPart {
    authority: Authority | undefined;
    path: string;
}
export interface Authority {
    host: string;
    port: number | undefined;
    userinfo: Userinfo | undefined;
}
export interface Userinfo {
    username: string;
    password: string | undefined;
}
export interface Query {
    pairs: Array<KeyValue>;
}
export interface KeyValue {
    key: string;
    value: string;
}
export declare function parseUri(text: string): Uri;
export declare function encodeBaseUrl(scheme: string, authority: Authority | undefined, path: string): URL;
