'use strict';

const assert = require('assert');

const debug = false;

const {
  fixtureKey,
  mustCall,
  setup,
} = require('./common.js');
const {
  AgentProtocol,
  BaseAgent,
  utils: { parseKey },
} = require('../lib/index.js');

const serverCfg = { hostKeys: [ fixtureKey('ssh_host_rsa_key').raw ] };

const clientKey = fixtureKey('openssh_new_rsa');

{
  let getIdentitiesCount = 0;
  let signCount = 0;
  class MyAgent extends BaseAgent {
    getIdentities(cb) {
      assert.strictEqual(++getIdentitiesCount, 1);
      // Ensure that no private portion of the key is used by re-parsing the
      // public version of the key
      cb(null, [ parseKey(clientKey.key.getPublicSSH()) ]);
    }
    sign(pubKey, data, options, cb) {
      assert.strictEqual(++signCount, 1);
      assert.strictEqual(pubKey.getPublicPEM(), clientKey.key.getPublicPEM());
      const sig = clientKey.key.sign(data, options.hash);
      cb(null, sig);
    }
  }

  const username = 'Agent User';
  const { server } = setup(
    'Custom agent authentication',
    {
      client: { username, agent: new MyAgent() },
      server: serverCfg,

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
          assert(ctx.method === 'none', `Wrong auth method: ${ctx.method}`);
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
      assert.strictEqual(getIdentitiesCount, 1);
      assert.strictEqual(signCount, 1);
      conn.end();
    }));
  }));
}
{
  const client = new AgentProtocol(true);
  const server = new AgentProtocol(false);

  server.on('identities', mustCall((req) => {
    setImmediate(() => server.failureReply(req));
  }));
  client.getIdentities(mustCall((err, keys) => {
    assert(err, 'Missing expected error');
  }));

  client.pipe(server).pipe(client);
}
{
  const client = new AgentProtocol(true);
  const server = new AgentProtocol(false);

  server.on('identities', mustCall((req) => {
    const keys = [ clientKey.key ];
    server.getIdentitiesReply(req, keys);
  }));
  client.getIdentities(mustCall((err, keys) => {
    assert(!err, 'Unexpected error');
    assert.strictEqual(keys.length, 1);
    assert.strictEqual(keys[0].isPrivateKey(), false);
    assert.strictEqual(keys[0].getPublicPEM(), clientKey.key.getPublicPEM());
  }));

  client.pipe(server).pipe(client);
}
{
  const client = new AgentProtocol(true);
  const server = new AgentProtocol(false);
  const buf = Buffer.from('data to sign');

  server.on('sign', mustCall((req, pubKey, data, options) => {
    assert.strictEqual(pubKey.getPublicPEM(), clientKey.key.getPublicPEM());
    assert.deepStrictEqual(data, buf);
    assert.strictEqual(options.hash, undefined);
    server.failureReply(req);
  }));
  client.sign(clientKey.key.getPublicSSH(),
              buf,
              mustCall((err, signature) => {
    assert(err, 'Missing expected error');
  }));

  client.pipe(server).pipe(client);
}
{
  const client = new AgentProtocol(true);
  const server = new AgentProtocol(false);
  const buf = Buffer.from('data to sign');

  server.on('sign', mustCall((req, pubKey, data, options) => {
    assert.strictEqual(pubKey.getPublicPEM(), clientKey.key.getPublicPEM());
    assert.deepStrictEqual(data, buf);
    assert.strictEqual(options.hash, undefined);
    server.signReply(req, clientKey.key.sign(data));
  }));
  client.sign(clientKey.key.getPublicSSH(),
              buf,
              mustCall((err, signature) => {
    assert(!err, 'Unexpected error');
    const pubKey = parseKey(clientKey.key.getPublicSSH());
    assert.strictEqual(pubKey.verify(buf, signature), true);
  }));

  client.pipe(server).pipe(client);
}
{
  // Test that outstanding requests are handled upon unexpected closure of the
  // protocol stream

  const client = new AgentProtocol(true);
  const server = new AgentProtocol(false);

  server.on('identities', mustCall((req) => {
    server.destroy();
  }));
  client.getIdentities(mustCall((err) => {
    assert(err, 'Missing expected error');
  }));

  client.pipe(server).pipe(client);
}
