import { IterableReadableStream } from "./stream.cjs";

//#region src/utils/event_source_parse.d.ts
declare const EventStreamContentType = "text/event-stream";
/**
 * Represents a message sent in an event stream
 * https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events#Event_stream_format
 */
interface EventSourceMessage {
  /** The event ID to set the EventSource object's last event ID value. */
  id: string;
  /** A string identifying the type of event described. */
  event: string;
  /** The event data */
  data: string;
  /** The reconnection interval (in milliseconds) to wait before retrying the connection */
  retry?: number;
}
/**
 * Converts a ReadableStream into a callback pattern.
 * @param stream The input ReadableStream.
 * @param onChunk A function that will be called on each new byte chunk in the stream.
 * @returns {Promise<void>} A promise that will be resolved when the stream closes.
 */
declare function getBytes(stream: ReadableStream<Uint8Array> | AsyncIterable<any>, onChunk: (arr: Uint8Array, flush?: boolean) => void): Promise<void>;
/**
 * Parses arbitary byte chunks into EventSource line buffers.
 * Each line should be of the format "field: value" and ends with \r, \n, or \r\n.
 * @param onLine A function that will be called on each new EventSource line.
 * @returns A function that should be called for each incoming byte chunk.
 */
declare function getLines(onLine: (line: Uint8Array, fieldLength: number, flush?: boolean) => void): (arr: Uint8Array<ArrayBufferLike>, flush?: boolean | undefined) => void;
/**
 * Parses line buffers into EventSourceMessages.
 * @param onId A function that will be called on each `id` field.
 * @param onRetry A function that will be called on each `retry` field.
 * @param onMessage A function that will be called on each message.
 * @returns A function that should be called for each incoming line buffer.
 */
declare function getMessages(onMessage?: (msg: EventSourceMessage) => void, onId?: (id: string) => void, onRetry?: (retry: number) => void): (line: Uint8Array<ArrayBufferLike>, fieldLength: number, flush?: boolean | undefined) => void;
declare function convertEventStreamToIterableReadableDataStream(stream: ReadableStream, onMetadataEvent?: (e: unknown) => unknown): IterableReadableStream<any>;
//#endregion
export { EventSourceMessage, EventStreamContentType, convertEventStreamToIterableReadableDataStream, getBytes, getLines, getMessages };
//# sourceMappingURL=event_source_parse.d.cts.map