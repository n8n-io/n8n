/**
 * Secure Hash Algorithm with a 1024-bit block size implementation.
 *
 * This includes: SHA-512, SHA-384, SHA-512/224, and SHA-512/256. For
 * SHA-256 (block size 512 bits), see sha256.js.
 *
 * See FIPS 180-4 for details.
 *
 * @author Dave Longley
 *
 * Copyright (c) 2014-2015 Digital Bazaar, Inc.
 */
var forge = require('./forge');
require('./md');
require('./util');

var sha512 = module.exports = forge.sha512 = forge.sha512 || {};

// SHA-512
forge.md.sha512 = forge.md.algorithms.sha512 = sha512;

// SHA-384
var sha384 = forge.sha384 = forge.sha512.sha384 = forge.sha512.sha384 || {};
sha384.create = function() {
  return sha512.create('SHA-384');
};
forge.md.sha384 = forge.md.algorithms.sha384 = sha384;

// SHA-512/256
forge.sha512.sha256 = forge.sha512.sha256 || {
  create: function() {
    return sha512.create('SHA-512/256');
  }
};
forge.md['sha512/256'] = forge.md.algorithms['sha512/256'] =
  forge.sha512.sha256;

// SHA-512/224
forge.sha512.sha224 = forge.sha512.sha224 || {
  create: function() {
    return sha512.create('SHA-512/224');
  }
};
forge.md['sha512/224'] = forge.md.algorithms['sha512/224'] =
  forge.sha512.sha224;

/**
 * Creates a SHA-2 message digest object.
 *
 * @param algorithm the algorithm to use (SHA-512, SHA-384, SHA-512/224,
 *          SHA-512/256).
 *
 * @return a message digest object.
 */
