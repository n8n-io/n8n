/*
 * Copyright 2019 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import * as zlib from 'zlib';

import { WriteObject, WriteFlags } from './call-interface';
import { Channel } from './channel';
import { ChannelOptions } from './channel-options';
import { CompressionAlgorithms } from './compression-algorithms';
import { DEFAULT_MAX_RECEIVE_MESSAGE_LENGTH, DEFAULT_MAX_SEND_MESSAGE_LENGTH, LogVerbosity, Status } from './constants';
import { BaseFilter, Filter, FilterFactory } from './filter';
import * as logging from './logging';
import { Metadata, MetadataValue } from './metadata';

const isCompressionAlgorithmKey = (
  key: number
): key is CompressionAlgorithms => {
  return (
    typeof key === 'number' && typeof CompressionAlgorithms[key] === 'string'
  );
};

type CompressionAlgorithm = keyof typeof CompressionAlgorithms;

type SharedCompressionFilterConfig = {
  serverSupportedEncodingHeader?: string;
};

abstract class CompressionHandler {
  protected abstract compressMessage(message: Buffer): Promise<Buffer>;
  protected abstract decompressMessage(data: Buffer): Promise<Buffer>;
  /**
   * @param message Raw uncompressed message bytes
   * @param compress Indicates whether the message should be compressed
   * @return Framed message, compressed if applicable
   */
  async writeMessage(message: Buffer, compress: boolean): Promise<Buffer> {
    let messageBuffer = message;
    if (compress) {
      messageBuffer = await this.compressMessage(messageBuffer);
    }
    const output = Buffer.allocUnsafe(messageBuffer.length + 5);
    output.writeUInt8(compress ? 1 : 0, 0);
    output.writeUInt32BE(messageBuffer.length, 1);
    messageBuffer.copy(output, 5);
    return output;
  }
  /**
   * @param data Framed message, possibly compressed
   * @return Uncompressed message
   */
  async readMessage(data: Buffer): Promise<Buffer> {
    const compressed = data.readUInt8(0) === 1;
    let messageBuffer: Buffer<ArrayBufferLike> = data.slice(5);
    if (compressed) {
      messageBuffer = await this.decompressMessage(messageBuffer);
    }
    return messageBuffer;
  }
}

class IdentityHandler extends CompressionHandler {
  async compressMessage(message: Buffer) {
    return message;
  }

  async writeMessage(message: Buffer, compress: boolean): Promise<Buffer> {
    const output = Buffer.allocUnsafe(message.length + 5);
    /* With "identity" compression, messages should always be marked as
     * uncompressed */
    output.writeUInt8(0, 0);
    output.writeUInt32BE(message.length, 1);
    message.copy(output, 5);
    return output;
  }

  decompressMessage(message: Buffer): Promise<Buffer> {
    return Promise.reject<Buffer>(
      new Error(
        'Received compressed message but "grpc-encoding" header was identity'
      )
    );
  }
}

class DeflateHandler extends CompressionHandler {
  constructor(private maxRecvMessageLength: number) {
    super();
  }

  compressMessage(message: Buffer) {
    return new Promise<Buffer>((resolve, reject) => {
      zlib.deflate(message, (err, output) => {
        if (err) {
          reject(err);
        } else {
          resolve(output);
        }
      });
    });
  }

  decompressMessage(message: Buffer) {
    return new Promise<Buffer>((resolve, reject) => {
      let totalLength = 0;
      const messageParts: Buffer[] = [];
      const decompresser = zlib.createInflate();
      decompresser.on('data', (chunk: Buffer) => {
        messageParts.push(chunk);
        totalLength += chunk.byteLength;
        if (this.maxRecvMessageLength !== -1 && totalLength > this.maxRecvMessageLength) {
          decompresser.destroy();
          reject({
            code: Status.RESOURCE_EXHAUSTED,
            details: `Received message that decompresses to a size larger than ${this.maxRecvMessageLength}`
          });
        }
      });
      decompresser.on('end', () => {
        resolve(Buffer.concat(messageParts));
      });
      decompresser.write(message);
      decompresser.end();
    });
  }
}

