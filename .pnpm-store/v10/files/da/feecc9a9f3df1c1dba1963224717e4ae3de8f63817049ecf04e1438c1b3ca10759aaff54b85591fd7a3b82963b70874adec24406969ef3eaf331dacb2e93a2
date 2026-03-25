// TODO:
//    * utilize `crypto.create(Private|Public)Key()` and `keyObject.export()`
//    * handle multi-line header values (OpenSSH)?
//    * more thorough validation?
'use strict';

const {
  createDecipheriv,
  createECDH,
  createHash,
  createHmac,
  createSign,
  createVerify,
  getCiphers,
  sign: sign_,
  verify: verify_,
} = require('crypto');
const supportedOpenSSLCiphers = getCiphers();

const { Ber } = require('asn1');
const bcrypt_pbkdf = require('bcrypt-pbkdf').pbkdf;

const { CIPHER_INFO } = require('./crypto.js');
const { eddsaSupported, SUPPORTED_CIPHER } = require('./constants.js');
const {
  bufferSlice,
  makeBufferParser,
  readString,
  readUInt32BE,
  writeUInt32BE,
} = require('./utils.js');

const SYM_HASH_ALGO = Symbol('Hash Algorithm');
const SYM_PRIV_PEM = Symbol('Private key PEM');
const SYM_PUB_PEM = Symbol('Public key PEM');
const SYM_PUB_SSH = Symbol('Public key SSH');
const SYM_DECRYPTED = Symbol('Decrypted Key');

// Create OpenSSL cipher name -> SSH cipher name conversion table
const CIPHER_INFO_OPENSSL = Object.create(null);
{
  const keys = Object.keys(CIPHER_INFO);
  for (let i = 0; i < keys.length; ++i) {
    const cipherName = CIPHER_INFO[keys[i]].sslName;
    if (!cipherName || CIPHER_INFO_OPENSSL[cipherName])
      continue;
    CIPHER_INFO_OPENSSL[cipherName] = CIPHER_INFO[keys[i]];
  }
}

const binaryKeyParser = makeBufferParser();

function makePEM(type, data) {
  data = data.base64Slice(0, data.length);
  let formatted = data.replace(/.{64}/g, '$&\n');
  if (data.length & 63)
    formatted += '\n';
  return `-----BEGIN ${type} KEY-----\n${formatted}-----END ${type} KEY-----`;
}

function combineBuffers(buf1, buf2) {
  const result = Buffer.allocUnsafe(buf1.length + buf2.length);
  result.set(buf1, 0);
  result.set(buf2, buf1.length);
  return result;
}

function skipFields(buf, nfields) {
  const bufLen = buf.length;
  let pos = (buf._pos || 0);
  for (let i = 0; i < nfields; ++i) {
    const left = (bufLen - pos);
    if (pos >= bufLen || left < 4)
      return false;
    const len = readUInt32BE(buf, pos);
    if (left < 4 + len)
      return false;
    pos += 4 + len;
  }
  buf._pos = pos;
  return true;
}

function genOpenSSLRSAPub(n, e) {
  const asnWriter = new Ber.Writer();
  asnWriter.startSequence();
    // algorithm
    asnWriter.startSequence();
      asnWriter.writeOID('1.2.840.113549.1.1.1'); // rsaEncryption
      // algorithm parameters (RSA has none)
      asnWriter.writeNull();
    asnWriter.endSequence();

    // subjectPublicKey
    asnWriter.startSequence(Ber.BitString);
      asnWriter.writeByte(0x00);
      asnWriter.startSequence();
        asnWriter.writeBuffer(n, Ber.Integer);
        asnWriter.writeBuffer(e, Ber.Integer);
      asnWriter.endSequence();
    asnWriter.endSequence();
  asnWriter.endSequence();
  return makePEM('PUBLIC', asnWriter.buffer);
}

function genOpenSSHRSAPub(n, e) {
  const publicKey = Buffer.allocUnsafe(4 + 7 + 4 + e.length + 4 + n.length);

  writeUInt32BE(publicKey, 7, 0);
  publicKey.utf8Write('ssh-rsa', 4, 7);

  let i = 4 + 7;
  writeUInt32BE(publicKey, e.length, i);
  publicKey.set(e, i += 4);

  writeUInt32BE(publicKey, n.length, i += e.length);
  publicKey.set(n, i + 4);

  return publicKey;
}

const genOpenSSLRSAPriv = (() => {
  function genRSAASN1Buf(n, e, d, p, q, dmp1, dmq1, iqmp) {
    const asnWriter = new Ber.Writer();
    asnWriter.startSequence();
      asnWriter.writeInt(0x00, Ber.Integer);
      asnWriter.writeBuffer(n, Ber.Integer);
      asnWriter.writeBuffer(e, Ber.Integer);
      asnWriter.writeBuffer(d, Ber.Integer);
      asnWriter.writeBuffer(p, Ber.Integer);
      asnWriter.writeBuffer(q, Ber.Integer);
      asnWriter.writeBuffer(dmp1, Ber.Integer);
      asnWriter.writeBuffer(dmq1, Ber.Integer);
      asnWriter.writeBuffer(iqmp, Ber.Integer);
    asnWriter.endSequence();
    return asnWriter.buffer;
  }

  function bigIntFromBuffer(buf) {
    return BigInt(`0x${buf.hexSlice(0, buf.length)}`);
  }

  function bigIntToBuffer(bn) {
    let hex = bn.toString(16);
    if ((hex.length & 1) !== 0) {
      hex = `0${hex}`;
    } else {
      const sigbit = hex.charCodeAt(0);
      // BER/DER integers require leading zero byte to denote a positive value
      // when first byte >= 0x80
      if (sigbit === 56/* '8' */
          || sigbit === 57/* '9' */
          || (sigbit >= 97/* 'a' */ && sigbit <= 102/* 'f' */)) {
        hex = `00${hex}`;
      }
    }
    return Buffer.from(hex, 'hex');
  }

  return function genOpenSSLRSAPriv(n, e, d, iqmp, p, q) {
    const bn_d = bigIntFromBuffer(d);
    const dmp1 = bigIntToBuffer(bn_d % (bigIntFromBuffer(p) - 1n));
    const dmq1 = bigIntToBuffer(bn_d % (bigIntFromBuffer(q) - 1n));
    return makePEM('RSA PRIVATE',
                   genRSAASN1Buf(n, e, d, p, q, dmp1, dmq1, iqmp));
  };
})();

