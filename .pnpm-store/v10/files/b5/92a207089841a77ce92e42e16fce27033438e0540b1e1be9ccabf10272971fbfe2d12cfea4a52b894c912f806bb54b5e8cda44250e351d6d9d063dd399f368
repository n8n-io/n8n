"use strict";
/**
 This file is a part of fetch-event-source package (as of v2.0.1)
 https://github.com/Azure/fetch-event-source/blob/v2.0.1/src/parse.ts

 Full package can be used after it is made compatible with nodejs:
 https://github.com/Azure/fetch-event-source/issues/20

 Below is the fetch-event-source package license:

 MIT License

 Copyright (c) Microsoft Corporation.

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE

 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBytes = getBytes;
exports.getLines = getLines;
exports.getMessages = getMessages;
/**
 * Converts a ReadableStream into a callback pattern.
 * @param stream The input ReadableStream.
 * @param onChunk A function that will be called on each new byte chunk in the stream.
 * @returns {Promise<void>} A promise that will be resolved when the stream closes.
 */
async function getBytes(stream, onChunk) {
    const reader = stream.getReader();
    let result;
    while (!(result = await reader.read()).done) {
        onChunk(result.value);
    }
}
/**
 * Parses arbitary byte chunks into EventSource line buffers.
 * Each line should be of the format "field: value" and ends with \r, \n, or \r\n.
 * @param onLine A function that will be called on each new EventSource line.
 * @returns A function that should be called for each incoming byte chunk.
 */
function getLines(onLine) {
    let buffer;
    let position; // current read position
    let fieldLength; // length of the `field` portion of the line
    let discardTrailingNewline = false;
    // return a function that can process each incoming byte chunk:
    return function onChunk(arr) {
        if (buffer === undefined) {
            buffer = arr;
            position = 0;
            fieldLength = -1;
        }
        else {
            // we're still parsing the old line. Append the new bytes into buffer:
            buffer = concat(buffer, arr);
        }
        const bufLength = buffer.length;
        let lineStart = 0; // index where the current line starts
        while (position < bufLength) {
            if (discardTrailingNewline) {
                if (buffer[position] === 10 /* ControlChars.NewLine */) {
                    lineStart = ++position; // skip to next char
                }
                discardTrailingNewline = false;
            }
            // start looking forward till the end of line:
            let lineEnd = -1; // index of the \r or \n char
            for (; position < bufLength && lineEnd === -1; ++position) {
                switch (buffer[position]) {
                    case 58 /* ControlChars.Colon */:
                        if (fieldLength === -1) { // first colon in line
                            fieldLength = position - lineStart;
                        }
                        break;
                    case 13 /* ControlChars.CarriageReturn */:
                        discardTrailingNewline = true;
                    // eslint-disable-next-line no-fallthrough
                    case 10 /* ControlChars.NewLine */:
                        lineEnd = position;
                        break;
                }
            }
            if (lineEnd === -1) {
                // We reached the end of the buffer but the line hasn't ended.
                // Wait for the next arr and then continue parsing:
                break;
            }
            // we've reached the line end, send it out:
            onLine(buffer.subarray(lineStart, lineEnd), fieldLength);
            lineStart = position; // we're now on the next line
            fieldLength = -1;
        }
        if (lineStart === bufLength) {
            buffer = undefined; // we've finished reading it
        }
        else if (lineStart !== 0) {
            // Create a new view into buffer beginning at lineStart so we don't
            // need to copy over the previous lines when we get the new arr:
            buffer = buffer.subarray(lineStart);
            position -= lineStart;
        }
    };
}
/**
 * Parses line buffers into EventSourceMessages.
 * @param onId A function that will be called on each `id` field.
 * @param onRetry A function that will be called on each `retry` field.
 * @param onMessage A function that will be called on each message.
 * @returns A function that should be called for each incoming line buffer.
 */
function getMessages(onId, onRetry, onMessage) {
    let message = newMessage();
    const decoder = new TextDecoder();
    // return a function that can process each incoming line buffer:
    return function onLine(line, fieldLength) {
        if (line.length === 0) {
            // empty line denotes end of message. Trigger the callback and start a new message:
            onMessage?.(message);
            message = newMessage();
        }
        else if (fieldLength > 0) { // exclude comments and lines with no values
            // line is of format "<field>:<value>" or "<field>: <value>"
            // https://html.spec.whatwg.org/multipage/server-sent-events.html#event-stream-interpretation
            const field = decoder.decode(line.subarray(0, fieldLength));
            const valueOffset = fieldLength + (line[fieldLength + 1] === 32 /* ControlChars.Space */ ? 2 : 1);
            const value = decoder.decode(line.subarray(valueOffset));
            switch (field) {
                case 'data':
                    // if this message already has data, append the new value to the old.
                    // otherwise, just set to the new value:
                    message.data = message.data
                        ? message.data + '\n' + value
                        : value; // otherwise, 
                    break;
                case 'event':
                    message.event = value;
                    break;
                case 'id':
                    onId(message.id = value);
                    break;
                case 'retry': {
                    const retry = parseInt(value, 10);
                    if (!isNaN(retry)) { // per spec, ignore non-integers
                        onRetry(message.retry = retry);
                    }
                    break;
                }
            }
        }
    };
}
function concat(a, b) {
    const res = new Uint8Array(a.length + b.length);
    res.set(a);
    res.set(b, a.length);
    return res;
}
function newMessage() {
    // data, event, and id must be initialized to empty strings:
    // https://html.spec.whatwg.org/multipage/server-sent-events.html#event-stream-interpretation
    // retry should be initialized to undefined so we return a consistent shape
    // to the js engine all the time: https://mathiasbynens.be/notes/shapes-ics#takeaways
    return {
        data: '',
        event: '',
        id: '',
        retry: undefined,
    };
}
