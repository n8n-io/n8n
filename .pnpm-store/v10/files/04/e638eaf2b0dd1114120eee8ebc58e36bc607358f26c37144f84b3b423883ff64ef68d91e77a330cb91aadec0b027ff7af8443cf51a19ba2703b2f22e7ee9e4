/**
 * DES (Data Encryption Standard) implementation.
 *
 * This implementation supports DES as well as 3DES-EDE in ECB and CBC mode.
 * It is based on the BSD-licensed implementation by Paul Tero:
 *
 * Paul Tero, July 2001
 * http://www.tero.co.uk/des/
 *
 * Optimised for performance with large blocks by
 * Michael Hayworth, November 2001
 * http://www.netdealing.com
 *
 * THIS SOFTWARE IS PROVIDED "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED.  IN NO EVENT SHALL THE AUTHOR OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
 * OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
 * HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
 * LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
 *
 * @author Stefan Siegl
 * @author Dave Longley
 *
 * Copyright (c) 2012 Stefan Siegl <stesie@brokenpipe.de>
 * Copyright (c) 2012-2014 Digital Bazaar, Inc.
 */
var forge = require('./forge');
require('./cipher');
require('./cipherModes');
require('./util');

/* DES API */
module.exports = forge.des = forge.des || {};

/**
 * Deprecated. Instead, use:
 *
 * var cipher = forge.cipher.createCipher('DES-<mode>', key);
 * cipher.start({iv: iv});
 *
 * Creates an DES cipher object to encrypt data using the given symmetric key.
 * The output will be stored in the 'output' member of the returned cipher.
 *
 * The key and iv may be given as binary-encoded strings of bytes or
 * byte buffers.
 *
 * @param key the symmetric key to use (64 or 192 bits).
 * @param iv the initialization vector to use.
 * @param output the buffer to write to, null to create one.
 * @param mode the cipher mode to use (default: 'CBC' if IV is
 *          given, 'ECB' if null).
 *
 * @return the cipher.
 */
forge.des.startEncrypting = function(key, iv, output, mode) {
  var cipher = _createCipher({
    key: key,
    output: output,
    decrypt: false,
    mode: mode || (iv === null ? 'ECB' : 'CBC')
  });
  cipher.start(iv);
  return cipher;
};

/**
 * Deprecated. Instead, use:
 *
 * var cipher = forge.cipher.createCipher('DES-<mode>', key);
 *
 * Creates an DES cipher object to encrypt data using the given symmetric key.
 *
 * The key may be given as a binary-encoded string of bytes or a byte buffer.
 *
 * @param key the symmetric key to use (64 or 192 bits).
 * @param mode the cipher mode to use (default: 'CBC').
 *
 * @return the cipher.
 */
forge.des.createEncryptionCipher = function(key, mode) {
  return _createCipher({
    key: key,
    output: null,
    decrypt: false,
    mode: mode
  });
};

/**
 * Deprecated. Instead, use:
 *
 * var decipher = forge.cipher.createDecipher('DES-<mode>', key);
 * decipher.start({iv: iv});
 *
 * Creates an DES cipher object to decrypt data using the given symmetric key.
 * The output will be stored in the 'output' member of the returned cipher.
 *
 * The key and iv may be given as binary-encoded strings of bytes or
 * byte buffers.
 *
 * @param key the symmetric key to use (64 or 192 bits).
 * @param iv the initialization vector to use.
 * @param output the buffer to write to, null to create one.
 * @param mode the cipher mode to use (default: 'CBC' if IV is
 *          given, 'ECB' if null).
 *
 * @return the cipher.
 */
forge.des.startDecrypting = function(key, iv, output, mode) {
  var cipher = _createCipher({
    key: key,
    output: output,
    decrypt: true,
    mode: mode || (iv === null ? 'ECB' : 'CBC')
  });
  cipher.start(iv);
  return cipher;
};

/**
 * Deprecated. Instead, use:
 *
 * var decipher = forge.cipher.createDecipher('DES-<mode>', key);
 *
 * Creates an DES cipher object to decrypt data using the given symmetric key.
 *
 * The key may be given as a binary-encoded string of bytes or a byte buffer.
 *
 * @param key the symmetric key to use (64 or 192 bits).
 * @param mode the cipher mode to use (default: 'CBC').
 *
 * @return the cipher.
 */
