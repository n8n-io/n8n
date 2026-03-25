'use strict';

const assert = require('assert');
const { createHash } = require('crypto');
const http = require('http');
const https = require('https');
const net = require('net');
const { Transform } = require('stream');
const { inspect } = require('util');

const Client = require('../lib/client.js');
const {
  SSHTTPAgent: HTTPAgent,
  SSHTTPSAgent: HTTPSAgent,
} = require('../lib/http-agents.js');
const Server = require('../lib/server.js');
const { KexInit } = require('../lib/protocol/kex.js');

const {
  fixture,
  mustCall,
  mustCallAtLeast,
  mustNotCall,
  setup: setup_,
  setupSimple,
} = require('./common.js');

const KEY_RSA_BAD = fixture('bad_rsa_private_key');
const HOST_RSA_MD5 = '64254520742d3d0792e918f3ce945a64';
const clientCfg = { username: 'foo', password: 'bar' };
const serverCfg = { hostKeys: [ fixture('ssh_host_rsa_key') ] };

const debug = false;

const setup = setupSimple.bind(undefined, debug);


{
  const { server } = setup_(
    'Verify host fingerprint (sync success, hostHash set)',
    {
      client: {
        ...clientCfg,
        hostHash: 'md5',
        hostVerifier: mustCall((hash) => {
          assert(hash === HOST_RSA_MD5, 'Host fingerprint mismatch');
          return true;
        }),
      },
      server: serverCfg,
    },
  );

  server.on('connection', mustCall((conn) => {
    conn.on('authentication', mustCall((ctx) => {
      ctx.accept();
    })).on('ready', mustCall(() => {
      conn.end();
    }));
  }));
}

{
  const { server } = setup_(
    'Verify host fingerprint (sync success, hostHash not set)',
    {
      client: {
        ...clientCfg,
        hostVerifier: mustCall((key) => {
          assert(Buffer.isBuffer(key), 'Expected buffer');
          let hash = createHash('md5');
          hash.update(key);
          hash = hash.digest('hex');
          assert(hash === HOST_RSA_MD5, 'Host fingerprint mismatch');
          return true;
        }),
      },
      server: serverCfg,
    }
  );

  server.on('connection', mustCall((conn) => {
    conn.on('authentication', mustCall((ctx) => {
      ctx.accept();
    })).on('ready', mustCall(() => {
      conn.end();
    }));
  }));
}

{
  const { server } = setup_(
    'Verify host fingerprint (async success)',
    {
      client: {
        ...clientCfg,
        hostVerifier: mustCall((key, cb) => {
          assert(Buffer.isBuffer(key), 'Expected buffer');
          let hash = createHash('md5');
          hash.update(key);
          hash = hash.digest('hex');
          assert(hash === HOST_RSA_MD5, 'Host fingerprint mismatch');
          process.nextTick(cb, true);
        }),
      },
      server: serverCfg,
    }
  );

  server.on('connection', mustCall((conn) => {
    conn.on('authentication', mustCall((ctx) => {
      ctx.accept();
    })).on('ready', mustCall(() => {
      conn.end();
    }));
  }));
}

{
  const { client, server } = setup_(
    'Verify host fingerprint (sync failure)',
    {
      client: {
        ...clientCfg,
        hostVerifier: mustCall((key) => {
          return false;
        }),
      },
      server: serverCfg,

      noForceClientReady: true,
      noForceServerReady: true,
    },
  );

  client.removeAllListeners('error');
  client.on('ready', mustNotCall())
        .on('error', mustCall((err) => {
    assert(/verification failed/.test(err.message),
           'Wrong client error message');
  }));

  server.on('connection', mustCall((conn) => {
    conn.removeAllListeners('error');

    conn.on('authentication', mustNotCall())
        .on('ready', mustNotCall())
        .on('error', mustCall((err) => {
      assert(/KEY_EXCHANGE_FAILED/.test(err.message),
             'Wrong server error message');
    }));
  }));
}

{
  // connect() on connected client

  const clientCfg_ = { ...clientCfg };
  const client = new Client();
  const server = new Server(serverCfg);

  server.listen(0, 'localhost', mustCall(() => {
    clientCfg_.host = 'localhost';
    clientCfg_.port = server.address().port;
    client.connect(clientCfg_);
  }));

  let connections = 0;
  server.on('connection', mustCall((conn) => {
    if (++connections === 2)
      server.close();
    conn.on('authentication', mustCall((ctx) => {
      ctx.accept();
    })).on('ready', mustCall(() => {}));
  }, 2)).on('close', mustCall(() => {}));

  let reconnect = false;
  client.on('ready', mustCall(() => {
    if (reconnect) {
      client.end();
    } else {
      reconnect = true;
      client.connect(clientCfg_);
    }
  }, 2)).on('close', mustCall(() => {}, 2));
}

