'use strict';

const {
  createCipheriv,
  generateKeyPair: generateKeyPair_,
  generateKeyPairSync: generateKeyPairSync_,
  getCurves,
  randomBytes,
} = require('crypto');

const { Ber } = require('asn1');
const bcrypt_pbkdf = require('bcrypt-pbkdf').pbkdf;

const { CIPHER_INFO } = require('./protocol/crypto.js');

const SALT_LEN = 16;
const DEFAULT_ROUNDS = 16;

const curves = getCurves();
const ciphers = new Map(Object.entries(CIPHER_INFO));

function makeArgs(type, opts) {
  if (typeof type !== 'string')
    throw new TypeError('Key type must be a string');

  const publicKeyEncoding = { type: 'spki', format: 'der' };
  const privateKeyEncoding = { type: 'pkcs8', format: 'der' };

  switch (type.toLowerCase()) {
    case 'rsa': {
      if (typeof opts !== 'object' || opts === null)
        throw new TypeError('Missing options object for RSA key');
      const modulusLength = opts.bits;
      if (!Number.isInteger(modulusLength))
        throw new TypeError('RSA bits must be an integer');
      if (modulusLength <= 0 || modulusLength > 16384)
        throw new RangeError('RSA bits must be non-zero and <= 16384');
      return ['rsa', { modulusLength, publicKeyEncoding, privateKeyEncoding }];
    }
    case 'ecdsa': {
      if (typeof opts !== 'object' || opts === null)
        throw new TypeError('Missing options object for ECDSA key');
      if (!Number.isInteger(opts.bits))
        throw new TypeError('ECDSA bits must be an integer');
      let namedCurve;
      switch (opts.bits) {
        case 256:
          namedCurve = 'prime256v1';
          break;
        case 384:
          namedCurve = 'secp384r1';
          break;
        case 521:
          namedCurve = 'secp521r1';
          break;
        default:
          throw new Error('ECDSA bits must be 256, 384, or 521');
      }
      if (!curves.includes(namedCurve))
        throw new Error('Unsupported ECDSA bits value');
      return ['ec', { namedCurve, publicKeyEncoding, privateKeyEncoding }];
    }
    case 'ed25519':
      return ['ed25519', { publicKeyEncoding, privateKeyEncoding }];
    default:
      throw new Error(`Unsupported key type: ${type}`);
  }
}