function genOpenSSLDSAPub(p, q, g, y) {
  const asnWriter = new Ber.Writer();
  asnWriter.startSequence();
    // algorithm
    asnWriter.startSequence();
      asnWriter.writeOID('1.2.840.10040.4.1'); // id-dsa
      // algorithm parameters
      asnWriter.startSequence();
        asnWriter.writeBuffer(p, Ber.Integer);
        asnWriter.writeBuffer(q, Ber.Integer);
        asnWriter.writeBuffer(g, Ber.Integer);
      asnWriter.endSequence();
    asnWriter.endSequence();

    // subjectPublicKey
    asnWriter.startSequence(Ber.BitString);
      asnWriter.writeByte(0x00);
      asnWriter.writeBuffer(y, Ber.Integer);
    asnWriter.endSequence();
  asnWriter.endSequence();
  return makePEM('PUBLIC', asnWriter.buffer);
}

function genOpenSSHDSAPub(p, q, g, y) {
  const publicKey = Buffer.allocUnsafe(
    4 + 7 + 4 + p.length + 4 + q.length + 4 + g.length + 4 + y.length
  );

  writeUInt32BE(publicKey, 7, 0);
  publicKey.utf8Write('ssh-dss', 4, 7);

  let i = 4 + 7;
  writeUInt32BE(publicKey, p.length, i);
  publicKey.set(p, i += 4);

  writeUInt32BE(publicKey, q.length, i += p.length);
  publicKey.set(q, i += 4);

  writeUInt32BE(publicKey, g.length, i += q.length);
  publicKey.set(g, i += 4);

  writeUInt32BE(publicKey, y.length, i += g.length);
  publicKey.set(y, i + 4);

  return publicKey;
}

function genOpenSSLDSAPriv(p, q, g, y, x) {
  const asnWriter = new Ber.Writer();
  asnWriter.startSequence();
    asnWriter.writeInt(0x00, Ber.Integer);
    asnWriter.writeBuffer(p, Ber.Integer);
    asnWriter.writeBuffer(q, Ber.Integer);
    asnWriter.writeBuffer(g, Ber.Integer);
    asnWriter.writeBuffer(y, Ber.Integer);
    asnWriter.writeBuffer(x, Ber.Integer);
  asnWriter.endSequence();
  return makePEM('DSA PRIVATE', asnWriter.buffer);
}

function genOpenSSLEdPub(pub) {
  const asnWriter = new Ber.Writer();
  asnWriter.startSequence();
    // algorithm
    asnWriter.startSequence();
      asnWriter.writeOID('1.3.101.112'); // id-Ed25519
    asnWriter.endSequence();

    // PublicKey
    asnWriter.startSequence(Ber.BitString);
      asnWriter.writeByte(0x00);
      // XXX: hack to write a raw buffer without a tag -- yuck
      asnWriter._ensure(pub.length);
      asnWriter._buf.set(pub, asnWriter._offset);
      asnWriter._offset += pub.length;
    asnWriter.endSequence();
  asnWriter.endSequence();
  return makePEM('PUBLIC', asnWriter.buffer);
}

function genOpenSSHEdPub(pub) {
  const publicKey = Buffer.allocUnsafe(4 + 11 + 4 + pub.length);

  writeUInt32BE(publicKey, 11, 0);
  publicKey.utf8Write('ssh-ed25519', 4, 11);

  writeUInt32BE(publicKey, pub.length, 15);
  publicKey.set(pub, 19);

  return publicKey;
}

function genOpenSSLEdPriv(priv) {
  const asnWriter = new Ber.Writer();
  asnWriter.startSequence();
    // version
    asnWriter.writeInt(0x00, Ber.Integer);

    // algorithm
    asnWriter.startSequence();
      asnWriter.writeOID('1.3.101.112'); // id-Ed25519
    asnWriter.endSequence();

    // PrivateKey
    asnWriter.startSequence(Ber.OctetString);
      asnWriter.writeBuffer(priv, Ber.OctetString);
    asnWriter.endSequence();
  asnWriter.endSequence();
  return makePEM('PRIVATE', asnWriter.buffer);
}

function genOpenSSLECDSAPub(oid, Q) {
  const asnWriter = new Ber.Writer();
  asnWriter.startSequence();
    // algorithm
    asnWriter.startSequence();
      asnWriter.writeOID('1.2.840.10045.2.1'); // id-ecPublicKey
      // algorithm parameters (namedCurve)
      asnWriter.writeOID(oid);
    asnWriter.endSequence();

    // subjectPublicKey
    asnWriter.startSequence(Ber.BitString);
      asnWriter.writeByte(0x00);
      // XXX: hack to write a raw buffer without a tag -- yuck
      asnWriter._ensure(Q.length);
      asnWriter._buf.set(Q, asnWriter._offset);
      asnWriter._offset += Q.length;
      // end hack
    asnWriter.endSequence();
  asnWriter.endSequence();
  return makePEM('PUBLIC', asnWriter.buffer);
}

function genOpenSSHECDSAPub(oid, Q) {
  let curveName;
  switch (oid) {
    case '1.2.840.10045.3.1.7':
      // prime256v1/secp256r1
      curveName = 'nistp256';
      break;
    case '1.3.132.0.34':
      // secp384r1
      curveName = 'nistp384';
      break;
    case '1.3.132.0.35':
      // secp521r1
      curveName = 'nistp521';
      break;
    default:
      return;
  }

  const publicKey = Buffer.allocUnsafe(4 + 19 + 4 + 8 + 4 + Q.length);

  writeUInt32BE(publicKey, 19, 0);
  publicKey.utf8Write(`ecdsa-sha2-${curveName}`, 4, 19);

  writeUInt32BE(publicKey, 8, 23);
  publicKey.utf8Write(curveName, 27, 8);

  writeUInt32BE(publicKey, Q.length, 35);
  publicKey.set(Q, 39);

  return publicKey;
}

function genOpenSSLECDSAPriv(oid, pub, priv) {
  const asnWriter = new Ber.Writer();
  asnWriter.startSequence();
    // version
    asnWriter.writeInt(0x01, Ber.Integer);
    // privateKey
    asnWriter.writeBuffer(priv, Ber.OctetString);
    // parameters (optional)
    asnWriter.startSequence(0xA0);
      asnWriter.writeOID(oid);
    asnWriter.endSequence();
    // publicKey (optional)
    asnWriter.startSequence(0xA1);
      asnWriter.startSequence(Ber.BitString);
        asnWriter.writeByte(0x00);
        // XXX: hack to write a raw buffer without a tag -- yuck
        asnWriter._ensure(pub.length);
        asnWriter._buf.set(pub, asnWriter._offset);
        asnWriter._offset += pub.length;
        // end hack
      asnWriter.endSequence();
    asnWriter.endSequence();
  asnWriter.endSequence();
  return makePEM('EC PRIVATE', asnWriter.buffer);
}

