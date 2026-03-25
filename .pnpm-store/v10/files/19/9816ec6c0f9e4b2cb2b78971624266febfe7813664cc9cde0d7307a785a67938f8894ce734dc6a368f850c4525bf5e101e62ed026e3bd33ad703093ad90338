'use strict';

const assert = require('assert');
const { spawnSync } = require('child_process');

const debug = false;
const SPAWN_OPTS = { windowsHide: true };

// TODO: figure out why this test is failing on Windows
if (process.platform === 'win32') {
  console.log('Skipping ssh-agent test on Windows');
  process.exit(0);
}

if (process.argv[2] === 'child') {
  const {
    fixtureKey,
    mustCall,
    setup,
  } = require('./common.js');

  const serverCfg = { hostKeys: [ fixtureKey('ssh_host_rsa_key').raw ] };

  const clientKey = fixtureKey('openssh_new_rsa');

  // Add key to the agent first
  {
    const {
      error, status
    } = spawnSync('ssh-add', [ clientKey.fullPath ], SPAWN_OPTS);
    if (error || status !== 0) {
      console.error('Failed to add key to agent');
      process.exit(1);
    }
  }

  const username = 'Agent User';
  const { server } = setup(
    'Agent authentication',
    {
      client: { username, agent: process.env.SSH_AUTH_SOCK },
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
      conn.end();
    }));
  }));
} else {
  {
    const {
      error, status
    } = spawnSync('which', ['ssh-agent'], SPAWN_OPTS);

    if (error || status !== 0) {
      console.log('No ssh-agent available, skipping agent test ...');
      process.exit(0);
    }
  }

  {
    const {
      error, status
    } = spawnSync('which', ['ssh-add'], SPAWN_OPTS);

    if (error || status !== 0) {
      console.log('No ssh-add available, skipping agent test ...');
      process.exit(0);
    }
  }

  const {
    error, status
  } = spawnSync('ssh-agent',
                [ process.execPath, __filename, 'child' ],
                { ...SPAWN_OPTS, stdio: 'inherit' });
  if (error || status !== 0)
    throw new Error('Agent test failed');
}