{
  // Throw when not connected

  const client = new Client({
    username: 'foo',
    password: 'bar',
  });

  assert.throws(mustCall(() => {
    client.exec('uptime', mustNotCall());
  }));
}

{
  const { client, server } = setup(
    'Outstanding callbacks called on disconnect'
  );

  server.on('connection', mustCall((conn) => {
    conn.on('session', mustCall(() => {}, 3));
  }));

  client.on('ready', mustCall(() => {
    function callback(err, stream) {
      assert(err, 'Expected error');
      assert(err.message === 'No response from server',
             `Wrong error message: ${err.message}`);
    }
    client.exec('uptime', mustCall(callback));
    client.shell(mustCall(callback));
    client.sftp(mustCall(callback));
    client.end();
  }));
}

{
  const { client, server } = setup('Pipelined requests');

  server.on('connection', mustCall((conn) => {
    conn.on('ready', mustCall(() => {
      conn.on('session', mustCall((accept, reject) => {
        const session = accept();
        session.on('exec', mustCall((accept, reject, info) => {
          const stream = accept();
          stream.exit(0);
          stream.end();
        }));
      }, 3));
    }));
  }));

  client.on('ready', mustCall(() => {
    let calledBack = 0;
    function callback(err, stream) {
      assert(!err, `Unexpected error: ${err}`);
      stream.resume();
      if (++calledBack === 3)
        client.end();
    }
    client.exec('foo', mustCall(callback));
    client.exec('bar', mustCall(callback));
    client.exec('baz', mustCall(callback));
  }));
}

{
  const { client, server } = setup(
    'Pipelined requests with intermediate rekeying'
  );

  server.on('connection', mustCall((conn) => {
    conn.on('ready', mustCall(() => {
      const reqs = [];
      conn.on('session', mustCall((accept, reject) => {
        if (reqs.length === 0) {
          conn.rekey(mustCall((err) => {
            assert(!err, `Unexpected rekey error: ${err}`);
            reqs.forEach((accept) => {
              const session = accept();
              session.on('exec', mustCall((accept, reject, info) => {
                const stream = accept();
                stream.exit(0);
                stream.end();
              }));
            });
          }));
        }
        reqs.push(accept);
      }, 3));
    }));
  }));

  client.on('ready', mustCall(() => {
    let calledBack = 0;
    function callback(err, stream) {
      assert(!err, `Unexpected error: ${err}`);
      stream.resume();
      if (++calledBack === 3)
        client.end();
    }
    client.exec('foo', mustCall(callback));
    client.exec('bar', mustCall(callback));
    client.exec('baz', mustCall(callback));
  }));
}

{
  const { client, server } = setup('Ignore outgoing after stream close');

  server.on('connection', mustCall((conn) => {
    conn.on('ready', mustCall(() => {
      conn.on('session', mustCall((accept, reject) => {
        const session = accept();
        session.on('exec', mustCall((accept, reject, info) => {
          const stream = accept();
          stream.exit(0);
          stream.end();
        }));
      }));
    }));
  }));

  client.on('ready', mustCall(() => {
    client.exec('foo', mustCall((err, stream) => {
      assert(!err, `Unexpected error: ${err}`);
      stream.on('exit', mustCall((code, signal) => {
        client.end();
      }));
    }));
  }));
}

{
  const { client, server } = setup_(
    'Double pipe on unconnected, passed in net.Socket',
    {
      client: {
        ...clientCfg,
        sock: new net.Socket(),
      },
      server: serverCfg,
    },
  );

  server.on('connection', mustCall((conn) => {
    conn.on('authentication', mustCall((ctx) => {
      ctx.accept();
    })).on('ready', mustCall(() => {}));
  }));
  client.on('ready', mustCall(() => {
    client.end();
  }));
}

{
  const { client, server } = setup(
    'Client auto-rejects inbound connections to unknown bound address'
  );

  const assignedPort = 31337;

  server.on('connection', mustCall((conn) => {
    conn.on('ready', mustCall(() => {
      conn.on('request', mustCall((accept, reject, name, info) => {
        assert(name === 'tcpip-forward', 'Wrong request name');
        assert.deepStrictEqual(
          info,
          { bindAddr: 'good', bindPort: 0 },
          'Wrong request info'
        );
        accept(assignedPort);
        conn.forwardOut(info.bindAddr,
                        assignedPort,
                        'remote',
                        12345,
                        mustCall((err, ch) => {
          assert(!err, `Unexpected error: ${err}`);
          conn.forwardOut('bad',
                          assignedPort,
                          'remote',
                          12345,
                          mustCall((err, ch) => {
            assert(err, 'Should receive error');
            client.end();
          }));
        }));
      }));
    }));
  }));

  client.on('ready', mustCall(() => {
    // request forwarding
    client.forwardIn('good', 0, mustCall((err, port) => {
      assert(!err, `Unexpected error: ${err}`);
      assert(port === assignedPort, 'Wrong assigned port');
    }));
  })).on('tcp connection', mustCall((details, accept, reject) => {
    assert.deepStrictEqual(
      details,
      { destIP: 'good',
        destPort: assignedPort,
        srcIP: 'remote',
        srcPort: 12345
      },
      'Wrong connection details'
    );
    accept();
  }));
}

