"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.keccakprg = exports.KeccakPRG = exports.m14 = exports.k12 = exports.KangarooTwelve = exports.turboshake256 = exports.turboshake128 = exports.parallelhash256xof = exports.parallelhash128xof = exports.parallelhash256 = exports.parallelhash128 = exports.ParallelHash = exports.tuplehash256xof = exports.tuplehash128xof = exports.tuplehash256 = exports.tuplehash128 = exports.TupleHash = exports.kmac256xof = exports.kmac128xof = exports.kmac256 = exports.kmac128 = exports.KMAC = exports.cshake256 = exports.cshake128 = void 0;
/**
 * SHA3 (keccak) addons.
 *
 * * Full [NIST SP 800-185](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-185.pdf):
 *   cSHAKE, KMAC, TupleHash, ParallelHash + XOF variants
 * * Reduced-round Keccak [(draft)](https://datatracker.ietf.org/doc/draft-irtf-cfrg-kangarootwelve/):
 *     * 🦘 K12 aka KangarooTwelve
 *     * M14 aka MarsupilamiFourteen
 *     * TurboSHAKE
 * * KeccakPRG: Pseudo-random generator based on Keccak [(pdf)](https://keccak.team/files/CSF-0.1.pdf)
 * @module
 */
const sha3_ts_1 = require("./sha3.js");
const utils_ts_1 = require("./utils.js");
// cSHAKE && KMAC (NIST SP800-185)
const _8n = BigInt(8);
const _ffn = BigInt(0xff);
// NOTE: it is safe to use bigints here, since they used only for length encoding (not actual data).
// We use bigints in sha256 for lengths too.
function leftEncode(n) {
    n = BigInt(n);
    const res = [Number(n & _ffn)];
    n >>= _8n;
    for (; n > 0; n >>= _8n)
        res.unshift(Number(n & _ffn));
    res.unshift(res.length);
    return new Uint8Array(res);
}
function rightEncode(n) {
    n = BigInt(n);
    const res = [Number(n & _ffn)];
    n >>= _8n;
    for (; n > 0; n >>= _8n)
        res.unshift(Number(n & _ffn));
    res.push(res.length);
    return new Uint8Array(res);
}
function chooseLen(opts, outputLen) {
    return opts.dkLen === undefined ? outputLen : opts.dkLen;
}
const abytesOrZero = (buf) => {
    if (buf === undefined)
        return Uint8Array.of();
    return (0, utils_ts_1.toBytes)(buf);
};
// NOTE: second modulo is necessary since we don't need to add padding if current element takes whole block
const getPadding = (len, block) => new Uint8Array((block - (len % block)) % block);
// Personalization
function cshakePers(hash, opts = {}) {
    if (!opts || (!opts.personalization && !opts.NISTfn))
        return hash;
    // Encode and pad inplace to avoid unneccesary memory copies/slices (so we don't need to zero them later)
    // bytepad(encode_string(N) || encode_string(S), 168)
    const blockLenBytes = leftEncode(hash.blockLen);
    const fn = abytesOrZero(opts.NISTfn);
    const fnLen = leftEncode(_8n * BigInt(fn.length)); // length in bits
    const pers = abytesOrZero(opts.personalization);
    const persLen = leftEncode(_8n * BigInt(pers.length)); // length in bits
    if (!fn.length && !pers.length)
        return hash;
    hash.suffix = 0x04;
    hash.update(blockLenBytes).update(fnLen).update(fn).update(persLen).update(pers);
    let totalLen = blockLenBytes.length + fnLen.length + fn.length + persLen.length + pers.length;
    hash.update(getPadding(totalLen, hash.blockLen));
    return hash;
}
const gencShake = (suffix, blockLen, outputLen) => (0, utils_ts_1.createXOFer)((opts = {}) => cshakePers(new sha3_ts_1.Keccak(blockLen, suffix, chooseLen(opts, outputLen), true), opts));
exports.cshake128 = (() => gencShake(0x1f, 168, 128 / 8))();
exports.cshake256 = (() => gencShake(0x1f, 136, 256 / 8))();
class KMAC extends sha3_ts_1.Keccak {
    constructor(blockLen, outputLen, enableXOF, key, opts = {}) {
        super(blockLen, 0x1f, outputLen, enableXOF);
        cshakePers(this, { NISTfn: 'KMAC', personalization: opts.personalization });
        key = (0, utils_ts_1.toBytes)(key);
        (0, utils_ts_1.abytes)(key);
        // 1. newX = bytepad(encode_string(K), 168) || X || right_encode(L).
        const blockLenBytes = leftEncode(this.blockLen);
        const keyLen = leftEncode(_8n * BigInt(key.length));
        this.update(blockLenBytes).update(keyLen).update(key);
        const totalLen = blockLenBytes.length + keyLen.length + key.length;
        this.update(getPadding(totalLen, this.blockLen));
    }
    finish() {
        if (!this.finished)
            this.update(rightEncode(this.enableXOF ? 0 : _8n * BigInt(this.outputLen))); // outputLen in bits
        super.finish();
    }
    _cloneInto(to) {
        // Create new instance without calling constructor since key already in state and we don't know it.
        // Force "to" to be instance of KMAC instead of Sha3.
        if (!to) {
            to = Object.create(Object.getPrototypeOf(this), {});
            to.state = this.state.slice();
            to.blockLen = this.blockLen;
            to.state32 = (0, utils_ts_1.u32)(to.state);
        }
        return super._cloneInto(to);
    }
    clone() {
        return this._cloneInto();
    }
}
exports.KMAC = KMAC;
function genKmac(blockLen, outputLen, xof = false) {
    const kmac = (key, message, opts) => kmac.create(key, opts).update(message).digest();
    kmac.create = (key, opts = {}) => new KMAC(blockLen, chooseLen(opts, outputLen), xof, key, opts);
    return kmac;
}
exports.kmac128 = (() => genKmac(168, 128 / 8))();
exports.kmac256 = (() => genKmac(136, 256 / 8))();
exports.kmac128xof = (() => genKmac(168, 128 / 8, true))();
exports.kmac256xof = (() => genKmac(136, 256 / 8, true))();
// TupleHash
// Usage: tuple(['ab', 'cd']) != tuple(['a', 'bcd'])
class TupleHash extends sha3_ts_1.Keccak {
    constructor(blockLen, outputLen, enableXOF, opts = {}) {
        super(blockLen, 0x1f, outputLen, enableXOF);
        cshakePers(this, { NISTfn: 'TupleHash', personalization: opts.personalization });
        // Change update after cshake processed
        this.update = (data) => {
            data = (0, utils_ts_1.toBytes)(data);
            (0, utils_ts_1.abytes)(data);
            super.update(leftEncode(_8n * BigInt(data.length)));
            super.update(data);
            return this;
        };
    }
    finish() {
        if (!this.finished)
            super.update(rightEncode(this.enableXOF ? 0 : _8n * BigInt(this.outputLen))); // outputLen in bits
        super.finish();
    }
    _cloneInto(to) {
        to || (to = new TupleHash(this.blockLen, this.outputLen, this.enableXOF));
        return super._cloneInto(to);
    }
    clone() {
        return this._cloneInto();
    }
}
exports.TupleHash = TupleHash;
function genTuple(blockLen, outputLen, xof = false) {
    const tuple = (messages, opts) => {
        const h = tuple.create(opts);
        for (const msg of messages)
            h.update(msg);
        return h.digest();
    };
    tuple.create = (opts = {}) => new TupleHash(blockLen, chooseLen(opts, outputLen), xof, opts);
    return tuple;
}
/** 128-bit TupleHASH. */
exports.tuplehash128 = (() => genTuple(168, 128 / 8))();
/** 256-bit TupleHASH. */
exports.tuplehash256 = (() => genTuple(136, 256 / 8))();
/** 128-bit TupleHASH XOF. */
exports.tuplehash128xof = (() => genTuple(168, 128 / 8, true))();
/** 256-bit TupleHASH XOF. */
exports.tuplehash256xof = (() => genTuple(136, 256 / 8, true))();
class ParallelHash extends sha3_ts_1.Keccak {
    constructor(blockLen, outputLen, leafCons, enableXOF, opts = {}) {
        super(blockLen, 0x1f, outputLen, enableXOF);
        this.chunkPos = 0; // Position of current block in chunk
        this.chunksDone = 0; // How many chunks we already have
        cshakePers(this, { NISTfn: 'ParallelHash', personalization: opts.personalization });
        this.leafCons = leafCons;
        let { blockLen: B } = opts;
        B || (B = 8);
        (0, utils_ts_1.anumber)(B);
        this.chunkLen = B;
        super.update(leftEncode(B));
        // Change update after cshake processed
        this.update = (data) => {
            data = (0, utils_ts_1.toBytes)(data);
            (0, utils_ts_1.abytes)(data);
            const { chunkLen, leafCons } = this;
            for (let pos = 0, len = data.length; pos < len;) {
                if (this.chunkPos == chunkLen || !this.leafHash) {
                    if (this.leafHash) {
                        super.update(this.leafHash.digest());
                        this.chunksDone++;
                    }
                    this.leafHash = leafCons();
                    this.chunkPos = 0;
                }
                const take = Math.min(chunkLen - this.chunkPos, len - pos);
                this.leafHash.update(data.subarray(pos, pos + take));
                this.chunkPos += take;
                pos += take;
            }
            return this;
        };
    }
    finish() {
        if (this.finished)
            return;
        if (this.leafHash) {
            super.update(this.leafHash.digest());
            this.chunksDone++;
        }
        super.update(rightEncode(this.chunksDone));
        super.update(rightEncode(this.enableXOF ? 0 : _8n * BigInt(this.outputLen))); // outputLen in bits
        super.finish();
    }
    _cloneInto(to) {
        to || (to = new ParallelHash(this.blockLen, this.outputLen, this.leafCons, this.enableXOF));
        if (this.leafHash)
            to.leafHash = this.leafHash._cloneInto(to.leafHash);
        to.chunkPos = this.chunkPos;
        to.chunkLen = this.chunkLen;
        to.chunksDone = this.chunksDone;
        return super._cloneInto(to);
    }
    destroy() {
        super.destroy.call(this);
        if (this.leafHash)
            this.leafHash.destroy();
    }
    clone() {
        return this._cloneInto();
    }
}
exports.ParallelHash = ParallelHash;
function genPrl(blockLen, outputLen, leaf, xof = false) {
    const parallel = (message, opts) => parallel.create(opts).update(message).digest();
    parallel.create = (opts = {}) => new ParallelHash(blockLen, chooseLen(opts, outputLen), () => leaf.create({ dkLen: 2 * outputLen }), xof, opts);
    return parallel;
}
/** 128-bit ParallelHash. In JS, it is not parallel. */
exports.parallelhash128 = (() => genPrl(168, 128 / 8, exports.cshake128))();
/** 256-bit ParallelHash. In JS, it is not parallel. */
exports.parallelhash256 = (() => genPrl(136, 256 / 8, exports.cshake256))();
/** 128-bit ParallelHash XOF. In JS, it is not parallel. */
exports.parallelhash128xof = (() => genPrl(168, 128 / 8, exports.cshake128, true))();
/** 256-bit ParallelHash. In JS, it is not parallel. */
exports.parallelhash256xof = (() => genPrl(136, 256 / 8, exports.cshake256, true))();
const genTurboshake = (blockLen, outputLen) => (0, utils_ts_1.createXOFer)((opts = {}) => {
    const D = opts.D === undefined ? 0x1f : opts.D;
    // Section 2.1 of https://datatracker.ietf.org/doc/draft-irtf-cfrg-kangarootwelve/
    if (!Number.isSafeInteger(D) || D < 0x01 || D > 0x7f)
        throw new Error('invalid domain separation byte must be 0x01..0x7f, got: ' + D);
    return new sha3_ts_1.Keccak(blockLen, D, opts.dkLen === undefined ? outputLen : opts.dkLen, true, 12);
});
/** TurboSHAKE 128-bit: reduced 12-round keccak. */
exports.turboshake128 = genTurboshake(168, 256 / 8);
/** TurboSHAKE 256-bit: reduced 12-round keccak. */
exports.turboshake256 = genTurboshake(136, 512 / 8);
// Kangaroo
// Same as NIST rightEncode, but returns [0] for zero string
function rightEncodeK12(n) {
    n = BigInt(n);
    const res = [];
    for (; n > 0; n >>= _8n)
        res.unshift(Number(n & _ffn));
    res.push(res.length);
    return Uint8Array.from(res);
}
const EMPTY_BUFFER = /* @__PURE__ */ Uint8Array.of();
class KangarooTwelve extends sha3_ts_1.Keccak {
    constructor(blockLen, leafLen, outputLen, rounds, opts) {
        super(blockLen, 0x07, outputLen, true, rounds);
        this.chunkLen = 8192;
        this.chunkPos = 0; // Position of current block in chunk
        this.chunksDone = 0; // How many chunks we already have
        this.leafLen = leafLen;
        this.personalization = abytesOrZero(opts.personalization);
    }
    update(data) {
        data = (0, utils_ts_1.toBytes)(data);
        (0, utils_ts_1.abytes)(data);
        const { chunkLen, blockLen, leafLen, rounds } = this;
        for (let pos = 0, len = data.length; pos < len;) {
            if (this.chunkPos == chunkLen) {
                if (this.leafHash)
                    super.update(this.leafHash.digest());
                else {
                    this.suffix = 0x06; // Its safe to change suffix here since its used only in digest()
                    super.update(Uint8Array.from([3, 0, 0, 0, 0, 0, 0, 0]));
                }
                this.leafHash = new sha3_ts_1.Keccak(blockLen, 0x0b, leafLen, false, rounds);
                this.chunksDone++;
                this.chunkPos = 0;
            }
            const take = Math.min(chunkLen - this.chunkPos, len - pos);
            const chunk = data.subarray(pos, pos + take);
            if (this.leafHash)
                this.leafHash.update(chunk);
            else
                super.update(chunk);
            this.chunkPos += take;
            pos += take;
        }
        return this;
    }
    finish() {
        if (this.finished)
            return;
        const { personalization } = this;
        this.update(personalization).update(rightEncodeK12(personalization.length));
        // Leaf hash
        if (this.leafHash) {
            super.update(this.leafHash.digest());
            super.update(rightEncodeK12(this.chunksDone));
            super.update(Uint8Array.from([0xff, 0xff]));
        }
        super.finish.call(this);
    }
    destroy() {
        super.destroy.call(this);
        if (this.leafHash)
            this.leafHash.destroy();
        // We cannot zero personalization buffer since it is user provided and we don't want to mutate user input
        this.personalization = EMPTY_BUFFER;
    }
    _cloneInto(to) {
        const { blockLen, leafLen, leafHash, outputLen, rounds } = this;
        to || (to = new KangarooTwelve(blockLen, leafLen, outputLen, rounds, {}));
        super._cloneInto(to);
        if (leafHash)
            to.leafHash = leafHash._cloneInto(to.leafHash);
        to.personalization.set(this.personalization);
        to.leafLen = this.leafLen;
        to.chunkPos = this.chunkPos;
        to.chunksDone = this.chunksDone;
        return to;
    }
    clone() {
        return this._cloneInto();
    }
}
exports.KangarooTwelve = KangarooTwelve;
/** KangarooTwelve: reduced 12-round keccak. */
exports.k12 = (() => (0, utils_ts_1.createOptHasher)((opts = {}) => new KangarooTwelve(168, 32, chooseLen(opts, 32), 12, opts)))();
/** MarsupilamiFourteen: reduced 14-round keccak. */
exports.m14 = (() => (0, utils_ts_1.createOptHasher)((opts = {}) => new KangarooTwelve(136, 64, chooseLen(opts, 64), 14, opts)))();
/**
 * More at https://github.com/XKCP/XKCP/tree/master/lib/high/Keccak/PRG.
 */