sha512.create = function(algorithm) {
  // do initialization as necessary
  if(!_initialized) {
    _init();
  }

  if(typeof algorithm === 'undefined') {
    algorithm = 'SHA-512';
  }

  if(!(algorithm in _states)) {
    throw new Error('Invalid SHA-512 algorithm: ' + algorithm);
  }

  // SHA-512 state contains eight 64-bit integers (each as two 32-bit ints)
  var _state = _states[algorithm];
  var _h = null;

  // input buffer
  var _input = forge.util.createBuffer();

  // used for 64-bit word storage
  var _w = new Array(80);
  for(var wi = 0; wi < 80; ++wi) {
    _w[wi] = new Array(2);
  }

  // determine digest length by algorithm name (default)
  var digestLength = 64;
  switch(algorithm) {
    case 'SHA-384':
      digestLength = 48;
      break;
    case 'SHA-512/256':
      digestLength = 32;
      break;
    case 'SHA-512/224':
      digestLength = 28;
      break;
  }

  // message digest object
  var md = {
    // SHA-512 => sha512
    algorithm: algorithm.replace('-', '').toLowerCase(),
    blockLength: 128,
    digestLength: digestLength,
    // 56-bit length of message so far (does not including padding)
    messageLength: 0,
    // true message length
    fullMessageLength: null,
    // size of message length in bytes
    messageLengthSize: 16
  };

  /**
   * Starts the digest.
   *
   * @return this digest object.
   */
  md.start = function() {
    // up to 56-bit message length for convenience
    md.messageLength = 0;

    // full message length (set md.messageLength128 for backwards-compatibility)
    md.fullMessageLength = md.messageLength128 = [];
    var int32s = md.messageLengthSize / 4;
    for(var i = 0; i < int32s; ++i) {
      md.fullMessageLength.push(0);
    }
    _input = forge.util.createBuffer();
    _h = new Array(_state.length);
    for(var i = 0; i < _state.length; ++i) {
      _h[i] = _state[i].slice(0);
    }
    return md;
  };
  // start digest automatically for first time
  md.start();

  /**
   * Updates the digest with the given message input. The given input can
   * treated as raw input (no encoding will be applied) or an encoding of
   * 'utf8' maybe given to encode the input using UTF-8.
   *
   * @param msg the message input to update with.
   * @param encoding the encoding to use (default: 'raw', other: 'utf8').
   *
   * @return this digest object.
   */
  md.update = function(msg, encoding) {
    if(encoding === 'utf8') {
      msg = forge.util.encodeUtf8(msg);
    }

    // update message length
    var len = msg.length;
    md.messageLength += len;
    len = [(len / 0x100000000) >>> 0, len >>> 0];
    for(var i = md.fullMessageLength.length - 1; i >= 0; --i) {
      md.fullMessageLength[i] += len[1];
      len[1] = len[0] + ((md.fullMessageLength[i] / 0x100000000) >>> 0);
      md.fullMessageLength[i] = md.fullMessageLength[i] >>> 0;
      len[0] = ((len[1] / 0x100000000) >>> 0);
    }

    // add bytes to input buffer
    _input.putBytes(msg);

    // process bytes
    _update(_h, _w, _input);

    // compact input buffer every 2K or if empty
    if(_input.read > 2048 || _input.length() === 0) {
      _input.compact();
    }

    return md;
  };

  /**
   * Produces the digest.
   *
   * @return a byte buffer containing the digest value.
   */
  md.digest = function() {
    /* Note: Here we copy the remaining bytes in the input buffer and
    add the appropriate SHA-512 padding. Then we do the final update
    on a copy of the state so that if the user wants to get
    intermediate digests they can do so. */

    /* Determine the number of bytes that must be added to the message
    to ensure its length is congruent to 896 mod 1024. In other words,
    the data to be digested must be a multiple of 1024 bits (or 128 bytes).
    This data includes the message, some padding, and the length of the
    message. Since the length of the message will be encoded as 16 bytes (128
    bits), that means that the last segment of the data must have 112 bytes
    (896 bits) of message and padding. Therefore, the length of the message
    plus the padding must be congruent to 896 mod 1024 because
    1024 - 128 = 896.

    In order to fill up the message length it must be filled with
    padding that begins with 1 bit followed by all 0 bits. Padding
    must *always* be present, so if the message length is already
    congruent to 896 mod 1024, then 1024 padding bits must be added. */

    var finalBlock = forge.util.createBuffer();
    finalBlock.putBytes(_input.bytes());

    // compute remaining size to be digested (include message length size)
    var remaining = (
      md.fullMessageLength[md.fullMessageLength.length - 1] +
      md.messageLengthSize);

    // add padding for overflow blockSize - overflow
    // _padding starts with 1 byte with first bit is set (byte value 128), then
    // there may be up to (blockSize - 1) other pad bytes
    var overflow = remaining & (md.blockLength - 1);
    finalBlock.putBytes(_padding.substr(0, md.blockLength - overflow));

    // serialize message length in bits in big-endian order; since length
    // is stored in bytes we multiply by 8 and add carry from next int
    var next, carry;
    var bits = md.fullMessageLength[0] * 8;
    for(var i = 0; i < md.fullMessageLength.length - 1; ++i) {
      next = md.fullMessageLength[i + 1] * 8;
      carry = (next / 0x100000000) >>> 0;
      bits += carry;
      finalBlock.putInt32(bits >>> 0);
      bits = next >>> 0;
    }
    finalBlock.putInt32(bits);

    var h = new Array(_h.length);
    for(var i = 0; i < _h.length; ++i) {
      h[i] = _h[i].slice(0);
    }
    _update(h, _w, finalBlock);
    var rval = forge.util.createBuffer();
    var hlen;
    if(algorithm === 'SHA-512') {
      hlen = h.length;
    } else if(algorithm === 'SHA-384') {
      hlen = h.length - 2;
    } else {
      hlen = h.length - 4;
    }
    for(var i = 0; i < hlen; ++i) {
      rval.putInt32(h[i][0]);
      if(i !== hlen - 1 || algorithm !== 'SHA-512/224') {
        rval.putInt32(h[i][1]);
      }
    }
    return rval;
  };

  return md;
};

