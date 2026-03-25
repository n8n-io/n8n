// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import * as fs from "fs";
import * as util from "util";
import { REQUEST_TIMEOUT } from "./constants";
/**
 * Reads a readable stream into buffer. Fill the buffer from offset to end.
 *
 * @param stream - A Node.js Readable stream
 * @param buffer - Buffer to be filled, length must greater than or equal to offset
 * @param offset - From which position in the buffer to be filled, inclusive
 * @param end - To which position in the buffer to be filled, exclusive
 * @param encoding - Encoding of the Readable stream
 */
export async function streamToBuffer(stream, buffer, offset, end, encoding) {
    let pos = 0; // Position in stream
    const count = end - offset; // Total amount of data needed in stream
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`The operation cannot be completed in timeout.`)), REQUEST_TIMEOUT);
        stream.on("readable", () => {
            if (pos >= count) {
                clearTimeout(timeout);
                resolve();
                return;
            }
            let chunk = stream.read();
            if (!chunk) {
                return;
            }
            if (typeof chunk === "string") {
                chunk = Buffer.from(chunk, encoding);
            }
            // How much data needed in this chunk
            const chunkLength = pos + chunk.length > count ? count - pos : chunk.length;
            buffer.fill(chunk.slice(0, chunkLength), offset + pos, offset + pos + chunkLength);
            pos += chunkLength;
        });
        stream.on("end", () => {
            clearTimeout(timeout);
            if (pos < count) {
                reject(new Error(`Stream drains before getting enough data needed. Data read: ${pos}, data need: ${count}`));
            }
            resolve();
        });
        stream.on("error", (msg) => {
            clearTimeout(timeout);
            reject(msg);
        });
    });
}
/**
 * Reads a readable stream into buffer entirely.
 *
 * @param stream - A Node.js Readable stream
 * @param buffer - Buffer to be filled, length must greater than or equal to offset
 * @param encoding - Encoding of the Readable stream
 * @returns with the count of bytes read.
 * @throws `RangeError` If buffer size is not big enough.
 */
export async function streamToBuffer2(stream, buffer, encoding) {
    let pos = 0; // Position in stream
    const bufferSize = buffer.length;
    return new Promise((resolve, reject) => {
        stream.on("readable", () => {
            let chunk = stream.read();
            if (!chunk) {
                return;
            }
            if (typeof chunk === "string") {
                chunk = Buffer.from(chunk, encoding);
            }
            if (pos + chunk.length > bufferSize) {
                reject(new Error(`Stream exceeds buffer size. Buffer size: ${bufferSize}`));
                return;
            }
            buffer.fill(chunk, pos, pos + chunk.length);
            pos += chunk.length;
        });
        stream.on("end", () => {
            resolve(pos);
        });
        stream.on("error", reject);
    });
}
/**
 * Reads a readable stream into a buffer.
 *
 * @param stream - A Node.js Readable stream
 * @param encoding - Encoding of the Readable stream
 * @returns with the count of bytes read.
 */
export async function streamToBuffer3(readableStream, encoding) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on("data", (data) => {
            chunks.push(data instanceof Buffer ? data : Buffer.from(data, encoding));
        });
        readableStream.on("end", () => {
            resolve(Buffer.concat(chunks));
        });
        readableStream.on("error", reject);
    });
}
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 *
 * Writes the content of a readstream to a local file. Returns a Promise which is completed after the file handle is closed.
 *
 * @param rs - The read stream.
 * @param file - Destination file path.
 */
export async function readStreamToLocalFile(rs, file) {
    return new Promise((resolve, reject) => {
        const ws = fs.createWriteStream(file);
        rs.on("error", (err) => {
            reject(err);
        });
        ws.on("error", (err) => {
            reject(err);
        });
        ws.on("close", resolve);
        rs.pipe(ws);
    });
}
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 *
 * Promisified version of fs.stat().
 */
export const fsStat = util.promisify(fs.stat);
export const fsCreateReadStream = fs.createReadStream;
//# sourceMappingURL=utils.node.js.map