forge.des.createDecryptionCipher = function(key, mode) {
  return _createCipher({
    key: key,
    output: null,
    decrypt: true,
    mode: mode
  });
};

/**
 * Creates a new DES cipher algorithm object.
 *
 * @param name the name of the algorithm.
 * @param mode the mode factory function.
 *
 * @return the DES algorithm object.
 */
forge.des.Algorithm = function(name, mode) {
  var self = this;
  self.name = name;
  self.mode = new mode({
    blockSize: 8,
    cipher: {
      encrypt: function(inBlock, outBlock) {
        return _updateBlock(self._keys, inBlock, outBlock, false);
      },
      decrypt: function(inBlock, outBlock) {
        return _updateBlock(self._keys, inBlock, outBlock, true);
      }
    }
  });
  self._init = false;
};

/**
 * Initializes this DES algorithm by expanding its key.
 *
 * @param options the options to use.
 *          key the key to use with this algorithm.
 *          decrypt true if the algorithm should be initialized for decryption,
 *            false for encryption.
 */
forge.des.Algorithm.prototype.initialize = function(options) {
  if(this._init) {
    return;
  }

  var key = forge.util.createBuffer(options.key);
  if(this.name.indexOf('3DES') === 0) {
    if(key.length() !== 24) {
      throw new Error('Invalid Triple-DES key size: ' + key.length() * 8);
    }
  }

  // do key expansion to 16 or 48 subkeys (single or triple DES)
  this._keys = _createKeys(key);
  this._init = true;
};

/** Register DES algorithms **/

registerAlgorithm('DES-ECB', forge.cipher.modes.ecb);
registerAlgorithm('DES-CBC', forge.cipher.modes.cbc);
registerAlgorithm('DES-CFB', forge.cipher.modes.cfb);
registerAlgorithm('DES-OFB', forge.cipher.modes.ofb);
registerAlgorithm('DES-CTR', forge.cipher.modes.ctr);

registerAlgorithm('3DES-ECB', forge.cipher.modes.ecb);
registerAlgorithm('3DES-CBC', forge.cipher.modes.cbc);
registerAlgorithm('3DES-CFB', forge.cipher.modes.cfb);
registerAlgorithm('3DES-OFB', forge.cipher.modes.ofb);
registerAlgorithm('3DES-CTR', forge.cipher.modes.ctr);

function registerAlgorithm(name, mode) {
  var factory = function() {
    return new forge.des.Algorithm(name, mode);
  };
  forge.cipher.registerAlgorithm(name, factory);
}

/** DES implementation **/

