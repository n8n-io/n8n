'use strict';

/*
4.1 authentication: (http://bazaar.launchpad.net/~mysql/mysql-server/5.5/view/head:/sql/password.c)

  SERVER:  public_seed=create_random_string()
           send(public_seed)

  CLIENT:  recv(public_seed)
           hash_stage1=sha1("password")
           hash_stage2=sha1(hash_stage1)
           reply=xor(hash_stage1, sha1(public_seed,hash_stage2)

           // this three steps are done in scramble()

           send(reply)


  SERVER:  recv(reply)
           hash_stage1=xor(reply, sha1(public_seed,hash_stage2))
           candidate_hash2=sha1(hash_stage1)
           check(candidate_hash2==hash_stage2)

server stores sha1(sha1(password)) ( hash_stag2)
*/

const crypto = require('crypto');

function sha1(msg, msg1, msg2) {
  const hash = crypto.createHash('sha1');
  hash.update(msg);
  if (msg1) {
    hash.update(msg1);
  }

  if (msg2) {
    hash.update(msg2);
  }

  return hash.digest();
}

function xor(a, b) {
  const result = Buffer.allocUnsafe(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] ^ b[i];
  }
  return result;
}

exports.xor = xor;

function token(password, scramble1, scramble2) {
  if (!password) {
    return Buffer.alloc(0);
  }
  const stage1 = sha1(password);
  return exports.calculateTokenFromPasswordSha(stage1, scramble1, scramble2);
}

exports.calculateTokenFromPasswordSha = function (
  passwordSha,
  scramble1,
  scramble2
) {
  // we use AUTH 41 here, and we need only the bytes we just need.
  const authPluginData1 = scramble1.slice(0, 8);
  const authPluginData2 = scramble2.slice(0, 12);
  const stage2 = sha1(passwordSha);
  const stage3 = sha1(authPluginData1, authPluginData2, stage2);
  return xor(stage3, passwordSha);
};

exports.calculateToken = token;

exports.verifyToken = function (publicSeed1, publicSeed2, token, doubleSha) {
  const hashStage1 = xor(token, sha1(publicSeed1, publicSeed2, doubleSha));
  const candidateHash2 = sha1(hashStage1);
  return candidateHash2.compare(doubleSha) === 0;
};

exports.doubleSha1 = function (password) {
  return sha1(sha1(password));
};

function xorRotating(a, seed) {
  const result = Buffer.allocUnsafe(a.length);
  const seedLen = seed.length;

  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] ^ seed[i % seedLen];
  }
  return result;
}
exports.xorRotating = xorRotating;
