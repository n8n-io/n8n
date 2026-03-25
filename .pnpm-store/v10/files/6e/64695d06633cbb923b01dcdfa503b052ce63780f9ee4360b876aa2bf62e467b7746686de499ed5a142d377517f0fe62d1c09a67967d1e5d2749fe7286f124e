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

import * as http2 from 'http2';
import * as os from 'os';

import { DEFAULT_MAX_RECEIVE_MESSAGE_LENGTH, Status } from './constants';
import { Metadata } from './metadata';
import { StreamDecoder } from './stream-decoder';
import * as logging from './logging';
import { LogVerbosity } from './constants';
import {
  InterceptingListener,
  MessageContext,
  StatusObject,
  WriteCallback,
} from './call-interface';
import { CallEventTracker, Transport } from './transport';

const TRACER_NAME = 'subchannel_call';

/**
 * https://nodejs.org/api/errors.html#errors_class_systemerror
 */
interface SystemError extends Error {
  address?: string;
  code: string;
  dest?: string;
  errno: number;
  info?: object;
  message: string;
  path?: string;
  port?: number;
  syscall: string;
}

/**
 * Should do approximately the same thing as util.getSystemErrorName but the
 * TypeScript types don't have that function for some reason so I just made my
 * own.
 * @param errno
 */
function getSystemErrorName(errno: number): string {
  for (const [name, num] of Object.entries(os.constants.errno)) {
    if (num === errno) {
      return name;
    }
  }
  return 'Unknown system error ' + errno;
}

export interface SubchannelCall {
  cancelWithStatus(status: Status, details: string): void;
  getPeer(): string;
  sendMessageWithContext(context: MessageContext, message: Buffer): void;
  startRead(): void;
  halfClose(): void;
  getCallNumber(): number;
  getDeadlineInfo(): string[];
}

export interface StatusObjectWithRstCode extends StatusObject {
  rstCode?: number;
}

export interface SubchannelCallInterceptingListener
  extends InterceptingListener {
  onReceiveStatus(status: StatusObjectWithRstCode): void;
}

function mapHttpStatusCode(code: number): StatusObject {
  const details = `Received HTTP status code ${code}`;
  let mappedStatusCode: number;
  switch (code) {
    // TODO(murgatroid99): handle 100 and 101
    case 400:
      mappedStatusCode = Status.INTERNAL;
      break;
    case 401:
      mappedStatusCode = Status.UNAUTHENTICATED;
      break;
    case 403:
      mappedStatusCode = Status.PERMISSION_DENIED;
      break;
    case 404:
      mappedStatusCode = Status.UNIMPLEMENTED;
      break;
    case 429:
    case 502:
    case 503:
    case 504:
      mappedStatusCode = Status.UNAVAILABLE;
      break;
    default:
      mappedStatusCode = Status.UNKNOWN;
  }
  return {
    code: mappedStatusCode,
    details: details,
    metadata: new Metadata()
  };
}

export class Http2SubchannelCall implements SubchannelCall {
  private decoder: StreamDecoder;

  private isReadFilterPending = false;
  private isPushPending = false;
  private canPush = false;
  /**
   * Indicates that an 'end' event has come from the http2 stream, so there
   * will be no more data events.
   */
  private readsClosed = false;

  private statusOutput = false;

  private unpushedReadMessages: Buffer[] = [];

  private httpStatusCode: number | undefined;

  // This is populated (non-null) if and only if the call has ended
  private finalStatus: StatusObject | null = null;

  private internalError: SystemError | null = null;

  private serverEndedCall = false;

  private connectionDropped = false;

