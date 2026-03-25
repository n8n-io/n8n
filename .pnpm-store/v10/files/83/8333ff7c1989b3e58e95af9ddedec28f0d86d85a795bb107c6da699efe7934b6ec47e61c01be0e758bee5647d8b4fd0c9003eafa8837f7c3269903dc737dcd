"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodePointer = encodePointer;
exports.escapePointer = escapePointer;
function encodePointer(p) {
    return encodeURI(escapePointer(p));
}
function escapePointer(p) {
    return p.replace(/~/g, '~0').replace(/\//g, '~1');
}