class GzipHandler extends CompressionHandler {
  constructor(private maxRecvMessageLength: number) {
    super();
  }

  compressMessage(message: Buffer) {
    return new Promise<Buffer>((resolve, reject) => {
      zlib.gzip(message, (err, output) => {
        if (err) {
          reject(err);
        } else {
          resolve(output);
        }
      });
    });
  }

  decompressMessage(message: Buffer) {
    return new Promise<Buffer>((resolve, reject) => {
      let totalLength = 0;
      const messageParts: Buffer[] = [];
      const decompresser = zlib.createGunzip();
      decompresser.on('data', (chunk: Buffer) => {
        messageParts.push(chunk);
        totalLength += chunk.byteLength;
        if (this.maxRecvMessageLength !== -1 && totalLength > this.maxRecvMessageLength) {
          decompresser.destroy();
          reject({
            code: Status.RESOURCE_EXHAUSTED,
            details: `Received message that decompresses to a size larger than ${this.maxRecvMessageLength}`
          });
        }
      });
      decompresser.on('end', () => {
        resolve(Buffer.concat(messageParts));
      });
      decompresser.write(message);
      decompresser.end();
    });
  }
}

class UnknownHandler extends CompressionHandler {
  constructor(private readonly compressionName: string) {
    super();
  }
  compressMessage(message: Buffer): Promise<Buffer> {
    return Promise.reject<Buffer>(
      new Error(
        `Received message compressed with unsupported compression method ${this.compressionName}`
      )
    );
  }

  decompressMessage(message: Buffer): Promise<Buffer> {
    // This should be unreachable
    return Promise.reject<Buffer>(
      new Error(`Compression method not supported: ${this.compressionName}`)
    );
  }
}

function getCompressionHandler(compressionName: string, maxReceiveMessageSize: number): CompressionHandler {
  switch (compressionName) {
    case 'identity':
      return new IdentityHandler();
    case 'deflate':
      return new DeflateHandler(maxReceiveMessageSize);
    case 'gzip':
      return new GzipHandler(maxReceiveMessageSize);
    default:
      return new UnknownHandler(compressionName);
  }
}

export class CompressionFilter extends BaseFilter implements Filter {
  private sendCompression: CompressionHandler = new IdentityHandler();
  private receiveCompression: CompressionHandler = new IdentityHandler();
  private currentCompressionAlgorithm: CompressionAlgorithm = 'identity';
  private maxReceiveMessageLength: number;
  private maxSendMessageLength: number;

  constructor(
    channelOptions: ChannelOptions,
    private sharedFilterConfig: SharedCompressionFilterConfig
  ) {
    super();

    const compressionAlgorithmKey =
      channelOptions['grpc.default_compression_algorithm'];
    this.maxReceiveMessageLength = channelOptions['grpc.max_receive_message_length'] ?? DEFAULT_MAX_RECEIVE_MESSAGE_LENGTH;
    this.maxSendMessageLength = channelOptions['grpc.max_send_message_length'] ?? DEFAULT_MAX_SEND_MESSAGE_LENGTH;
    if (compressionAlgorithmKey !== undefined) {
      if (isCompressionAlgorithmKey(compressionAlgorithmKey)) {
        const clientSelectedEncoding = CompressionAlgorithms[
          compressionAlgorithmKey
        ] as CompressionAlgorithm;
        const serverSupportedEncodings =
          sharedFilterConfig.serverSupportedEncodingHeader?.split(',');
        /**
         * There are two possible situations here:
         * 1) We don't have any info yet from the server about what compression it supports
         *    In that case we should just use what the client tells us to use
         * 2) We've previously received a response from the server including a grpc-accept-encoding header
         *    In that case we only want to use the encoding chosen by the client if the server supports it
         */
        if (
          !serverSupportedEncodings ||
          serverSupportedEncodings.includes(clientSelectedEncoding)
        ) {
          this.currentCompressionAlgorithm = clientSelectedEncoding;
          this.sendCompression = getCompressionHandler(
            this.currentCompressionAlgorithm,
            -1
          );
        }
      } else {
        logging.log(
          LogVerbosity.ERROR,
          `Invalid value provided for grpc.default_compression_algorithm option: ${compressionAlgorithmKey}`
        );
      }
    }
  }

