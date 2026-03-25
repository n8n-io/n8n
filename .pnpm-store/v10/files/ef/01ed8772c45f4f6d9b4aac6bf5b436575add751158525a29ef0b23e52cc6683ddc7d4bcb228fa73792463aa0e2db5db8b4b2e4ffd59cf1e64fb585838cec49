import { Socket } from 'net';
import { SubchannelAddress } from './subchannel-address';
import { ChannelOptions } from './channel-options';
import { GrpcUri } from './uri-parser';
interface CIDRNotation {
    ip: number;
    prefixLength: number;
}
export declare function parseCIDR(cidrString: string): CIDRNotation | null;
export interface ProxyMapResult {
    target: GrpcUri;
    extraOptions: ChannelOptions;
}
export declare function mapProxyName(target: GrpcUri, options: ChannelOptions): ProxyMapResult;
export declare function getProxiedConnection(address: SubchannelAddress, channelOptions: ChannelOptions): Promise<Socket | null>;
export {};