  constructor(
    private readonly http2Stream: http2.ClientHttp2Stream,
    private readonly callEventTracker: CallEventTracker,
    private readonly listener: SubchannelCallInterceptingListener,
    private readonly transport: Transport,
    private readonly callId: number
  ) {
    const maxReceiveMessageLength = transport.getOptions()['grpc.max_receive_message_length'] ?? DEFAULT_MAX_RECEIVE_MESSAGE_LENGTH;
    this.decoder = new StreamDecoder(maxReceiveMessageLength);
    http2Stream.on('response', (headers, flags) => {
      let headersString = '';
      for (const header of Object.keys(headers)) {
        headersString += '\t\t' + header + ': ' + headers[header] + '\n';
      }
      this.trace('Received server headers:\n' + headersString);
      this.httpStatusCode = headers[':status'];

      if (flags & http2.constants.NGHTTP2_FLAG_END_STREAM) {
        this.handleTrailers(headers);
      } else {
        let metadata: Metadata;
        try {
          metadata = Metadata.fromHttp2Headers(headers);
        } catch (error) {
          this.endCall({
            code: Status.UNKNOWN,
            details: (error as Error).message,
            metadata: new Metadata(),
          });
          return;
        }
        this.listener.onReceiveMetadata(metadata);
      }
    });
    http2Stream.on('trailers', (headers: http2.IncomingHttpHeaders) => {
      this.handleTrailers(headers);
    });
    http2Stream.on('data', (data: Buffer) => {
      /* If the status has already been output, allow the http2 stream to
       * drain without processing the data. */
      if (this.statusOutput) {
        return;
      }
      this.trace('receive HTTP/2 data frame of length ' + data.length);
      let messages: Buffer[];
      try {
        messages = this.decoder.write(data);
      } catch (e) {
        /* Some servers send HTML error pages along with HTTP status codes.
         * When the client attempts to parse this as a length-delimited
         * message, the parsed message size is greater than the default limit,
         * resulting in a message decoding error. In that situation, the HTTP
         * error code information is more useful to the user than the
         * RESOURCE_EXHAUSTED error is, so we report that instead. Normally,
         * we delay processing the HTTP status until after the stream ends, to
         * prioritize reporting the gRPC status from trailers if it is present,
         * but when there is a message parsing error we end the stream early
         * before processing trailers. */
        if (this.httpStatusCode !== undefined && this.httpStatusCode !== 200) {
          const mappedStatus = mapHttpStatusCode(this.httpStatusCode);
          this.cancelWithStatus(mappedStatus.code, mappedStatus.details);
        } else {
          this.cancelWithStatus(Status.RESOURCE_EXHAUSTED, (e as Error).message);
        }
        return;
      }

      for (const message of messages) {
        this.trace('parsed message of length ' + message.length);
        this.callEventTracker!.addMessageReceived();
        this.tryPush(message);
      }
    });
    http2Stream.on('end', () => {
      this.readsClosed = true;
      this.maybeOutputStatus();
    });
    http2Stream.on('close', () => {
      this.serverEndedCall = true;
      /* Use process.next tick to ensure that this code happens after any
       * "error" event that may be emitted at about the same time, so that
       * we can bubble up the error message from that event. */
      process.nextTick(() => {
        this.trace('HTTP/2 stream closed with code ' + http2Stream.rstCode);
        /* If we have a final status with an OK status code, that means that
         * we have received all of the messages and we have processed the
         * trailers and the call completed successfully, so it doesn't matter
         * how the stream ends after that */
        if (this.finalStatus?.code === Status.OK) {
          return;
        }
        let code: Status;
        let details = '';
        switch (http2Stream.rstCode) {
          case http2.constants.NGHTTP2_NO_ERROR:
            /* If we get a NO_ERROR code and we already have a status, the
             * stream completed properly and we just haven't fully processed
             * it yet */
            if (this.finalStatus !== null) {
              return;
            }
            if (this.httpStatusCode && this.httpStatusCode !== 200) {
              const mappedStatus = mapHttpStatusCode(this.httpStatusCode);
              code = mappedStatus.code;
              details = mappedStatus.details;
            } else {
              code = Status.INTERNAL;
              details = `Received RST_STREAM with code ${http2Stream.rstCode} (Call ended without gRPC status)`;
            }
            break;
          case http2.constants.NGHTTP2_REFUSED_STREAM:
            code = Status.UNAVAILABLE;
            details = 'Stream refused by server';
            break;
          case http2.constants.NGHTTP2_CANCEL:
            /* Bug reports indicate that Node synthesizes a NGHTTP2_CANCEL
             * code from connection drops. We want to prioritize reporting
             * an unavailable status when that happens. */
            if (this.connectionDropped) {
              code = Status.UNAVAILABLE;
              details = 'Connection dropped';
            } else {
              code = Status.CANCELLED;
              details = 'Call cancelled';
            }
            break;
          case http2.constants.NGHTTP2_ENHANCE_YOUR_CALM:
            code = Status.RESOURCE_EXHAUSTED;
            details = 'Bandwidth exhausted or memory limit exceeded';
            break;
          case http2.constants.NGHTTP2_INADEQUATE_SECURITY:
            code = Status.PERMISSION_DENIED;
            details = 'Protocol not secure enough';
            break;
          case http2.constants.NGHTTP2_INTERNAL_ERROR:
            code = Status.INTERNAL;
            if (this.internalError === null) {
              /* This error code was previously handled in the default case, and
               * there are several instances of it online, so I wanted to
               * preserve the original error message so that people find existing
               * information in searches, but also include the more recognizable
               * "Internal server error" message. */
              details = `Received RST_STREAM with code ${http2Stream.rstCode} (Internal server error)`;
            } else {
              if (
                this.internalError.code === 'ECONNRESET' ||
                this.internalError.code === 'ETIMEDOUT'
              ) {
                code = Status.UNAVAILABLE;
                details = this.internalError.message;
              } else {
                /* The "Received RST_STREAM with code ..." error is preserved
                 * here for continuity with errors reported online, but the
                 * error message at the end will probably be more relevant in
                 * most cases. */
                details = `Received RST_STREAM with code ${http2Stream.rstCode} triggered by internal client error: ${this.internalError.message}`;
              }
            }
            break;
          default:
            code = Status.INTERNAL;
            details = `Received RST_STREAM with code ${http2Stream.rstCode}`;
        }
        // This is a no-op if trailers were received at all.
        // This is OK, because status codes emitted here correspond to more
        // catastrophic issues that prevent us from receiving trailers in the
        // first place.
        this.endCall({
          code,
          details,
          metadata: new Metadata(),
          rstCode: http2Stream.rstCode,
        });
      });
    });
    http2Stream.on('error', (err: SystemError) => {
      /* We need an error handler here to stop "Uncaught Error" exceptions
       * from bubbling up. However, errors here should all correspond to
       * "close" events, where we will handle the error more granularly */
      /* Specifically looking for stream errors that were *not* constructed
       * from a RST_STREAM response here:
       * https://github.com/nodejs/node/blob/8b8620d580314050175983402dfddf2674e8e22a/lib/internal/http2/core.js#L2267
       */
      if (err.code !== 'ERR_HTTP2_STREAM_ERROR') {
        this.trace(
          'Node error event: message=' +
            err.message +
            ' code=' +
            err.code +
            ' errno=' +
            getSystemErrorName(err.errno) +
            ' syscall=' +
            err.syscall
        );
        this.internalError = err;
      }
      this.callEventTracker.onStreamEnd(false);
    });
  }
  getDeadlineInfo(): string[] {
    return [`remote_addr=${this.getPeer()}`];
  }

