//#region src/utils/stream.d.ts
interface AbstractStream {
  /**
   * Add more text to the buffer
   * @param data
   */
  appendBuffer(data: string): void;
  /**
   * Indicate that there is no more text to be added to the buffer
   * (ie - our source material is done)
   */
  closeBuffer(): void;
  /**
   * Get the next chunk that is coming from the stream.
   * This chunk may be null, usually indicating the last chunk in the stream.
   */
  nextChunk(): Promise<any>;
  /**
   * Is the stream done?
   * A stream is only done if all of the following are true:
   * - There is no more data to be added to the text buffer
   * - There is no more data in the text buffer
   * - There are no chunks that are waiting to be consumed
   */
  get streamDone(): boolean;
}
declare function complexValue(value: unknown): unknown;
declare function simpleValue(val: unknown): unknown;
declare class JsonStream implements AbstractStream {
  _buffer: string;
  _bufferOpen: boolean;
  _firstRun: boolean;
  /**
   * Add data to the buffer. This may cause chunks to be generated, if available.
   * @param data
   */
  appendBuffer(data: string): void;
  /**
   * Indicate there is no more data that will be added to the text buffer.
   * This should be called when all the data has been read and added to indicate
   * that we should process everything remaining in the buffer.
   */
  closeBuffer(): void;
  /**
   * Skip characters in the buffer till we get to the start of an object.
   * Then attempt to read a full object.
   * If we do read a full object, turn it into a chunk and send it to the chunk handler.
   * Repeat this for as much as we can.
   */
  _parseBuffer(): void;
  /**
   * If the string is present, move the start of the buffer to the first occurrence
   * of that string. This is useful for skipping over elements or parts that we're not
   * really interested in parsing. (ie - the opening characters, comma separators, etc.)
   * @param start The string to start the buffer with
   */
  _skipTo(start: string): void;
  /**
   * Given what is in the buffer, parse a single object out of it.
   * If a complete object isn't available, return null.
   * Assumes that we are at the start of an object to parse.
   */
  _getFullObject(): object | null;
  _simplifyObject(obj: unknown): object;
  _chunkResolution: (chunk: any) => void;
  _chunkPending: Promise<any> | null;
  _chunkQueue: any[];
  /**
   * Register that we have another chunk available for consumption.
   * If we are waiting for a chunk, resolve the promise waiting for it immediately.
   * If not, then add it to the queue.
   * @param chunk
   */
  _handleChunk(chunk: any): void;
  /**
   * Get the next chunk that is coming from the stream.
   * This chunk may be null, usually indicating the last chunk in the stream.
   */
  nextChunk(): Promise<any>;
  /**
   * Is the stream done?
   * A stream is only done if all of the following are true:
   * - There is no more data to be added to the text buffer
   * - There is no more data in the text buffer
   * - There are no chunks that are waiting to be consumed
   */
  get streamDone(): boolean;
}
declare class ComplexJsonStream extends JsonStream {
  _simplifyObject(obj: unknown): object;
}
declare class ReadableAbstractStream implements AbstractStream {
  private baseStream;
  decoder: TextDecoder;
  constructor(baseStream: AbstractStream, body: ReadableStream | null);
  appendBuffer(data: string): void;
  closeBuffer(): void;
  nextChunk(): Promise<any>;
  get streamDone(): boolean;
  run(body: any): Promise<void>;
}
declare class ReadableJsonStream extends ReadableAbstractStream {
  constructor(body: ReadableStream | null);
}
declare class SseStream implements AbstractStream {
  _buffer: string;
  _bufferOpen: boolean;
  appendBuffer(data: string): void;
  closeBuffer(): void;
  /**
   * Attempt to load an entire event.
   * For each entire event we load,
   * send them to be handled.
   */
  _parseBuffer(): void;
  /**
   * Given an event string, get all the fields
   * in the event. It is assumed there is one field
   * per line, but that field names can be duplicated,
   * indicating to append the new value to the previous value
   * @param event
   */
  _parseEvent(event: string | null): Record<string, string> | null;
  _chunkResolution: (chunk: any) => void;
  _chunkPending: Promise<any> | null;
  _chunkQueue: any[];
  _handleEvent(event: string | null): void;
  nextChunk(): Promise<any>;
  get streamDone(): boolean;
}
declare class ReadableSseStream extends ReadableAbstractStream {
  constructor(body: ReadableStream | null);
}
declare class SseJsonStream extends SseStream {
  _jsonAttribute: string;
  constructor(jsonAttribute?: string);
  nextChunk(): Promise<any>;
}
declare class ReadableSseJsonStream extends ReadableAbstractStream {
  constructor(body: ReadableStream | null);
}
//#endregion
export { AbstractStream, ComplexJsonStream, JsonStream, ReadableAbstractStream, ReadableJsonStream, ReadableSseJsonStream, ReadableSseStream, SseJsonStream, SseStream, complexValue, simpleValue };
//# sourceMappingURL=stream.d.cts.map