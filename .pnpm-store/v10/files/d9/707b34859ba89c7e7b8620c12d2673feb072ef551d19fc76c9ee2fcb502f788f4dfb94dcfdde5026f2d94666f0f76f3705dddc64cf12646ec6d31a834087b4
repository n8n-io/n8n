import { fromUtf8 } from "@smithy/util-utf8";
import { BLOCK_SIZE, DIGEST_LENGTH, INIT } from "./constants";
export class Md5 {
    state;
    buffer;
    bufferLength;
    bytesHashed;
    finished;
    constructor() {
        this.reset();
    }
    update(sourceData) {
        if (isEmptyData(sourceData)) {
            return;
        }
        else if (this.finished) {
            throw new Error("Attempted to update an already finished hash.");
        }
        const data = convertToBuffer(sourceData);
        let position = 0;
        let { byteLength } = data;
        this.bytesHashed += byteLength;
        while (byteLength > 0) {
            this.buffer.setUint8(this.bufferLength++, data[position++]);
            byteLength--;
            if (this.bufferLength === BLOCK_SIZE) {
                this.hashBuffer();
                this.bufferLength = 0;
            }
        }
    }
    async digest() {
        if (!this.finished) {
            const { buffer, bufferLength: undecoratedLength, bytesHashed } = this;
            const bitsHashed = bytesHashed * 8;
            buffer.setUint8(this.bufferLength++, 0b10000000);
            if (undecoratedLength % BLOCK_SIZE >= BLOCK_SIZE - 8) {
                for (let i = this.bufferLength; i < BLOCK_SIZE; i++) {
                    buffer.setUint8(i, 0);
                }
                this.hashBuffer();
                this.bufferLength = 0;
            }
            for (let i = this.bufferLength; i < BLOCK_SIZE - 8; i++) {
                buffer.setUint8(i, 0);
            }
            buffer.setUint32(BLOCK_SIZE - 8, bitsHashed >>> 0, true);
            buffer.setUint32(BLOCK_SIZE - 4, Math.floor(bitsHashed / 0x100000000), true);
            this.hashBuffer();
            this.finished = true;
        }
        const out = new DataView(new ArrayBuffer(DIGEST_LENGTH));
        for (let i = 0; i < 4; i++) {
            out.setUint32(i * 4, this.state[i], true);
        }
        return new Uint8Array(out.buffer, out.byteOffset, out.byteLength);
    }
    hashBuffer() {
        const { buffer, state } = this;
        let a = state[0], b = state[1], c = state[2], d = state[3];
        a = ff(a, b, c, d, buffer.getUint32(0, true), 7, 0xd76aa478);
        d = ff(d, a, b, c, buffer.getUint32(4, true), 12, 0xe8c7b756);
        c = ff(c, d, a, b, buffer.getUint32(8, true), 17, 0x242070db);
        b = ff(b, c, d, a, buffer.getUint32(12, true), 22, 0xc1bdceee);
        a = ff(a, b, c, d, buffer.getUint32(16, true), 7, 0xf57c0faf);
        d = ff(d, a, b, c, buffer.getUint32(20, true), 12, 0x4787c62a);
        c = ff(c, d, a, b, buffer.getUint32(24, true), 17, 0xa8304613);
        b = ff(b, c, d, a, buffer.getUint32(28, true), 22, 0xfd469501);
        a = ff(a, b, c, d, buffer.getUint32(32, true), 7, 0x698098d8);
        d = ff(d, a, b, c, buffer.getUint32(36, true), 12, 0x8b44f7af);
        c = ff(c, d, a, b, buffer.getUint32(40, true), 17, 0xffff5bb1);
        b = ff(b, c, d, a, buffer.getUint32(44, true), 22, 0x895cd7be);
        a = ff(a, b, c, d, buffer.getUint32(48, true), 7, 0x6b901122);
        d = ff(d, a, b, c, buffer.getUint32(52, true), 12, 0xfd987193);
        c = ff(c, d, a, b, buffer.getUint32(56, true), 17, 0xa679438e);
        b = ff(b, c, d, a, buffer.getUint32(60, true), 22, 0x49b40821);
        a = gg(a, b, c, d, buffer.getUint32(4, true), 5, 0xf61e2562);
        d = gg(d, a, b, c, buffer.getUint32(24, true), 9, 0xc040b340);
        c = gg(c, d, a, b, buffer.getUint32(44, true), 14, 0x265e5a51);
        b = gg(b, c, d, a, buffer.getUint32(0, true), 20, 0xe9b6c7aa);
        a = gg(a, b, c, d, buffer.getUint32(20, true), 5, 0xd62f105d);
        d = gg(d, a, b, c, buffer.getUint32(40, true), 9, 0x02441453);
        c = gg(c, d, a, b, buffer.getUint32(60, true), 14, 0xd8a1e681);
        b = gg(b, c, d, a, buffer.getUint32(16, true), 20, 0xe7d3fbc8);
        a = gg(a, b, c, d, buffer.getUint32(36, true), 5, 0x21e1cde6);
        d = gg(d, a, b, c, buffer.getUint32(56, true), 9, 0xc33707d6);
        c = gg(c, d, a, b, buffer.getUint32(12, true), 14, 0xf4d50d87);
        b = gg(b, c, d, a, buffer.getUint32(32, true), 20, 0x455a14ed);
        a = gg(a, b, c, d, buffer.getUint32(52, true), 5, 0xa9e3e905);
        d = gg(d, a, b, c, buffer.getUint32(8, true), 9, 0xfcefa3f8);
        c = gg(c, d, a, b, buffer.getUint32(28, true), 14, 0x676f02d9);
        b = gg(b, c, d, a, buffer.getUint32(48, true), 20, 0x8d2a4c8a);
        a = hh(a, b, c, d, buffer.getUint32(20, true), 4, 0xfffa3942);
        d = hh(d, a, b, c, buffer.getUint32(32, true), 11, 0x8771f681);
        c = hh(c, d, a, b, buffer.getUint32(44, true), 16, 0x6d9d6122);
        b = hh(b, c, d, a, buffer.getUint32(56, true), 23, 0xfde5380c);
        a = hh(a, b, c, d, buffer.getUint32(4, true), 4, 0xa4beea44);
        d = hh(d, a, b, c, buffer.getUint32(16, true), 11, 0x4bdecfa9);
        c = hh(c, d, a, b, buffer.getUint32(28, true), 16, 0xf6bb4b60);
        b = hh(b, c, d, a, buffer.getUint32(40, true), 23, 0xbebfbc70);
        a = hh(a, b, c, d, buffer.getUint32(52, true), 4, 0x289b7ec6);
        d = hh(d, a, b, c, buffer.getUint32(0, true), 11, 0xeaa127fa);
        c = hh(c, d, a, b, buffer.getUint32(12, true), 16, 0xd4ef3085);
        b = hh(b, c, d, a, buffer.getUint32(24, true), 23, 0x04881d05);
        a = hh(a, b, c, d, buffer.getUint32(36, true), 4, 0xd9d4d039);
        d = hh(d, a, b, c, buffer.getUint32(48, true), 11, 0xe6db99e5);
        c = hh(c, d, a, b, buffer.getUint32(60, true), 16, 0x1fa27cf8);
        b = hh(b, c, d, a, buffer.getUint32(8, true), 23, 0xc4ac5665);
        a = ii(a, b, c, d, buffer.getUint32(0, true), 6, 0xf4292244);
        d = ii(d, a, b, c, buffer.getUint32(28, true), 10, 0x432aff97);
        c = ii(c, d, a, b, buffer.getUint32(56, true), 15, 0xab9423a7);
        b = ii(b, c, d, a, buffer.getUint32(20, true), 21, 0xfc93a039);
        a = ii(a, b, c, d, buffer.getUint32(48, true), 6, 0x655b59c3);
        d = ii(d, a, b, c, buffer.getUint32(12, true), 10, 0x8f0ccc92);
        c = ii(c, d, a, b, buffer.getUint32(40, true), 15, 0xffeff47d);
        b = ii(b, c, d, a, buffer.getUint32(4, true), 21, 0x85845dd1);
        a = ii(a, b, c, d, buffer.getUint32(32, true), 6, 0x6fa87e4f);
        d = ii(d, a, b, c, buffer.getUint32(60, true), 10, 0xfe2ce6e0);
        c = ii(c, d, a, b, buffer.getUint32(24, true), 15, 0xa3014314);
        b = ii(b, c, d, a, buffer.getUint32(52, true), 21, 0x4e0811a1);
        a = ii(a, b, c, d, buffer.getUint32(16, true), 6, 0xf7537e82);
        d = ii(d, a, b, c, buffer.getUint32(44, true), 10, 0xbd3af235);
        c = ii(c, d, a, b, buffer.getUint32(8, true), 15, 0x2ad7d2bb);
        b = ii(b, c, d, a, buffer.getUint32(36, true), 21, 0xeb86d391);
        state[0] = (a + state[0]) & 0xffffffff;
        state[1] = (b + state[1]) & 0xffffffff;
        state[2] = (c + state[2]) & 0xffffffff;
        state[3] = (d + state[3]) & 0xffffffff;
    }
    reset() {
        this.state = Uint32Array.from(INIT);
        this.buffer = new DataView(new ArrayBuffer(BLOCK_SIZE));
        this.bufferLength = 0;
        this.bytesHashed = 0;
        this.finished = false;
    }
}
function cmn(q, a, b, x, s, t) {
    a = (((a + q) & 0xffffffff) + ((x + t) & 0xffffffff)) & 0xffffffff;
    return (((a << s) | (a >>> (32 - s))) + b) & 0xffffffff;
}
function ff(a, b, c, d, x, s, t) {
    return cmn((b & c) | (~b & d), a, b, x, s, t);
}
function gg(a, b, c, d, x, s, t) {
    return cmn((b & d) | (c & ~d), a, b, x, s, t);
}
function hh(a, b, c, d, x, s, t) {
    return cmn(b ^ c ^ d, a, b, x, s, t);
}
function ii(a, b, c, d, x, s, t) {
    return cmn(c ^ (b | ~d), a, b, x, s, t);
}
function isEmptyData(data) {
    if (typeof data === "string") {
        return data.length === 0;
    }
    return data.byteLength === 0;
}
function convertToBuffer(data) {
    if (typeof data === "string") {
        return fromUtf8(data);
    }
    if (ArrayBuffer.isView(data)) {
        return new Uint8Array(data.buffer, data.byteOffset, data.byteLength / Uint8Array.BYTES_PER_ELEMENT);
    }
    return new Uint8Array(data);
}
