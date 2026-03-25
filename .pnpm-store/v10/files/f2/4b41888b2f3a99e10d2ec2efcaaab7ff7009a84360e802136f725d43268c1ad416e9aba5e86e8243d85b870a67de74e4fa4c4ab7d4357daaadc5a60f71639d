/**
 * PSS signature scheme
 */

var BigInteger = require('../libs/jsbn');
var crypt = require('crypto');

module.exports = {
    isEncryption: false,
    isSignature: true
};

var DEFAULT_HASH_FUNCTION = 'sha1';
var DEFAULT_SALT_LENGTH = 20;

module.exports.makeScheme = function (key, options) {
    var OAEP = require('./schemes').pkcs1_oaep;

    /**
     * @param key
     * @param options
     * options    [Object]    An object that contains the following keys that specify certain options for encoding.
     *  └>signingSchemeOptions
     *     ├>hash    [String]    Hash function to use when encoding and generating masks. Must be a string accepted by node's crypto.createHash function. (default = "sha1")
     *     ├>mgf    [function]    The mask generation function to use when encoding. (default = mgf1SHA1)
     *     └>sLen    [uint]        The length of the salt to generate. (default = 20)
     * @constructor
     */
    function Scheme(key, options) {
        this.key = key;
        this.options = options;
    }

    Scheme.prototype.sign = function (buffer) {
        var mHash = crypt.createHash(this.options.signingSchemeOptions.hash || DEFAULT_HASH_FUNCTION);
        mHash.update(buffer);

        var encoded = this.emsa_pss_encode(mHash.digest(), this.key.keySize - 1);
        return this.key.$doPrivate(new BigInteger(encoded)).toBuffer(this.key.encryptedDataLength);
    };

    Scheme.prototype.verify = function (buffer, signature, signature_encoding) {
        if (signature_encoding) {
            signature = Buffer.from(signature, signature_encoding);
        }
        signature = new BigInteger(signature);

        var emLen = Math.ceil((this.key.keySize - 1) / 8);
        var m = this.key.$doPublic(signature).toBuffer(emLen);

        var mHash = crypt.createHash(this.options.signingSchemeOptions.hash || DEFAULT_HASH_FUNCTION);
        mHash.update(buffer);

        return this.emsa_pss_verify(mHash.digest(), m, this.key.keySize - 1);
    };

    /*
     * https://tools.ietf.org/html/rfc3447#section-9.1.1
     *
     * mHash	[Buffer]	Hashed message to encode
     * emBits	[uint]		Maximum length of output in bits. Must be at least 8hLen + 8sLen + 9 (hLen = Hash digest length in bytes | sLen = length of salt in bytes)
     * @returns {Buffer} The encoded message
     */
    Scheme.prototype.emsa_pss_encode = function (mHash, emBits) {
        var hash = this.options.signingSchemeOptions.hash || DEFAULT_HASH_FUNCTION;
        var mgf = this.options.signingSchemeOptions.mgf || OAEP.eme_oaep_mgf1;
        var sLen = this.options.signingSchemeOptions.saltLength || DEFAULT_SALT_LENGTH;

        var hLen = OAEP.digestLength[hash];
        var emLen = Math.ceil(emBits / 8);

        if (emLen < hLen + sLen + 2) {
            throw new Error("Output length passed to emBits(" + emBits + ") is too small for the options " +
                "specified(" + hash + ", " + sLen + "). To fix this issue increase the value of emBits. (minimum size: " +
                (8 * hLen + 8 * sLen + 9) + ")"
            );
        }

        var salt = crypt.randomBytes(sLen);

        var Mapostrophe = Buffer.alloc(8 + hLen + sLen);
        Mapostrophe.fill(0, 0, 8);
        mHash.copy(Mapostrophe, 8);
        salt.copy(Mapostrophe, 8 + mHash.length);

        var H = crypt.createHash(hash);
        H.update(Mapostrophe);
        H = H.digest();

        var PS = Buffer.alloc(emLen - salt.length - hLen - 2);
        PS.fill(0);

        var DB = Buffer.alloc(PS.length + 1 + salt.length);
        PS.copy(DB);
        DB[PS.length] = 0x01;
        salt.copy(DB, PS.length + 1);

        var dbMask = mgf(H, DB.length, hash);

        // XOR DB and dbMask together
        var maskedDB = Buffer.alloc(DB.length);
        for (var i = 0; i < dbMask.length; i++) {
            maskedDB[i] = DB[i] ^ dbMask[i];
        }

        var bits = 8 * emLen - emBits;
        var mask = 255 ^ (255 >> 8 - bits << 8 - bits);
        maskedDB[0] = maskedDB[0] & mask;

        var EM = Buffer.alloc(maskedDB.length + H.length + 1);
        maskedDB.copy(EM, 0);
        H.copy(EM, maskedDB.length);
        EM[EM.length - 1] = 0xbc;

        return EM;
    };

    /*
     * https://tools.ietf.org/html/rfc3447#section-9.1.2
     *
     * mHash	[Buffer]	Hashed message
     * EM		[Buffer]	Signature
     * emBits	[uint]		Length of EM in bits. Must be at least 8hLen + 8sLen + 9 to be a valid signature. (hLen = Hash digest length in bytes | sLen = length of salt in bytes)
     * @returns {Boolean} True if signature(EM) matches message(M)
     */
    Scheme.prototype.emsa_pss_verify = function (mHash, EM, emBits) {
        var hash = this.options.signingSchemeOptions.hash || DEFAULT_HASH_FUNCTION;
        var mgf = this.options.signingSchemeOptions.mgf || OAEP.eme_oaep_mgf1;
        var sLen = this.options.signingSchemeOptions.saltLength || DEFAULT_SALT_LENGTH;

        var hLen = OAEP.digestLength[hash];
        var emLen = Math.ceil(emBits / 8);

        if (emLen < hLen + sLen + 2 || EM[EM.length - 1] != 0xbc) {
            return false;
        }

        var DB = Buffer.alloc(emLen - hLen - 1);
        EM.copy(DB, 0, 0, emLen - hLen - 1);

        var mask = 0;
        for (var i = 0, bits = 8 * emLen - emBits; i < bits; i++) {
            mask |= 1 << (7 - i);
        }

        if ((DB[0] & mask) !== 0) {
            return false;
        }

        var H = EM.slice(emLen - hLen - 1, emLen - 1);
        var dbMask = mgf(H, DB.length, hash);

        // Unmask DB
        for (i = 0; i < DB.length; i++) {
            DB[i] ^= dbMask[i];
        }

        bits = 8 * emLen - emBits;
        mask = 255 ^ (255 >> 8 - bits << 8 - bits);
        DB[0] = DB[0] & mask;

        // Filter out padding
        for (i = 0; DB[i] === 0 && i < DB.length; i++);
        if (DB[i] != 1) {
            return false;
        }

        var salt = DB.slice(DB.length - sLen);

        var Mapostrophe = Buffer.alloc(8 + hLen + sLen);
        Mapostrophe.fill(0, 0, 8);
        mHash.copy(Mapostrophe, 8);
        salt.copy(Mapostrophe, 8 + mHash.length);

        var Hapostrophe = crypt.createHash(hash);
        Hapostrophe.update(Mapostrophe);
        Hapostrophe = Hapostrophe.digest();

        return H.toString("hex") === Hapostrophe.toString("hex");
    };

    return new Scheme(key, options);
};