function parseDERs(keyType, pub, priv) {
  switch (keyType) {
    case 'rsa': {
      // Note: we don't need to parse the public key since the PKCS8 private key
      // already includes the public key parameters

      // Parse private key
      let reader = new Ber.Reader(priv);
      reader.readSequence();

      // - Version
      if (reader.readInt() !== 0)
        throw new Error('Unsupported version in RSA private key');

      // - Algorithm
      reader.readSequence();
      if (reader.readOID() !== '1.2.840.113549.1.1.1')
        throw new Error('Bad RSA private OID');
      // - Algorithm parameters (RSA has none)
      if (reader.readByte() !== Ber.Null)
        throw new Error('Malformed RSA private key (expected null)');
      if (reader.readByte() !== 0x00) {
        throw new Error(
          'Malformed RSA private key (expected zero-length null)'
        );
      }

      reader = new Ber.Reader(reader.readString(Ber.OctetString, true));
      reader.readSequence();
      if (reader.readInt() !== 0)
        throw new Error('Unsupported version in RSA private key');
      const n = reader.readString(Ber.Integer, true);
      const e = reader.readString(Ber.Integer, true);
      const d = reader.readString(Ber.Integer, true);
      const p = reader.readString(Ber.Integer, true);
      const q = reader.readString(Ber.Integer, true);
      reader.readString(Ber.Integer, true); // dmp1
      reader.readString(Ber.Integer, true); // dmq1
      const iqmp = reader.readString(Ber.Integer, true);

      /*
        OpenSSH RSA private key:
          string  "ssh-rsa"
          string  n -- public
          string  e -- public
          string  d -- private
          string  iqmp -- private
          string  p -- private
          string  q -- private
      */
      const keyName = Buffer.from('ssh-rsa');
      const privBuf = Buffer.allocUnsafe(
        4 + keyName.length
        + 4 + n.length
        + 4 + e.length
        + 4 + d.length
        + 4 + iqmp.length
        + 4 + p.length
        + 4 + q.length
      );
      let pos = 0;

      privBuf.writeUInt32BE(keyName.length, pos += 0);
      privBuf.set(keyName, pos += 4);
      privBuf.writeUInt32BE(n.length, pos += keyName.length);
      privBuf.set(n, pos += 4);
      privBuf.writeUInt32BE(e.length, pos += n.length);
      privBuf.set(e, pos += 4);
      privBuf.writeUInt32BE(d.length, pos += e.length);
      privBuf.set(d, pos += 4);
      privBuf.writeUInt32BE(iqmp.length, pos += d.length);
      privBuf.set(iqmp, pos += 4);
      privBuf.writeUInt32BE(p.length, pos += iqmp.length);
      privBuf.set(p, pos += 4);
      privBuf.writeUInt32BE(q.length, pos += p.length);
      privBuf.set(q, pos += 4);

      /*
        OpenSSH RSA public key:
          string  "ssh-rsa"
          string  e -- public
          string  n -- public
      */
      const pubBuf = Buffer.allocUnsafe(
        4 + keyName.length
        + 4 + e.length
        + 4 + n.length
      );
      pos = 0;

      pubBuf.writeUInt32BE(keyName.length, pos += 0);
      pubBuf.set(keyName, pos += 4);
      pubBuf.writeUInt32BE(e.length, pos += keyName.length);
      pubBuf.set(e, pos += 4);
      pubBuf.writeUInt32BE(n.length, pos += e.length);
      pubBuf.set(n, pos += 4);

      return { sshName: keyName.toString(), priv: privBuf, pub: pubBuf };
    }
    case 'ec': {
      // Parse public key
      let reader = new Ber.Reader(pub);
      reader.readSequence();

      reader.readSequence();
      if (reader.readOID() !== '1.2.840.10045.2.1')
        throw new Error('Bad ECDSA public OID');
      // Skip curve OID, we'll get it from the private key
      reader.readOID();
      let pubBin = reader.readString(Ber.BitString, true);
      {
        // Remove leading zero bytes
        let i = 0;
        for (; i < pubBin.length && pubBin[i] === 0x00; ++i);
        if (i > 0)
          pubBin = pubBin.slice(i);
      }

      // Parse private key
      reader = new Ber.Reader(priv);
      reader.readSequence();

      // - Version
      if (reader.readInt() !== 0)
        throw new Error('Unsupported version in ECDSA private key');

      reader.readSequence();
      if (reader.readOID() !== '1.2.840.10045.2.1')
        throw new Error('Bad ECDSA private OID');
      const curveOID = reader.readOID();
      let sshCurveName;
      switch (curveOID) {
        case '1.2.840.10045.3.1.7':
          // prime256v1/secp256r1
          sshCurveName = 'nistp256';
          break;
        case '1.3.132.0.34':
          // secp384r1
          sshCurveName = 'nistp384';
          break;
        case '1.3.132.0.35':
          // secp521r1
          sshCurveName = 'nistp521';
          break;
        default:
          throw new Error('Unsupported curve in ECDSA private key');
      }

      reader = new Ber.Reader(reader.readString(Ber.OctetString, true));
      reader.readSequence();

      // - Version
      if (reader.readInt() !== 1)
        throw new Error('Unsupported version in ECDSA private key');

      // Add leading zero byte to prevent negative bignum in private key
      const privBin = Buffer.concat([
        Buffer.from([0x00]),
        reader.readString(Ber.OctetString, true)
      ]);

      /*
        OpenSSH ECDSA private key:
          string  "ecdsa-sha2-<sshCurveName>"
          string  curve name
          string  Q -- public
          string  d -- private
      */
      const keyName = Buffer.from(`ecdsa-sha2-${sshCurveName}`);
      sshCurveName = Buffer.from(sshCurveName);
      const privBuf = Buffer.allocUnsafe(
        4 + keyName.length
        + 4 + sshCurveName.length
        + 4 + pubBin.length
        + 4 + privBin.length
      );
      let pos = 0;

      privBuf.writeUInt32BE(keyName.length, pos += 0);
      privBuf.set(keyName, pos += 4);
      privBuf.writeUInt32BE(sshCurveName.length, pos += keyName.length);
      privBuf.set(sshCurveName, pos += 4);
      privBuf.writeUInt32BE(pubBin.length, pos += sshCurveName.length);
      privBuf.set(pubBin, pos += 4);
      privBuf.writeUInt32BE(privBin.length, pos += pubBin.length);
      privBuf.set(privBin, pos += 4);

      /*
        OpenSSH ECDSA public key:
          string  "ecdsa-sha2-<sshCurveName>"
          string  curve name
          string  Q -- public
      */
      const pubBuf = Buffer.allocUnsafe(
        4 + keyName.length
        + 4 + sshCurveName.length
        + 4 + pubBin.length
      );
      pos = 0;

      pubBuf.writeUInt32BE(keyName.length, pos += 0);
      pubBuf.set(keyName, pos += 4);
      pubBuf.writeUInt32BE(sshCurveName.length, pos += keyName.length);
      pubBuf.set(sshCurveName, pos += 4);
      pubBuf.writeUInt32BE(pubBin.length, pos += sshCurveName.length);
      pubBuf.set(pubBin, pos += 4);

      return { sshName: keyName.toString(), priv: privBuf, pub: pubBuf };
    }
    case 'ed25519': {
      // Parse public key
      let reader = new Ber.Reader(pub);
      reader.readSequence();

      // - Algorithm
      reader.readSequence();
      if (reader.readOID() !== '1.3.101.112')
        throw new Error('Bad ED25519 public OID');
      // - Attributes (absent for ED25519)

      let pubBin = reader.readString(Ber.BitString, true);
      {
        // Remove leading zero bytes
        let i = 0;
        for (; i < pubBin.length && pubBin[i] === 0x00; ++i);
        if (i > 0)
          pubBin = pubBin.slice(i);
      }

      // Parse private key
      reader = new Ber.Reader(priv);
      reader.readSequence();

      // - Version
      if (reader.readInt() !== 0)
        throw new Error('Unsupported version in ED25519 private key');

      // - Algorithm
      reader.readSequence();
      if (reader.readOID() !== '1.3.101.112')
        throw new Error('Bad ED25519 private OID');
      // - Attributes (absent)

      reader = new Ber.Reader(reader.readString(Ber.OctetString, true));
      const privBin = reader.readString(Ber.OctetString, true);

      /*
        OpenSSH ed25519 private key:
          string  "ssh-ed25519"
          string  public key
          string  private key + public key
      */
      const keyName = Buffer.from('ssh-ed25519');
      const privBuf = Buffer.allocUnsafe(
        4 + keyName.length
        + 4 + pubBin.length
        + 4 + (privBin.length + pubBin.length)
      );
      let pos = 0;

      privBuf.writeUInt32BE(keyName.length, pos += 0);
      privBuf.set(keyName, pos += 4);
      privBuf.writeUInt32BE(pubBin.length, pos += keyName.length);
      privBuf.set(pubBin, pos += 4);
      privBuf.writeUInt32BE(
        privBin.length + pubBin.length,
        pos += pubBin.length
      );
      privBuf.set(privBin, pos += 4);
      privBuf.set(pubBin, pos += privBin.length);

      /*
        OpenSSH ed25519 public key:
          string  "ssh-ed25519"
          string  public key
      */
      const pubBuf = Buffer.allocUnsafe(
        4 + keyName.length
        + 4 + pubBin.length
      );
      pos = 0;

      pubBuf.writeUInt32BE(keyName.length, pos += 0);
      pubBuf.set(keyName, pos += 4);
      pubBuf.writeUInt32BE(pubBin.length, pos += keyName.length);
      pubBuf.set(pubBin, pos += 4);

      return { sshName: keyName.toString(), priv: privBuf, pub: pubBuf };
    }
  }
}