class KeccakPRG extends sha3_ts_1.Keccak {
    constructor(capacity) {
        (0, utils_ts_1.anumber)(capacity);
        // Rho should be full bytes
        if (capacity < 0 || capacity > 1600 - 10 || (1600 - capacity - 2) % 8)
            throw new Error('invalid capacity');
        // blockLen = rho in bytes
        super((1600 - capacity - 2) / 8, 0, 0, true);
        this.rate = 1600 - capacity;
        this.posOut = Math.floor((this.rate + 7) / 8);
    }
    keccak() {
        // Duplex padding
        this.state[this.pos] ^= 0x01;
        this.state[this.blockLen] ^= 0x02; // Rho is full bytes
        super.keccak();
        this.pos = 0;
        this.posOut = 0;
    }
    update(data) {
        super.update(data);
        this.posOut = this.blockLen;
        return this;
    }
    feed(data) {
        return this.update(data);
    }
    finish() { }
    digestInto(_out) {
        throw new Error('digest is not allowed, use .fetch instead');
    }
    fetch(bytes) {
        return this.xof(bytes);
    }
    // Ensure irreversibility (even if state leaked previous outputs cannot be computed)
    forget() {
        if (this.rate < 1600 / 2 + 1)
            throw new Error('rate is too low to use .forget()');
        this.keccak();
        for (let i = 0; i < this.blockLen; i++)
            this.state[i] = 0;
        this.pos = this.blockLen;
        this.keccak();
        this.posOut = this.blockLen;
    }
    _cloneInto(to) {
        const { rate } = this;
        to || (to = new KeccakPRG(1600 - rate));
        super._cloneInto(to);
        to.rate = rate;
        return to;
    }
    clone() {
        return this._cloneInto();
    }
}
exports.KeccakPRG = KeccakPRG;
/** KeccakPRG: Pseudo-random generator based on Keccak. https://keccak.team/files/CSF-0.1.pdf */
const keccakprg = (capacity = 254) => new KeccakPRG(capacity);
exports.keccakprg = keccakprg;
//# sourceMappingURL=sha3-addons.js.map