{
  const { client, server } = setup(
    'Client auto-rejects inbound connections to unknown bound port'
  );

  const assignedPort = 31337;

  server.on('connection', mustCall((conn) => {
    conn.on('ready', mustCall(() => {
      conn.on('request', mustCall((accept, reject, name, info) => {
        assert(name === 'tcpip-forward', 'Wrong request name');
        assert.deepStrictEqual(
          info,
          { bindAddr: 'good', bindPort: 0 },
          'Wrong request info'
        );
        accept(assignedPort);
        conn.forwardOut(info.bindAddr,
                        assignedPort,
                        'remote',
                        12345,
                        mustCall((err, ch) => {
          assert(!err, `Unexpected error: ${err}`);
          conn.forwardOut(info.bindAddr,
                          99999,
                          'remote',
                          12345,
                          mustCall((err, ch) => {
            assert(err, 'Should receive error');
            client.end();
          }));
        }));
      }));
    }));
  }));

  client.on('ready', mustCall(() => {
    // request forwarding
    client.forwardIn('good', 0, mustCall((err, port) => {
      assert(!err, `Unexpected error: ${err}`);
      assert(port === assignedPort, 'Wrong assigned port');
    }));
  })).on('tcp connection', mustCall((details, accept, reject) => {
    assert.deepStrictEqual(
      details,
      { destIP: 'good',
        destPort: assignedPort,
        srcIP: 'remote',
        srcPort: 12345
      },
      'Wrong connection details'
    );
    accept();
  }));
}

{
  const GREETING = 'Hello world!';

  const { client, server } = setup_(
    'Server greeting',
    {
      client: {
        ...clientCfg,
        ident: 'node.js rules',
      },
      server: {
        ...serverCfg,
        greeting: GREETING,
      }
    },
  );

  let sawGreeting = false;

  server.on('connection', mustCall((conn, info) => {
    assert.deepStrictEqual(info.header, {
      identRaw: 'SSH-2.0-node.js rules',
      greeting: '',
      versions: {
        protocol: '2.0',
        software: 'node.js'
      },
      comments: 'rules'
    });
    conn.on('handshake', mustCall((details) => {
      assert(sawGreeting, 'Client did not see greeting before handshake');
    })).on('authentication', mustCall((ctx) => {
      ctx.accept();
    })).on('ready', mustCall(() => {
      conn.end();
    }));
  }));

  client.on('greeting', mustCall((greeting) => {
    assert.strictEqual(greeting, `${GREETING}\r\n`);
    sawGreeting = true;
  })).on('banner', mustNotCall());
}

{
  const { client, server } = setup_(
    'Correct ident parsing',
    {
      client: {
        ...clientCfg,
        ident: 'node.js rules\n',
      },
      server: serverCfg,

      noServerError: true,
      noClientError: true,
      noForceServerReady: true,
      noForceClientReady: true,
    },
  );

  server.on('connection', mustCall((conn, info) => {
    assert.deepStrictEqual(info.header, {
      identRaw: 'SSH-2.0-node.js rules',
      greeting: '',
      versions: {
        protocol: '2.0',
        software: 'node.js'
      },
      comments: 'rules'
    });
    conn.once('error', mustCall((err) => {
      assert(/bad packet length/i.test(err.message), 'Wrong error message');
    }));
    conn.on('handshake', mustNotCall())
        .on('authentication', mustNotCall())
        .on('ready', mustNotCall());
  }));

  client.on('greeting', mustNotCall())
        .on('banner', mustNotCall())
        .on('ready', mustNotCall());
}

{
  const BANNER = 'Hello world!';

  let authCb;
  const { client, server } = setup_(
    'Server banner',
    {
      client: {
        ...clientCfg,
        // This test uses a custom auth handler to avoid a race condition where
        // we don't get the complete banner packet before the default auth
        // handler immediately sends the initial auth method
        authHandler: (authsLeft, partialSuccess, cb) => {
          authCb = cb;
        },
      },
      server: {
        ...serverCfg,
        banner: BANNER,
      }
    },
  );

  let sawBanner = false;

  server.on('connection', mustCall((conn) => {
    conn.on('handshake', mustCall((details) => {
      assert(!sawBanner, 'Client saw banner too early');
    })).on('authentication', mustCall((ctx) => {
      assert(sawBanner, 'Client did not see banner before auth');
      ctx.accept();
    })).on('ready', mustCall(() => {
      conn.end();
    }));
  }));

  client.on('greeting', mustNotCall())
        .on('banner', mustCall((message) => {
    assert.strictEqual(message, 'Hello world!\r\n');
    sawBanner = true;
    authCb('password');
  }));
}