var spfunction1 = [0x1010400,0,0x10000,0x1010404,0x1010004,0x10404,0x4,0x10000,0x400,0x1010400,0x1010404,0x400,0x1000404,0x1010004,0x1000000,0x4,0x404,0x1000400,0x1000400,0x10400,0x10400,0x1010000,0x1010000,0x1000404,0x10004,0x1000004,0x1000004,0x10004,0,0x404,0x10404,0x1000000,0x10000,0x1010404,0x4,0x1010000,0x1010400,0x1000000,0x1000000,0x400,0x1010004,0x10000,0x10400,0x1000004,0x400,0x4,0x1000404,0x10404,0x1010404,0x10004,0x1010000,0x1000404,0x1000004,0x404,0x10404,0x1010400,0x404,0x1000400,0x1000400,0,0x10004,0x10400,0,0x1010004];
var spfunction2 = [-0x7fef7fe0,-0x7fff8000,0x8000,0x108020,0x100000,0x20,-0x7fefffe0,-0x7fff7fe0,-0x7fffffe0,-0x7fef7fe0,-0x7fef8000,-0x80000000,-0x7fff8000,0x100000,0x20,-0x7fefffe0,0x108000,0x100020,-0x7fff7fe0,0,-0x80000000,0x8000,0x108020,-0x7ff00000,0x100020,-0x7fffffe0,0,0x108000,0x8020,-0x7fef8000,-0x7ff00000,0x8020,0,0x108020,-0x7fefffe0,0x100000,-0x7fff7fe0,-0x7ff00000,-0x7fef8000,0x8000,-0x7ff00000,-0x7fff8000,0x20,-0x7fef7fe0,0x108020,0x20,0x8000,-0x80000000,0x8020,-0x7fef8000,0x100000,-0x7fffffe0,0x100020,-0x7fff7fe0,-0x7fffffe0,0x100020,0x108000,0,-0x7fff8000,0x8020,-0x80000000,-0x7fefffe0,-0x7fef7fe0,0x108000];
var spfunction3 = [0x208,0x8020200,0,0x8020008,0x8000200,0,0x20208,0x8000200,0x20008,0x8000008,0x8000008,0x20000,0x8020208,0x20008,0x8020000,0x208,0x8000000,0x8,0x8020200,0x200,0x20200,0x8020000,0x8020008,0x20208,0x8000208,0x20200,0x20000,0x8000208,0x8,0x8020208,0x200,0x8000000,0x8020200,0x8000000,0x20008,0x208,0x20000,0x8020200,0x8000200,0,0x200,0x20008,0x8020208,0x8000200,0x8000008,0x200,0,0x8020008,0x8000208,0x20000,0x8000000,0x8020208,0x8,0x20208,0x20200,0x8000008,0x8020000,0x8000208,0x208,0x8020000,0x20208,0x8,0x8020008,0x20200];
var spfunction4 = [0x802001,0x2081,0x2081,0x80,0x802080,0x800081,0x800001,0x2001,0,0x802000,0x802000,0x802081,0x81,0,0x800080,0x800001,0x1,0x2000,0x800000,0x802001,0x80,0x800000,0x2001,0x2080,0x800081,0x1,0x2080,0x800080,0x2000,0x802080,0x802081,0x81,0x800080,0x800001,0x802000,0x802081,0x81,0,0,0x802000,0x2080,0x800080,0x800081,0x1,0x802001,0x2081,0x2081,0x80,0x802081,0x81,0x1,0x2000,0x800001,0x2001,0x802080,0x800081,0x2001,0x2080,0x800000,0x802001,0x80,0x800000,0x2000,0x802080];
var spfunction5 = [0x100,0x2080100,0x2080000,0x42000100,0x80000,0x100,0x40000000,0x2080000,0x40080100,0x80000,0x2000100,0x40080100,0x42000100,0x42080000,0x80100,0x40000000,0x2000000,0x40080000,0x40080000,0,0x40000100,0x42080100,0x42080100,0x2000100,0x42080000,0x40000100,0,0x42000000,0x2080100,0x2000000,0x42000000,0x80100,0x80000,0x42000100,0x100,0x2000000,0x40000000,0x2080000,0x42000100,0x40080100,0x2000100,0x40000000,0x42080000,0x2080100,0x40080100,0x100,0x2000000,0x42080000,0x42080100,0x80100,0x42000000,0x42080100,0x2080000,0,0x40080000,0x42000000,0x80100,0x2000100,0x40000100,0x80000,0,0x40080000,0x2080100,0x40000100];
var spfunction6 = [0x20000010,0x20400000,0x4000,0x20404010,0x20400000,0x10,0x20404010,0x400000,0x20004000,0x404010,0x400000,0x20000010,0x400010,0x20004000,0x20000000,0x4010,0,0x400010,0x20004010,0x4000,0x404000,0x20004010,0x10,0x20400010,0x20400010,0,0x404010,0x20404000,0x4010,0x404000,0x20404000,0x20000000,0x20004000,0x10,0x20400010,0x404000,0x20404010,0x400000,0x4010,0x20000010,0x400000,0x20004000,0x20000000,0x4010,0x20000010,0x20404010,0x404000,0x20400000,0x404010,0x20404000,0,0x20400010,0x10,0x4000,0x20400000,0x404010,0x4000,0x400010,0x20004010,0,0x20404000,0x20000000,0x400010,0x20004010];
var spfunction7 = [0x200000,0x4200002,0x4000802,0,0x800,0x4000802,0x200802,0x4200800,0x4200802,0x200000,0,0x4000002,0x2,0x4000000,0x4200002,0x802,0x4000800,0x200802,0x200002,0x4000800,0x4000002,0x4200000,0x4200800,0x200002,0x4200000,0x800,0x802,0x4200802,0x200800,0x2,0x4000000,0x200800,0x4000000,0x200800,0x200000,0x4000802,0x4000802,0x4200002,0x4200002,0x2,0x200002,0x4000000,0x4000800,0x200000,0x4200800,0x802,0x200802,0x4200800,0x802,0x4000002,0x4200802,0x4200000,0x200800,0,0x2,0x4200802,0,0x200802,0x4200000,0x800,0x4000002,0x4000800,0x800,0x200002];
var spfunction8 = [0x10001040,0x1000,0x40000,0x10041040,0x10000000,0x10001040,0x40,0x10000000,0x40040,0x10040000,0x10041040,0x41000,0x10041000,0x41040,0x1000,0x40,0x10040000,0x10000040,0x10001000,0x1040,0x41000,0x40040,0x10040040,0x10041000,0x1040,0,0,0x10040040,0x10000040,0x10001000,0x41040,0x40000,0x41040,0x40000,0x10041000,0x1000,0x40,0x10040040,0x1000,0x41040,0x10001000,0x40,0x10000040,0x10040000,0x10040040,0x10000000,0x40000,0x10001040,0,0x10041040,0x40040,0x10000040,0x10040000,0x10001000,0x10001040,0,0x10041040,0x41000,0x41000,0x1040,0x1040,0x40040,0x10000000,0x10041000];

