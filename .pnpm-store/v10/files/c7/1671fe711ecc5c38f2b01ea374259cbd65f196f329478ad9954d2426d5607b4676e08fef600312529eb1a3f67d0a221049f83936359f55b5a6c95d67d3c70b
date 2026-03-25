'use strict';

const assert = require('assert');
const { inspect } = require('util');

const {
  fixtureKey,
  mustCall,
  mustNotCall,
  setup,
} = require('./common.js');

const serverCfg = { hostKeys: [ fixtureKey('ssh_host_rsa_key').raw ] };

const debug = false;

// Keys ========================================================================
[
  { desc: 'RSA (old OpenSSH)',
    clientKey: fixtureKey('id_rsa') },
  { desc: 'RSA (new OpenSSH)',
    clientKey: fixtureKey('openssh_new_rsa') },
  { desc: 'RSA (encrypted)',
    clientKey: fixtureKey('id_rsa_enc', 'foobarbaz'),
    passphrase: 'foobarbaz' },
  { desc: 'DSA',
    clientKey: fixtureKey('id_dsa') },
  { desc: 'ECDSA',
    clientKey: fixtureKey('id_ecdsa') },
  { desc: 'PPK',
    clientKey: fixtureKey('id_rsa.ppk') },
].forEach((test) => {
  const { desc, clientKey, passphrase } = test;
  const username = 'Key User';
  const { server } = setup(
    desc,
    {
      client: { username, privateKey: clientKey.raw, passphrase },
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
});


// Password ====================================================================
{
  const username = 'Password User';
  const password = 'hi mom';
  const { server } = setup(
    'Password',
    {
      client: { username, password },
      server: serverCfg,

      debug,
    }
  );

  server.on('connection', mustCall((conn) => {
    let authAttempt = 0;
    conn.on('authentication', mustCall((ctx) => {
      assert(ctx.username === username,
             `Wrong username: ${ctx.username}`);
      if (++authAttempt === 1) {
        assert(ctx.method === 'none', `Wrong auth method: ${ctx.method}`);
        return ctx.reject();
      }
      assert(ctx.method === 'password',
             `Wrong auth method: ${ctx.method}`);
      assert(ctx.password === password,
             `Wrong password: ${ctx.password}`);
      ctx.accept();
    }, 2)).on('ready', mustCall(() => {
      conn.end();
    }));
  }));
}
{
  const username = '';
  const password = 'hi mom';
  const { server } = setup(
    'Password (empty username)',
    {
      client: { username, password },
      server: serverCfg,

      debug,
    }
  );

  server.on('connection', mustCall((conn) => {
    let authAttempt = 0;
    conn.on('authentication', mustCall((ctx) => {
      assert(ctx.username === username,
             `Wrong username: ${ctx.username}`);
      if (++authAttempt === 1) {
        assert(ctx.method === 'none', `Wrong auth method: ${ctx.method}`);
        return ctx.reject();
      }
      assert(ctx.method === 'password',
             `Wrong auth method: ${ctx.method}`);
      assert(ctx.password === password,
             `Wrong password: ${ctx.password}`);
      ctx.accept();
    }, 2)).on('ready', mustCall(() => {
      conn.end();
    }));
  }));
}
{
  const username = 'foo';
  const oldPassword = 'bar';
  const newPassword = 'baz';
  const changePrompt = 'Prithee changeth thy password';
  const { client, server } = setup(
    'Password (change requested)',
    {
      client: { username, password: oldPassword },
      server: serverCfg,

      debug,
    }
  );

  server.on('connection', mustCall((conn) => {
    let authAttempt = 0;
    conn.on('authentication', mustCall((ctx) => {
      assert(ctx.username === username,
             `Wrong username: ${ctx.username}`);
      if (++authAttempt === 1) {
        assert(ctx.method === 'none', `Wrong auth method: ${ctx.method}`);
        return ctx.reject();
      }
      assert(ctx.method === 'password',
             `Wrong auth method: ${ctx.method}`);
      assert(ctx.password === oldPassword,
             `Wrong old password: ${ctx.password}`);
      ctx.requestChange(changePrompt, mustCall((newPassword_) => {
        assert(newPassword_ === newPassword,
               `Wrong new password: ${newPassword_}`);
        ctx.accept();
      }));
    }, 2)).on('ready', mustCall(() => {
      conn.end();
    }));
  }));

  client.on('change password', mustCall((prompt, done) => {
    assert(prompt === changePrompt, `Wrong password change prompt: ${prompt}`);
    process.nextTick(done, newPassword);
  }));
}


// Hostbased ===================================================================
{
  const localUsername = 'Local User Foo';
  const localHostname = 'Local Host Bar';
  const username = 'Hostbased User';
  const clientKey = fixtureKey('id_rsa');
  const { server } = setup(
    'Hostbased',
    {
      client: {
        username,
        privateKey: clientKey.raw,
        localUsername,
        localHostname,
      },
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
        case 2:
          assert(ctx.method === 'publickey',
                 `Wrong auth method: ${ctx.method}`);
          return ctx.reject();
        case 3: {
          assert(ctx.method === 'hostbased',
                 `Wrong auth method: ${ctx.method}`);
          assert(ctx.key.algo === clientKey.key.type,
                 `Wrong key algo: ${ctx.key.algo}`);
          assert.deepStrictEqual(clientKey.key.getPublicSSH(),
                                 ctx.key.data,
                                 'Public key mismatch');
          assert(ctx.signature, 'Expected signature');
          assert(ctx.localHostname === localHostname, 'Wrong local hostname');
          assert(ctx.localUsername === localUsername, 'Wrong local username');
          const result =
            clientKey.key.verify(ctx.blob, ctx.signature, ctx.hashAlgo);
          assert(result === true, 'Could not verify hostbased signature');

          break;
        }
      }
      ctx.accept();
    }, 3)).on('ready', mustCall(() => {
      conn.end();
    }));
  }));
}