{
  const { client, server } = setup(
    'Server responds to global requests in the right order'
  );

  function sendAcceptLater(accept) {
    if (fastRejectSent)
      accept();
    else
      setImmediate(sendAcceptLater, accept);
  }

  let fastRejectSent = false;

  server.on('connection', mustCall((conn) => {
    conn.on('ready', mustCall(() => {
      conn.on('request', mustCall((accept, reject, name, info) => {
        if (info.bindAddr === 'fastReject') {
          // Will call reject on 'fastReject' soon ...
          reject();
          fastRejectSent = true;
        } else {
          // ... but accept on 'slowAccept' later
          sendAcceptLater(accept);
        }
      }, 2));
    }));
  }));

  client.on('ready', mustCall(() => {
    let replyCnt = 0;

    client.forwardIn('slowAccept', 0, mustCall((err) => {
      assert(!err, `Unexpected error: ${err}`);
      if (++replyCnt === 2)
        client.end();
    }));

    client.forwardIn('fastReject', 0, mustCall((err) => {
      assert(err, 'Expected error');
      if (++replyCnt === 2)
        client.end();
    }));
  }));
}

{
  const { client, server } = setup(
    'Cleanup outstanding channel requests on channel close'
  );

  server.on('connection', mustCall((conn) => {
    conn.on('ready', mustCall(() => {
      conn.on('session', mustCall((accept, reject) => {
        const session = accept();
        session.on('subsystem', mustCall((accept, reject, info) => {
          assert(info.name === 'netconf', `Wrong subsystem name: ${info.name}`);

          // XXX: hack to prevent success reply from being sent
          conn._protocol.channelSuccess = () => {};

          accept().close();
        }));
      }));
    }));
  }));

  client.on('ready', mustCall(() => {
    client.subsys('netconf', mustCall((err, stream) => {
      assert(err, 'Expected error');
      client.end();
    }));
  }));
}

{
  const { client, server } = setup_(
    'Handshake errors are emitted',
    {
      client: {
        ...clientCfg,
        algorithms: { cipher: [ 'aes128-cbc' ] },
      },
      server: {
        ...serverCfg,
        algorithms: { cipher: [ 'aes128-ctr' ] },
      },

      noForceClientReady: true,
      noForceServerReady: true,
    },
  );

  client.removeAllListeners('error');

  function onError(err) {
    assert.strictEqual(err.level, 'handshake');
    assert(/handshake failed/i.test(err.message), 'Wrong error message');
  }

  server.on('connection', mustCall((conn) => {
    conn.removeAllListeners('error');

    conn.on('authentication', mustNotCall())
        .on('ready', mustNotCall())
        .on('handshake', mustNotCall())
        .on('error', mustCall(onError))
        .on('close', mustCall(() => {}));
  }));

  client.on('ready', mustNotCall())
        .on('error', mustCall(onError))
        .on('close', mustCall(() => {}));
}

{
  const { client, server } = setup_(
    'Client signing errors are caught and emitted',
    {
      client: {
        username: 'foo',
        privateKey: KEY_RSA_BAD,
      },
      server: serverCfg,

      noForceClientReady: true,
      noForceServerReady: true,
    },
  );

  client.removeAllListeners('error');

  server.on('connection', mustCall((conn) => {
    let authAttempt = 0;
    conn.on('authentication', mustCall((ctx) => {
      assert(!ctx.signature, 'Unexpected signature');
      switch (++authAttempt) {
        case 1:
          assert(ctx.method === 'none', `Wrong auth method: ${ctx.method}`);
          return ctx.reject();
        case 2:
          assert(ctx.method === 'publickey',
                 `Wrong auth method: ${ctx.method}`);
          ctx.accept();
          break;
      }
    }, 2)).on('ready', mustNotCall()).on('close', mustCall(() => {}));
  }));

  let cliError;
  client.on('ready', mustNotCall()).on('error', mustCall((err) => {
    if (cliError) {
      assert(/all configured/i.test(err.message), 'Wrong error message');
    } else {
      cliError = err;
      assert(/signing/i.test(err.message), 'Wrong error message');
    }
  }, 2)).on('close', mustCall(() => {}));
}

{
  const { client, server } = setup_(
    'Server signing errors are caught and emitted',
    {
      client: clientCfg,
      server: { hostKeys: [KEY_RSA_BAD] },

      noForceClientReady: true,
      noForceServerReady: true,
    },
  );

  client.removeAllListeners('error');

  server.on('connection', mustCall((conn) => {
    conn.removeAllListeners('error');

    conn.on('error', mustCall((err) => {
      assert(/signature generation failed/i.test(err.message),
             'Wrong error message');
    })).on('authentication', mustNotCall())
       .on('ready', mustNotCall())
       .on('close', mustCall(() => {}));
  }));

  client.on('ready', mustNotCall()).on('error', mustCall((err) => {
    assert(/KEY_EXCHANGE_FAILED/.test(err.message), 'Wrong error message');
  })).on('close', mustCall(() => {}));
}

