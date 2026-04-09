import { EventEmitter } from 'node:events';
import { ServerResponse } from 'node:http';

class MockServerResponse extends EventEmitter {
  writtenChunks: any[] = [];
  headers: Record<string, string> = {};
  statusCode = 0;
  statusMessage = '';
  ended = false;

  write(chunk: any): boolean {
    this.writtenChunks.push(chunk);
    return true;
  }

  end(): void {
    this.ended = true;
  }

  writeHead(
    statusCode: number,
    arg2: string | Record<string, string>,
    arg3?: Record<string, string>,
  ): void {
    this.statusCode = statusCode;

    if (typeof arg2 === 'string') {
      this.statusMessage = arg2;
      this.headers = arg3 ?? {};
    } else {
      this.statusMessage = '';
      this.headers = arg2;
    }
  }

  get body() {
    // Combine all written chunks into a single string
    return this.writtenChunks.join('');
  }

  /**
   * Get the decoded chunks as strings.
   */
  getDecodedChunks() {
    const decoder = new TextDecoder();
    return this.writtenChunks.map(chunk => decoder.decode(chunk));
  }

  /**
   * Wait for the stream to finish writing to the mock response.
   */
  async waitForEnd() {
    await new Promise(resolve => {
      const checkIfEnded = () => {
        if (this.ended) {
          resolve(undefined);
        } else {
          setImmediate(checkIfEnded);
        }
      };
      checkIfEnded();
    });
  }
}

export function createMockServerResponse(): ServerResponse &
  MockServerResponse {
  return new MockServerResponse() as ServerResponse & MockServerResponse;
}
