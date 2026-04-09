import net from 'net';
import dns from 'dns';
type LookupFunction = (hostname: string, options: dns.LookupAllOptions, callback: (err: NodeJS.ErrnoException | null, addresses: dns.LookupAddress[]) => void) => void;
export declare function connectInParallel(options: {
    host: string;
    port: number;
    localAddress?: string | undefined;
}, lookup: LookupFunction, signal: AbortSignal): Promise<net.Socket>;
export declare function connectInSequence(options: {
    host: string;
    port: number;
    localAddress?: string | undefined;
}, lookup: LookupFunction, signal: AbortSignal): Promise<net.Socket>;
/**
 * Look up all addresses for the given hostname.
 */
export declare function lookupAllAddresses(host: string, lookup: LookupFunction, signal: AbortSignal): Promise<dns.LookupAddress[]>;
export {};