{
  const { client, server } = setup_(
    'Rekeying with AES-GCM',
    {
      client: {
        ...clientCfg,
        algorithms: { cipher: [ 'aes128-gcm@openssh.com' ] },
      },
      server: {
        ...serverCfg,
        algorithms: { cipher: [ 'aes128-gcm@openssh.com' ] },
      },
    },
  );

  server.on('connection', mustCall((conn) => {
    conn.on('authentication', mustCall((ctx) => {
      ctx.accept();
    })).on('ready', mustCall(() => {
      const reqs = [];
      conn.on('session', mustCall((accept, reject) => {
        if (reqs.length === 0) {
          conn.rekey(mustCall((err) => {
            assert(!err, `Unexpected rekey error: ${err}`);
            reqs.forEach((accept) => {
              const session = accept();
              session.on('exec', mustCall((accept, reject, info) => {
                const stream = accept();
                stream.exit(0);
                stream.end();
              }));
            });
          }));
        }
        reqs.push(accept);
      }, 3));
    }));
  }));

  client.on('ready', mustCall(() => {
    let calledBack = 0;
    function callback(err, stream) {
      assert(!err, `Unexpected error: ${err}`);
      stream.resume();
      if (++calledBack === 3)
        client.end();
    }
    client.exec('foo', mustCall(callback));
    client.exec('bar', mustCall(callback));
    client.exec('baz', mustCall(callback));
  }));
}

{
  const { client, server } = setup_(
    'Switch from no compression to compression',
    {
      client: {
        ...clientCfg,
        algorithms: { compress: [ 'none' ] },
      },
      server: {
        ...serverCfg,
        algorithms: { compress: [ 'none', 'zlib@openssh.com' ] },
      },
    },
  );

  server.on('connection', mustCall((conn) => {
    conn.on('authentication', mustCall((ctx) => {
      ctx.accept();
    })).on('ready', mustCall(() => {
      const reqs = [];
      conn.on('session', mustCall((accept, reject) => {
        if (reqs.length === 0) {
          // XXX: hack to change algorithms after initial handshake
          client._protocol._offer = new KexInit({
            kex: [ 'ecdh-sha2-nistp256' ],
            serverHostKey: [ 'rsa-sha2-256' ],
            cs: {
              cipher: [ 'aes128-gcm@openssh.com' ],
              mac: [],
              compress: [ 'zlib@openssh.com' ],
              lang: [],
            },
            sc: {
              cipher: [ 'aes128-gcm@openssh.com' ],
              mac: [],
              compress: [ 'zlib@openssh.com' ],
              lang: [],
            },
          });

          conn.rekey(mustCall((err) => {
            assert(!err, `Unexpected rekey error: ${err}`);
            reqs.forEach((accept) => {
              const session = accept();
              session.on('exec', mustCall((accept, reject, info) => {
                const stream = accept();
                stream.exit(0);
                stream.end();
              }));
            });
          }));
        }
        reqs.push(accept);
      }, 3));
    }));
  }));

  let handshakes = 0;
  client.on('handshake', mustCall((info) => {
    switch (++handshakes) {
      case 1:
        assert(info.cs.compress === 'none', 'wrong compress value');
        assert(info.sc.compress === 'none', 'wrong compress value');
        break;
      case 2:
        assert(info.cs.compress === 'zlib@openssh.com',
               'wrong compress value');
        assert(info.sc.compress === 'zlib@openssh.com',
               'wrong compress value');
        break;
    }
  }, 2)).on('ready', mustCall(() => {
    let calledBack = 0;
    function callback(err, stream) {
      assert(!err, `Unexpected error: ${err}`);
      stream.resume();
      if (++calledBack === 3)
        client.end();
    }
    client.exec('foo', mustCall(callback));
    client.exec('bar', mustCall(callback));
    client.exec('baz', mustCall(callback));
  }));
}

