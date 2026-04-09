import dns from 'dns';
type LookupFunction = (hostname: string, options: dns.LookupAllOptions, callback: (err: NodeJS.ErrnoException | null, addresses: dns.LookupAddress[]) => void) => void;
export declare function sendInParallel(addresses: dns.LookupAddress[], port: number, request: Buffer, signal: AbortSignal): Promise<Buffer<ArrayBufferLike>>;
export declare function sendMessage(host: string, port: number, lookup: LookupFunction, signal: AbortSignal, request: Buffer): Promise<Buffer<ArrayBufferLike>>;
export {};
