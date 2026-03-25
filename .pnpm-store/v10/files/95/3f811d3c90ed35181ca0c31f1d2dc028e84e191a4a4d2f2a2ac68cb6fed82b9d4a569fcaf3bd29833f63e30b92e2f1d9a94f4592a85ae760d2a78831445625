'use strict';

const assert = require('assert');
const { inspect } = require('util');

const {
  fixture,
  mustCall,
  mustCallAtLeast,
  setup: setup_,
} = require('./common.js');

const debug = false;

const clientCfg = { username: 'foo', password: 'bar' };
const serverCfg = { hostKeys: [ fixture('ssh_host_rsa_key') ] };

{
  const { client, server } = setup_(
    'Exec with OpenSSH agent forwarding',
    {
      client: {
        ...clientCfg,
        agent: '/path/to/agent',
      },
      server: serverCfg,

      debug,
    },
  );

  server.on('connection', mustCall((conn) => {
    conn.on('authentication', mustCall((ctx) => {
      ctx.accept();
    })).on('ready', mustCall(() => {
      conn.on('session', mustCall((accept, reject) => {
        let sawAuthAgent = false;
        accept().on('auth-agent', mustCall((accept, reject) => {
          sawAuthAgent = true;
          accept && accept();
        })).on('exec', mustCall((accept, reject, info) => {
          assert(sawAuthAgent, 'Expected auth-agent before exec');
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
    client.exec('foo --bar', { agentForward: true }, mustCall((err, stream) => {
      assert(!err, `Unexpected exec error: ${err}`);
      stream.resume();
    }));
  }));
}

{
  const { client, server } = setup_(
    'OpenSSH forwarded UNIX socket connection',
    {
      client: clientCfg,
      server: {
        ...serverCfg,
        ident: 'OpenSSH_7.1',
      },

      debug,
    },
  );

  const socketPath = '/foo';
  const events = [];
  const expected = [
    ['client', 'openssh_forwardInStreamLocal'],
    ['server', 'streamlocal-forward@openssh.com', { socketPath }],
    ['client', 'forward callback'],
    ['client', 'unix connection', { socketPath }],
    ['client', 'socket data', '1'],
    ['server', 'socket data', '2'],
    ['client', 'socket end'],
    ['server', 'cancel-streamlocal-forward@openssh.com', { socketPath }],
    ['client', 'cancel callback']
  ];

  server.on('connection', mustCall((conn) => {
    conn.on('authentication', mustCall((ctx) => {
      ctx.accept();
    })).on('ready', mustCall(() => {
      conn.once('request', mustCall((accept, reject, name, info) => {
        events.push(['server', name, info]);
        assert(name === 'streamlocal-forward@openssh.com',
               `Wrong request name: ${name}`);
        accept();
        conn.openssh_forwardOutStreamLocal(socketPath,
                                           mustCall((err, ch) => {
          assert(!err, `Unexpected error: ${err}`);
          ch.write('1');
          ch.on('data', mustCallAtLeast((data) => {
            events.push(['server', 'socket data', data.toString()]);
            ch.close();
          }));
        }));

        conn.on('request', mustCall((accept, reject, name, info) => {
          events.push(['server', name, info]);
          assert(name === 'cancel-streamlocal-forward@openssh.com',
                 `Wrong request name: ${name}`);
          accept();
        }));
      }));
    }));
  }));

  client.on('ready', mustCall(() => {
    // request forwarding
    events.push(['client', 'openssh_forwardInStreamLocal']);
    client.openssh_forwardInStreamLocal(socketPath, mustCall((err) => {
      assert(!err, `Unexpected error: ${err}`);
      events.push(['client', 'forward callback']);
    }));
    client.on('unix connection', mustCall((info, accept, reject) => {
      events.push(['client', 'unix connection', info]);
      const stream = accept();
      stream.on('data', mustCallAtLeast((data) => {
        events.push(['client', 'socket data', data.toString()]);
        stream.write('2');
      })).on('end', mustCall(() => {
        events.push(['client', 'socket end']);
        client.openssh_unforwardInStreamLocal(socketPath,
                                              mustCall((err) => {
          assert(!err, `Unexpected error: ${err}`);
          events.push(['client', 'cancel callback']);
          client.end();
        }));
      }));
    }));
  })).on('close', mustCall(() => {
    assert.deepStrictEqual(
      events,
      expected,
      'Events mismatch\n'
        + `Actual:\n${inspect(events)}\n`
        + `Expected:\n${inspect(expected)}`
    );
  }));
}

{
  const { client, server } = setup_(
    'OpenSSH UNIX socket connection',
    {
      client: clientCfg,
      server: {
        ...serverCfg,
        ident: 'OpenSSH_8.0',
      },

      debug,
    },
  );

  const socketPath = '/foo/bar/baz';
  const response = 'Hello World';

  server.on('connection', mustCall((conn) => {
    conn.on('authentication', mustCall((ctx) => {
      ctx.accept();
    })).on('ready', mustCall(() => {
      conn.on('openssh.streamlocal', mustCall((accept, reject, info) => {
        assert.deepStrictEqual(
          info,
          { socketPath },
          `Wrong info: ${inspect(info)}`
        );

        const stream = accept();
        stream.on('close', mustCall(() => {
          client.end();
        })).end(response);
        stream.resume();
      }));
    }));
  }));

  client.on('ready', mustCall(() => {
    client.openssh_forwardOutStreamLocal(socketPath, mustCall((err, stream) => {
      assert(!err, `Unexpected error: ${err}`);
      let buf = '';
      stream.on('data', mustCallAtLeast((data) => {
        buf += data;
      })).on('close', mustCall(() => {
        assert(buf === response, `Wrong response: ${inspect(buf)}`);
      }));
    }));
  }));
}

{
  const { client, server } = setup_(
    'OpenSSH 5.x workaround for binding on port 0',
    {
      client: clientCfg,
      server: {
        ...serverCfg,
        ident: 'OpenSSH_5.3',
      },

      debug,
    },
  );

  const boundAddr = 'good';
  const boundPort = 1337;
  const tcpInfo = {
    destIP: boundAddr,
    destPort: boundPort,
    srcIP: 'remote',
    srcPort: 12345,
  };

  server.on('connection', mustCall((conn) => {
    conn.on('authentication', mustCall((ctx) => {
      ctx.accept();
    })).on('ready', mustCall(() => {
      conn.on('request', mustCall((accept, reject, name, info) => {
        assert(name === 'tcpip-forward', `Unexpected request: ${name}`);
        assert(info.bindAddr === boundAddr, `Wrong addr: ${info.bindAddr}`);
        assert(info.bindPort === 0, `Wrong port: ${info.bindPort}`);
        accept(boundPort);
        conn.forwardOut(boundAddr,
                        0,
                        tcpInfo.srcIP,
                        tcpInfo.srcPort,
                        mustCall((err, ch) => {
          assert(!err, `Unexpected error: ${err}`);
          client.end();
        }));
      }));
    }));
  }));

  client.on('ready', mustCall(() => {
    // request forwarding
    client.forwardIn(boundAddr, 0, mustCall((err, port) => {
      assert(!err, `Unexpected error: ${err}`);
      assert(port === boundPort, `Bad bound port: ${port}`);
    }));
  })).on('tcp connection', mustCall((details, accept, reject) => {
    assert.deepStrictEqual(
      details,
      tcpInfo,
      `Wrong tcp details: ${inspect(details)}`
    );
    accept();
  }));
}