{
  const { client, server } = setup_(
    'Switch from compression to no compression',
    {
      client: {
        ...clientCfg,
        algorithms: { compress: [ 'zlib' ] },
      },
      server: {
        ...serverCfg,
        algorithms: { compress: [ 'zlib', 'none' ] },
      }
    },
  );

  server.on('connection', mustCall((conn) => {
    conn.on('authentication', mustCall((ctx) => {
      ctx.accept();
    })).on('ready', mustCall(() => {
      const reqs = [];
      conn.on('session', mustCall((accept, reject) => {
        if (reqs.length === 0) {
          // XXX: hack to change algorithms after initial handshake
          client._protocol._offer = new KexInit({
            kex: [ 'ecdh-sha2-nistp256' ],
            serverHostKey: [ 'rsa-sha2-256' ],
            cs: {
              cipher: [ 'aes128-gcm@openssh.com' ],
              mac: [],
              compress: [ 'none' ],
              lang: [],
            },
            sc: {
              cipher: [ 'aes128-gcm@openssh.com' ],
              mac: [],
              compress: [ 'none' ],
              lang: [],
            },
          });

          conn.rekey(mustCall((err) => {
            assert(!err, `Unexpected rekey error: ${err}`);
            reqs.forEach((accept) => {
              const session = accept();
              session.on('exec', mustCall((accept, reject, info) => {
                const stream = accept();
                stream.exit(0);
                stream.end();
              }));
            });
          }));
        }
        reqs.push(accept);
      }, 3));
    }));
  }));

  let handshakes = 0;
  client.on('handshake', mustCall((info) => {
    switch (++handshakes) {
      case 1:
        assert(info.cs.compress === 'zlib', 'wrong compress value');
        assert(info.sc.compress === 'zlib', 'wrong compress value');
        break;
      case 2:
        assert(info.cs.compress === 'none', 'wrong compress value');
        assert(info.sc.compress === 'none', 'wrong compress value');
        break;
    }
  }, 2)).on('ready', mustCall(() => {
    let calledBack = 0;
    function callback(err, stream) {
      assert(!err, `Unexpected error: ${err}`);
      stream.resume();
      if (++calledBack === 3)
        client.end();
    }
    client.exec('foo', mustCall(callback));
    client.exec('bar', mustCall(callback));
    client.exec('baz', mustCall(callback));
  }));
}

{
  const { client, server } = setup_(
    'Large data compression',
    {
      client: {
        ...clientCfg,
        algorithms: { compress: [ 'zlib' ] },
      },
      server: {
        ...serverCfg,
        algorithms: { compress: [ 'zlib' ] },
      }
    },
  );

  const chunk = Buffer.alloc(1024 * 1024, 'a');
  const chunkCount = 10;

  server.on('connection', mustCall((conn) => {
    conn.on('authentication', mustCall((ctx) => {
      ctx.accept();
    })).on('ready', mustCall(() => {
      conn.on('session', mustCall((accept, reject) => {
        accept().on('exec', mustCall((accept, reject, info) => {
          const stream = accept();
          for (let i = 0; i < chunkCount; ++i)
            stream.write(chunk);
          stream.exit(0);
          stream.end();
        }));
      }));
    }));
  }));

  client.on('ready', mustCall(() => {
    client.exec('foo', mustCall((err, stream) => {
      assert(!err, `Unexpected exec error: ${err}`);
      let nb = 0;
      stream.on('data', mustCallAtLeast((data) => {
        nb += data.length;
      })).on('end', mustCall(() => {
        assert(nb === (chunkCount * chunk.length),
               `Wrong stream byte count: ${nb}`);
        client.end();
      }));
    }));
  }));
}

{
  const { client, server } = setup_(
    'Debug output',
    {
      client: {
        ...clientCfg,
        debug: mustCallAtLeast((msg) => {
          assert(typeof msg === 'string',
                 `Wrong debug argument type: ${typeof msg}`);
          assert(msg.length > 0, 'Unexpected empty debug message');
        }),
      },
      server: {
        ...serverCfg,
        debug: mustCallAtLeast((msg) => {
          assert(typeof msg === 'string',
                 `Wrong debug argument type: ${typeof msg}`);
          assert(msg.length > 0, 'Unexpected empty debug message');
        }),
      },
    },
  );

  server.on('connection', mustCall((conn) => {
    conn.on('authentication', mustCall((ctx) => {
      ctx.accept();
    })).on('ready', mustCall(() => {
      conn.on('session', mustCall((accept, reject) => {
        accept().on('exec', mustCall((accept, reject, info) => {
          assert(info.command === 'foo --bar',
                 `Wrong exec command: ${info.command}`);
          const stream = accept();
          stream.exit(100);
          stream.end();
          conn.end();
        }));
      }));
    }));
  }));

  client.on('ready', mustCall(() => {
    client.exec('foo --bar', mustCall((err, stream) => {
      assert(!err, `Unexpected exec error: ${err}`);
      stream.resume();
    }));
  }));
}