/**
 * Create necessary sub keys.
 *
 * @param key the 64-bit or 192-bit key.
 *
 * @return the expanded keys.
 */
function _createKeys(key) {
  var pc2bytes0  = [0,0x4,0x20000000,0x20000004,0x10000,0x10004,0x20010000,0x20010004,0x200,0x204,0x20000200,0x20000204,0x10200,0x10204,0x20010200,0x20010204],
      pc2bytes1  = [0,0x1,0x100000,0x100001,0x4000000,0x4000001,0x4100000,0x4100001,0x100,0x101,0x100100,0x100101,0x4000100,0x4000101,0x4100100,0x4100101],
      pc2bytes2  = [0,0x8,0x800,0x808,0x1000000,0x1000008,0x1000800,0x1000808,0,0x8,0x800,0x808,0x1000000,0x1000008,0x1000800,0x1000808],
      pc2bytes3  = [0,0x200000,0x8000000,0x8200000,0x2000,0x202000,0x8002000,0x8202000,0x20000,0x220000,0x8020000,0x8220000,0x22000,0x222000,0x8022000,0x8222000],
      pc2bytes4  = [0,0x40000,0x10,0x40010,0,0x40000,0x10,0x40010,0x1000,0x41000,0x1010,0x41010,0x1000,0x41000,0x1010,0x41010],
      pc2bytes5  = [0,0x400,0x20,0x420,0,0x400,0x20,0x420,0x2000000,0x2000400,0x2000020,0x2000420,0x2000000,0x2000400,0x2000020,0x2000420],
      pc2bytes6  = [0,0x10000000,0x80000,0x10080000,0x2,0x10000002,0x80002,0x10080002,0,0x10000000,0x80000,0x10080000,0x2,0x10000002,0x80002,0x10080002],
      pc2bytes7  = [0,0x10000,0x800,0x10800,0x20000000,0x20010000,0x20000800,0x20010800,0x20000,0x30000,0x20800,0x30800,0x20020000,0x20030000,0x20020800,0x20030800],
      pc2bytes8  = [0,0x40000,0,0x40000,0x2,0x40002,0x2,0x40002,0x2000000,0x2040000,0x2000000,0x2040000,0x2000002,0x2040002,0x2000002,0x2040002],
      pc2bytes9  = [0,0x10000000,0x8,0x10000008,0,0x10000000,0x8,0x10000008,0x400,0x10000400,0x408,0x10000408,0x400,0x10000400,0x408,0x10000408],
      pc2bytes10 = [0,0x20,0,0x20,0x100000,0x100020,0x100000,0x100020,0x2000,0x2020,0x2000,0x2020,0x102000,0x102020,0x102000,0x102020],
      pc2bytes11 = [0,0x1000000,0x200,0x1000200,0x200000,0x1200000,0x200200,0x1200200,0x4000000,0x5000000,0x4000200,0x5000200,0x4200000,0x5200000,0x4200200,0x5200200],
      pc2bytes12 = [0,0x1000,0x8000000,0x8001000,0x80000,0x81000,0x8080000,0x8081000,0x10,0x1010,0x8000010,0x8001010,0x80010,0x81010,0x8080010,0x8081010],
      pc2bytes13 = [0,0x4,0x100,0x104,0,0x4,0x100,0x104,0x1,0x5,0x101,0x105,0x1,0x5,0x101,0x105];

  // how many iterations (1 for des, 3 for triple des)
  // changed by Paul 16/6/2007 to use Triple DES for 9+ byte keys
  var iterations = key.length() > 8 ? 3 : 1;

  // stores the return keys
  var keys = [];

  // now define the left shifts which need to be done
  var shifts = [0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0];

  var n = 0, tmp;
  for(var j = 0; j < iterations; j++) {
    var left = key.getInt32();
    var right = key.getInt32();

    tmp = ((left >>> 4) ^ right) & 0x0f0f0f0f;
    right ^= tmp;
    left ^= (tmp << 4);

    tmp = ((right >>> -16) ^ left) & 0x0000ffff;
    left ^= tmp;
    right ^= (tmp << -16);

    tmp = ((left >>> 2) ^ right) & 0x33333333;
    right ^= tmp;
    left ^= (tmp << 2);

    tmp = ((right >>> -16) ^ left) & 0x0000ffff;
    left ^= tmp;
    right ^= (tmp << -16);

    tmp = ((left >>> 1) ^ right) & 0x55555555;
    right ^= tmp;
    left ^= (tmp << 1);

    tmp = ((right >>> 8) ^ left) & 0x00ff00ff;
    left ^= tmp;
    right ^= (tmp << 8);

    tmp = ((left >>> 1) ^ right) & 0x55555555;
    right ^= tmp;
    left ^= (tmp << 1);

    // right needs to be shifted and OR'd with last four bits of left
    tmp = (left << 8) | ((right >>> 20) & 0x000000f0);

    // left needs to be put upside down
    left = ((right << 24) | ((right << 8) & 0xff0000) |
      ((right >>> 8) & 0xff00) | ((right >>> 24) & 0xf0));
    right = tmp;

    // now go through and perform these shifts on the left and right keys
    for(var i = 0; i < shifts.length; ++i) {
      //shift the keys either one or two bits to the left
      if(shifts[i]) {
        left = (left << 2) | (left >>> 26);
        right = (right << 2) | (right >>> 26);
      } else {
        left = (left << 1) | (left >>> 27);
        right = (right << 1) | (right >>> 27);
      }
      left &= -0xf;
      right &= -0xf;

      // now apply PC-2, in such a way that E is easier when encrypting or
      // decrypting this conversion will look like PC-2 except only the last 6
      // bits of each byte are used rather than 48 consecutive bits and the
      // order of lines will be according to how the S selection functions will
      // be applied: S2, S4, S6, S8, S1, S3, S5, S7
      var lefttmp = (
        pc2bytes0[left >>> 28] | pc2bytes1[(left >>> 24) & 0xf] |
        pc2bytes2[(left >>> 20) & 0xf] | pc2bytes3[(left >>> 16) & 0xf] |
        pc2bytes4[(left >>> 12) & 0xf] | pc2bytes5[(left >>> 8) & 0xf] |
        pc2bytes6[(left >>> 4) & 0xf]);
      var righttmp = (
        pc2bytes7[right >>> 28] | pc2bytes8[(right >>> 24) & 0xf] |
        pc2bytes9[(right >>> 20) & 0xf] | pc2bytes10[(right >>> 16) & 0xf] |
        pc2bytes11[(right >>> 12) & 0xf] | pc2bytes12[(right >>> 8) & 0xf] |
        pc2bytes13[(right >>> 4) & 0xf]);
      tmp = ((righttmp >>> 16) ^ lefttmp) & 0x0000ffff;
      keys[n++] = lefttmp ^ tmp;
      keys[n++] = righttmp ^ (tmp << 16);
    }
  }

  return keys;
}

