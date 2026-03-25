import {
  Channel,
  ChannelCredentials,
  ChannelOptions,
  connectivityState,
} from '@grpc/grpc-js';

const knownProtocols = new Set(['http', 'https']);

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
export function createChannel(
  address: string,
  credentials?: ChannelCredentials,
  options: ChannelOptions = {},
): Channel {
  const match = /^(?:([^:]+):\/\/)?(.*?)(?::(\d+))?$/.exec(address);
  if (match == null) throw new Error(`Invalid address: '${address}'`);

  let [, protocol, host, port] = match;

  const knownProtocol = !protocol || knownProtocols.has(protocol);
  const isSecure = credentials?._isSecure() || protocol?.includes('https');

  credentials ??= isSecure
    ? ChannelCredentials.createSsl()
    : ChannelCredentials.createInsecure();
  port ??= isSecure ? '443' : '80';

  let target = knownProtocol ? `${host}:${port}` : address;
  return new Channel(target, credentials, options);
}

/**
 * Waits for the channel to be connected.
 *
 * It is not necessary to call this function before making a call on a client.
 */
export async function waitForChannelReady(
  channel: Channel,
  deadline: Date,
): Promise<void> {
  while (true) {
    const state = channel.getConnectivityState(true);

    if (state === connectivityState.READY) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      channel.watchConnectivityState(state, deadline, err => {
        if (err != null) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
