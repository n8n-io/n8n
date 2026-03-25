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

enum ReadState {
  NO_DATA,
  READING_SIZE,
  READING_MESSAGE,
}

export class StreamDecoder {
  private readState: ReadState = ReadState.NO_DATA;
  private readCompressFlag: Buffer = Buffer.alloc(1);
  private readPartialSize: Buffer = Buffer.alloc(4);
  private readSizeRemaining = 4;
  private readMessageSize = 0;
  private readPartialMessage: Buffer[] = [];
  private readMessageRemaining = 0;

  constructor(private maxReadMessageLength: number) {}

  write(data: Buffer): Buffer[] {
    let readHead = 0;
    let toRead: number;
    const result: Buffer[] = [];

    while (readHead < data.length) {
      switch (this.readState) {
        case ReadState.NO_DATA:
          this.readCompressFlag = data.slice(readHead, readHead + 1);
          readHead += 1;
          this.readState = ReadState.READING_SIZE;
          this.readPartialSize.fill(0);
          this.readSizeRemaining = 4;
          this.readMessageSize = 0;
          this.readMessageRemaining = 0;
          this.readPartialMessage = [];
          break;
        case ReadState.READING_SIZE:
          toRead = Math.min(data.length - readHead, this.readSizeRemaining);
          data.copy(
            this.readPartialSize,
            4 - this.readSizeRemaining,
            readHead,
            readHead + toRead
          );
          this.readSizeRemaining -= toRead;
          readHead += toRead;
          // readSizeRemaining >=0 here
          if (this.readSizeRemaining === 0) {
            this.readMessageSize = this.readPartialSize.readUInt32BE(0);
            if (this.maxReadMessageLength !== -1 && this.readMessageSize > this.maxReadMessageLength) {
              throw new Error(`Received message larger than max (${this.readMessageSize} vs ${this.maxReadMessageLength})`);
            }
            this.readMessageRemaining = this.readMessageSize;
            if (this.readMessageRemaining > 0) {
              this.readState = ReadState.READING_MESSAGE;
            } else {
              const message = Buffer.concat(
                [this.readCompressFlag, this.readPartialSize],
                5
              );

              this.readState = ReadState.NO_DATA;
              result.push(message);
            }
          }
          break;
        case ReadState.READING_MESSAGE:
          toRead = Math.min(data.length - readHead, this.readMessageRemaining);
          this.readPartialMessage.push(data.slice(readHead, readHead + toRead));
          this.readMessageRemaining -= toRead;
          readHead += toRead;
          // readMessageRemaining >=0 here
          if (this.readMessageRemaining === 0) {
            // At this point, we have read a full message
            const framedMessageBuffers = [
              this.readCompressFlag,
              this.readPartialSize,
            ].concat(this.readPartialMessage);
            const framedMessage = Buffer.concat(
              framedMessageBuffers,
              this.readMessageSize + 5
            );

            this.readState = ReadState.NO_DATA;
            result.push(framedMessage);
          }
          break;
        default:
          throw new Error('Unexpected read state');
      }
    }

    return result;
  }
}
