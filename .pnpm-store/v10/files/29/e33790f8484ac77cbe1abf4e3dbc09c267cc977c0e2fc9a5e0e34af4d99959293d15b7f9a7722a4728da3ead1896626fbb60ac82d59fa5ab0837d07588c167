import { isArrayBuffer } from "@smithy/is-array-buffer";
export const isStreaming = (body) => body !== undefined && typeof body !== "string" && !ArrayBuffer.isView(body) && !isArrayBuffer(body);
