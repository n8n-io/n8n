export interface TcpSubchannelAddress {
    port: number;
    host: string;
}
export interface IpcSubchannelAddress {
    path: string;
}
/**
 * This represents a single backend address to connect to. This interface is a
 * subset of net.SocketConnectOpts, i.e. the options described at
 * https://nodejs.org/api/net.html#net_socket_connect_options_connectlistener.
 * Those are in turn a subset of the options that can be passed to http2.connect.
 */
export type SubchannelAddress = TcpSubchannelAddress | IpcSubchannelAddress;
export declare function isTcpSubchannelAddress(address: SubchannelAddress): address is TcpSubchannelAddress;
export declare function subchannelAddressEqual(address1?: SubchannelAddress, address2?: SubchannelAddress): boolean;
export declare function subchannelAddressToString(address: SubchannelAddress): string;
export declare function stringToSubchannelAddress(addressString: string, port?: number): SubchannelAddress;
export interface Endpoint {
    addresses: SubchannelAddress[];
}
export declare function endpointEqual(endpoint1: Endpoint, endpoint2: Endpoint): boolean;
export declare function endpointToString(endpoint: Endpoint): string;
export declare function endpointHasAddress(endpoint: Endpoint, expectedAddress: SubchannelAddress): boolean;
export declare class EndpointMap<ValueType> {
    private map;
    get size(): number;
    getForSubchannelAddress(address: SubchannelAddress): ValueType | undefined;
    /**
     * Delete any entries in this map with keys that are not in endpoints
     * @param endpoints
     */
    deleteMissing(endpoints: Endpoint[]): ValueType[];
    get(endpoint: Endpoint): ValueType | undefined;
    set(endpoint: Endpoint, mapEntry: ValueType): void;
    delete(endpoint: Endpoint): void;
    has(endpoint: Endpoint): boolean;
    clear(): void;
    keys(): IterableIterator<Endpoint>;
    values(): IterableIterator<ValueType>;
    entries(): IterableIterator<[Endpoint, ValueType]>;
}