/**
 * Updates a single block (1 byte) using DES. The update will either
 * encrypt or decrypt the block.
 *
 * @param keys the expanded keys.
 * @param input the input block (an array of 32-bit words).
 * @param output the updated output block.
 * @param decrypt true to decrypt the block, false to encrypt it.
 */
function _updateBlock(keys, input, output, decrypt) {
  // set up loops for single or triple DES
  var iterations = keys.length === 32 ? 3 : 9;
  var looping;
  if(iterations === 3) {
    looping = decrypt ? [30, -2, -2] : [0, 32, 2];
  } else {
    looping = (decrypt ?
      [94, 62, -2, 32, 64, 2, 30, -2, -2] :
      [0, 32, 2, 62, 30, -2, 64, 96, 2]);
  }

  var tmp;

  var left = input[0];
  var right = input[1];

  // first each 64 bit chunk of the message must be permuted according to IP
  tmp = ((left >>> 4) ^ right) & 0x0f0f0f0f;
  right ^= tmp;
  left ^= (tmp << 4);

  tmp = ((left >>> 16) ^ right) & 0x0000ffff;
  right ^= tmp;
  left ^= (tmp << 16);

  tmp = ((right >>> 2) ^ left) & 0x33333333;
  left ^= tmp;
  right ^= (tmp << 2);

  tmp = ((right >>> 8) ^ left) & 0x00ff00ff;
  left ^= tmp;
  right ^= (tmp << 8);

  tmp = ((left >>> 1) ^ right) & 0x55555555;
  right ^= tmp;
  left ^= (tmp << 1);

  // rotate left 1 bit
  left = ((left << 1) | (left >>> 31));
  right = ((right << 1) | (right >>> 31));

  for(var j = 0; j < iterations; j += 3) {
    var endloop = looping[j + 1];
    var loopinc = looping[j + 2];

    // now go through and perform the encryption or decryption
    for(var i = looping[j]; i != endloop; i += loopinc) {
      var right1 = right ^ keys[i];
      var right2 = ((right >>> 4) | (right << 28)) ^ keys[i + 1];

      // passing these bytes through the S selection functions
      tmp = left;
      left = right;
      right = tmp ^ (
        spfunction2[(right1 >>> 24) & 0x3f] |
        spfunction4[(right1 >>> 16) & 0x3f] |
        spfunction6[(right1 >>>  8) & 0x3f] |
        spfunction8[right1 & 0x3f] |
        spfunction1[(right2 >>> 24) & 0x3f] |
        spfunction3[(right2 >>> 16) & 0x3f] |
        spfunction5[(right2 >>>  8) & 0x3f] |
        spfunction7[right2 & 0x3f]);
    }
    // unreverse left and right
    tmp = left;
    left = right;
    right = tmp;
  }

  // rotate right 1 bit
  left = ((left >>> 1) | (left << 31));
  right = ((right >>> 1) | (right << 31));

  // now perform IP-1, which is IP in the opposite direction
  tmp = ((left >>> 1) ^ right) & 0x55555555;
  right ^= tmp;
  left ^= (tmp << 1);

  tmp = ((right >>> 8) ^ left) & 0x00ff00ff;
  left ^= tmp;
  right ^= (tmp << 8);

  tmp = ((right >>> 2) ^ left) & 0x33333333;
  left ^= tmp;
  right ^= (tmp << 2);

  tmp = ((left >>> 16) ^ right) & 0x0000ffff;
  right ^= tmp;
  left ^= (tmp << 16);

  tmp = ((left >>> 4) ^ right) & 0x0f0f0f0f;
  right ^= tmp;
  left ^= (tmp << 4);

  output[0] = left;
  output[1] = right;
}

