/**
 * Hash-based Message Authentication Code implementation. Requires a message
 * digest object that can be obtained, for example, from forge.md.sha1 or
 * forge.md.md5.
 *
 * @author Dave Longley
 *
 * Copyright (c) 2010-2012 Digital Bazaar, Inc. All rights reserved.
 */
var forge = require('./forge');
require('./md');
require('./util');

/* HMAC API */
var hmac = module.exports = forge.hmac = forge.hmac || {};

/**
 * Creates an HMAC object that uses the given message digest object.
 *
 * @return an HMAC object.
 */
hmac.create = function() {
  // the hmac key to use
  var _key = null;

  // the message digest to use
  var _md = null;

  // the inner padding
  var _ipadding = null;

  // the outer padding
  var _opadding = null;

  // hmac context
  var ctx = {};

  /**
   * Starts or restarts the HMAC with the given key and message digest.
   *
   * @param md the message digest to use, null to reuse the previous one,
   *           a string to use builtin 'sha1', 'md5', 'sha256'.
   * @param key the key to use as a string, array of bytes, byte buffer,
   *           or null to reuse the previous key.
   */
  ctx.start = function(md, key) {
    if(md !== null) {
      if(typeof md === 'string') {
        // create builtin message digest
        md = md.toLowerCase();
        if(md in forge.md.algorithms) {
          _md = forge.md.algorithms[md].create();
        } else {
          throw new Error('Unknown hash algorithm "' + md + '"');
        }
      } else {
        // store message digest
        _md = md;
      }
    }

    if(key === null) {
      // reuse previous key
      key = _key;
    } else {
      if(typeof key === 'string') {
        // convert string into byte buffer
        key = forge.util.createBuffer(key);
      } else if(forge.util.isArray(key)) {
        // convert byte array into byte buffer
        var tmp = key;
        key = forge.util.createBuffer();
        for(var i = 0; i < tmp.length; ++i) {
          key.putByte(tmp[i]);
        }
      }

      // if key is longer than blocksize, hash it
      var keylen = key.length();
      if(keylen > _md.blockLength) {
        _md.start();
        _md.update(key.bytes());
        key = _md.digest();
      }

      // mix key into inner and outer padding
      // ipadding = [0x36 * blocksize] ^ key
      // opadding = [0x5C * blocksize] ^ key
      _ipadding = forge.util.createBuffer();
      _opadding = forge.util.createBuffer();
      keylen = key.length();
      for(var i = 0; i < keylen; ++i) {
        var tmp = key.at(i);
        _ipadding.putByte(0x36 ^ tmp);
        _opadding.putByte(0x5C ^ tmp);
      }

      // if key is shorter than blocksize, add additional padding
      if(keylen < _md.blockLength) {
        var tmp = _md.blockLength - keylen;
        for(var i = 0; i < tmp; ++i) {
          _ipadding.putByte(0x36);
          _opadding.putByte(0x5C);
        }
      }
      _key = key;
      _ipadding = _ipadding.bytes();
      _opadding = _opadding.bytes();
    }

    // digest is done like so: hash(opadding | hash(ipadding | message))

    // prepare to do inner hash
    // hash(ipadding | message)
    _md.start();
    _md.update(_ipadding);
  };

  /**
   * Updates the HMAC with the given message bytes.
   *
   * @param bytes the bytes to update with.
   */
  ctx.update = function(bytes) {
    _md.update(bytes);
  };

  /**
   * Produces the Message Authentication Code (MAC).
   *
   * @return a byte buffer containing the digest value.
   */
  ctx.getMac = function() {
    // digest is done like so: hash(opadding | hash(ipadding | message))
    // here we do the outer hashing
    var inner = _md.digest().bytes();
    _md.start();
    _md.update(_opadding);
    _md.update(inner);
    return _md.digest();
  };
  // alias for getMac
  ctx.digest = ctx.getMac;

  return ctx;
};
