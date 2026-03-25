// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { blobToString } from "./utils/utils.browser";
export async function getBodyAsText(batchResponse) {
    const blob = (await batchResponse.blobBody);
    return blobToString(blob);
}
export function utf8ByteLength(str) {
    return new Blob([str]).size;
}
//# sourceMappingURL=BatchUtils.browser.js.map