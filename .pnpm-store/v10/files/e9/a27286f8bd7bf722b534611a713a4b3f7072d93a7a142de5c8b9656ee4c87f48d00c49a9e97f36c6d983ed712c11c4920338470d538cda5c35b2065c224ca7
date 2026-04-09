import { OpenAIError } from '../../error';

export type Bytes = string | ArrayBuffer | Uint8Array | Buffer | null | undefined;

/**
 * A re-implementation of httpx's `LineDecoder` in Python that handles incrementally
 * reading lines from text.
 *
 * https://github.com/encode/httpx/blob/920333ea98118e9cf617f246905d7b202510941c/httpx/_decoders.py#L258
 */
export class LineDecoder {
  // prettier-ignore
  static NEWLINE_CHARS = new Set(['\n', '\r']);
  static NEWLINE_REGEXP = /\r\n|[\n\r]/g;

  buffer: Uint8Array;
  #carriageReturnIndex: number | null;
  textDecoder: any; // TextDecoder found in browsers; not typed to avoid pulling in either "dom" or "node" types.

  constructor() {
    this.buffer = new Uint8Array();
    this.#carriageReturnIndex = null;
  }

  decode(chunk: Bytes): string[] {
    if (chunk == null) {
      return [];
    }

    const binaryChunk =
      chunk instanceof ArrayBuffer ? new Uint8Array(chunk)
      : typeof chunk === 'string' ? new TextEncoder().encode(chunk)
      : chunk;

    let newData = new Uint8Array(this.buffer.length + binaryChunk.length);
    newData.set(this.buffer);
    newData.set(binaryChunk, this.buffer.length);
    this.buffer = newData;

    const lines: string[] = [];
    let patternIndex;
    while ((patternIndex = findNewlineIndex(this.buffer, this.#carriageReturnIndex)) != null) {
      if (patternIndex.carriage && this.#carriageReturnIndex == null) {
        // skip until we either get a corresponding `\n`, a new `\r` or nothing
        this.#carriageReturnIndex = patternIndex.index;
        continue;
      }

      // we got double \r or \rtext\n
      if (
        this.#carriageReturnIndex != null &&
        (patternIndex.index !== this.#carriageReturnIndex + 1 || patternIndex.carriage)
      ) {
        lines.push(this.decodeText(this.buffer.slice(0, this.#carriageReturnIndex - 1)));
        this.buffer = this.buffer.slice(this.#carriageReturnIndex);
        this.#carriageReturnIndex = null;
        continue;
      }

      const endIndex =
        this.#carriageReturnIndex !== null ? patternIndex.preceding - 1 : patternIndex.preceding;

      const line = this.decodeText(this.buffer.slice(0, endIndex));
      lines.push(line);

      this.buffer = this.buffer.slice(patternIndex.index);
      this.#carriageReturnIndex = null;
    }

    return lines;
  }

  decodeText(bytes: Bytes): string {
    if (bytes == null) return '';
    if (typeof bytes === 'string') return bytes;

    // Node:
    if (typeof Buffer !== 'undefined') {
      if (bytes instanceof Buffer) {
        return bytes.toString();
      }
      if (bytes instanceof Uint8Array) {
        return Buffer.from(bytes).toString();
      }

      throw new OpenAIError(
        `Unexpected: received non-Uint8Array (${bytes.constructor.name}) stream chunk in an environment with a global "Buffer" defined, which this library assumes to be Node. Please report this error.`,
      );
    }

    // Browser
    if (typeof TextDecoder !== 'undefined') {
      if (bytes instanceof Uint8Array || bytes instanceof ArrayBuffer) {
        this.textDecoder ??= new TextDecoder('utf8');
        return this.textDecoder.decode(bytes);
      }

      throw new OpenAIError(
        `Unexpected: received non-Uint8Array/ArrayBuffer (${
          (bytes as any).constructor.name
        }) in a web platform. Please report this error.`,
      );
    }

    throw new OpenAIError(
      `Unexpected: neither Buffer nor TextDecoder are available as globals. Please report this error.`,
    );
  }

  flush(): string[] {
    if (!this.buffer.length) {
      return [];
    }
    return this.decode('\n');
  }
}

/**
 * This function searches the buffer for the end patterns, (\r or \n)
 * and returns an object with the index preceding the matched newline and the
 * index after the newline char. `null` is returned if no new line is found.
 *
 * ```ts
 * findNewLineIndex('abc\ndef') -> { preceding: 2, index: 3 }
 * ```
 */
function findNewlineIndex(
  buffer: Uint8Array,
  startIndex: number | null,
): { preceding: number; index: number; carriage: boolean } | null {
  const newline = 0x0a; // \n
  const carriage = 0x0d; // \r

  for (let i = startIndex ?? 0; i < buffer.length; i++) {
    if (buffer[i] === newline) {
      return { preceding: i, index: i + 1, carriage: false };
    }

    if (buffer[i] === carriage) {
      return { preceding: i, index: i + 1, carriage: true };
    }
  }

  return null;
}

export function findDoubleNewlineIndex(buffer: Uint8Array): number {
  // This function searches the buffer for the end patterns (\r\r, \n\n, \r\n\r\n)
  // and returns the index right after the first occurrence of any pattern,
  // or -1 if none of the patterns are found.
  const newline = 0x0a; // \n
  const carriage = 0x0d; // \r

  for (let i = 0; i < buffer.length - 1; i++) {
    if (buffer[i] === newline && buffer[i + 1] === newline) {
      // \n\n
      return i + 2;
    }
    if (buffer[i] === carriage && buffer[i + 1] === carriage) {
      // \r\r
      return i + 2;
    }
    if (
      buffer[i] === carriage &&
      buffer[i + 1] === newline &&
      i + 3 < buffer.length &&
      buffer[i + 2] === carriage &&
      buffer[i + 3] === newline
    ) {
      // \r\n\r\n
      return i + 4;
    }
  }

  return -1;
}
