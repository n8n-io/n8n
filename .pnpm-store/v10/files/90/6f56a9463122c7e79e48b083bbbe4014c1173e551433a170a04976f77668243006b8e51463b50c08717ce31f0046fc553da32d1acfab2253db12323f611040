'use strict';

const assert = require('assert');
const { randomBytes } = require('crypto');

const {
  CIPHER_INFO,
  MAC_INFO,
  bindingAvailable,
  NullCipher,
  createCipher,
  NullDecipher,
  createDecipher,
  init: cryptoInit,
} = require('../lib/protocol/crypto.js');

(async () => {
  await cryptoInit;

  console.log(`Crypto binding ${bindingAvailable ? '' : 'not '}available`);
  {
    const PAIRS = [
      // cipher, decipher
      ['native', 'native'],
      ['binding', 'native'],
      ['native', 'binding'],
      ['binding', 'binding'],
    ].slice(0, bindingAvailable ? 4 : 1);

    [
      { cipher: null },
      { cipher: 'chacha20-poly1305@openssh.com' },
      { cipher: 'aes128-gcm@openssh.com' },
      { cipher: 'aes128-cbc', mac: 'hmac-sha1-etm@openssh.com' },
      { cipher: 'aes128-ctr', mac: 'hmac-sha1' },
      { cipher: 'arcfour', mac: 'hmac-sha2-256-96' },
    ].forEach((testConfig) => {
      for (const pair of PAIRS) {
        function onCipherData(data) {
          ciphered = Buffer.concat([ciphered, data]);
        }

        function onDecipherPayload(payload) {
          deciphered.push(payload);
        }

        function reset() {
          ciphered = Buffer.alloc(0);
          deciphered = [];
        }

        function reinit() {
          if (testConfig.cipher === null) {
            cipher = new NullCipher(1, onCipherData);
            decipher = new NullDecipher(1, onDecipherPayload);
          } else {
            cipher = createCipher(config);
            decipher = createDecipher(config);
          }
        }

        let ciphered;
        let deciphered;
        let cipher;
        let decipher;
        let macSize;
        let packet;
        let payload;
        let cipherInfo;
        let config;

        console.log('Testing cipher: %s, mac: %s (%s encrypt, %s decrypt) ...',
                    testConfig.cipher,
                    testConfig.mac
                      || (testConfig.cipher === null ? '<none>' : '<implicit>'),
                    pair[0],
                    pair[1]);

        if (testConfig.cipher === null) {
          cipher = new NullCipher(1, onCipherData);
          decipher = new NullDecipher(1, onDecipherPayload);
          macSize = 0;
        } else {
          cipherInfo = CIPHER_INFO[testConfig.cipher];
          let macInfo;
          let macKey;
          if (testConfig.mac) {
            macInfo = MAC_INFO[testConfig.mac];
            macKey = randomBytes(macInfo.len);
            macSize = macInfo.actualLen;
          } else if (cipherInfo.authLen) {
            macSize = cipherInfo.authLen;
          } else {
            throw new Error('Missing MAC for cipher');
          }
          const key = randomBytes(cipherInfo.keyLen);
          const iv = (cipherInfo.ivLen
                      ? randomBytes(cipherInfo.ivLen)
                      : Buffer.alloc(0));
          config = {
            outbound: {
              onWrite: onCipherData,
              cipherInfo,
              cipherKey: Buffer.from(key),
              cipherIV: Buffer.from(iv),
              seqno: 1,
              macInfo,
              macKey: (macKey && Buffer.from(macKey)),
              forceNative: (pair[0] === 'native'),
            },
            inbound: {
              onPayload: onDecipherPayload,
              decipherInfo: cipherInfo,
              decipherKey: Buffer.from(key),
              decipherIV: Buffer.from(iv),
              seqno: 1,
              macInfo,
              macKey: (macKey && Buffer.from(macKey)),
              forceNative: (pair[1] === 'native'),
            },
          };
          try {
            cipher = createCipher(config);
          } catch (ex) {
            if (ex.code === 'ERR_OSSL_EVP_UNSUPPORTED'
                || /unsupported/i.test(ex.message)) {
              console.log(
                '  ... skipping because cipher is unsupported by OpenSSL'
              );
              continue;
            }
            throw ex;
          }
          try {
            decipher = createDecipher(config);
          } catch (ex) {
            if (ex.code === 'ERR_OSSL_EVP_UNSUPPORTED'
                || /unsupported/i.test(ex.message)) {
              console.log(
                '  ... skipping because cipher is unsupported by OpenSSL'
              );
              continue;
            }
            throw ex;
          }

          if (pair[0] === 'binding')
            assert(/binding/i.test(cipher.constructor.name));
          else
            assert(/native/i.test(cipher.constructor.name));
          if (pair[1] === 'binding')
            assert(/binding/i.test(decipher.constructor.name));
          else
            assert(/native/i.test(decipher.constructor.name));
        }

        let expectedSeqno;
        // Test zero-length payload ============================================
        payload = Buffer.alloc(0);
        expectedSeqno = 2;

        reset();
        packet = cipher.allocPacket(payload.length);
        payload.copy(packet, 5);
        cipher.encrypt(packet);
        assert.strictEqual(decipher.decrypt(ciphered, 0, ciphered.length),
                           undefined);

        assert.strictEqual(cipher.outSeqno, expectedSeqno);
        assert(ciphered.length >= 9 + macSize);
        assert.strictEqual(decipher.inSeqno, cipher.outSeqno);
        assert.strictEqual(deciphered.length, 1);
        assert.deepStrictEqual(deciphered[0], payload);

        // Test single byte payload ============================================
        payload = Buffer.from([ 0xEF ]);
        expectedSeqno = 3;

        reset();
        packet = cipher.allocPacket(payload.length);
        payload.copy(packet, 5);
        cipher.encrypt(packet);
        assert.strictEqual(decipher.decrypt(ciphered, 0, ciphered.length),
                           undefined);

        assert.strictEqual(cipher.outSeqno, 3);
        assert(ciphered.length >= 9 + macSize);
        assert.strictEqual(decipher.inSeqno, cipher.outSeqno);
        assert.strictEqual(deciphered.length, 1);
        assert.deepStrictEqual(deciphered[0], payload);

        // Test large payload ==================================================
        payload = randomBytes(32 * 1024);
        expectedSeqno = 4;

        reset();
        packet = cipher.allocPacket(payload.length);
        payload.copy(packet, 5);
        cipher.encrypt(packet);
        assert.strictEqual(decipher.decrypt(ciphered, 0, ciphered.length),
                           undefined);

        assert.strictEqual(cipher.outSeqno, expectedSeqno);
        assert(ciphered.length >= 9 + macSize);
        assert.strictEqual(decipher.inSeqno, cipher.outSeqno);
        assert.strictEqual(deciphered.length, 1);
        assert.deepStrictEqual(deciphered[0], payload);

        // Test sequnce number rollover ========================================
        payload = randomBytes(4);
        expectedSeqno = 0;
        cipher.outSeqno = decipher.inSeqno = (2 ** 32) - 1;

        reset();
        packet = cipher.allocPacket(payload.length);
        payload.copy(packet, 5);
        cipher.encrypt(packet);
        assert.strictEqual(decipher.decrypt(ciphered, 0, ciphered.length),
                           undefined);

        assert.strictEqual(cipher.outSeqno, expectedSeqno);
        assert(ciphered.length >= 9 + macSize);
        assert.strictEqual(decipher.inSeqno, cipher.outSeqno);
        assert.strictEqual(deciphered.length, 1);
        assert.deepStrictEqual(deciphered[0], payload);

        // Test chunked input -- split length bytes ============================
        payload = randomBytes(32 * 768);
        expectedSeqno = 1;

        reset();
        packet = cipher.allocPacket(payload.length);
        payload.copy(packet, 5);
        cipher.encrypt(packet);
        assert.strictEqual(decipher.decrypt(ciphered, 0, 2), undefined);
        assert.strictEqual(decipher.decrypt(ciphered, 2, ciphered.length),
                           undefined);

        assert.strictEqual(cipher.outSeqno, expectedSeqno);
        assert(ciphered.length >= 9 + macSize);
        assert.strictEqual(decipher.inSeqno, cipher.outSeqno);
        assert.strictEqual(deciphered.length, 1);
        assert.deepStrictEqual(deciphered[0], payload);

        // Test chunked input -- split length from payload =====================
        payload = randomBytes(32 * 768);
        expectedSeqno = 2;

        reset();
        packet = cipher.allocPacket(payload.length);
        payload.copy(packet, 5);
        cipher.encrypt(packet);
        assert.strictEqual(decipher.decrypt(ciphered, 0, 4), undefined);
        assert.strictEqual(decipher.decrypt(ciphered, 4, ciphered.length),
                           undefined);

        assert.strictEqual(cipher.outSeqno, expectedSeqno);
        assert(ciphered.length >= 9 + macSize);
        assert.strictEqual(decipher.inSeqno, cipher.outSeqno);
        assert.strictEqual(deciphered.length, 1);
        assert.deepStrictEqual(deciphered[0], payload);

        // Test chunked input -- split length and payload from MAC =============
        payload = randomBytes(32 * 768);
        expectedSeqno = 3;

        reset();
        packet = cipher.allocPacket(payload.length);
        payload.copy(packet, 5);
        cipher.encrypt(packet);
        assert.strictEqual(
          decipher.decrypt(ciphered, 0, ciphered.length - macSize),
          undefined
        );
        assert.strictEqual(
          decipher.decrypt(ciphered,
                           ciphered.length - macSize,
                           ciphered.length),
          undefined
        );

        assert.strictEqual(cipher.outSeqno, expectedSeqno);
        assert(ciphered.length >= 9 + macSize);
        assert.strictEqual(decipher.inSeqno, cipher.outSeqno);
        assert.strictEqual(deciphered.length, 1);
        assert.deepStrictEqual(deciphered[0], payload);

        // Test packet length checks ===========================================
        [0, 2 ** 32 - 1].forEach((n) => {
          reset();
          packet = cipher.allocPacket(0);
          packet.writeUInt32BE(n, 0); // Overwrite packet length field
          cipher.encrypt(packet);
          let threw = false;
          try {
            decipher.decrypt(ciphered, 0, ciphered.length);
          } catch (ex) {
            threw = true;
            assert(ex instanceof Error);
            assert(/packet length/i.test(ex.message));
          }
          if (!threw)
            throw new Error('Expected error');

          // Recreate deciphers since errors leave them in an unusable state.
          // We recreate the ciphers as well so that internal states of both
          // ends match again.
          reinit();
        });

        // Test minimum padding length check ===================================
        if (testConfig.cipher !== null) {
          let payloadLen;
          const blockLen = cipherInfo.blockLen;
          if (/chacha|gcm/i.test(testConfig.cipher)
              || /etm/i.test(testConfig.mac)) {
            payloadLen = blockLen - 2;
          } else {
            payloadLen = blockLen - 6;
          }
          const minLen = 4 + 1 + payloadLen + (blockLen + 1);
          // We don't do strict equality checks here since the length of the
          // returned Buffer can vary due to implementation details.
          assert(cipher.allocPacket(payloadLen).length >= minLen);
        }

        // =====================================================================
        cipher.free();
        decipher.free();
        if (testConfig.cipher === null)
          break;
      }
    });
  }

  // Test createCipher()/createDecipher() exceptions
  {
    [
      [
        [true, null],
        /invalid config/i
      ],
      [
        [{}],
        [/invalid outbound/i, /invalid inbound/i]
      ],
      [
        [{ outbound: {}, inbound: {} }],
        [/invalid outbound\.onWrite/i, /invalid inbound\.onPayload/i]
      ],
      [
        [
          { outbound: {
              onWrite: () => {},
              cipherInfo: true
            },
            inbound: {
              onPayload: () => {},
              decipherInfo: true
            },
          },
          { outbound: {
              onWrite: () => {},
              cipherInfo: null
            },
            inbound: {
              onPayload: () => {},
              decipherInfo: null
            },
          },
        ],
        [/invalid outbound\.cipherInfo/i, /invalid inbound\.decipherInfo/i]
      ],
      [
        [
          { outbound: {
              onWrite: () => {},
              cipherInfo: {},
              cipherKey: {},
            },
            inbound: {
              onPayload: () => {},
              decipherInfo: {},
              decipherKey: {},
            },
          },
          { outbound: {
              onWrite: () => {},
              cipherInfo: { keyLen: 32 },
              cipherKey: Buffer.alloc(8),
            },
            inbound: {
              onPayload: () => {},
              decipherInfo: { keyLen: 32 },
              decipherKey: Buffer.alloc(8),
            },
          },
        ],
        [/invalid outbound\.cipherKey/i, /invalid inbound\.decipherKey/i]
      ],
      [
        [
          { outbound: {
              onWrite: () => {},
              cipherInfo: { keyLen: 1, ivLen: 12 },
              cipherKey: Buffer.alloc(1),
              cipherIV: true
            },
            inbound: {
              onPayload: () => {},
              decipherInfo: { keyLen: 1, ivLen: 12 },
              decipherKey: Buffer.alloc(1),
              cipherIV: true
            },
          },
          { outbound: {
              onWrite: () => {},
              cipherInfo: { keyLen: 1, ivLen: 12 },
              cipherKey: Buffer.alloc(1),
              cipherIV: null
            },
            inbound: {
              onPayload: () => {},
              decipherInfo: { keyLen: 1, ivLen: 12 },
              decipherKey: Buffer.alloc(1),
              cipherIV: null
            },
          },
          { outbound: {
              onWrite: () => {},
              cipherInfo: { keyLen: 1, ivLen: 12 },
              cipherKey: Buffer.alloc(1),
              cipherIV: {}
            },
            inbound: {
              onPayload: () => {},
              decipherInfo: { keyLen: 1, ivLen: 12 },
              decipherKey: Buffer.alloc(1),
              cipherIV: {}
            },
          },
          { outbound: {
              onWrite: () => {},
              cipherInfo: { keyLen: 1, ivLen: 12 },
              cipherKey: Buffer.alloc(1),
              cipherIV: Buffer.alloc(1)
            },
            inbound: {
              onPayload: () => {},
              decipherInfo: { keyLen: 1, ivLen: 12 },
              decipherKey: Buffer.alloc(1),
              cipherIV: Buffer.alloc(1)
            },
          },
        ],
        [/invalid outbound\.cipherIV/i, /invalid inbound\.decipherIV/i]
      ],
      [
        [
          { outbound: {
              onWrite: () => {},
              cipherInfo: { keyLen: 1, ivLen: 0 },
              cipherKey: Buffer.alloc(1),
              seqno: true
            },
            inbound: {
              onPayload: () => {},
              decipherInfo: { keyLen: 1, ivLen: 0 },
              decipherKey: Buffer.alloc(1),
              seqno: true
            },
          },
          { outbound: {
              onWrite: () => {},
              cipherInfo: { keyLen: 1, ivLen: 0 },
              cipherKey: Buffer.alloc(1),
              seqno: -1
            },
            inbound: {
              onPayload: () => {},
              decipherInfo: { keyLen: 1, ivLen: 0 },
              decipherKey: Buffer.alloc(1),
              seqno: -1
            },
          },
          { outbound: {
              onWrite: () => {},
              cipherInfo: { keyLen: 1, ivLen: 0 },
              cipherKey: Buffer.alloc(1),
              seqno: 2 ** 32
            },
            inbound: {
              onPayload: () => {},
              decipherInfo: { keyLen: 1, ivLen: 0 },
              decipherKey: Buffer.alloc(1),
              seqno: 2 ** 32
            },
          },
        ],
        [/invalid outbound\.seqno/i, /invalid inbound\.seqno/i]
      ],
      [
        [
          { outbound: {
              onWrite: () => {},
              cipherInfo: { keyLen: 1, ivLen: 0, sslName: 'foo' },
              cipherKey: Buffer.alloc(1),
              seqno: 0
            },
            inbound: {
              onPayload: () => {},
              decipherInfo: { keyLen: 1, ivLen: 0, sslName: 'foo' },
              decipherKey: Buffer.alloc(1),
              seqno: 0
            },
          },
          { outbound: {
              onWrite: () => {},
              cipherInfo: { keyLen: 1, ivLen: 0, sslName: 'foo' },
              cipherKey: Buffer.alloc(1),
              seqno: 0,
              macInfo: true
            },
            inbound: {
              onPayload: () => {},
              decipherInfo: { keyLen: 1, ivLen: 0, sslName: 'foo' },
              decipherKey: Buffer.alloc(1),
              seqno: 0,
              macInfo: true
            },
          },
          { outbound: {
              onWrite: () => {},
              cipherInfo: { keyLen: 1, ivLen: 0, sslName: 'foo' },
              cipherKey: Buffer.alloc(1),
              seqno: 0,
              macInfo: null
            },
            inbound: {
              onPayload: () => {},
              decipherInfo: { keyLen: 1, ivLen: 0, sslName: 'foo' },
              decipherKey: Buffer.alloc(1),
              seqno: 0,
              macInfo: null
            },
          },
        ],
        [/invalid outbound\.macInfo/i, /invalid inbound\.macInfo/i]
      ],
      [
        [
          { outbound: {
              onWrite: () => {},
              cipherInfo: { keyLen: 1, ivLen: 0, sslName: 'foo' },
              cipherKey: Buffer.alloc(1),
              seqno: 0,
              macInfo: { keyLen: 16 }
            },
            inbound: {
              onPayload: () => {},
              decipherInfo: { keyLen: 1, ivLen: 0, sslName: 'foo' },
              decipherKey: Buffer.alloc(1),
              seqno: 0,
              macInfo: { keyLen: 16 }
            },
          },
          { outbound: {
              onWrite: () => {},
              cipherInfo: { keyLen: 1, ivLen: 0, sslName: 'foo' },
              cipherKey: Buffer.alloc(1),
              seqno: 0,
              macInfo: { keyLen: 16 },
              macKey: true
            },
            inbound: {
              onPayload: () => {},
              decipherInfo: { keyLen: 1, ivLen: 0, sslName: 'foo' },
              decipherKey: Buffer.alloc(1),
              seqno: 0,
              macInfo: { keyLen: 16 },
              macKey: true
            },
          },
          { outbound: {
              onWrite: () => {},
              cipherInfo: { keyLen: 1, ivLen: 0, sslName: 'foo' },
              cipherKey: Buffer.alloc(1),
              seqno: 0,
              macInfo: { keyLen: 16 },
              macKey: null
            },
            inbound: {
              onPayload: () => {},
              decipherInfo: { keyLen: 1, ivLen: 0, sslName: 'foo' },
              decipherKey: Buffer.alloc(1),
              seqno: 0,
              macInfo: { keyLen: 16 },
              macKey: null
            },
          },
          { outbound: {
              onWrite: () => {},
              cipherInfo: { keyLen: 1, ivLen: 0, sslName: 'foo' },
              cipherKey: Buffer.alloc(1),
              seqno: 0,
              macInfo: { keyLen: 16 },
              macKey: Buffer.alloc(1)
            },
            inbound: {
              onPayload: () => {},
              decipherInfo: { keyLen: 1, ivLen: 0, sslName: 'foo' },
              decipherKey: Buffer.alloc(1),
              seqno: 0,
              macInfo: { keyLen: 16 },
              macKey: Buffer.alloc(1)
            },
          },
        ],
        [/invalid outbound\.macKey/i, /invalid inbound\.macKey/i]
      ],
    ].forEach((testCase) => {
      let errorChecks = testCase[1];
      if (!Array.isArray(errorChecks))
        errorChecks = [errorChecks[0], errorChecks[0]];
      for (const input of testCase[0]) {
        assert.throws(() => createCipher(input), errorChecks[0]);
        assert.throws(() => createDecipher(input), errorChecks[1]);
      }
    });
  }
})();