  public onDisconnect() {
    this.connectionDropped = true;
    /* Give the call an event loop cycle to finish naturally before reporting
     * the disconnection as an error. */
    setImmediate(() => {
      this.endCall({
        code: Status.UNAVAILABLE,
        details: 'Connection dropped',
        metadata: new Metadata(),
      });
    });
  }

  private outputStatus() {
    /* Precondition: this.finalStatus !== null */
    if (!this.statusOutput) {
      this.statusOutput = true;
      this.trace(
        'ended with status: code=' +
          this.finalStatus!.code +
          ' details="' +
          this.finalStatus!.details +
          '"'
      );
      this.callEventTracker.onCallEnd(this.finalStatus!);
      /* We delay the actual action of bubbling up the status to insulate the
       * cleanup code in this class from any errors that may be thrown in the
       * upper layers as a result of bubbling up the status. In particular,
       * if the status is not OK, the "error" event may be emitted
       * synchronously at the top level, which will result in a thrown error if
       * the user does not handle that event. */
      process.nextTick(() => {
        this.listener.onReceiveStatus(this.finalStatus!);
      });
      /* Leave the http2 stream in flowing state to drain incoming messages, to
       * ensure that the stream closure completes. The call stream already does
       * not push more messages after the status is output, so the messages go
       * nowhere either way. */
      this.http2Stream.resume();
    }
  }

