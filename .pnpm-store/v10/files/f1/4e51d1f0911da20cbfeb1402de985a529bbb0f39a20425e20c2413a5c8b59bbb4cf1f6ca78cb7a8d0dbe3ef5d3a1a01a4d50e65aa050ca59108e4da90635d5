"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamDecoder = void 0;
var ReadState;
(function (ReadState) {
    ReadState[ReadState["NO_DATA"] = 0] = "NO_DATA";
    ReadState[ReadState["READING_SIZE"] = 1] = "READING_SIZE";
    ReadState[ReadState["READING_MESSAGE"] = 2] = "READING_MESSAGE";
})(ReadState || (ReadState = {}));
class StreamDecoder {
    constructor(maxReadMessageLength) {
        this.maxReadMessageLength = maxReadMessageLength;
        this.readState = ReadState.NO_DATA;
        this.readCompressFlag = Buffer.alloc(1);
        this.readPartialSize = Buffer.alloc(4);
        this.readSizeRemaining = 4;
        this.readMessageSize = 0;
        this.readPartialMessage = [];
        this.readMessageRemaining = 0;
    }
    write(data) {
        let readHead = 0;
        let toRead;
        const result = [];
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
                    data.copy(this.readPartialSize, 4 - this.readSizeRemaining, readHead, readHead + toRead);
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
                        }
                        else {
                            const message = Buffer.concat([this.readCompressFlag, this.readPartialSize], 5);
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
                        const framedMessage = Buffer.concat(framedMessageBuffers, this.readMessageSize + 5);
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
exports.StreamDecoder = StreamDecoder;
//# sourceMappingURL=stream-decoder.js.map