function genOpenSSLECDSAPubFromPriv(curveName, priv) {
  const tempECDH = createECDH(curveName);
  tempECDH.setPrivateKey(priv);
  return tempECDH.getPublicKey();
}

const BaseKey = {
  sign: (() => {
    if (typeof sign_ === 'function') {
      return function sign(data, algo) {
        const pem = this[SYM_PRIV_PEM];
        if (pem === null)
          return new Error('No private key available');
        if (!algo || typeof algo !== 'string')
          algo = this[SYM_HASH_ALGO];
        try {
          return sign_(algo, data, pem);
        } catch (ex) {
          return ex;
        }
      };
    }
    return function sign(data, algo) {
      const pem = this[SYM_PRIV_PEM];
      if (pem === null)
        return new Error('No private key available');
      if (!algo || typeof algo !== 'string')
        algo = this[SYM_HASH_ALGO];
      const signature = createSign(algo);
      signature.update(data);
      try {
        return signature.sign(pem);
      } catch (ex) {
        return ex;
      }
    };
  })(),
  verify: (() => {
    if (typeof verify_ === 'function') {
      return function verify(data, signature, algo) {
        const pem = this[SYM_PUB_PEM];
        if (pem === null)
          return new Error('No public key available');
        if (!algo || typeof algo !== 'string')
          algo = this[SYM_HASH_ALGO];
        try {
          return verify_(algo, data, pem, signature);
        } catch (ex) {
          return ex;
        }
      };
    }
    return function verify(data, signature, algo) {
      const pem = this[SYM_PUB_PEM];
      if (pem === null)
        return new Error('No public key available');
      if (!algo || typeof algo !== 'string')
        algo = this[SYM_HASH_ALGO];
      const verifier = createVerify(algo);
      verifier.update(data);
      try {
        return verifier.verify(pem, signature);
      } catch (ex) {
        return ex;
      }
    };
  })(),
  isPrivateKey: function isPrivateKey() {
    return (this[SYM_PRIV_PEM] !== null);
  },
  getPrivatePEM: function getPrivatePEM() {
    return this[SYM_PRIV_PEM];
  },
  getPublicPEM: function getPublicPEM() {
    return this[SYM_PUB_PEM];
  },
  getPublicSSH: function getPublicSSH() {
    return this[SYM_PUB_SSH];
  },
  equals: function equals(key) {
    const parsed = parseKey(key);
    if (parsed instanceof Error)
      return false;
    return (
      this.type === parsed.type
      && this[SYM_PRIV_PEM] === parsed[SYM_PRIV_PEM]
      && this[SYM_PUB_PEM] === parsed[SYM_PUB_PEM]
      && this[SYM_PUB_SSH] === parsed[SYM_PUB_SSH]
    );
  },
};


