'use strict';

const assert = require('assert');

const {
  utils: {
    generateKeyPair,
    generateKeyPairSync,
    parseKey,
  },
} = require('..');

const { mustCall } = require('./common.js');

const nodeMajor = +/(?<=^v)\d+/.exec(process.version)[0];

function tryParse(...args) {
  const ret = parseKey(...args);
  if (ret instanceof Error)
    throw ret;
  return ret;
}

const inputs = [
  { args: ['rsa', { bits: 2048 }], sshType: 'ssh-rsa' },
  { args: ['ecdsa', { bits: 256 }], sshType: 'ecdsa-sha2-nistp256' },
  { args: ['ecdsa', { bits: 521 }], sshType: 'ecdsa-sha2-nistp521' },
  { args: ['ed25519'], sshType: 'ssh-ed25519' },
  { args: ['rsa', { bits: 2048, passphrase: 'foo', cipher: 'aes256-cbc' }],
    sshType: 'ssh-rsa' },
  { args: ['rsa', { bits: 2048, comment: 'foobarbaz' }], sshType: 'ssh-rsa' },
];
(function next() {
  if (inputs.length === 0)
    return;
  const { args, sshType } = inputs.shift();
  if (args[0] === 'ed25519' && nodeMajor < 12) {
    console.log('Skipping ed25519 on node < 12');
    return;
  }
  const passphrase = (args[1] && args[1].passphrase);
  const comment = ((args[1] && args[1].comment) || '');
  const check = (keys) => {
    let parsed = tryParse(keys.private, passphrase);
    assert.strictEqual(parsed.type, sshType);
    assert.strictEqual(parsed.comment, comment);

    parsed = tryParse(keys.public);
    assert.strictEqual(parsed.type, sshType);
    assert.strictEqual(parsed.comment, comment);
  };
  console.log(`Testing generateKeyPairSync(${JSON.stringify(args)}) ...`);
  check(generateKeyPairSync(...args));
  console.log(`Testing generateKeyPair(${JSON.stringify(args)}) ...`);
  generateKeyPair(...args, mustCall((err, keys) => {
    assert.ifError(err);
    check(keys);
    next();
  }));
})();