{
  const { server } = setup_(
    'HTTP agent',
    {
      // No automatic client, the agent will create one

      server: serverCfg,

      debug,
    },
  );

  let httpServer;
  server.on('listening', () => {
    httpServer = http.createServer((req, res) => {
      httpServer.close();
      res.end('hello world!');
    });
    httpServer.listen(0, 'localhost', () => {
      const agent = new HTTPAgent({
        host: 'localhost',
        port: server.address().port,
        username: 'foo',
        password: 'bar',
      });
      http.get({
        host: 'localhost',
        port: httpServer.address().port,
        agent,
        headers: { Connection: 'close' },
      }, (res) => {
        assert(res.statusCode === 200,
               `Wrong http status code: ${res.statusCode}`);
        let buf = '';
        res.on('data', mustCallAtLeast((chunk) => {
          buf += chunk;
        })).on('end', mustCall(() => {
          assert(buf === 'hello world!',
                 `Wrong http response body: ${inspect(buf)}`);
        }));
      });
    });
  });

  server.on('connection', mustCall((conn) => {
    conn.on('authentication', mustCall((ctx) => {
      ctx.accept();
    })).on('ready', mustCall(() => {
      conn.on('tcpip', mustCall((accept, reject, info) => {
        assert(info.destIP === 'localhost', `Wrong destIP: ${info.destIP}`);
        assert(info.destPort === httpServer.address().port,
               `Wrong destPort: ${info.destPort}`);
        assert(info.srcIP === 'localhost', `Wrong srcIP: ${info.srcIP}`);

        const stream = accept();
        const tcp = new net.Socket();
        tcp.pipe(stream).pipe(tcp);
        tcp.connect(httpServer.address().port, 'localhost');
      }));
    }));
  }));
}

{
  const { server } = setup_(
    'HTTPS agent',
    {
      // No automatic client, the agent will create one

      server: serverCfg,

      debug,
    },
  );

  let httpsServer;
  server.on('listening', () => {
    httpsServer = https.createServer({
      key: fixture('https_key.pem'),
      cert: fixture('https_cert.pem'),
    }, (req, res) => {
      httpsServer.close();
      res.end('hello world!');
    });
    httpsServer.listen(0, 'localhost', () => {
      const agent = new HTTPSAgent({
        host: 'localhost',
        port: server.address().port,
        username: 'foo',
        password: 'bar',
      });
      https.get({
        host: 'localhost',
        port: httpsServer.address().port,
        agent,
        headers: { Connection: 'close' },
        ca: fixture('https_cert.pem'),
      }, (res) => {
        assert(res.statusCode === 200,
               `Wrong http status code: ${res.statusCode}`);
        let buf = '';
        res.on('data', mustCallAtLeast((chunk) => {
          buf += chunk;
        })).on('end', mustCall(() => {
          assert(buf === 'hello world!',
                 `Wrong http response body: ${inspect(buf)}`);
        }));
      }).on('error', (err) => {
        // This workaround is necessary for some reason on node < v14.x
        if (!/write after end/i.test(err.message))
          throw err;
      });
    });
  });

  server.on('connection', mustCall((conn) => {
    conn.on('authentication', mustCall((ctx) => {
      ctx.accept();
    })).on('ready', mustCall(() => {
      conn.on('tcpip', mustCall((accept, reject, info) => {
        assert(info.destIP === 'localhost', `Wrong destIP: ${info.destIP}`);
        assert(info.destPort === httpsServer.address().port,
               `Wrong destPort: ${info.destPort}`);
        assert(info.srcIP === 'localhost', `Wrong srcIP: ${info.srcIP}`);

        const stream = accept();
        const tcp = new net.Socket();
        tcp.pipe(stream).pipe(tcp);
        tcp.connect(httpsServer.address().port, 'localhost');
      }));
    }));
  }));
}

[
  { desc: 'remove/append/prepend (regexps)',
    config: {
      remove: /.*/,
      append: /gcm/,
      prepend: /ctr/,
    },
    expected: [
      'aes128-ctr',
      'aes192-ctr',
      'aes256-ctr',
      'aes128-gcm@openssh.com',
      'aes256-gcm@openssh.com',
      'aes128-gcm',
      'aes256-gcm',
    ],
  },
  { desc: 'remove/append/prepend (strings)',
    config: {
      remove: /.*/,
      append: 'aes256-ctr',
      prepend: [ 'aes256-gcm@openssh.com', 'aes128-gcm@openssh.com' ],
    },
    expected: [
      'aes256-gcm@openssh.com',
      'aes128-gcm@openssh.com',
      'aes256-ctr',
    ],
  },
].forEach((info) => {
  const { client, server } = setup_(
    `Client algorithms option (${info.desc})`,
    {
      client: {
        ...clientCfg,
        algorithms: { cipher: info.config },
      },
      server: serverCfg,

      debug,
    },
  );

  server.on('connection', mustCall((conn) => {
    conn.on('authentication', mustCall((ctx) => {
      ctx.accept();
    })).on('ready', mustCall(() => {
      conn.end();
    }));
  }));
  client.on('ready', mustCall(() => {
    // XXX: hack to easily verify computed offer
    const offer = client._protocol._offer.lists;
    assert.deepStrictEqual(
      offer.cs.cipher.array,
      info.expected,
      `Wrong algorithm list: ${offer.cs.cipher.array}`
    );
  }));
});