function OpenSSH_Private(type, comment, privPEM, pubPEM, pubSSH, algo,
                         decrypted) {
  this.type = type;
  this.comment = comment;
  this[SYM_PRIV_PEM] = privPEM;
  this[SYM_PUB_PEM] = pubPEM;
  this[SYM_PUB_SSH] = pubSSH;
  this[SYM_HASH_ALGO] = algo;
  this[SYM_DECRYPTED] = decrypted;
}
OpenSSH_Private.prototype = BaseKey;
{
  const regexp = /^-----BEGIN OPENSSH PRIVATE KEY-----(?:\r\n|\n)([\s\S]+)(?:\r\n|\n)-----END OPENSSH PRIVATE KEY-----$/;
  OpenSSH_Private.parse = (str, passphrase) => {
    const m = regexp.exec(str);
    if (m === null)
      return null;
    let ret;
    const data = Buffer.from(m[1], 'base64');
    if (data.length < 31) // magic (+ magic null term.) + minimum field lengths
      return new Error('Malformed OpenSSH private key');
    const magic = data.utf8Slice(0, 15);
    if (magic !== 'openssh-key-v1\0')
      return new Error(`Unsupported OpenSSH key magic: ${magic}`);

    const cipherName = readString(data, 15, true);
    if (cipherName === undefined)
      return new Error('Malformed OpenSSH private key');
    if (cipherName !== 'none' && SUPPORTED_CIPHER.indexOf(cipherName) === -1)
      return new Error(`Unsupported cipher for OpenSSH key: ${cipherName}`);

    const kdfName = readString(data, data._pos, true);
    if (kdfName === undefined)
      return new Error('Malformed OpenSSH private key');
    if (kdfName !== 'none') {
      if (cipherName === 'none')
        return new Error('Malformed OpenSSH private key');
      if (kdfName !== 'bcrypt')
        return new Error(`Unsupported kdf name for OpenSSH key: ${kdfName}`);
      if (!passphrase) {
        return new Error(
          'Encrypted private OpenSSH key detected, but no passphrase given'
        );
      }
    } else if (cipherName !== 'none') {
      return new Error('Malformed OpenSSH private key');
    }

    let encInfo;
    let cipherKey;
    let cipherIV;
    if (cipherName !== 'none')
      encInfo = CIPHER_INFO[cipherName];
    const kdfOptions = readString(data, data._pos);
    if (kdfOptions === undefined)
      return new Error('Malformed OpenSSH private key');
    if (kdfOptions.length) {
      switch (kdfName) {
        case 'none':
          return new Error('Malformed OpenSSH private key');
        case 'bcrypt': {
          /*
            string salt
            uint32 rounds
          */
          const salt = readString(kdfOptions, 0);
          if (salt === undefined || kdfOptions._pos + 4 > kdfOptions.length)
            return new Error('Malformed OpenSSH private key');
          const rounds = readUInt32BE(kdfOptions, kdfOptions._pos);
          const gen = Buffer.allocUnsafe(encInfo.keyLen + encInfo.ivLen);
          const r = bcrypt_pbkdf(passphrase,
                                 passphrase.length,
                                 salt,
                                 salt.length,
                                 gen,
                                 gen.length,
                                 rounds);
          if (r !== 0)
            return new Error('Failed to generate information to decrypt key');
          cipherKey = bufferSlice(gen, 0, encInfo.keyLen);
          cipherIV = bufferSlice(gen, encInfo.keyLen, gen.length);
          break;
        }
      }
    } else if (kdfName !== 'none') {
      return new Error('Malformed OpenSSH private key');
    }

    if (data._pos + 3 >= data.length)
      return new Error('Malformed OpenSSH private key');
    const keyCount = readUInt32BE(data, data._pos);
    data._pos += 4;

    if (keyCount > 0) {
      // TODO: place sensible limit on max `keyCount`

      // Read public keys first
      for (let i = 0; i < keyCount; ++i) {
        const pubData = readString(data, data._pos);
        if (pubData === undefined)
          return new Error('Malformed OpenSSH private key');
        const type = readString(pubData, 0, true);
        if (type === undefined)
          return new Error('Malformed OpenSSH private key');
      }

      let privBlob = readString(data, data._pos);
      if (privBlob === undefined)
        return new Error('Malformed OpenSSH private key');

      if (cipherKey !== undefined) {
        // Encrypted private key(s)
        if (privBlob.length < encInfo.blockLen
            || (privBlob.length % encInfo.blockLen) !== 0) {
          return new Error('Malformed OpenSSH private key');
        }
        try {
          const options = { authTagLength: encInfo.authLen };
          const decipher = createDecipheriv(encInfo.sslName,
                                            cipherKey,
                                            cipherIV,
                                            options);
          decipher.setAutoPadding(false);
          if (encInfo.authLen > 0) {
            if (data.length - data._pos < encInfo.authLen)
              return new Error('Malformed OpenSSH private key');
            decipher.setAuthTag(
              bufferSlice(data, data._pos, data._pos += encInfo.authLen)
            );
          }
          privBlob = combineBuffers(decipher.update(privBlob),
                                    decipher.final());
        } catch (ex) {
          return ex;
        }
      }
      // Nothing should we follow the private key(s), except a possible
      // authentication tag for relevant ciphers
      if (data._pos !== data.length)
        return new Error('Malformed OpenSSH private key');

      ret = parseOpenSSHPrivKeys(privBlob, keyCount, cipherKey !== undefined);
    } else {
      ret = [];
    }
    if (ret instanceof Error)
      return ret;
    // This will need to change if/when OpenSSH ever starts storing multiple
    // keys in their key files
    return ret[0];
  };

  function parseOpenSSHPrivKeys(data, nkeys, decrypted) {
    const keys = [];
    /*
      uint32  checkint
      uint32  checkint
      string  privatekey1
      string  comment1
      string  privatekey2
      string  comment2
      ...
      string  privatekeyN
      string  commentN
      char  1
      char  2
      char  3
      ...
      char  padlen % 255
    */
    if (data.length < 8)
      return new Error('Malformed OpenSSH private key');
    const check1 = readUInt32BE(data, 0);
    const check2 = readUInt32BE(data, 4);
    if (check1 !== check2) {
      if (decrypted) {
        return new Error(
          'OpenSSH key integrity check failed -- bad passphrase?'
        );
      }
      return new Error('OpenSSH key integrity check failed');
    }
    data._pos = 8;
    let i;
    let oid;
    for (i = 0; i < nkeys; ++i) {
      let algo;
      let privPEM;
      let pubPEM;
      let pubSSH;
      // The OpenSSH documentation for the key format actually lies, the
      // entirety of the private key content is not contained with a string
      // field, it's actually the literal contents of the private key, so to be
      // able to find the end of the key data you need to know the layout/format
      // of each key type ...
      const type = readString(data, data._pos, true);
      if (type === undefined)
        return new Error('Malformed OpenSSH private key');

      switch (type) {
        case 'ssh-rsa': {
          /*
            string  n -- public
            string  e -- public
            string  d -- private
            string  iqmp -- private
            string  p -- private
            string  q -- private
          */
          const n = readString(data, data._pos);
          if (n === undefined)
            return new Error('Malformed OpenSSH private key');
          const e = readString(data, data._pos);
          if (e === undefined)
            return new Error('Malformed OpenSSH private key');
          const d = readString(data, data._pos);
          if (d === undefined)
            return new Error('Malformed OpenSSH private key');
          const iqmp = readString(data, data._pos);
          if (iqmp === undefined)
            return new Error('Malformed OpenSSH private key');
          const p = readString(data, data._pos);
          if (p === undefined)
            return new Error('Malformed OpenSSH private key');
          const q = readString(data, data._pos);
          if (q === undefined)
            return new Error('Malformed OpenSSH private key');

          pubPEM = genOpenSSLRSAPub(n, e);
          pubSSH = genOpenSSHRSAPub(n, e);
          privPEM = genOpenSSLRSAPriv(n, e, d, iqmp, p, q);
          algo = 'sha1';
          break;
        }
        case 'ssh-dss': {
          /*
            string  p -- public
            string  q -- public
            string  g -- public
            string  y -- public
            string  x -- private
          */
          const p = readString(data, data._pos);
          if (p === undefined)
            return new Error('Malformed OpenSSH private key');
          const q = readString(data, data._pos);
          if (q === undefined)
            return new Error('Malformed OpenSSH private key');
          const g = readString(data, data._pos);
          if (g === undefined)
            return new Error('Malformed OpenSSH private key');
          const y = readString(data, data._pos);
          if (y === undefined)
            return new Error('Malformed OpenSSH private key');
          const x = readString(data, data._pos);
          if (x === undefined)
            return new Error('Malformed OpenSSH private key');

          pubPEM = genOpenSSLDSAPub(p, q, g, y);
          pubSSH = genOpenSSHDSAPub(p, q, g, y);
          privPEM = genOpenSSLDSAPriv(p, q, g, y, x);
          algo = 'sha1';
          break;
        }
        case 'ssh-ed25519': {
          if (!eddsaSupported)
            return new Error(`Unsupported OpenSSH private key type: ${type}`);
          /*
            * string  public key
            * string  private key + public key
          */
          const edpub = readString(data, data._pos);
          if (edpub === undefined || edpub.length !== 32)
            return new Error('Malformed OpenSSH private key');
          const edpriv = readString(data, data._pos);
          if (edpriv === undefined || edpriv.length !== 64)
            return new Error('Malformed OpenSSH private key');

          pubPEM = genOpenSSLEdPub(edpub);
          pubSSH = genOpenSSHEdPub(edpub);
          privPEM = genOpenSSLEdPriv(bufferSlice(edpriv, 0, 32));
          algo = null;
          break;
        }
        case 'ecdsa-sha2-nistp256':
          algo = 'sha256';
          oid = '1.2.840.10045.3.1.7';
        // FALLTHROUGH
        case 'ecdsa-sha2-nistp384':
          if (algo === undefined) {
            algo = 'sha384';
            oid = '1.3.132.0.34';
          }
        // FALLTHROUGH
        case 'ecdsa-sha2-nistp521': {
          if (algo === undefined) {
            algo = 'sha512';
            oid = '1.3.132.0.35';
          }
          /*
            string  curve name
            string  Q -- public
            string  d -- private
          */
          // TODO: validate curve name against type
          if (!skipFields(data, 1)) // Skip curve name
            return new Error('Malformed OpenSSH private key');
          const ecpub = readString(data, data._pos);
          if (ecpub === undefined)
            return new Error('Malformed OpenSSH private key');
          const ecpriv = readString(data, data._pos);
          if (ecpriv === undefined)
            return new Error('Malformed OpenSSH private key');

          pubPEM = genOpenSSLECDSAPub(oid, ecpub);
          pubSSH = genOpenSSHECDSAPub(oid, ecpub);
          privPEM = genOpenSSLECDSAPriv(oid, ecpub, ecpriv);
          break;
        }
        default:
          return new Error(`Unsupported OpenSSH private key type: ${type}`);
      }

      const privComment = readString(data, data._pos, true);
      if (privComment === undefined)
        return new Error('Malformed OpenSSH private key');

      keys.push(
        new OpenSSH_Private(type, privComment, privPEM, pubPEM, pubSSH, algo,
                            decrypted)
      );
    }
    let cnt = 0;
    for (i = data._pos; i < data.length; ++i) {
      if (data[i] !== (++cnt % 255))
        return new Error('Malformed OpenSSH private key');
    }

    return keys;
  }
}