// sha-512 padding bytes not initialized yet
var _padding = null;
var _initialized = false;

// table of constants
var _k = null;

// initial hash states
var _states = null;

/**
 * Initializes the constant tables.
 */
function _init() {
  // create padding
  _padding = String.fromCharCode(128);
  _padding += forge.util.fillString(String.fromCharCode(0x00), 128);

  // create K table for SHA-512
  _k = [
    [0x428a2f98, 0xd728ae22], [0x71374491, 0x23ef65cd],
    [0xb5c0fbcf, 0xec4d3b2f], [0xe9b5dba5, 0x8189dbbc],
    [0x3956c25b, 0xf348b538], [0x59f111f1, 0xb605d019],
    [0x923f82a4, 0xaf194f9b], [0xab1c5ed5, 0xda6d8118],
    [0xd807aa98, 0xa3030242], [0x12835b01, 0x45706fbe],
    [0x243185be, 0x4ee4b28c], [0x550c7dc3, 0xd5ffb4e2],
    [0x72be5d74, 0xf27b896f], [0x80deb1fe, 0x3b1696b1],
    [0x9bdc06a7, 0x25c71235], [0xc19bf174, 0xcf692694],
    [0xe49b69c1, 0x9ef14ad2], [0xefbe4786, 0x384f25e3],
    [0x0fc19dc6, 0x8b8cd5b5], [0x240ca1cc, 0x77ac9c65],
    [0x2de92c6f, 0x592b0275], [0x4a7484aa, 0x6ea6e483],
    [0x5cb0a9dc, 0xbd41fbd4], [0x76f988da, 0x831153b5],
    [0x983e5152, 0xee66dfab], [0xa831c66d, 0x2db43210],
    [0xb00327c8, 0x98fb213f], [0xbf597fc7, 0xbeef0ee4],
    [0xc6e00bf3, 0x3da88fc2], [0xd5a79147, 0x930aa725],
    [0x06ca6351, 0xe003826f], [0x14292967, 0x0a0e6e70],
    [0x27b70a85, 0x46d22ffc], [0x2e1b2138, 0x5c26c926],
    [0x4d2c6dfc, 0x5ac42aed], [0x53380d13, 0x9d95b3df],
    [0x650a7354, 0x8baf63de], [0x766a0abb, 0x3c77b2a8],
    [0x81c2c92e, 0x47edaee6], [0x92722c85, 0x1482353b],
    [0xa2bfe8a1, 0x4cf10364], [0xa81a664b, 0xbc423001],
    [0xc24b8b70, 0xd0f89791], [0xc76c51a3, 0x0654be30],
    [0xd192e819, 0xd6ef5218], [0xd6990624, 0x5565a910],
    [0xf40e3585, 0x5771202a], [0x106aa070, 0x32bbd1b8],
    [0x19a4c116, 0xb8d2d0c8], [0x1e376c08, 0x5141ab53],
    [0x2748774c, 0xdf8eeb99], [0x34b0bcb5, 0xe19b48a8],
    [0x391c0cb3, 0xc5c95a63], [0x4ed8aa4a, 0xe3418acb],
    [0x5b9cca4f, 0x7763e373], [0x682e6ff3, 0xd6b2b8a3],
    [0x748f82ee, 0x5defb2fc], [0x78a5636f, 0x43172f60],
    [0x84c87814, 0xa1f0ab72], [0x8cc70208, 0x1a6439ec],
    [0x90befffa, 0x23631e28], [0xa4506ceb, 0xde82bde9],
    [0xbef9a3f7, 0xb2c67915], [0xc67178f2, 0xe372532b],
    [0xca273ece, 0xea26619c], [0xd186b8c7, 0x21c0c207],
    [0xeada7dd6, 0xcde0eb1e], [0xf57d4f7f, 0xee6ed178],
    [0x06f067aa, 0x72176fba], [0x0a637dc5, 0xa2c898a6],
    [0x113f9804, 0xbef90dae], [0x1b710b35, 0x131c471b],
    [0x28db77f5, 0x23047d84], [0x32caab7b, 0x40c72493],
    [0x3c9ebe0a, 0x15c9bebc], [0x431d67c4, 0x9c100d4c],
    [0x4cc5d4be, 0xcb3e42b6], [0x597f299c, 0xfc657e2a],
    [0x5fcb6fab, 0x3ad6faec], [0x6c44198c, 0x4a475817]
  ];

  // initial hash states
  _states = {};
  _states['SHA-512'] = [
    [0x6a09e667, 0xf3bcc908],
    [0xbb67ae85, 0x84caa73b],
    [0x3c6ef372, 0xfe94f82b],
    [0xa54ff53a, 0x5f1d36f1],
    [0x510e527f, 0xade682d1],
    [0x9b05688c, 0x2b3e6c1f],
    [0x1f83d9ab, 0xfb41bd6b],
    [0x5be0cd19, 0x137e2179]
  ];
  _states['SHA-384'] = [
    [0xcbbb9d5d, 0xc1059ed8],
    [0x629a292a, 0x367cd507],
    [0x9159015a, 0x3070dd17],
    [0x152fecd8, 0xf70e5939],
    [0x67332667, 0xffc00b31],
    [0x8eb44a87, 0x68581511],
    [0xdb0c2e0d, 0x64f98fa7],
    [0x47b5481d, 0xbefa4fa4]
  ];
  _states['SHA-512/256'] = [
    [0x22312194, 0xFC2BF72C],
    [0x9F555FA3, 0xC84C64C2],
    [0x2393B86B, 0x6F53B151],
    [0x96387719, 0x5940EABD],
    [0x96283EE2, 0xA88EFFE3],
    [0xBE5E1E25, 0x53863992],
    [0x2B0199FC, 0x2C85B8AA],
    [0x0EB72DDC, 0x81C52CA2]
  ];
  _states['SHA-512/224'] = [
    [0x8C3D37C8, 0x19544DA2],
    [0x73E19966, 0x89DCD4D6],
    [0x1DFAB7AE, 0x32FF9C82],
    [0x679DD514, 0x582F9FCF],
    [0x0F6D2B69, 0x7BD44DA8],
    [0x77E36F73, 0x04C48942],
    [0x3F9D85A8, 0x6A1D36C8],
    [0x1112E6AD, 0x91D692A1]
  ];

  // now initialized
  _initialized = true;
}