// keyboard-interactive ========================================================
{
  const username = 'Keyboard-Interactive User';
  const request = {
    name: 'SSH2 Authentication',
    instructions: 'These are instructions',
    prompts: [
      { prompt: 'Password: ', echo: false },
      { prompt: 'Is the cake a lie? ', echo: true },
    ],
  };
  const responses = [
    'foobarbaz',
    'yes',
  ];
  const { client, server } = setup(
    'Password (empty username)',
    {
      client: {
        username,
        tryKeyboard: true,
      },
      server: serverCfg,

      debug,
    }
  );

  server.on('connection', mustCall((conn) => {
    let authAttempt = 0;
    conn.on('authentication', mustCall((ctx) => {
      assert(ctx.username === username,
             `Wrong username: ${ctx.username}`);
      if (++authAttempt === 1) {
        assert(ctx.method === 'none', `Wrong auth method: ${ctx.method}`);
        return ctx.reject();
      }
      assert(ctx.method === 'keyboard-interactive',
             `Wrong auth method: ${ctx.method}`);
      ctx.prompt(request.prompts,
                 request.name,
                 request.instructions,
                 mustCall((responses_) => {
        assert.deepStrictEqual(responses_, responses);
        ctx.accept();
      }));
    }, 2)).on('ready', mustCall(() => {
      conn.end();
    }));
  }));

  client.on('keyboard-interactive',
            mustCall((name, instructions, lang, prompts, finish) => {
    assert(name === request.name, `Wrong prompt name: ${name}`);
    assert(instructions === request.instructions,
           `Wrong prompt instructions: ${instructions}`);
    assert.deepStrictEqual(
      prompts,
      request.prompts,
      `Wrong prompts: ${inspect(prompts)}`
    );
    process.nextTick(finish, responses);
  }));
}