function convertKeys(keyType, pub, priv, opts) {
  let format = 'new';
  let encrypted;
  let comment = '';
  if (typeof opts === 'object' && opts !== null) {
    if (typeof opts.comment === 'string' && opts.comment)
      comment = opts.comment;
    if (typeof opts.format === 'string' && opts.format)
      format = opts.format;
    if (opts.passphrase) {
      let passphrase;
      if (typeof opts.passphrase === 'string')
        passphrase = Buffer.from(opts.passphrase);
      else if (Buffer.isBuffer(opts.passphrase))
        passphrase = opts.passphrase;
      else
        throw new Error('Invalid passphrase');

      if (opts.cipher === undefined)
        throw new Error('Missing cipher name');
      const cipher = ciphers.get(opts.cipher);
      if (cipher === undefined)
        throw new Error('Invalid cipher name');

      if (format === 'new') {
        let rounds = DEFAULT_ROUNDS;
        if (opts.rounds !== undefined) {
          if (!Number.isInteger(opts.rounds))
            throw new TypeError('rounds must be an integer');
          if (opts.rounds > 0)
            rounds = opts.rounds;
        }

        const gen = Buffer.allocUnsafe(cipher.keyLen + cipher.ivLen);
        const salt = randomBytes(SALT_LEN);
        const r = bcrypt_pbkdf(
          passphrase,
          passphrase.length,
          salt,
          salt.length,
          gen,
          gen.length,
          rounds
        );
        if (r !== 0)
          return new Error('Failed to generate information to encrypt key');

        /*
          string salt
          uint32 rounds
        */
        const kdfOptions = Buffer.allocUnsafe(4 + salt.length + 4);
        {
          let pos = 0;
          kdfOptions.writeUInt32BE(salt.length, pos += 0);
          kdfOptions.set(salt, pos += 4);
          kdfOptions.writeUInt32BE(rounds, pos += salt.length);
        }

        encrypted = {
          cipher,
          cipherName: opts.cipher,
          kdfName: 'bcrypt',
          kdfOptions,
          key: gen.slice(0, cipher.keyLen),
          iv: gen.slice(cipher.keyLen),
        };
      }
    }
  }

  switch (format) {
    case 'new': {
      let privateB64 = '-----BEGIN OPENSSH PRIVATE KEY-----\n';
      let publicB64;
      /*
        byte[]  "openssh-key-v1\0"
        string  ciphername
        string  kdfname
        string  kdfoptions
        uint32  number of keys N
        string  publickey1
        string  encrypted, padded list of private keys
          uint32  checkint
          uint32  checkint
          byte[]  privatekey1
          string  comment1
          byte  1
          byte  2
          byte  3
          ...
          byte  padlen % 255
      */
      const cipherName = Buffer.from(encrypted ? encrypted.cipherName : 'none');
      const kdfName = Buffer.from(encrypted ? encrypted.kdfName : 'none');
      const kdfOptions = (encrypted ? encrypted.kdfOptions : Buffer.alloc(0));
      const blockLen = (encrypted ? encrypted.cipher.blockLen : 8);

      const parsed = parseDERs(keyType, pub, priv);

      const checkInt = randomBytes(4);
      const commentBin = Buffer.from(comment);
      const privBlobLen = (4 + 4 + parsed.priv.length + 4 + commentBin.length);
      let padding = [];
      for (let i = 1; ((privBlobLen + padding.length) % blockLen); ++i)
        padding.push(i & 0xFF);
      padding = Buffer.from(padding);

      let privBlob = Buffer.allocUnsafe(privBlobLen + padding.length);
      let extra;
      {
        let pos = 0;
        privBlob.set(checkInt, pos += 0);
        privBlob.set(checkInt, pos += 4);
        privBlob.set(parsed.priv, pos += 4);
        privBlob.writeUInt32BE(commentBin.length, pos += parsed.priv.length);
        privBlob.set(commentBin, pos += 4);
        privBlob.set(padding, pos += commentBin.length);
      }

      if (encrypted) {
        const options = { authTagLength: encrypted.cipher.authLen };
        const cipher = createCipheriv(
          encrypted.cipher.sslName,
          encrypted.key,
          encrypted.iv,
          options
        );
        cipher.setAutoPadding(false);
        privBlob = Buffer.concat([ cipher.update(privBlob), cipher.final() ]);
        if (encrypted.cipher.authLen > 0)
          extra = cipher.getAuthTag();
        else
          extra = Buffer.alloc(0);
        encrypted.key.fill(0);
        encrypted.iv.fill(0);
      } else {
        extra = Buffer.alloc(0);
      }

      const magicBytes = Buffer.from('openssh-key-v1\0');
      const privBin = Buffer.allocUnsafe(
        magicBytes.length
          + 4 + cipherName.length
          + 4 + kdfName.length
          + 4 + kdfOptions.length
          + 4
          + 4 + parsed.pub.length
          + 4 + privBlob.length
          + extra.length
      );
      {
        let pos = 0;
        privBin.set(magicBytes, pos += 0);
        privBin.writeUInt32BE(cipherName.length, pos += magicBytes.length);
        privBin.set(cipherName, pos += 4);
        privBin.writeUInt32BE(kdfName.length, pos += cipherName.length);
        privBin.set(kdfName, pos += 4);
        privBin.writeUInt32BE(kdfOptions.length, pos += kdfName.length);
        privBin.set(kdfOptions, pos += 4);
        privBin.writeUInt32BE(1, pos += kdfOptions.length);
        privBin.writeUInt32BE(parsed.pub.length, pos += 4);
        privBin.set(parsed.pub, pos += 4);
        privBin.writeUInt32BE(privBlob.length, pos += parsed.pub.length);
        privBin.set(privBlob, pos += 4);
        privBin.set(extra, pos += privBlob.length);
      }

      {
        const b64 = privBin.base64Slice(0, privBin.length);
        let formatted = b64.replace(/.{64}/g, '$&\n');
        if (b64.length & 63)
          formatted += '\n';
        privateB64 += formatted;
      }

      {
        const b64 = parsed.pub.base64Slice(0, parsed.pub.length);
        publicB64 = `${parsed.sshName} ${b64}${comment ? ` ${comment}` : ''}`;
      }

      privateB64 += '-----END OPENSSH PRIVATE KEY-----\n';
      return {
        private: privateB64,
        public: publicB64,
      };
    }
    default:
      throw new Error('Invalid output key format');
  }
}

function noop() {}

module.exports = {
  generateKeyPair: (keyType, opts, cb) => {
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (typeof cb !== 'function')
      cb = noop;
    const args = makeArgs(keyType, opts);
    generateKeyPair_(...args, (err, pub, priv) => {
      if (err)
        return cb(err);
      let ret;
      try {
        ret = convertKeys(args[0], pub, priv, opts);
      } catch (ex) {
        return cb(ex);
      }
      cb(null, ret);
    });
  },
  generateKeyPairSync: (keyType, opts) => {
    const args = makeArgs(keyType, opts);
    const { publicKey: pub, privateKey: priv } = generateKeyPairSync_(...args);
    return convertKeys(args[0], pub, priv, opts);
  }
};