  private trace(text: string): void {
    logging.trace(
      LogVerbosity.DEBUG,
      TRACER_NAME,
      '[' + this.callId + '] ' + text
    );
  }

  /**
   * On first call, emits a 'status' event with the given StatusObject.
   * Subsequent calls are no-ops.
   * @param status The status of the call.
   */
  private endCall(status: StatusObjectWithRstCode): void {
    /* If the status is OK and a new status comes in (e.g. from a
     * deserialization failure), that new status takes priority */
    if (this.finalStatus === null || this.finalStatus.code === Status.OK) {
      this.finalStatus = status;
      this.maybeOutputStatus();
    }
    this.destroyHttp2Stream();
  }

  private maybeOutputStatus() {
    if (this.finalStatus !== null) {
      /* The combination check of readsClosed and that the two message buffer
       * arrays are empty checks that there all incoming data has been fully
       * processed */
      if (
        this.finalStatus.code !== Status.OK ||
        (this.readsClosed &&
          this.unpushedReadMessages.length === 0 &&
          !this.isReadFilterPending &&
          !this.isPushPending)
      ) {
        this.outputStatus();
      }
    }
  }

  private push(message: Buffer): void {
    this.trace(
      'pushing to reader message of length ' +
        (message instanceof Buffer ? message.length : null)
    );
    this.canPush = false;
    this.isPushPending = true;
    process.nextTick(() => {
      this.isPushPending = false;
      /* If we have already output the status any later messages should be
       * ignored, and can cause out-of-order operation errors higher up in the
       * stack. Checking as late as possible here to avoid any race conditions.
       */
      if (this.statusOutput) {
        return;
      }
      this.listener.onReceiveMessage(message);
      this.maybeOutputStatus();
    });
  }

  private tryPush(messageBytes: Buffer): void {
    if (this.canPush) {
      this.http2Stream!.pause();
      this.push(messageBytes);
    } else {
      this.trace(
        'unpushedReadMessages.push message of length ' + messageBytes.length
      );
      this.unpushedReadMessages.push(messageBytes);
    }
  }

  private handleTrailers(headers: http2.IncomingHttpHeaders) {
    this.serverEndedCall = true;
    this.callEventTracker.onStreamEnd(true);
    let headersString = '';
    for (const header of Object.keys(headers)) {
      headersString += '\t\t' + header + ': ' + headers[header] + '\n';
    }
    this.trace('Received server trailers:\n' + headersString);
    let metadata: Metadata;
    try {
      metadata = Metadata.fromHttp2Headers(headers);
    } catch (e) {
      metadata = new Metadata();
    }
    const metadataMap = metadata.getMap();
    let status: StatusObject;
    if (typeof metadataMap['grpc-status'] === 'string') {
      const receivedStatus: Status = Number(metadataMap['grpc-status']);
      this.trace('received status code ' + receivedStatus + ' from server');
      metadata.remove('grpc-status');
      let details = '';
      if (typeof metadataMap['grpc-message'] === 'string') {
        try {
          details = decodeURI(metadataMap['grpc-message']);
        } catch (e) {
          details = metadataMap['grpc-message'];
        }
        metadata.remove('grpc-message');
        this.trace(
          'received status details string "' + details + '" from server'
        );
      }
      status = {
        code: receivedStatus,
        details: details,
        metadata: metadata
      };
    } else if (this.httpStatusCode) {
      status = mapHttpStatusCode(this.httpStatusCode);
      status.metadata = metadata;
    } else {
      status = {
        code: Status.UNKNOWN,
        details: 'No status information received',
        metadata: metadata
      };
    }
    // This is a no-op if the call was already ended when handling headers.
    this.endCall(status);
  }

