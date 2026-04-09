import dns from 'dns';
type LookupFunction = (hostname: string, options: dns.LookupAllOptions, callback: (err: NodeJS.ErrnoException | null, addresses: dns.LookupAddress[]) => void) => void;
export declare function instanceLookup(options: {
    server: string;
    instanceName: string;
    timeout?: number;
    retries?: number;
    port?: number;
    lookup?: LookupFunction;
    signal: AbortSignal;
}): Promise<number>;
export declare function parseBrowserResponse(response: string, instanceName: string): number | undefined;
export {};