/**
 * Updates a SHA-512 state with the given byte buffer.
 *
 * @param s the SHA-512 state to update.
 * @param w the array to use to store words.
 * @param bytes the byte buffer to update with.
 */
function _update(s, w, bytes) {
  // consume 512 bit (128 byte) chunks
  var t1_hi, t1_lo;
  var t2_hi, t2_lo;
  var s0_hi, s0_lo;
  var s1_hi, s1_lo;
  var ch_hi, ch_lo;
  var maj_hi, maj_lo;
  var a_hi, a_lo;
  var b_hi, b_lo;
  var c_hi, c_lo;
  var d_hi, d_lo;
  var e_hi, e_lo;
  var f_hi, f_lo;
  var g_hi, g_lo;
  var h_hi, h_lo;
  var i, hi, lo, w2, w7, w15, w16;
  var len = bytes.length();
  while(len >= 128) {
    // the w array will be populated with sixteen 64-bit big-endian words
    // and then extended into 64 64-bit words according to SHA-512
    for(i = 0; i < 16; ++i) {
      w[i][0] = bytes.getInt32() >>> 0;
      w[i][1] = bytes.getInt32() >>> 0;
    }
    for(; i < 80; ++i) {
      // for word 2 words ago: ROTR 19(x) ^ ROTR 61(x) ^ SHR 6(x)
      w2 = w[i - 2];
      hi = w2[0];
      lo = w2[1];

      // high bits
      t1_hi = (
        ((hi >>> 19) | (lo << 13)) ^ // ROTR 19
        ((lo >>> 29) | (hi << 3)) ^ // ROTR 61/(swap + ROTR 29)
        (hi >>> 6)) >>> 0; // SHR 6
      // low bits
      t1_lo = (
        ((hi << 13) | (lo >>> 19)) ^ // ROTR 19
        ((lo << 3) | (hi >>> 29)) ^ // ROTR 61/(swap + ROTR 29)
        ((hi << 26) | (lo >>> 6))) >>> 0; // SHR 6

      // for word 15 words ago: ROTR 1(x) ^ ROTR 8(x) ^ SHR 7(x)
      w15 = w[i - 15];
      hi = w15[0];
      lo = w15[1];

      // high bits
      t2_hi = (
        ((hi >>> 1) | (lo << 31)) ^ // ROTR 1
        ((hi >>> 8) | (lo << 24)) ^ // ROTR 8
        (hi >>> 7)) >>> 0; // SHR 7
      // low bits
      t2_lo = (
        ((hi << 31) | (lo >>> 1)) ^ // ROTR 1
        ((hi << 24) | (lo >>> 8)) ^ // ROTR 8
        ((hi << 25) | (lo >>> 7))) >>> 0; // SHR 7

      // sum(t1, word 7 ago, t2, word 16 ago) modulo 2^64 (carry lo overflow)
      w7 = w[i - 7];
      w16 = w[i - 16];
      lo = (t1_lo + w7[1] + t2_lo + w16[1]);
      w[i][0] = (t1_hi + w7[0] + t2_hi + w16[0] +
        ((lo / 0x100000000) >>> 0)) >>> 0;
      w[i][1] = lo >>> 0;
    }

    // initialize hash value for this chunk
    a_hi = s[0][0];
    a_lo = s[0][1];
    b_hi = s[1][0];
    b_lo = s[1][1];
    c_hi = s[2][0];
    c_lo = s[2][1];
    d_hi = s[3][0];
    d_lo = s[3][1];
    e_hi = s[4][0];
    e_lo = s[4][1];
    f_hi = s[5][0];
    f_lo = s[5][1];
    g_hi = s[6][0];
    g_lo = s[6][1];
    h_hi = s[7][0];
    h_lo = s[7][1];

    // round function
    for(i = 0; i < 80; ++i) {
      // Sum1(e) = ROTR 14(e) ^ ROTR 18(e) ^ ROTR 41(e)
      s1_hi = (
        ((e_hi >>> 14) | (e_lo << 18)) ^ // ROTR 14
        ((e_hi >>> 18) | (e_lo << 14)) ^ // ROTR 18
        ((e_lo >>> 9) | (e_hi << 23))) >>> 0; // ROTR 41/(swap + ROTR 9)
      s1_lo = (
        ((e_hi << 18) | (e_lo >>> 14)) ^ // ROTR 14
        ((e_hi << 14) | (e_lo >>> 18)) ^ // ROTR 18
        ((e_lo << 23) | (e_hi >>> 9))) >>> 0; // ROTR 41/(swap + ROTR 9)

      // Ch(e, f, g) (optimized the same way as SHA-1)
      ch_hi = (g_hi ^ (e_hi & (f_hi ^ g_hi))) >>> 0;
      ch_lo = (g_lo ^ (e_lo & (f_lo ^ g_lo))) >>> 0;

      // Sum0(a) = ROTR 28(a) ^ ROTR 34(a) ^ ROTR 39(a)
      s0_hi = (
        ((a_hi >>> 28) | (a_lo << 4)) ^ // ROTR 28
        ((a_lo >>> 2) | (a_hi << 30)) ^ // ROTR 34/(swap + ROTR 2)
        ((a_lo >>> 7) | (a_hi << 25))) >>> 0; // ROTR 39/(swap + ROTR 7)
      s0_lo = (
        ((a_hi << 4) | (a_lo >>> 28)) ^ // ROTR 28
        ((a_lo << 30) | (a_hi >>> 2)) ^ // ROTR 34/(swap + ROTR 2)
        ((a_lo << 25) | (a_hi >>> 7))) >>> 0; // ROTR 39/(swap + ROTR 7)

      // Maj(a, b, c) (optimized the same way as SHA-1)
      maj_hi = ((a_hi & b_hi) | (c_hi & (a_hi ^ b_hi))) >>> 0;
      maj_lo = ((a_lo & b_lo) | (c_lo & (a_lo ^ b_lo))) >>> 0;

      // main algorithm
      // t1 = (h + s1 + ch + _k[i] + _w[i]) modulo 2^64 (carry lo overflow)
      lo = (h_lo + s1_lo + ch_lo + _k[i][1] + w[i][1]);
      t1_hi = (h_hi + s1_hi + ch_hi + _k[i][0] + w[i][0] +
        ((lo / 0x100000000) >>> 0)) >>> 0;
      t1_lo = lo >>> 0;

      // t2 = s0 + maj modulo 2^64 (carry lo overflow)
      lo = s0_lo + maj_lo;
      t2_hi = (s0_hi + maj_hi + ((lo / 0x100000000) >>> 0)) >>> 0;
      t2_lo = lo >>> 0;

      h_hi = g_hi;
      h_lo = g_lo;

      g_hi = f_hi;
      g_lo = f_lo;

      f_hi = e_hi;
      f_lo = e_lo;

      // e = (d + t1) modulo 2^64 (carry lo overflow)
      lo = d_lo + t1_lo;
      e_hi = (d_hi + t1_hi + ((lo / 0x100000000) >>> 0)) >>> 0;
      e_lo = lo >>> 0;

      d_hi = c_hi;
      d_lo = c_lo;

      c_hi = b_hi;
      c_lo = b_lo;

      b_hi = a_hi;
      b_lo = a_lo;

      // a = (t1 + t2) modulo 2^64 (carry lo overflow)
      lo = t1_lo + t2_lo;
      a_hi = (t1_hi + t2_hi + ((lo / 0x100000000) >>> 0)) >>> 0;
      a_lo = lo >>> 0;
    }

    // update hash state (additional modulo 2^64)
    lo = s[0][1] + a_lo;
    s[0][0] = (s[0][0] + a_hi + ((lo / 0x100000000) >>> 0)) >>> 0;
    s[0][1] = lo >>> 0;

    lo = s[1][1] + b_lo;
    s[1][0] = (s[1][0] + b_hi + ((lo / 0x100000000) >>> 0)) >>> 0;
    s[1][1] = lo >>> 0;

    lo = s[2][1] + c_lo;
    s[2][0] = (s[2][0] + c_hi + ((lo / 0x100000000) >>> 0)) >>> 0;
    s[2][1] = lo >>> 0;

    lo = s[3][1] + d_lo;
    s[3][0] = (s[3][0] + d_hi + ((lo / 0x100000000) >>> 0)) >>> 0;
    s[3][1] = lo >>> 0;

    lo = s[4][1] + e_lo;
    s[4][0] = (s[4][0] + e_hi + ((lo / 0x100000000) >>> 0)) >>> 0;
    s[4][1] = lo >>> 0;

    lo = s[5][1] + f_lo;
    s[5][0] = (s[5][0] + f_hi + ((lo / 0x100000000) >>> 0)) >>> 0;
    s[5][1] = lo >>> 0;

    lo = s[6][1] + g_lo;
    s[6][0] = (s[6][0] + g_hi + ((lo / 0x100000000) >>> 0)) >>> 0;
    s[6][1] = lo >>> 0;

    lo = s[7][1] + h_lo;
    s[7][0] = (s[7][0] + h_hi + ((lo / 0x100000000) >>> 0)) >>> 0;
    s[7][1] = lo >>> 0;

    len -= 128;
  }
}