// authHandler() tests =========================================================
{
  const username = 'foo';
  const password = '1234';
  const clientKey = fixtureKey('id_rsa');
  const { server } = setup(
    'authHandler() (sync)',
    {
      client: {
        username,
        password,
        privateKey: clientKey.raw,

        authHandler: mustCall((methodsLeft, partial, cb) => {
          assert(methodsLeft === null, 'expected null methodsLeft');
          assert(partial === null, 'expected null partial');
          return 'none';
        }),
      },
      server: serverCfg,

      debug,
    }
  );

  server.on('connection', mustCall((conn) => {
    conn.on('authentication', mustCall((ctx) => {
      assert(ctx.username === username, `Wrong username: ${ctx.username}`);
      assert(ctx.method === 'none', `Wrong auth method: ${ctx.method}`);
      ctx.accept();
    })).on('ready', mustCall(() => {
      conn.end();
    }));
  }));
}
{
  const username = 'foo';
  const password = '1234';
  const clientKey = fixtureKey('id_rsa');
  const { server } = setup(
    'authHandler() (async)',
    {
      client: {
        username,
        password,
        privateKey: clientKey.raw,

        authHandler: mustCall((methodsLeft, partial, cb) => {
          assert(methodsLeft === null, 'expected null methodsLeft');
          assert(partial === null, 'expected null partial');
          process.nextTick(mustCall(cb), 'none');
        }),
      },
      server: serverCfg,

      debug,
    }
  );

  server.on('connection', mustCall((conn) => {
    conn.on('authentication', mustCall((ctx) => {
      assert(ctx.username === username, `Wrong username: ${ctx.username}`);
      assert(ctx.method === 'none', `Wrong auth method: ${ctx.method}`);
      ctx.accept();
    })).on('ready', mustCall(() => {
      conn.end();
    }));
  }));
}
{
  const username = 'foo';
  const password = '1234';
  const clientKey = fixtureKey('id_rsa');
  const { client, server } = setup(
    'authHandler() (no methods left -- sync)',
    {
      client: {
        username,
        password,
        privateKey: clientKey.raw,

        authHandler: mustCall((methodsLeft, partial, cb) => {
          assert(methodsLeft === null, 'expected null methodsLeft');
          assert(partial === null, 'expected null partial');
          return false;
        }),
      },
      server: serverCfg,

      debug,
      noForceClientReady: true,
      noForceServerReady: true,
    }
  );

  // Remove default client error handler added by `setup()` since we are
  // expecting an error in this case
  client.removeAllListeners('error');

  client.on('error', mustCall((err) => {
    assert.strictEqual(err.level, 'client-authentication');
    assert(/configured authentication methods failed/i.test(err.message),
           'Wrong error message');
  }));

  server.on('connection', mustCall((conn) => {
    conn.on('authentication', mustNotCall())
        .on('ready', mustNotCall());
  }));
}
{
  const username = 'foo';
  const password = '1234';
  const clientKey = fixtureKey('id_rsa');
  const { client, server } = setup(
    'authHandler() (no methods left -- async)',
    {
      client: {
        username,
        password,
        privateKey: clientKey.raw,

        authHandler: mustCall((methodsLeft, partial, cb) => {
          assert(methodsLeft === null, 'expected null methodsLeft');
          assert(partial === null, 'expected null partial');
          process.nextTick(mustCall(cb), false);
        }),
      },
      server: serverCfg,

      debug,
      noForceClientReady: true,
      noForceServerReady: true,
    }
  );

  // Remove default client error handler added by `setup()` since we are
  // expecting an error in this case
  client.removeAllListeners('error');

  client.on('error', mustCall((err) => {
    assert.strictEqual(err.level, 'client-authentication');
    assert(/configured authentication methods failed/i.test(err.message),
           'Wrong error message');
  }));

  server.on('connection', mustCall((conn) => {
    conn.on('authentication', mustNotCall())
        .on('ready', mustNotCall());
  }));
}
{
  const username = 'foo';
  const password = '1234';
  const clientKey = fixtureKey('id_rsa');
  const events = [];
  const expectedEvents = [
    'client', 'server', 'client', 'server'
  ];
  let clientCalls = 0;
  const { client, server } = setup(
    'authHandler() (multi-step)',
    {
      client: {
        username,
        password,
        privateKey: clientKey.raw,

        authHandler: mustCall((methodsLeft, partial, cb) => {
          events.push('client');
          switch (++clientCalls) {
            case 1:
              assert(methodsLeft === null, 'expected null methodsLeft');
              assert(partial === null, 'expected null partial');
              return 'publickey';
            case 2:
              assert.deepStrictEqual(
                methodsLeft,
                ['password'],
                `expected 'password' method left, saw: ${methodsLeft}`
              );
              assert(partial === true, 'expected partial success');
              return 'password';
          }
        }, 2),
      },
      server: serverCfg,

      debug,
    }
  );

  server.on('connection', mustCall((conn) => {
    let attempts = 0;
    conn.on('authentication', mustCall((ctx) => {
      assert(++attempts === clientCalls, 'server<->client state mismatch');
      assert(ctx.username === username,
             `Unexpected username: ${ctx.username}`);
      events.push('server');
      switch (attempts) {
        case 1:
          assert(ctx.method === 'publickey',
                 `Wrong auth method: ${ctx.method}`);
          assert(ctx.key.algo === clientKey.key.type,
                 `Unexpected key algo: ${ctx.key.algo}`);
          assert.deepEqual(clientKey.key.getPublicSSH(),
                           ctx.key.data,
                           'Public key mismatch');
          ctx.reject(['password'], true);
          break;
        case 2:
          assert(ctx.method === 'password',
                 `Wrong auth method: ${ctx.method}`);
          assert(ctx.password === password,
                 `Unexpected password: ${ctx.password}`);
          ctx.accept();
          break;
      }
    }, 2)).on('ready', mustCall(() => {
      conn.end();
    }));
  }));

  client.on('close', mustCall(() => {
    assert.deepStrictEqual(events, expectedEvents);
  }));
}
{
  const username = 'foo';
  const password = '1234';
  const { server } = setup(
    'authHandler() (custom auth configuration)',
    {
      client: {
        username: 'bar',
        password: '5678',

        authHandler: mustCall((methodsLeft, partial, cb) => {
          assert(methodsLeft === null, 'expected null methodsLeft');
          assert(partial === null, 'expected null partial');
          return {
            type: 'password',
            username,
            password,
          };
        }),
      },
      server: serverCfg,

      debug,
    }
  );

  server.on('connection', mustCall((conn) => {
    conn.on('authentication', mustCall((ctx) => {
      assert(ctx.username === username, `Wrong username: ${ctx.username}`);
      assert(ctx.method === 'password', `Wrong auth method: ${ctx.method}`);
      assert(ctx.password === password, `Unexpected password: ${ctx.password}`);
      ctx.accept();
    })).on('ready', mustCall(() => {
      conn.end();
    }));
  }));
}
{
  const username = 'foo';
  const password = '1234';
  const { server } = setup(
    'authHandler() (simple construction with custom auth configuration)',
    {
      client: {
        username: 'bar',
        password: '5678',

        authHandler: [{
          type: 'password',
          username,
          password,
        }],
      },
      server: serverCfg,

      debug,
    }
  );

  server.on('connection', mustCall((conn) => {
    conn.on('authentication', mustCall((ctx) => {
      assert(ctx.username === username, `Wrong username: ${ctx.username}`);
      assert(ctx.method === 'password', `Wrong auth method: ${ctx.method}`);
      assert(ctx.password === password, `Unexpected password: ${ctx.password}`);
      ctx.accept();
    })).on('ready', mustCall(() => {
      conn.end();
    }));
  }));
}
