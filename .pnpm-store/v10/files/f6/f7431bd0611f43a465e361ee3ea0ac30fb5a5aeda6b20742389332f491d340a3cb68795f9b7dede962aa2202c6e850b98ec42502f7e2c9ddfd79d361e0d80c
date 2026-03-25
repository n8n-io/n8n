'use strict';

const assert = require('assert');

const {
  fixtureKey,
  mustCall,
  setup,
} = require('./common.js');

const debug = false;

[
  { desc: 'RSA user key (old OpenSSH)',
    hostKey: fixtureKey('id_rsa') },
  { desc: 'RSA user key (new OpenSSH)',
    hostKey: fixtureKey('openssh_new_rsa') },
  { desc: 'DSA host key',
    hostKey: fixtureKey('ssh_host_dsa_key') },
  { desc: 'ECDSA host key',
    hostKey: fixtureKey('ssh_host_ecdsa_key') },
  { desc: 'PPK',
    hostKey: fixtureKey('id_rsa.ppk') },
].forEach((test) => {
  const { desc, hostKey } = test;
  const clientKey = fixtureKey('openssh_new_rsa');
  const username = 'KeyUser';
  const { server } = setup(
    desc,
    {
      client: {
        username,
        privateKey: clientKey.raw,
        algorithms: {
          serverHostKey: [ hostKey.key.type ],
        }
      },
      server: { hostKeys: [ hostKey.raw ] },
      debug,
    }
  );

  server.on('connection', mustCall((conn) => {
    let authAttempt = 0;
    conn.on('authentication', mustCall((ctx) => {
      assert(ctx.username === username,
             `Wrong username: ${ctx.username}`);
      switch (++authAttempt) {
        case 1:
          assert(ctx.method === 'none',
                 `Wrong auth method: ${ctx.method}`);
          return ctx.reject();
        case 3:
          assert(ctx.signature, 'Missing publickey signature');
        // FALLTHROUGH
        case 2:
          assert(ctx.method === 'publickey',
                 `Wrong auth method: ${ctx.method}`);
          assert(ctx.key.algo === clientKey.key.type,
                 `Wrong key algo: ${ctx.key.algo}`);
          assert.deepStrictEqual(clientKey.key.getPublicSSH(),
                                 ctx.key.data,
                                 'Public key mismatch');
          break;
      }
      if (ctx.signature) {
        const result =
          clientKey.key.verify(ctx.blob, ctx.signature, ctx.hashAlgo);
        assert(result === true, 'Could not verify publickey signature');
      }
      ctx.accept();
    }, 3)).on('ready', mustCall(() => {
      conn.end();
    }));
  }));
});


{
  const RSA_KEY = fixtureKey('ssh_host_rsa_key');
  const ECDSA_KEY = fixtureKey('ssh_host_ecdsa_key');
  [ RSA_KEY, ECDSA_KEY ].forEach((key) => {
    const selKeyType = key.key.type;
    const clientKey = fixtureKey('openssh_new_rsa');
    const username = 'KeyUser';
    const { client, server } = setup(
      `Multiple host key types (${key.type} selected)`,
      {
        client: {
          username,
          privateKey: clientKey.raw,
          algorithms: {
            serverHostKey: [ selKeyType ],
          }
        },
        server: { hostKeys: [ RSA_KEY.raw, ECDSA_KEY.raw ] },
        debug,
      }
    );

    server.on('connection', mustCall((conn) => {
      let authAttempt = 0;
      conn.on('authentication', mustCall((ctx) => {
        assert(ctx.username === username,
               `Wrong username: ${ctx.username}`);
        switch (++authAttempt) {
          case 1:
            assert(ctx.method === 'none',
                   `Wrong auth method: ${ctx.method}`);
            return ctx.reject();
          case 3:
            assert(ctx.signature, 'Missing publickey signature');
          // FALLTHROUGH
          case 2:
            assert(ctx.method === 'publickey',
                   `Wrong auth method: ${ctx.method}`);
            assert(ctx.key.algo === clientKey.key.type,
                   `Wrong key algo: ${ctx.key.algo}`);
            assert.deepStrictEqual(clientKey.key.getPublicSSH(),
                                   ctx.key.data,
                                   'Public key mismatch');
            break;
        }
        if (ctx.signature) {
          const result =
            clientKey.key.verify(ctx.blob, ctx.signature, ctx.hashAlgo);
          assert(result === true, 'Could not verify publickey signature');
        }
        ctx.accept();
      }, 3)).on('ready', mustCall(() => {
        conn.end();
      }));
    }));
    client.on('handshake', mustCall((info) => {
      assert(info.serverHostKey === selKeyType, 'Wrong host key selected');
    }));
  });
}