/**
 * Deprecated. Instead, use:
 *
 * forge.cipher.createCipher('DES-<mode>', key);
 * forge.cipher.createDecipher('DES-<mode>', key);
 *
 * Creates a deprecated DES cipher object. This object's mode will default to
 * CBC (cipher-block-chaining).
 *
 * The key may be given as a binary-encoded string of bytes or a byte buffer.
 *
 * @param options the options to use.
 *          key the symmetric key to use (64 or 192 bits).
 *          output the buffer to write to.
 *          decrypt true for decryption, false for encryption.
 *          mode the cipher mode to use (default: 'CBC').
 *
 * @return the cipher.
 */
function _createCipher(options) {
  options = options || {};
  var mode = (options.mode || 'CBC').toUpperCase();
  var algorithm = 'DES-' + mode;

  var cipher;
  if(options.decrypt) {
    cipher = forge.cipher.createDecipher(algorithm, options.key);
  } else {
    cipher = forge.cipher.createCipher(algorithm, options.key);
  }

  // backwards compatible start API
  var start = cipher.start;
  cipher.start = function(iv, options) {
    // backwards compatibility: support second arg as output buffer
    var output = null;
    if(options instanceof forge.util.ByteBuffer) {
      output = options;
      options = {};
    }
    options = options || {};
    options.output = output;
    options.iv = iv;
    start.call(cipher, options);
  };

  return cipher;
}
