"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataUrlFromBlob = dataUrlFromBlob;
const base64FromBytes_js_1 = require("./base64FromBytes.js");
async function dataUrlFromBlob(blob, mimeType = "image/jpeg") {
    const buffer = await blob.arrayBuffer();
    const base64 = (0, base64FromBytes_js_1.base64FromBytes)(new Uint8Array(buffer));
    return `data:${mimeType};base64,${base64}`;
}
