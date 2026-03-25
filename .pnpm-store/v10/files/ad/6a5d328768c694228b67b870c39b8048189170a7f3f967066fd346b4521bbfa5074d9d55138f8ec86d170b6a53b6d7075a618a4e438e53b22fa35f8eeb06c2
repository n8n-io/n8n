import { Buffer } from 'buffer';
import { JOSENotSupported } from '../util/errors.js';
const tagInteger = 0x02;
const tagBitStr = 0x03;
const tagOctStr = 0x04;
const tagSequence = 0x30;
const bZero = Buffer.from([0x00]);
const bTagInteger = Buffer.from([tagInteger]);
const bTagBitStr = Buffer.from([tagBitStr]);
const bTagSequence = Buffer.from([tagSequence]);
const bTagOctStr = Buffer.from([tagOctStr]);
const encodeLength = (len) => {
    if (len < 128)
        return Buffer.from([len]);
    const buffer = Buffer.alloc(5);
    buffer.writeUInt32BE(len, 1);
    let offset = 1;
    while (buffer[offset] === 0)
        offset++;
    buffer[offset - 1] = 0x80 | (5 - offset);
    return buffer.slice(offset - 1);
};
const oids = new Map([
    ['P-256', Buffer.from('06 08 2A 86 48 CE 3D 03 01 07'.replace(/ /g, ''), 'hex')],
    ['secp256k1', Buffer.from('06 05 2B 81 04 00 0A'.replace(/ /g, ''), 'hex')],
    ['P-384', Buffer.from('06 05 2B 81 04 00 22'.replace(/ /g, ''), 'hex')],
    ['P-521', Buffer.from('06 05 2B 81 04 00 23'.replace(/ /g, ''), 'hex')],
    ['ecPublicKey', Buffer.from('06 07 2A 86 48 CE 3D 02 01'.replace(/ /g, ''), 'hex')],
    ['X25519', Buffer.from('06 03 2B 65 6E'.replace(/ /g, ''), 'hex')],
    ['X448', Buffer.from('06 03 2B 65 6F'.replace(/ /g, ''), 'hex')],
    ['Ed25519', Buffer.from('06 03 2B 65 70'.replace(/ /g, ''), 'hex')],
    ['Ed448', Buffer.from('06 03 2B 65 71'.replace(/ /g, ''), 'hex')],
]);
export default class DumbAsn1Encoder {
    constructor() {
        this.length = 0;
        this.elements = [];
    }
    oidFor(oid) {
        const bOid = oids.get(oid);
        if (!bOid) {
            throw new JOSENotSupported('Invalid or unsupported OID');
        }
        this.elements.push(bOid);
        this.length += bOid.length;
    }
    zero() {
        this.elements.push(bTagInteger, Buffer.from([0x01]), bZero);
        this.length += 3;
    }
    one() {
        this.elements.push(bTagInteger, Buffer.from([0x01]), Buffer.from([0x01]));
        this.length += 3;
    }
    unsignedInteger(integer) {
        if (integer[0] & 0x80) {
            const len = encodeLength(integer.length + 1);
            this.elements.push(bTagInteger, len, bZero, integer);
            this.length += 2 + len.length + integer.length;
        }
        else {
            let i = 0;
            while (integer[i] === 0 && (integer[i + 1] & 0x80) === 0)
                i++;
            const len = encodeLength(integer.length - i);
            this.elements.push(bTagInteger, encodeLength(integer.length - i), integer.slice(i));
            this.length += 1 + len.length + integer.length - i;
        }
    }
    octStr(octStr) {
        const len = encodeLength(octStr.length);
        this.elements.push(bTagOctStr, encodeLength(octStr.length), octStr);
        this.length += 1 + len.length + octStr.length;
    }
    bitStr(bitS) {
        const len = encodeLength(bitS.length + 1);
        this.elements.push(bTagBitStr, encodeLength(bitS.length + 1), bZero, bitS);
        this.length += 1 + len.length + bitS.length + 1;
    }
    add(seq) {
        this.elements.push(seq);
        this.length += seq.length;
    }
    end(tag = bTagSequence) {
        const len = encodeLength(this.length);
        return Buffer.concat([tag, len, ...this.elements], 1 + len.length + this.length);
    }
}
