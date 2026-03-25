'use strict';

const assert = require('assert');
const { readdirSync, readFileSync } = require('fs');
const { inspect } = require('util');

const { parseKey } = require('../lib/protocol/keyParser.js');

const { EDDSA_SUPPORTED } = require('../lib/protocol/constants.js');

const BASE_PATH = `${__dirname}/fixtures/keyParser`;

function failMsg(name, message, exit) {
  const msg = `[${name}] ${message}`;
  if (!exit)
    return msg;
  console.error(msg);
  process.exit(1);
}

readdirSync(BASE_PATH).forEach((name) => {
  if (/\.result$/i.test(name))
    return;
  if (/ed25519/i.test(name) && !EDDSA_SUPPORTED)
    return;

  const isPublic = /\.pub$/i.test(name);
  const isEncrypted = /_enc/i.test(name);
  const isPPK = /^ppk_/i.test(name);
  const key = readFileSync(`${BASE_PATH}/${name}`);
  let res;
  if (isEncrypted)
    res = parseKey(key, (isPPK ? 'node.js' : 'password'));
  else
    res = parseKey(key);
  let expected = JSON.parse(
    readFileSync(`${BASE_PATH}/${name}.result`, 'utf8')
  );
  if (typeof expected === 'string') {
    if (!(res instanceof Error))
      failMsg(name, `Expected error: ${expected}`, true);
    assert.strictEqual(
      expected,
      res.message,
      failMsg(name,
              'Error message mismatch.\n'
                + `Expected: ${inspect(expected)}\n`
                + `Received: ${inspect(res.message)}`)
    );
  } else if (res instanceof Error) {
    failMsg(name, `Unexpected error: ${res.stack}`, true);
  } else {
    if (Array.isArray(expected) && !Array.isArray(res))
      failMsg(name, 'Expected array but did not receive one', true);
    if (!Array.isArray(expected) && Array.isArray(res))
      failMsg(name, 'Received array but did not expect one', true);

    if (!Array.isArray(res)) {
      res = [res];
      expected = [expected];
    } else if (res.length !== expected.length) {
      failMsg(name,
              `Expected ${expected.length} keys, but received ${res.length}`,
              true);
    }

    res.forEach((curKey, i) => {
      const details = {
        type: curKey.type,
        comment: curKey.comment,
        public: curKey.getPublicPEM(),
        publicSSH: curKey.getPublicSSH()
                   && curKey.getPublicSSH().toString('base64'),
        private: curKey.getPrivatePEM()
      };
      assert.deepStrictEqual(
        details,
        expected[i],
        failMsg(name,
                'Parser output mismatch.\n'
                  + `Expected: ${inspect(expected[i])}\n\n`
                  + `Received: ${inspect(details)}`)
      );
    });

    // Test `equals()`
    let copy;
    if (isEncrypted)
      copy = parseKey(key, (isPPK ? 'node.js' : 'password'));
    else
      copy = parseKey(key);
    if (!Array.isArray(copy))
      copy = [copy];
    for (let i = 0; i < res.length; ++i) {
      assert.strictEqual(
        res[i].equals(copy[i]),
        true,
        failMsg(name, 'equals() failed with copy')
      );
    }
  }

  if (isEncrypted && !isPublic) {
    // Make sure parsing encrypted keys without a passphrase results in an
    // appropriate error
    const err = parseKey(key);
    if (!(err instanceof Error))
      failMsg(name, 'Expected error during parse without passphrase', true);
    if (!/no passphrase/i.test(err.message)) {
      failMsg(name,
              `Error during parse without passphrase: ${err.message}`,
              true);
    }

    // Make sure parsing encrypted keys with an incorrect passphrase results in
    // an appropriate error
    const errIncPass = parseKey(key, 'incorrectPassphrase');
    if (!(errIncPass instanceof Error)) {
      failMsg(name,
              'Expected error during parse with an incorrect passphrase',
              true);
    }
    if (!/bad passphrase\?|unable to authenticate data/i
        .test(errIncPass.message)) {
      failMsg(name,
              'Error during parse with an incorrect passphrase: '
                + errIncPass.message,
              true);
    }
  }

  if (!isPublic) {
    // Try signing and verifying to make sure the private/public key PEMs are
    // correct
    const data = Buffer.from('hello world');
    res.forEach((curKey) => {
      let result = curKey.sign(data);
      if (result instanceof Error) {
        failMsg(name,
                `Error while signing data with key: ${result.message}`,
                true);
      }
      result = curKey.verify(data, result);
      if (result instanceof Error) {
        failMsg(name,
                `Error while verifying signed data with key: ${result.message}`,
                true);
      }
      if (!result)
        failMsg(name, 'Failed to verify signed data with key', true);
    });
    if (res.length === 1 && !isPPK) {
      const pubFile = readFileSync(`${BASE_PATH}/${name}.pub`);
      const pubParsed = parseKey(pubFile);
      if (!(pubParsed instanceof Error)) {
        let result = res[0].sign(data);
        if (result instanceof Error) {
          failMsg(name,
                  `Error while signing data with key: ${result.message}`,
                  true);
        }
        result = pubParsed.verify(data, result);
        if (result instanceof Error) {
          failMsg(name,
                  'Error while verifying signed data with separate public key: '
                    + result.message,
                  true);
        }
        if (!result) {
          failMsg(name,
                  'Failed to verify signed data with separate public key',
                  true);
        }
      }
    }
  }
});