function OpenSSH_Old_Private(type, comment, privPEM, pubPEM, pubSSH, algo,
                             decrypted) {
  this.type = type;
  this.comment = comment;
  this[SYM_PRIV_PEM] = privPEM;
  this[SYM_PUB_PEM] = pubPEM;
  this[SYM_PUB_SSH] = pubSSH;
  this[SYM_HASH_ALGO] = algo;
  this[SYM_DECRYPTED] = decrypted;
}
OpenSSH_Old_Private.prototype = BaseKey;
{
  const regexp = /^-----BEGIN (RSA|DSA|EC) PRIVATE KEY-----(?:\r\n|\n)((?:[^:]+:\s*[\S].*(?:\r\n|\n))*)([\s\S]+)(?:\r\n|\n)-----END (RSA|DSA|EC) PRIVATE KEY-----$/;
  OpenSSH_Old_Private.parse = (str, passphrase) => {
    const m = regexp.exec(str);
    if (m === null)
      return null;
    let privBlob = Buffer.from(m[3], 'base64');
    let headers = m[2];
    let decrypted = false;
    if (headers !== undefined) {
      // encrypted key
      headers = headers.split(/\r\n|\n/g);
      for (let i = 0; i < headers.length; ++i) {
        const header = headers[i];
        let sepIdx = header.indexOf(':');
        if (header.slice(0, sepIdx) === 'DEK-Info') {
          const val = header.slice(sepIdx + 2);
          sepIdx = val.indexOf(',');
          if (sepIdx === -1)
            continue;
          const cipherName = val.slice(0, sepIdx).toLowerCase();
          if (supportedOpenSSLCiphers.indexOf(cipherName) === -1) {
            return new Error(
              `Cipher (${cipherName}) not supported `
                + 'for encrypted OpenSSH private key'
            );
          }
          const encInfo = CIPHER_INFO_OPENSSL[cipherName];
          if (!encInfo) {
            return new Error(
              `Cipher (${cipherName}) not supported `
                + 'for encrypted OpenSSH private key'
            );
          }
          const cipherIV = Buffer.from(val.slice(sepIdx + 1), 'hex');
          if (cipherIV.length !== encInfo.ivLen)
            return new Error('Malformed encrypted OpenSSH private key');
          if (!passphrase) {
            return new Error(
              'Encrypted OpenSSH private key detected, but no passphrase given'
            );
          }
          const ivSlice = bufferSlice(cipherIV, 0, 8);
          let cipherKey = createHash('md5')
                            .update(passphrase)
                            .update(ivSlice)
                            .digest();
          while (cipherKey.length < encInfo.keyLen) {
            cipherKey = combineBuffers(
              cipherKey,
              createHash('md5')
                .update(cipherKey)
                .update(passphrase)
                .update(ivSlice)
                .digest()
            );
          }
          if (cipherKey.length > encInfo.keyLen)
            cipherKey = bufferSlice(cipherKey, 0, encInfo.keyLen);
          try {
            const decipher = createDecipheriv(cipherName, cipherKey, cipherIV);
            decipher.setAutoPadding(false);
            privBlob = combineBuffers(decipher.update(privBlob),
                                      decipher.final());
            decrypted = true;
          } catch (ex) {
            return ex;
          }
        }
      }
    }

    let type;
    let privPEM;
    let pubPEM;
    let pubSSH;
    let algo;
    let reader;
    let errMsg = 'Malformed OpenSSH private key';
    if (decrypted)
      errMsg += '. Bad passphrase?';
    switch (m[1]) {
      case 'RSA':
        type = 'ssh-rsa';
        privPEM = makePEM('RSA PRIVATE', privBlob);
        try {
          reader = new Ber.Reader(privBlob);
          reader.readSequence();
          reader.readInt(); // skip version
          const n = reader.readString(Ber.Integer, true);
          if (n === null)
            return new Error(errMsg);
          const e = reader.readString(Ber.Integer, true);
          if (e === null)
            return new Error(errMsg);
          pubPEM = genOpenSSLRSAPub(n, e);
          pubSSH = genOpenSSHRSAPub(n, e);
        } catch {
          return new Error(errMsg);
        }
        algo = 'sha1';
        break;
      case 'DSA':
        type = 'ssh-dss';
        privPEM = makePEM('DSA PRIVATE', privBlob);
        try {
          reader = new Ber.Reader(privBlob);
          reader.readSequence();
          reader.readInt(); // skip version
          const p = reader.readString(Ber.Integer, true);
          if (p === null)
            return new Error(errMsg);
          const q = reader.readString(Ber.Integer, true);
          if (q === null)
            return new Error(errMsg);
          const g = reader.readString(Ber.Integer, true);
          if (g === null)
            return new Error(errMsg);
          const y = reader.readString(Ber.Integer, true);
          if (y === null)
            return new Error(errMsg);
          pubPEM = genOpenSSLDSAPub(p, q, g, y);
          pubSSH = genOpenSSHDSAPub(p, q, g, y);
        } catch {
          return new Error(errMsg);
        }
        algo = 'sha1';
        break;
      case 'EC': {
        let ecSSLName;
        let ecPriv;
        let ecOID;
        try {
          reader = new Ber.Reader(privBlob);
          reader.readSequence();
          reader.readInt(); // skip version
          ecPriv = reader.readString(Ber.OctetString, true);
          reader.readByte(); // Skip "complex" context type byte
          const offset = reader.readLength(); // Skip context length
          if (offset !== null) {
            reader._offset = offset;
            ecOID = reader.readOID();
            if (ecOID === null)
              return new Error(errMsg);
            switch (ecOID) {
              case '1.2.840.10045.3.1.7':
                // prime256v1/secp256r1
                ecSSLName = 'prime256v1';
                type = 'ecdsa-sha2-nistp256';
                algo = 'sha256';
                break;
              case '1.3.132.0.34':
                // secp384r1
                ecSSLName = 'secp384r1';
                type = 'ecdsa-sha2-nistp384';
                algo = 'sha384';
                break;
              case '1.3.132.0.35':
                // secp521r1
                ecSSLName = 'secp521r1';
                type = 'ecdsa-sha2-nistp521';
                algo = 'sha512';
                break;
              default:
                return new Error(`Unsupported private key EC OID: ${ecOID}`);
            }
          } else {
            return new Error(errMsg);
          }
        } catch {
          return new Error(errMsg);
        }
        privPEM = makePEM('EC PRIVATE', privBlob);
        const pubBlob = genOpenSSLECDSAPubFromPriv(ecSSLName, ecPriv);
        pubPEM = genOpenSSLECDSAPub(ecOID, pubBlob);
        pubSSH = genOpenSSHECDSAPub(ecOID, pubBlob);
        break;
      }
    }

    return new OpenSSH_Old_Private(type, '', privPEM, pubPEM, pubSSH, algo,
                                   decrypted);
  };
}


