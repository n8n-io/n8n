import { toHex } from "@smithy/util-hex-encoding";
export class Int64 {
    constructor(bytes) {
        this.bytes = bytes;
        if (bytes.byteLength !== 8) {
            throw new Error("Int64 buffers must be exactly 8 bytes");
        }
    }
    static fromNumber(number) {
        if (number > 9223372036854776000 || number < -9223372036854776000) {
            throw new Error(`${number} is too large (or, if negative, too small) to represent as an Int64`);
        }
        const bytes = new Uint8Array(8);
        for (let i = 7, remaining = Math.abs(Math.round(number)); i > -1 && remaining > 0; i--, remaining /= 256) {
            bytes[i] = remaining;
        }
        if (number < 0) {
            negate(bytes);
        }
        return new Int64(bytes);
    }
    valueOf() {
        const bytes = this.bytes.slice(0);
        const negative = bytes[0] & 0b10000000;
        if (negative) {
            negate(bytes);
        }
        return parseInt(toHex(bytes), 16) * (negative ? -1 : 1);
    }
    toString() {
        return String(this.valueOf());
    }
}
function negate(bytes) {
    for (let i = 0; i < 8; i++) {
        bytes[i] ^= 0xff;
    }
    for (let i = 7; i > -1; i--) {
        bytes[i]++;
        if (bytes[i] !== 0)
            break;
    }
}
