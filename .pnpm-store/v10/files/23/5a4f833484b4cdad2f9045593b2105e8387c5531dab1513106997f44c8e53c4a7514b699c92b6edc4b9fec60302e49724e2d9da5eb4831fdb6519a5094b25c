// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { streamToBuffer2 } from "./utils/utils.node";
import { BATCH_MAX_PAYLOAD_IN_BYTES } from "./utils/constants";
export async function getBodyAsText(batchResponse) {
    let buffer = Buffer.alloc(BATCH_MAX_PAYLOAD_IN_BYTES);
    const responseLength = await streamToBuffer2(batchResponse.readableStreamBody, buffer);
    // Slice the buffer to trim the empty ending.
    buffer = buffer.slice(0, responseLength);
    return buffer.toString();
}
export function utf8ByteLength(str) {
    return Buffer.byteLength(str);
}
//# sourceMappingURL=BatchUtils.js.map