function PPK_Private(type, comment, privPEM, pubPEM, pubSSH, algo, decrypted) {
  this.type = type;
  this.comment = comment;
  this[SYM_PRIV_PEM] = privPEM;
  this[SYM_PUB_PEM] = pubPEM;
  this[SYM_PUB_SSH] = pubSSH;
  this[SYM_HASH_ALGO] = algo;
  this[SYM_DECRYPTED] = decrypted;
}
PPK_Private.prototype = BaseKey;
{
  const EMPTY_PASSPHRASE = Buffer.alloc(0);
  const PPK_IV = Buffer.from([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const PPK_PP1 = Buffer.from([0, 0, 0, 0]);
  const PPK_PP2 = Buffer.from([0, 0, 0, 1]);
  const regexp = /^PuTTY-User-Key-File-2: (ssh-(?:rsa|dss))\r?\nEncryption: (aes256-cbc|none)\r?\nComment: ([^\r\n]*)\r?\nPublic-Lines: \d+\r?\n([\s\S]+?)\r?\nPrivate-Lines: \d+\r?\n([\s\S]+?)\r?\nPrivate-MAC: ([^\r\n]+)/;
  PPK_Private.parse = (str, passphrase) => {
    const m = regexp.exec(str);
    if (m === null)
      return null;
    // m[1] = key type
    // m[2] = encryption type
    // m[3] = comment
    // m[4] = base64-encoded public key data:
    //         for "ssh-rsa":
    //          string "ssh-rsa"
    //          mpint  e    (public exponent)
    //          mpint  n    (modulus)
    //         for "ssh-dss":
    //          string "ssh-dss"
    //          mpint p     (modulus)
    //          mpint q     (prime)
    //          mpint g     (base number)
    //          mpint y     (public key parameter: g^x mod p)
    // m[5] = base64-encoded private key data:
    //         for "ssh-rsa":
    //          mpint  d    (private exponent)
    //          mpint  p    (prime 1)
    //          mpint  q    (prime 2)
    //          mpint  iqmp ([inverse of q] mod p)
    //         for "ssh-dss":
    //          mpint x     (private key parameter)
    // m[6] = SHA1 HMAC over:
    //          string  name of algorithm ("ssh-dss", "ssh-rsa")
    //          string  encryption type
    //          string  comment
    //          string  public key data
    //          string  private-plaintext (including the final padding)
    const cipherName = m[2];
    const encrypted = (cipherName !== 'none');
    if (encrypted && !passphrase) {
      return new Error(
        'Encrypted PPK private key detected, but no passphrase given'
      );
    }

    let privBlob = Buffer.from(m[5], 'base64');

    if (encrypted) {
      const encInfo = CIPHER_INFO[cipherName];
      let cipherKey = combineBuffers(
        createHash('sha1').update(PPK_PP1).update(passphrase).digest(),
        createHash('sha1').update(PPK_PP2).update(passphrase).digest()
      );
      if (cipherKey.length > encInfo.keyLen)
        cipherKey = bufferSlice(cipherKey, 0, encInfo.keyLen);
      try {
        const decipher = createDecipheriv(encInfo.sslName, cipherKey, PPK_IV);
        decipher.setAutoPadding(false);
        privBlob = combineBuffers(decipher.update(privBlob),
                                  decipher.final());
      } catch (ex) {
        return ex;
      }
    }

    const type = m[1];
    const comment = m[3];
    const pubBlob = Buffer.from(m[4], 'base64');

    const mac = m[6];
    const typeLen = type.length;
    const cipherNameLen = cipherName.length;
    const commentLen = Buffer.byteLength(comment);
    const pubLen = pubBlob.length;
    const privLen = privBlob.length;
    const macData = Buffer.allocUnsafe(4 + typeLen
                                       + 4 + cipherNameLen
                                       + 4 + commentLen
                                       + 4 + pubLen
                                       + 4 + privLen);
    let p = 0;

    writeUInt32BE(macData, typeLen, p);
    macData.utf8Write(type, p += 4, typeLen);
    writeUInt32BE(macData, cipherNameLen, p += typeLen);
    macData.utf8Write(cipherName, p += 4, cipherNameLen);
    writeUInt32BE(macData, commentLen, p += cipherNameLen);
    macData.utf8Write(comment, p += 4, commentLen);
    writeUInt32BE(macData, pubLen, p += commentLen);
    macData.set(pubBlob, p += 4);
    writeUInt32BE(macData, privLen, p += pubLen);
    macData.set(privBlob, p + 4);

    if (!passphrase)
      passphrase = EMPTY_PASSPHRASE;

    const calcMAC = createHmac(
      'sha1',
       createHash('sha1')
         .update('putty-private-key-file-mac-key')
         .update(passphrase)
         .digest()
    ).update(macData).digest('hex');

    if (calcMAC !== mac) {
      if (encrypted) {
        return new Error(
          'PPK private key integrity check failed -- bad passphrase?'
        );
      }
      return new Error('PPK private key integrity check failed');
    }

    let pubPEM;
    let pubSSH;
    let privPEM;
    pubBlob._pos = 0;
    skipFields(pubBlob, 1); // skip (duplicate) key type
    switch (type) {
      case 'ssh-rsa': {
        const e = readString(pubBlob, pubBlob._pos);
        if (e === undefined)
          return new Error('Malformed PPK public key');
        const n = readString(pubBlob, pubBlob._pos);
        if (n === undefined)
          return new Error('Malformed PPK public key');
        const d = readString(privBlob, 0);
        if (d === undefined)
          return new Error('Malformed PPK private key');
        const p = readString(privBlob, privBlob._pos);
        if (p === undefined)
          return new Error('Malformed PPK private key');
        const q = readString(privBlob, privBlob._pos);
        if (q === undefined)
          return new Error('Malformed PPK private key');
        const iqmp = readString(privBlob, privBlob._pos);
        if (iqmp === undefined)
          return new Error('Malformed PPK private key');
        pubPEM = genOpenSSLRSAPub(n, e);
        pubSSH = genOpenSSHRSAPub(n, e);
        privPEM = genOpenSSLRSAPriv(n, e, d, iqmp, p, q);
        break;
      }
      case 'ssh-dss': {
        const p = readString(pubBlob, pubBlob._pos);
        if (p === undefined)
          return new Error('Malformed PPK public key');
        const q = readString(pubBlob, pubBlob._pos);
        if (q === undefined)
          return new Error('Malformed PPK public key');
        const g = readString(pubBlob, pubBlob._pos);
        if (g === undefined)
          return new Error('Malformed PPK public key');
        const y = readString(pubBlob, pubBlob._pos);
        if (y === undefined)
          return new Error('Malformed PPK public key');
        const x = readString(privBlob, 0);
        if (x === undefined)
          return new Error('Malformed PPK private key');

        pubPEM = genOpenSSLDSAPub(p, q, g, y);
        pubSSH = genOpenSSHDSAPub(p, q, g, y);
        privPEM = genOpenSSLDSAPriv(p, q, g, y, x);
        break;
      }
    }

    return new PPK_Private(type, comment, privPEM, pubPEM, pubSSH, 'sha1',
                           encrypted);
  };
}


function OpenSSH_Public(type, comment, pubPEM, pubSSH, algo) {
  this.type = type;
  this.comment = comment;
  this[SYM_PRIV_PEM] = null;
  this[SYM_PUB_PEM] = pubPEM;
  this[SYM_PUB_SSH] = pubSSH;
  this[SYM_HASH_ALGO] = algo;
  this[SYM_DECRYPTED] = false;
}
OpenSSH_Public.prototype = BaseKey;
{
  let regexp;
  if (eddsaSupported)
    regexp = /^(((?:ssh-(?:rsa|dss|ed25519))|ecdsa-sha2-nistp(?:256|384|521))(?:-cert-v0[01]@openssh.com)?) ([A-Z0-9a-z/+=]+)(?:$|\s+([\S].*)?)$/;
  else
    regexp = /^(((?:ssh-(?:rsa|dss))|ecdsa-sha2-nistp(?:256|384|521))(?:-cert-v0[01]@openssh.com)?) ([A-Z0-9a-z/+=]+)(?:$|\s+([\S].*)?)$/;
  OpenSSH_Public.parse = (str) => {
    const m = regexp.exec(str);
    if (m === null)
      return null;
    // m[1] = full type
    // m[2] = base type
    // m[3] = base64-encoded public key
    // m[4] = comment

    const fullType = m[1];
    const baseType = m[2];
    const data = Buffer.from(m[3], 'base64');
    const comment = (m[4] || '');

    const type = readString(data, data._pos, true);
    if (type === undefined || type.indexOf(baseType) !== 0)
      return new Error('Malformed OpenSSH public key');

    return parseDER(data, baseType, comment, fullType);
  };
}


function RFC4716_Public(type, comment, pubPEM, pubSSH, algo) {
  this.type = type;
  this.comment = comment;
  this[SYM_PRIV_PEM] = null;
  this[SYM_PUB_PEM] = pubPEM;
  this[SYM_PUB_SSH] = pubSSH;
  this[SYM_HASH_ALGO] = algo;
  this[SYM_DECRYPTED] = false;
}
RFC4716_Public.prototype = BaseKey;
{
  const regexp = /^---- BEGIN SSH2 PUBLIC KEY ----(?:\r?\n)((?:.{0,72}\r?\n)+)---- END SSH2 PUBLIC KEY ----$/;
  const RE_DATA = /^[A-Z0-9a-z/+=\r\n]+$/;
  const RE_HEADER = /^([\x21-\x39\x3B-\x7E]{1,64}): ((?:[^\\]*\\\r?\n)*[^\r\n]+)\r?\n/gm;
  const RE_HEADER_ENDS = /\\\r?\n/g;
  RFC4716_Public.parse = (str) => {
    let m = regexp.exec(str);
    if (m === null)
      return null;

    const body = m[1];
    let dataStart = 0;
    let comment = '';

    while (m = RE_HEADER.exec(body)) {
      const headerName = m[1];
      const headerValue = m[2].replace(RE_HEADER_ENDS, '');
      if (headerValue.length > 1024) {
        RE_HEADER.lastIndex = 0;
        return new Error('Malformed RFC4716 public key');
      }

      dataStart = RE_HEADER.lastIndex;

      if (headerName.toLowerCase() === 'comment') {
        comment = headerValue;
        if (comment.length > 1
            && comment.charCodeAt(0) === 34/* '"' */
            && comment.charCodeAt(comment.length - 1) === 34/* '"' */) {
          comment = comment.slice(1, -1);
        }
      }
    }

    let data = body.slice(dataStart);
    if (!RE_DATA.test(data))
      return new Error('Malformed RFC4716 public key');

    data = Buffer.from(data, 'base64');

    const type = readString(data, 0, true);
    if (type === undefined)
      return new Error('Malformed RFC4716 public key');

    let pubPEM = null;
    let pubSSH = null;
    switch (type) {
      case 'ssh-rsa': {
        const e = readString(data, data._pos);
        if (e === undefined)
          return new Error('Malformed RFC4716 public key');
        const n = readString(data, data._pos);
        if (n === undefined)
          return new Error('Malformed RFC4716 public key');
        pubPEM = genOpenSSLRSAPub(n, e);
        pubSSH = genOpenSSHRSAPub(n, e);
        break;
      }
      case 'ssh-dss': {
        const p = readString(data, data._pos);
        if (p === undefined)
          return new Error('Malformed RFC4716 public key');
        const q = readString(data, data._pos);
        if (q === undefined)
          return new Error('Malformed RFC4716 public key');
        const g = readString(data, data._pos);
        if (g === undefined)
          return new Error('Malformed RFC4716 public key');
        const y = readString(data, data._pos);
        if (y === undefined)
          return new Error('Malformed RFC4716 public key');
        pubPEM = genOpenSSLDSAPub(p, q, g, y);
        pubSSH = genOpenSSHDSAPub(p, q, g, y);
        break;
      }
      default:
        return new Error('Malformed RFC4716 public key');
    }

    return new RFC4716_Public(type, comment, pubPEM, pubSSH, 'sha1');
  };
}


function parseDER(data, baseType, comment, fullType) {
  if (!isSupportedKeyType(baseType))
    return new Error(`Unsupported OpenSSH public key type: ${baseType}`);

  let algo;
  let oid;
  let pubPEM = null;
  let pubSSH = null;

  switch (baseType) {
    case 'ssh-rsa': {
      const e = readString(data, data._pos || 0);
      if (e === undefined)
        return new Error('Malformed OpenSSH public key');
      const n = readString(data, data._pos);
      if (n === undefined)
        return new Error('Malformed OpenSSH public key');
      pubPEM = genOpenSSLRSAPub(n, e);
      pubSSH = genOpenSSHRSAPub(n, e);
      algo = 'sha1';
      break;
    }
    case 'ssh-dss': {
      const p = readString(data, data._pos || 0);
      if (p === undefined)
        return new Error('Malformed OpenSSH public key');
      const q = readString(data, data._pos);
      if (q === undefined)
        return new Error('Malformed OpenSSH public key');
      const g = readString(data, data._pos);
      if (g === undefined)
        return new Error('Malformed OpenSSH public key');
      const y = readString(data, data._pos);
      if (y === undefined)
        return new Error('Malformed OpenSSH public key');
      pubPEM = genOpenSSLDSAPub(p, q, g, y);
      pubSSH = genOpenSSHDSAPub(p, q, g, y);
      algo = 'sha1';
      break;
    }
    case 'ssh-ed25519': {
      const edpub = readString(data, data._pos || 0);
      if (edpub === undefined || edpub.length !== 32)
        return new Error('Malformed OpenSSH public key');
      pubPEM = genOpenSSLEdPub(edpub);
      pubSSH = genOpenSSHEdPub(edpub);
      algo = null;
      break;
    }
    case 'ecdsa-sha2-nistp256':
      algo = 'sha256';
      oid = '1.2.840.10045.3.1.7';
    // FALLTHROUGH
    case 'ecdsa-sha2-nistp384':
      if (algo === undefined) {
        algo = 'sha384';
        oid = '1.3.132.0.34';
      }
    // FALLTHROUGH
    case 'ecdsa-sha2-nistp521': {
      if (algo === undefined) {
        algo = 'sha512';
        oid = '1.3.132.0.35';
      }
      // TODO: validate curve name against type
      if (!skipFields(data, 1)) // Skip curve name
        return new Error('Malformed OpenSSH public key');
      const ecpub = readString(data, data._pos || 0);
      if (ecpub === undefined)
        return new Error('Malformed OpenSSH public key');
      pubPEM = genOpenSSLECDSAPub(oid, ecpub);
      pubSSH = genOpenSSHECDSAPub(oid, ecpub);
      break;
    }
    default:
      return new Error(`Unsupported OpenSSH public key type: ${baseType}`);
  }

  return new OpenSSH_Public(fullType, comment, pubPEM, pubSSH, algo);
}

function isSupportedKeyType(type) {
  switch (type) {
    case 'ssh-rsa':
    case 'ssh-dss':
    case 'ecdsa-sha2-nistp256':
    case 'ecdsa-sha2-nistp384':
    case 'ecdsa-sha2-nistp521':
      return true;
    case 'ssh-ed25519':
      if (eddsaSupported)
        return true;
    // FALLTHROUGH
    default:
      return false;
  }
}

function isParsedKey(val) {
  if (!val)
    return false;
  return (typeof val[SYM_DECRYPTED] === 'boolean');
}

function parseKey(data, passphrase) {
  if (isParsedKey(data))
    return data;

  let origBuffer;
  if (Buffer.isBuffer(data)) {
    origBuffer = data;
    data = data.utf8Slice(0, data.length).trim();
  } else if (typeof data === 'string') {
    data = data.trim();
  } else {
    return new Error('Key data must be a Buffer or string');
  }

  // eslint-disable-next-line eqeqeq
  if (passphrase != undefined) {
    if (typeof passphrase === 'string')
      passphrase = Buffer.from(passphrase);
    else if (!Buffer.isBuffer(passphrase))
      return new Error('Passphrase must be a string or Buffer when supplied');
  }

  let ret;

  // First try as printable string format (e.g. PEM)

  // Private keys
  if ((ret = OpenSSH_Private.parse(data, passphrase)) !== null)
    return ret;
  if ((ret = OpenSSH_Old_Private.parse(data, passphrase)) !== null)
    return ret;
  if ((ret = PPK_Private.parse(data, passphrase)) !== null)
    return ret;

  // Public keys
  if ((ret = OpenSSH_Public.parse(data)) !== null)
    return ret;
  if ((ret = RFC4716_Public.parse(data)) !== null)
    return ret;

  // Finally try as a binary format if we were originally passed binary data
  if (origBuffer) {
    binaryKeyParser.init(origBuffer, 0);
    const type = binaryKeyParser.readString(true);
    if (type !== undefined) {
      data = binaryKeyParser.readRaw();
      if (data !== undefined) {
        ret = parseDER(data, type, '', type);
        // Ignore potentially useless errors in case the data was not actually
        // in the binary format
        if (ret instanceof Error)
          ret = null;
      }
    }
    binaryKeyParser.clear();
  }

  if (ret)
    return ret;

  return new Error('Unsupported key format');
}

module.exports = {
  isParsedKey,
  isSupportedKeyType,
  parseDERKey: (data, type) => parseDER(data, type, '', type),
  parseKey,
};
