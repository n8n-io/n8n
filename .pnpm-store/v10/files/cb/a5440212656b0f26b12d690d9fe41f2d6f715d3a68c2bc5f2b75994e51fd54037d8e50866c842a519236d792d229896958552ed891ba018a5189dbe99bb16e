import { WriteObject } from './call-interface';
import { Channel } from './channel';
import { ChannelOptions } from './channel-options';
import { BaseFilter, Filter, FilterFactory } from './filter';
import { Metadata } from './metadata';
type SharedCompressionFilterConfig = {
    serverSupportedEncodingHeader?: string;
};
export declare class CompressionFilter extends BaseFilter implements Filter {
    private sharedFilterConfig;
    private sendCompression;
    private receiveCompression;
    private currentCompressionAlgorithm;
    private maxReceiveMessageLength;
    private maxSendMessageLength;
    constructor(channelOptions: ChannelOptions, sharedFilterConfig: SharedCompressionFilterConfig);
    sendMetadata(metadata: Promise<Metadata>): Promise<Metadata>;
    receiveMetadata(metadata: Metadata): Metadata;
    sendMessage(message: Promise<WriteObject>): Promise<WriteObject>;
    receiveMessage(message: Promise<Buffer>): Promise<Buffer<ArrayBufferLike>>;
}
export declare class CompressionFilterFactory implements FilterFactory<CompressionFilter> {
    private readonly options;
    private sharedFilterConfig;
    constructor(channel: Channel, options: ChannelOptions);
    createFilter(): CompressionFilter;
}
export {};
