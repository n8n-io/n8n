/**
 * Password-Based Key-Derivation Function #2 implementation.
 *
 * See RFC 2898 for details.
 *
 * @author Dave Longley
 *
 * Copyright (c) 2010-2013 Digital Bazaar, Inc.
 */
var forge = require('./forge');
require('./hmac');
require('./md');
require('./util');

var pkcs5 = forge.pkcs5 = forge.pkcs5 || {};

var crypto;
if(forge.util.isNodejs && !forge.options.usePureJavaScript) {
  crypto = require('crypto');
}

/**
 * Derives a key from a password.
 *
 * @param p the password as a binary-encoded string of bytes.
 * @param s the salt as a binary-encoded string of bytes.
 * @param c the iteration count, a positive integer.
 * @param dkLen the intended length, in bytes, of the derived key,
 *          (max: 2^32 - 1) * hash length of the PRF.
 * @param [md] the message digest (or algorithm identifier as a string) to use
 *          in the PRF, defaults to SHA-1.
 * @param [callback(err, key)] presence triggers asynchronous version, called
 *          once the operation completes.
 *
 * @return the derived key, as a binary-encoded string of bytes, for the
 *           synchronous version (if no callback is specified).
 */
module.exports = forge.pbkdf2 = pkcs5.pbkdf2 = function(
  p, s, c, dkLen, md, callback) {
  if(typeof md === 'function') {
    callback = md;
    md = null;
  }

  // use native implementation if possible and not disabled, note that
  // some node versions only support SHA-1, others allow digest to be changed
  if(forge.util.isNodejs && !forge.options.usePureJavaScript &&
    crypto.pbkdf2 && (md === null || typeof md !== 'object') &&
    (crypto.pbkdf2Sync.length > 4 || (!md || md === 'sha1'))) {
    if(typeof md !== 'string') {
      // default prf to SHA-1
      md = 'sha1';
    }
    p = Buffer.from(p, 'binary');
    s = Buffer.from(s, 'binary');
    if(!callback) {
      if(crypto.pbkdf2Sync.length === 4) {
        return crypto.pbkdf2Sync(p, s, c, dkLen).toString('binary');
      }
      return crypto.pbkdf2Sync(p, s, c, dkLen, md).toString('binary');
    }
    if(crypto.pbkdf2Sync.length === 4) {
      return crypto.pbkdf2(p, s, c, dkLen, function(err, key) {
        if(err) {
          return callback(err);
        }
        callback(null, key.toString('binary'));
      });
    }
    return crypto.pbkdf2(p, s, c, dkLen, md, function(err, key) {
      if(err) {
        return callback(err);
      }
      callback(null, key.toString('binary'));
    });
  }

  if(typeof md === 'undefined' || md === null) {
    // default prf to SHA-1
    md = 'sha1';
  }
  if(typeof md === 'string') {
    if(!(md in forge.md.algorithms)) {
      throw new Error('Unknown hash algorithm: ' + md);
    }
    md = forge.md[md].create();
  }

  var hLen = md.digestLength;

  /* 1. If dkLen > (2^32 - 1) * hLen, output "derived key too long" and
    stop. */
  if(dkLen > (0xFFFFFFFF * hLen)) {
    var err = new Error('Derived key is too long.');
    if(callback) {
      return callback(err);
    }
    throw err;
  }

  /* 2. Let len be the number of hLen-octet blocks in the derived key,
    rounding up, and let r be the number of octets in the last
    block:

    len = CEIL(dkLen / hLen),
    r = dkLen - (len - 1) * hLen. */
  var len = Math.ceil(dkLen / hLen);
  var r = dkLen - (len - 1) * hLen;

  /* 3. For each block of the derived key apply the function F defined
    below to the password P, the salt S, the iteration count c, and
    the block index to compute the block:

    T_1 = F(P, S, c, 1),
    T_2 = F(P, S, c, 2),
    ...
    T_len = F(P, S, c, len),

    where the function F is defined as the exclusive-or sum of the
    first c iterates of the underlying pseudorandom function PRF
    applied to the password P and the concatenation of the salt S
    and the block index i:

    F(P, S, c, i) = u_1 XOR u_2 XOR ... XOR u_c

    where

    u_1 = PRF(P, S || INT(i)),
    u_2 = PRF(P, u_1),
    ...
    u_c = PRF(P, u_{c-1}).

    Here, INT(i) is a four-octet encoding of the integer i, most
    significant octet first. */
  var prf = forge.hmac.create();
  prf.start(md, p);
  var dk = '';
  var xor, u_c, u_c1;

  // sync version
  if(!callback) {
    for(var i = 1; i <= len; ++i) {
      // PRF(P, S || INT(i)) (first iteration)
      prf.start(null, null);
      prf.update(s);
      prf.update(forge.util.int32ToBytes(i));
      xor = u_c1 = prf.digest().getBytes();

      // PRF(P, u_{c-1}) (other iterations)
      for(var j = 2; j <= c; ++j) {
        prf.start(null, null);
        prf.update(u_c1);
        u_c = prf.digest().getBytes();
        // F(p, s, c, i)
        xor = forge.util.xorBytes(xor, u_c, hLen);
        u_c1 = u_c;
      }

      /* 4. Concatenate the blocks and extract the first dkLen octets to
        produce a derived key DK:

        DK = T_1 || T_2 ||  ...  || T_len<0..r-1> */
      dk += (i < len) ? xor : xor.substr(0, r);
    }
    /* 5. Output the derived key DK. */
    return dk;
  }

  // async version
  var i = 1, j;
  function outer() {
    if(i > len) {
      // done
      return callback(null, dk);
    }

    // PRF(P, S || INT(i)) (first iteration)
    prf.start(null, null);
    prf.update(s);
    prf.update(forge.util.int32ToBytes(i));
    xor = u_c1 = prf.digest().getBytes();

    // PRF(P, u_{c-1}) (other iterations)
    j = 2;
    inner();
  }

  function inner() {
    if(j <= c) {
      prf.start(null, null);
      prf.update(u_c1);
      u_c = prf.digest().getBytes();
      // F(p, s, c, i)
      xor = forge.util.xorBytes(xor, u_c, hLen);
      u_c1 = u_c;
      ++j;
      return forge.util.setImmediate(inner);
    }

    /* 4. Concatenate the blocks and extract the first dkLen octets to
      produce a derived key DK:

      DK = T_1 || T_2 ||  ...  || T_len<0..r-1> */
    dk += (i < len) ? xor : xor.substr(0, r);

    ++i;
    outer();
  }

  outer();
};
