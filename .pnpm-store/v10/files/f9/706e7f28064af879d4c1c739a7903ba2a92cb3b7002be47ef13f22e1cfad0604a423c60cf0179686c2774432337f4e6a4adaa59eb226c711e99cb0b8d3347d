export interface GrpcUri {
    scheme?: string;
    authority?: string;
    path: string;
}
export declare function parseUri(uriString: string): GrpcUri | null;
export interface HostPort {
    host: string;
    port?: number;
}
export declare function splitHostPort(path: string): HostPort | null;
export declare function combineHostPort(hostPort: HostPort): string;
export declare function uriToString(uri: GrpcUri): string;
