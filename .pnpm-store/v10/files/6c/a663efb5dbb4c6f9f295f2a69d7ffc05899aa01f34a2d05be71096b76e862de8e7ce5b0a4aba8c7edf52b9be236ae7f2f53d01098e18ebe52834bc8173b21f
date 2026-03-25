import { Channel, ChannelCredentials, ChannelOptions } from '@grpc/grpc-js';
/**
 * Creates a new channel. The channel represents a remote endpoint that can be
 * connected to.
 *
 * @param address The address of the server, in the form `protocol://host:port`,
 *     where `protocol` is one of `http` or `https`.
 *     If the protocol is not specified, it will be inferred from the
 *     credentials.
 *     If the port is not specified, it will be inferred from the protocol.
 * @param credentials Optional credentials object that is usually created by
 *     calling `ChannelCredentials.createSsl()` or
 *     `ChannelCredentials.createInsecure()`. If not specified, the credentials
 *     will be inferred from the protocol. If the protocol is not specified,
 *     `ChannelCredentials.createInsecure()` will be used.
 * @param options Optional channel options object.
 * @returns The new channel.
 */
export declare function createChannel(address: string, credentials?: ChannelCredentials, options?: ChannelOptions): Channel;
/**
 * Waits for the channel to be connected.
 *
 * It is not necessary to call this function before making a call on a client.
 */
export declare function waitForChannelReady(channel: Channel, deadline: Date): Promise<void>;