  private destroyHttp2Stream() {
    // The http2 stream could already have been destroyed if cancelWithStatus
    // is called in response to an internal http2 error.
    if (this.http2Stream.destroyed) {
      return;
    }
    /* If the server ended the call, sending an RST_STREAM is redundant, so we
     * just half close on the client side instead to finish closing the stream.
     */
    if (this.serverEndedCall) {
      this.http2Stream.end();
    } else {
      /* If the call has ended with an OK status, communicate that when closing
       * the stream, partly to avoid a situation in which we detect an error
       * RST_STREAM as a result after we have the status */
      let code: number;
      if (this.finalStatus?.code === Status.OK) {
        code = http2.constants.NGHTTP2_NO_ERROR;
      } else {
        code = http2.constants.NGHTTP2_CANCEL;
      }
      this.trace('close http2 stream with code ' + code);
      this.http2Stream.close(code);
    }
  }

  cancelWithStatus(status: Status, details: string): void {
    this.trace(
      'cancelWithStatus code: ' + status + ' details: "' + details + '"'
    );
    this.endCall({ code: status, details, metadata: new Metadata() });
  }

  getStatus(): StatusObject | null {
    return this.finalStatus;
  }

  getPeer(): string {
    return this.transport.getPeerName();
  }

  getCallNumber(): number {
    return this.callId;
  }

  startRead() {
    /* If the stream has ended with an error, we should not emit any more
     * messages and we should communicate that the stream has ended */
    if (this.finalStatus !== null && this.finalStatus.code !== Status.OK) {
      this.readsClosed = true;
      this.maybeOutputStatus();
      return;
    }
    this.canPush = true;
    if (this.unpushedReadMessages.length > 0) {
      const nextMessage: Buffer = this.unpushedReadMessages.shift()!;
      this.push(nextMessage);
      return;
    }
    /* Only resume reading from the http2Stream if we don't have any pending
     * messages to emit */
    this.http2Stream.resume();
  }

  sendMessageWithContext(context: MessageContext, message: Buffer) {
    this.trace('write() called with message of length ' + message.length);
    const cb: WriteCallback = (error?: Error | null) => {
      /* nextTick here ensures that no stream action can be taken in the call
       * stack of the write callback, in order to hopefully work around
       * https://github.com/nodejs/node/issues/49147 */
      process.nextTick(() => {
        let code: Status = Status.UNAVAILABLE;
        if (
          (error as NodeJS.ErrnoException)?.code ===
          'ERR_STREAM_WRITE_AFTER_END'
        ) {
          code = Status.INTERNAL;
        }
        if (error) {
          this.cancelWithStatus(code, `Write error: ${error.message}`);
        }
        context.callback?.();
      });
    };
    this.trace('sending data chunk of length ' + message.length);
    this.callEventTracker.addMessageSent();
    try {
      this.http2Stream!.write(message, cb);
    } catch (error) {
      this.endCall({
        code: Status.UNAVAILABLE,
        details: `Write failed with error ${(error as Error).message}`,
        metadata: new Metadata(),
      });
    }
  }

  halfClose() {
    this.trace('end() called');
    this.trace('calling end() on HTTP/2 stream');
    this.http2Stream.end();
  }
}
