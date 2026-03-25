// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * Convert a Browser Blob object into ArrayBuffer.
 *
 * @param blob -
 */
export async function blobToArrayBuffer(blob) {
    const fileReader = new FileReader();
    return new Promise((resolve, reject) => {
        fileReader.onloadend = (ev) => {
            resolve(ev.target.result);
        };
        fileReader.onerror = reject;
        fileReader.readAsArrayBuffer(blob);
    });
}
/**
 * Convert a Browser Blob object into string.
 *
 * @param blob -
 */
export async function blobToString(blob) {
    const fileReader = new FileReader();
    return new Promise((resolve, reject) => {
        fileReader.onloadend = (ev) => {
            resolve(ev.target.result);
        };
        fileReader.onerror = reject;
        fileReader.readAsText(blob);
    });
}
export function streamToBuffer() {
    /* empty */
}
export function streamToBuffer2() {
    /* empty */
}
export function readStreamToLocalFile() {
    /* empty */
}
export const fsStat = function stat() {
    /* empty */
};
export const fsCreateReadStream = function createReadStream() {
    /* empty */
};
//# sourceMappingURL=utils.browser.js.map