  async sendMetadata(metadata: Promise<Metadata>): Promise<Metadata> {
    const headers: Metadata = await metadata;
    headers.set('grpc-accept-encoding', 'identity,deflate,gzip');
    headers.set('accept-encoding', 'identity');

    // No need to send the header if it's "identity" -  behavior is identical; save the bandwidth
    if (this.currentCompressionAlgorithm === 'identity') {
      headers.remove('grpc-encoding');
    } else {
      headers.set('grpc-encoding', this.currentCompressionAlgorithm);
    }

    return headers;
  }

  receiveMetadata(metadata: Metadata): Metadata {
    const receiveEncoding: MetadataValue[] = metadata.get('grpc-encoding');
    if (receiveEncoding.length > 0) {
      const encoding: MetadataValue = receiveEncoding[0];
      if (typeof encoding === 'string') {
        this.receiveCompression = getCompressionHandler(encoding, this.maxReceiveMessageLength);
      }
    }
    metadata.remove('grpc-encoding');

    /* Check to see if the compression we're using to send messages is supported by the server
     * If not, reset the sendCompression filter and have it use the default IdentityHandler */
    const serverSupportedEncodingsHeader = metadata.get(
      'grpc-accept-encoding'
    )[0] as string | undefined;
    if (serverSupportedEncodingsHeader) {
      this.sharedFilterConfig.serverSupportedEncodingHeader =
        serverSupportedEncodingsHeader;
      const serverSupportedEncodings =
        serverSupportedEncodingsHeader.split(',');

      if (
        !serverSupportedEncodings.includes(this.currentCompressionAlgorithm)
      ) {
        this.sendCompression = new IdentityHandler();
        this.currentCompressionAlgorithm = 'identity';
      }
    }
    metadata.remove('grpc-accept-encoding');
    return metadata;
  }

  async sendMessage(message: Promise<WriteObject>): Promise<WriteObject> {
    /* This filter is special. The input message is the bare message bytes,
     * and the output is a framed and possibly compressed message. For this
     * reason, this filter should be at the bottom of the filter stack */
    const resolvedMessage: WriteObject = await message;
    if (this.maxSendMessageLength !== -1 && resolvedMessage.message.length > this.maxSendMessageLength) {
      throw {
        code: Status.RESOURCE_EXHAUSTED,
        details: `Attempted to send message with a size larger than ${this.maxSendMessageLength}`
      };
    }
    let compress: boolean;
    if (this.sendCompression instanceof IdentityHandler) {
      compress = false;
    } else {
      compress = ((resolvedMessage.flags ?? 0) & WriteFlags.NoCompress) === 0;
    }

    return {
      message: await this.sendCompression.writeMessage(
        resolvedMessage.message,
        compress
      ),
      flags: resolvedMessage.flags,
    };
  }

  async receiveMessage(message: Promise<Buffer>) {
    /* This filter is also special. The input message is framed and possibly
     * compressed, and the output message is deframed and uncompressed. So
     * this is another reason that this filter should be at the bottom of the
     * filter stack. */
    return this.receiveCompression.readMessage(await message);
  }
}

export class CompressionFilterFactory
  implements FilterFactory<CompressionFilter>
{
  private sharedFilterConfig: SharedCompressionFilterConfig = {};
  constructor(channel: Channel, private readonly options: ChannelOptions) {}
  createFilter(): CompressionFilter {
    return new CompressionFilter(this.options, this.sharedFilterConfig);
  }
}