{
  const { client } = setup_(
    `Safely end() from Client 'error' event handler`,
    {
      client: clientCfg,
      noClientError: true,
      noForceClientReady: true,
    },
  );

  const badServer = net.createServer((s) => {});
  badServer.listen(0, 'localhost', mustCall(() => {
    badServer.unref();

    client.on('error', mustCallAtLeast((err) => {
      client.end();
    })).on('ready', mustNotCall()).on('close', mustCall(() => {}));
    client.connect({
      host: 'localhost',
      port: badServer.address().port,
      user: 'foo',
      password: 'bar',
      readyTimeout: 1,
    });
  }));
}

{
  const { client } = setup_(
    'Client error should be emitted on bad/nonexistent greeting',
    {
      client: clientCfg,
      noClientError: true,
      noForceClientReady: true,
    },
  );

  const badServer = net.createServer(mustCall((s) => {
    badServer.close();
    s.end();
  })).listen(0, 'localhost', mustCall(() => {
    client.on('error', mustCall((err) => {
      client.end();
    })).on('ready', mustNotCall()).on('close', mustCall(() => {}));
    client.connect({
      host: 'localhost',
      port: badServer.address().port,
      user: 'foo',
      password: 'bar',
    });
  }));
}

{
  const { client } = setup_(
    'Only one client error on connection failure',
    {
      client: clientCfg,
      noClientError: true,
      noForceClientReady: true,
    },
  );

  client.on('error', mustCall((err) => {
    assert.strictEqual(err.syscall, 'getaddrinfo');
  }));
  client.connect({
    host: 'blerbblubblubblerb',
    port: 9999,
    user: 'foo',
    password: 'bar'
  });
}

{
  const { client, server } = setup(
    'Client should remove reserved channels on incoming channel rejection'
  );

  const assignedPort = 31337;

  server.on('connection', mustCall((conn) => {
    conn.on('ready', mustCall(() => {
      conn.on('request', mustCall((accept, reject, name, info) => {
        assert(name === 'tcpip-forward', 'Wrong request name');
        assert.deepStrictEqual(
          info,
          { bindAddr: 'good', bindPort: 0 },
          'Wrong request info'
        );
        accept(assignedPort);
        conn.forwardOut(info.bindAddr,
                        assignedPort,
                        'remote',
                        12345,
                        mustCall((err, ch) => {
          assert(err, 'Should receive error');
          client.end();
        }));
      }));
    }));
  }));

  client.on('ready', mustCall(() => {
    // request forwarding
    client.forwardIn('good', 0, mustCall((err, port) => {
      assert(!err, `Unexpected error: ${err}`);
      assert(port === assignedPort, 'Wrong assigned port');
    }));
  })).on('tcp connection', mustCall((details, accept, reject) => {
    assert.deepStrictEqual(
      details,
      { destIP: 'good',
        destPort: assignedPort,
        srcIP: 'remote',
        srcPort: 12345
      },
      'Wrong connection details'
    );
    assert.strictEqual(Object.keys(client._chanMgr._channels).length, 1);
    assert.strictEqual(client._chanMgr._count, 1);
    reject();
    assert.strictEqual(Object.keys(client._chanMgr._channels).length, 0);
    assert.strictEqual(client._chanMgr._count, 0);
  }));
}

{
  // Allow injected sockets

  const socket = new Transform({
    emitClose: true,
    autoDestroy: true,
    transform: (chunk, encoding, cb) => {
      cb();
    },
  });
  socket.remoteAddress = '127.0.0.1';
  socket.remotePort = '12345';
  socket.remoteFamily = 'IPv4';
  socket.push(Buffer.from('SSH-2.0-foo\r\n'));

  const server = new Server(serverCfg);
  server.on('connection', mustCall((conn, info) => {
    assert.strictEqual(info.header.versions.software, 'foo');
    assert.strictEqual(info.ip, '127.0.0.1');
    assert.strictEqual(info.port, '12345');
    assert.strictEqual(info.family, 'IPv4');
    conn.on('ready', mustNotCall());
    conn.on('close', mustCall());
    socket.end();
  }));
  server.injectSocket(socket);
}

{
  const { client, server } = setup(
    'Server should not error when cleaning up client bare session channels'
  );

  server.on('connection', mustCall((conn) => {
    conn.on('session', mustCall((accept, reject) => {
      accept().on('exec', mustCall((accept, reject, info) => {
        assert(info.command === 'uptime',
               `Wrong exec command: ${info.command}`);
        client.end();
      }));
    }));
  }));

  client.on('ready', mustCall(() => {
    client.exec('uptime', mustCall((err) => {
      assert(err instanceof Error);
    }));
  }));
}
