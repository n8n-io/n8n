"use strict";

// node crypt, we use it for generate salt
// eslint-disable-next-line node/no-unsupported-features/node-builtins
const { randomFillSync } = require("crypto");
const Errors = require("../util/errors");

// generate CRC32 lookup table
const crctable = new Uint32Array(256).map((t, crc) => {
    for (let j = 0; j < 8; j++) {
        if (0 !== (crc & 1)) {
            crc = (crc >>> 1) ^ 0xedb88320;
        } else {
            crc >>>= 1;
        }
    }
    return crc >>> 0;
});

// C-style uInt32 Multiply (discards higher bits, when JS multiply discards lower bits)
const uMul = (a, b) => Math.imul(a, b) >>> 0;

// crc32 byte single update (actually same function is part of utils.crc32 function :) )
const crc32update = (pCrc32, bval) => {
    return crctable[(pCrc32 ^ bval) & 0xff] ^ (pCrc32 >>> 8);
};

// function for generating salt for encrytion header
const genSalt = () => {
    if ("function" === typeof randomFillSync) {
        return randomFillSync(Buffer.alloc(12));
    } else {
        // fallback if function is not defined
        return genSalt.node();
    }
};

// salt generation with node random function (mainly as fallback)
genSalt.node = () => {
    const salt = Buffer.alloc(12);
    const len = salt.length;
    for (let i = 0; i < len; i++) salt[i] = (Math.random() * 256) & 0xff;
    return salt;
};

// general config
const config = {
    genSalt
};

// Class Initkeys handles same basic ops with keys
function Initkeys(pw) {
    const pass = Buffer.isBuffer(pw) ? pw : Buffer.from(pw);
    this.keys = new Uint32Array([0x12345678, 0x23456789, 0x34567890]);
    for (let i = 0; i < pass.length; i++) {
        this.updateKeys(pass[i]);
    }
}

Initkeys.prototype.updateKeys = function (byteValue) {
    const keys = this.keys;
    keys[0] = crc32update(keys[0], byteValue);
    keys[1] += keys[0] & 0xff;
    keys[1] = uMul(keys[1], 134775813) + 1;
    keys[2] = crc32update(keys[2], keys[1] >>> 24);
    return byteValue;
};

Initkeys.prototype.next = function () {
    const k = (this.keys[2] | 2) >>> 0; // key
    return (uMul(k, k ^ 1) >> 8) & 0xff; // decode
};

function make_decrypter(/*Buffer*/ pwd) {
    // 1. Stage initialize key
    const keys = new Initkeys(pwd);

    // return decrypter function
    return function (/*Buffer*/ data) {
        // result - we create new Buffer for results
        const result = Buffer.alloc(data.length);
        let pos = 0;
        // process input data
        for (let c of data) {
            //c ^= keys.next();
            //result[pos++] = c; // decode & Save Value
            result[pos++] = keys.updateKeys(c ^ keys.next()); // update keys with decoded byte
        }
        return result;
    };
}

function make_encrypter(/*Buffer*/ pwd) {
    // 1. Stage initialize key
    const keys = new Initkeys(pwd);

    // return encrypting function, result and pos is here so we dont have to merge buffers later
    return function (/*Buffer*/ data, /*Buffer*/ result, /* Number */ pos = 0) {
        // result - we create new Buffer for results
        if (!result) result = Buffer.alloc(data.length);
        // process input data
        for (let c of data) {
            const k = keys.next(); // save key byte
            result[pos++] = c ^ k; // save val
            keys.updateKeys(c); // update keys with decoded byte
        }
        return result;
    };
}

function decrypt(/*Buffer*/ data, /*Object*/ header, /*String, Buffer*/ pwd) {
    if (!data || !Buffer.isBuffer(data) || data.length < 12) {
        return Buffer.alloc(0);
    }

    // 1. We Initialize and generate decrypting function
    const decrypter = make_decrypter(pwd);

    // 2. decrypt salt what is always 12 bytes and is a part of file content
    const salt = decrypter(data.slice(0, 12));

    // if bit 3 (0x08) of the general-purpose flags field is set, check salt[11] with the high byte of the header time
    // 2 byte data block (as per Info-Zip spec), otherwise check with the high byte of the header entry
    const verifyByte = (header.flags & 0x8) === 0x8 ? header.timeHighByte : header.crc >>> 24;

    //3. does password meet expectations
    if (salt[11] !== verifyByte) {
        throw Errors.WRONG_PASSWORD();
    }

    // 4. decode content
    return decrypter(data.slice(12));
}

// lets add way to populate salt, NOT RECOMMENDED for production but maybe useful for testing general functionality
function _salter(data) {
    if (Buffer.isBuffer(data) && data.length >= 12) {
        // be aware - currently salting buffer data is modified
        config.genSalt = function () {
            return data.slice(0, 12);
        };
    } else if (data === "node") {
        // test salt generation with node random function
        config.genSalt = genSalt.node;
    } else {
        // if value is not acceptable config gets reset.
        config.genSalt = genSalt;
    }
}

function encrypt(/*Buffer*/ data, /*Object*/ header, /*String, Buffer*/ pwd, /*Boolean*/ oldlike = false) {
    // 1. test data if data is not Buffer we make buffer from it
    if (data == null) data = Buffer.alloc(0);
    // if data is not buffer be make buffer from it
    if (!Buffer.isBuffer(data)) data = Buffer.from(data.toString());

    // 2. We Initialize and generate encrypting function
    const encrypter = make_encrypter(pwd);

    // 3. generate salt (12-bytes of random data)
    const salt = config.genSalt();
    salt[11] = (header.crc >>> 24) & 0xff;

    // old implementations (before PKZip 2.04g) used two byte check
    if (oldlike) salt[10] = (header.crc >>> 16) & 0xff;

    // 4. create output
    const result = Buffer.alloc(data.length + 12);
    encrypter(salt, result);

    // finally encode content
    return encrypter(data, result, 12);
}

module.exports = { decrypt, encrypt, _salter };
