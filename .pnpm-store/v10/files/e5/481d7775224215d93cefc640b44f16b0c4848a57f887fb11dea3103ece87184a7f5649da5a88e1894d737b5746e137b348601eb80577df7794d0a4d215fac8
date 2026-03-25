'use strict';

const assert = require('assert');
const { inspect } = require('util');

const {
  mustCall,
  mustCallAtLeast,
  setupSimple,
} = require('./common.js');

const DEBUG = false;

const setup = setupSimple.bind(undefined, DEBUG);

{
  const { client, server } = setup('Simple exec()');

  const COMMAND = 'foo --bar';
  const STDOUT_DATA = 'stdout data!\n';
  const STDERR_DATA = 'stderr data!\n';

  server.on('connection', mustCall((conn) => {
    conn.on('ready', mustCall(() => {
      conn.on('session', mustCall((accept, reject) => {
        accept().on('exec', mustCall((accept, reject, info) => {
          assert(info.command === COMMAND,
                 `Wrong exec command: ${info.command}`);
          const stream = accept();
          stream.stderr.write(STDERR_DATA);
          stream.write(STDOUT_DATA);
          stream.exit(100);
          stream.end();
          conn.end();
        }));
      }));
    }));
  }));

  client.on('ready', mustCall(() => {
    let out = '';
    let outErr = '';
    const events = [];
    const EXPECTED_EVENTS = [ 'exit', 'close' ];
    const EXPECTED_EXIT_CLOSE_ARGS = [ 100 ];
    client.on('close', mustCall(() => {
      assert(out === STDOUT_DATA, `Wrong stdout data: ${inspect(out)}`);
      assert(outErr === STDERR_DATA, `Wrong stderr data: ${inspect(outErr)}`);
      assert.deepStrictEqual(
        events,
        EXPECTED_EVENTS,
        `Wrong command event order: ${events}`
      );
    })).exec(COMMAND, mustCall((err, stream) => {
      assert(!err, `Unexpected exec error: ${err}`);
      stream.on('data', mustCallAtLeast((d) => {
        out += d;
      })).on('exit', mustCall((...args) => {
        assert.deepStrictEqual(args,
                               EXPECTED_EXIT_CLOSE_ARGS,
                               `Wrong exit args: ${inspect(args)}`);
        events.push('exit');
      })).on('close', mustCall((...args) => {
        assert.deepStrictEqual(args,
                               EXPECTED_EXIT_CLOSE_ARGS,
                               `Wrong close args: ${inspect(args)}`);
        events.push('close');
      })).stderr.on('data', mustCallAtLeast((d) => {
        outErr += d;
      }));
    }));
  }));
}

{
  const { client, server } = setup('Simple exec() (exit signal)');

  const COMMAND = 'foo --bar';
  const STDOUT_DATA = 'stdout data!\n';
  const STDERR_DATA = 'stderr data!\n';

  server.on('connection', mustCall((conn) => {
    conn.on('ready', mustCall(() => {
      conn.on('session', mustCall((accept, reject) => {
        accept().on('exec', mustCall((accept, reject, info) => {
          assert(info.command === COMMAND,
                 `Wrong exec command: ${info.command}`);
          const stream = accept();
          stream.stderr.write(STDERR_DATA);
          stream.write(STDOUT_DATA);
          assert.throws(() => stream.exit('SIGFAKE'));
          stream.exit('SIGKILL');
          stream.end();
          conn.end();
        }));
      }));
    }));
  }));

  client.on('ready', mustCall(() => {
    let out = '';
    let outErr = '';
    const events = [];
    const EXPECTED_EVENTS = [ 'exit', 'close' ];
    const EXPECTED_EXIT_CLOSE_ARGS = [ null, 'SIGKILL', false, '' ];
    client.on('close', mustCall(() => {
      assert(out === STDOUT_DATA, `Wrong stdout data: ${inspect(out)}`);
      assert(outErr === STDERR_DATA, `Wrong stderr data: ${inspect(outErr)}`);
      assert.deepStrictEqual(
        events,
        EXPECTED_EVENTS,
        `Wrong command event order: ${events}`
      );
    })).exec(COMMAND, mustCall((err, stream) => {
      assert(!err, `Unexpected exec error: ${err}`);
      stream.on('data', mustCallAtLeast((d) => {
        out += d;
      })).on('exit', mustCall((...args) => {
        assert.deepStrictEqual(args,
                               EXPECTED_EXIT_CLOSE_ARGS,
                               `Wrong exit args: ${inspect(args)}`);
        events.push('exit');
      })).on('close', mustCall((...args) => {
        assert.deepStrictEqual(args,
                               EXPECTED_EXIT_CLOSE_ARGS,
                               `Wrong close args: ${inspect(args)}`);
        events.push('close');
      })).stderr.on('data', mustCallAtLeast((d) => {
        outErr += d;
      }));
    }));
  }));
}

{
  const { client, server } = setup('Simple exec() (exit signal -- no "SIG")');

  const COMMAND = 'foo --bar';
  const STDOUT_DATA = 'stdout data!\n';
  const STDERR_DATA = 'stderr data!\n';

  server.on('connection', mustCall((conn) => {
    conn.on('ready', mustCall(() => {
      conn.on('session', mustCall((accept, reject) => {
        accept().on('exec', mustCall((accept, reject, info) => {
          assert(info.command === COMMAND,
                 `Wrong exec command: ${info.command}`);
          const stream = accept();
          stream.stderr.write(STDERR_DATA);
          stream.write(STDOUT_DATA);
          assert.throws(() => stream.exit('FAKE'));
          stream.exit('KILL');
          stream.end();
          conn.end();
        }));
      }));
    }));
  }));

  client.on('ready', mustCall(() => {
    let out = '';
    let outErr = '';
    const events = [];
    const EXPECTED_EVENTS = [ 'exit', 'close' ];
    const EXPECTED_EXIT_CLOSE_ARGS = [ null, 'SIGKILL', false, '' ];
    client.on('close', mustCall(() => {
      assert(out === STDOUT_DATA, `Wrong stdout data: ${inspect(out)}`);
      assert(outErr === STDERR_DATA, `Wrong stderr data: ${inspect(outErr)}`);
      assert.deepStrictEqual(
        events,
        EXPECTED_EVENTS,
        `Wrong command event order: ${events}`
      );
    })).exec(COMMAND, mustCall((err, stream) => {
      assert(!err, `Unexpected exec error: ${err}`);
      stream.on('data', mustCallAtLeast((d) => {
        out += d;
      })).on('exit', mustCall((...args) => {
        assert.deepStrictEqual(args,
                               EXPECTED_EXIT_CLOSE_ARGS,
                               `Wrong exit args: ${inspect(args)}`);
        events.push('exit');
      })).on('close', mustCall((...args) => {
        assert.deepStrictEqual(args,
                               EXPECTED_EXIT_CLOSE_ARGS,
                               `Wrong close args: ${inspect(args)}`);
        events.push('close');
      })).stderr.on('data', mustCallAtLeast((d) => {
        outErr += d;
      }));
    }));
  }));
}

{
  const { client, server } = setup('Exec with signal()');

  const COMMAND = 'foo --bar';
  const STDOUT_DATA = 'stdout data!\n';
  const STDERR_DATA = 'stderr data!\n';

  server.on('connection', mustCall((conn) => {
    conn.on('ready', mustCall(() => {
      conn.on('session', mustCall((accept, reject) => {
        let stream;
        accept().on('exec', mustCall((accept, reject, info) => {
          assert(info.command === COMMAND,
                 `Wrong exec command: ${info.command}`);
          stream = accept();
          stream.stderr.write(STDERR_DATA);
          stream.write(STDOUT_DATA);
        })).on('signal', mustCall((accept, reject, info) => {
          assert(info.name === 'INT', `Wrong client signal name: ${info.name}`);
          stream.exit(100);
          stream.end();
          conn.end();
        }));
      }));
    }));
  }));

  client.on('ready', mustCall(() => {
    let out = '';
    let outErr = '';
    const events = [];
    const EXPECTED_EVENTS = [ 'exit', 'close' ];
    const EXPECTED_EXIT_CLOSE_ARGS = [ 100 ];
    client.on('close', mustCall(() => {
      assert(out === STDOUT_DATA, `Wrong stdout data: ${inspect(out)}`);
      assert(outErr === STDERR_DATA, `Wrong stderr data: ${inspect(outErr)}`);
      assert.deepStrictEqual(
        events,
        EXPECTED_EVENTS,
        `Wrong command event order: ${events}`
      );
    })).exec(COMMAND, mustCall((err, stream) => {
      assert(!err, `Unexpected exec error: ${err}`);
      const sendSignal = (() => {
        let sent = false;
        return () => {
          if (sent)
            return;
          sent = true;
          assert.throws(() => stream.signal('FAKE'));
          assert.throws(() => stream.signal('SIGFAKE'));
          stream.signal('SIGINT');
        };
      })();
      stream.on('data', mustCallAtLeast((d) => {
        out += d;
        sendSignal();
      })).on('exit', mustCall((...args) => {
        assert.deepStrictEqual(args,
                               EXPECTED_EXIT_CLOSE_ARGS,
                               `Wrong exit args: ${inspect(args)}`);
        events.push('exit');
      })).on('close', mustCall((...args) => {
        assert.deepStrictEqual(args,
                               EXPECTED_EXIT_CLOSE_ARGS,
                               `Wrong close args: ${inspect(args)}`);
        events.push('close');
      })).stderr.on('data', mustCallAtLeast((d) => {
        outErr += d;
      }));
    }));
  }));
}

{
  const { client, server } = setup('Exec with signal() -- no "SIG"');

  const COMMAND = 'foo --bar';
  const STDOUT_DATA = 'stdout data!\n';
  const STDERR_DATA = 'stderr data!\n';

  server.on('connection', mustCall((conn) => {
    conn.on('ready', mustCall(() => {
      conn.on('session', mustCall((accept, reject) => {
        let stream;
        accept().on('exec', mustCall((accept, reject, info) => {
          assert(info.command === COMMAND,
                 `Wrong exec command: ${info.command}`);
          stream = accept();
          stream.stderr.write(STDERR_DATA);
          stream.write(STDOUT_DATA);
        })).on('signal', mustCall((accept, reject, info) => {
          assert(info.name === 'INT', `Wrong client signal name: ${info.name}`);
          stream.exit(100);
          stream.end();
          conn.end();
        }));
      }));
    }));
  }));

  client.on('ready', mustCall(() => {
    let out = '';
    let outErr = '';
    const events = [];
    const EXPECTED_EVENTS = [ 'exit', 'close' ];
    const EXPECTED_EXIT_CLOSE_ARGS = [ 100 ];
    client.on('close', mustCall(() => {
      assert(out === STDOUT_DATA, `Wrong stdout data: ${inspect(out)}`);
      assert(outErr === STDERR_DATA, `Wrong stderr data: ${inspect(outErr)}`);
      assert.deepStrictEqual(
        events,
        EXPECTED_EVENTS,
        `Wrong command event order: ${events}`
      );
    })).exec(COMMAND, mustCall((err, stream) => {
      assert(!err, `Unexpected exec error: ${err}`);
      const sendSignal = (() => {
        let sent = false;
        return () => {
          if (sent)
            return;
          sent = true;
          stream.signal('INT');
        };
      })();
      stream.on('data', mustCallAtLeast((d) => {
        out += d;
        sendSignal();
      })).on('exit', mustCall((...args) => {
        assert.deepStrictEqual(args,
                               EXPECTED_EXIT_CLOSE_ARGS,
                               `Wrong exit args: ${inspect(args)}`);
        events.push('exit');
      })).on('close', mustCall((...args) => {
        assert.deepStrictEqual(args,
                               EXPECTED_EXIT_CLOSE_ARGS,
                               `Wrong close args: ${inspect(args)}`);
        events.push('close');
      })).stderr.on('data', mustCallAtLeast((d) => {
        outErr += d;
      }));
    }));
  }));
}

{
  const { client, server } = setup('Exec with environment set');

  const env = { SSH2NODETEST: 'foo' };

  server.on('connection', mustCall((conn) => {
    conn.on('ready', mustCall(() => {
      conn.on('session', mustCall((accept, reject) => {
        accept().on('env', mustCall((accept, reject, info) => {
          accept && accept();
          assert(info.key === Object.keys(env)[0],
                 'Wrong env key');
          assert(info.val === Object.values(env)[0],
                 'Wrong env value');
        })).on('exec', mustCall((accept, reject, info) => {
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
    client.exec('foo --bar', { env }, mustCall((err, stream) => {
      assert(!err, `Unexpected exec error: ${err}`);
      stream.resume();
    }));
  }));
}

{
  const { client, server } = setup('Exec with setWindow()');

  const dimensions = {
    rows: 60,
    cols: 115,
    height: 480,
    width: 640,
  };

  server.on('connection', mustCall((conn) => {
    conn.on('ready', mustCall(() => {
      conn.on('session', mustCall((accept, reject) => {
        accept().on('window-change', mustCall((accept, reject, info) => {
          accept && accept();
          assert.deepStrictEqual(info, dimensions, 'Wrong dimensions');
        })).on('exec', mustCall((accept, reject, info) => {
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
      stream.setWindow(...Object.values(dimensions));
      stream.resume();
    }));
  }));
}

{
  const { client, server } = setup('Exec with pty set');

  const pty = {
    rows: 2,
    cols: 4,
    width: 0,
    height: 0,
    term: 'vt220',
    modes: {},
  };

  server.on('connection', mustCall((conn) => {
    conn.on('ready', mustCall(() => {
      conn.on('session', mustCall((accept, reject) => {
        let sawPty = false;
        accept().on('pty', mustCall((accept, reject, info) => {
          assert.deepStrictEqual(info, pty, 'Wrong pty info');
          sawPty = true;
          accept && accept();
        })).on('exec', mustCall((accept, reject, info) => {
          assert(sawPty, 'Expected pty to be set up');
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
    client.exec('foo --bar', { pty }, mustCall((err, stream) => {
      assert(!err, `Unexpected exec error: ${err}`);
      stream.resume();
    }));
  }));
}

{
  const { client, server } = setup('Exec with X11 forwarding');

  server.on('connection', mustCall((conn) => {
    conn.on('ready', mustCall(() => {
      conn.on('session', mustCall((accept, reject) => {
        let sawX11 = false;
        accept().on('x11', mustCall((accept, reject, info) => {
          assert.strictEqual(info.single,
                             false,
                             `Wrong x11 single: ${info.single}`);
          assert.strictEqual(info.screen,
                             0,
                             `Wrong x11 screen: ${info.screen}`);
          assert.strictEqual(info.protocol,
                             'MIT-MAGIC-COOKIE-1',
                             `Wrong x11 protocol: ${info.protocol}`);
          assert(Buffer.isBuffer(info.cookie), 'Expected cookie Buffer');
          assert.strictEqual(
            info.cookie.length,
            32,
            `Invalid x11 cookie length: ${info.cookie.length}`
          );
          sawX11 = true;
          accept && accept();
        })).on('exec', mustCall((accept, reject, info) => {
          assert(sawX11, 'Expected x11 before exec');
          assert(info.command === 'foo --bar',
                 `Wrong exec command: ${info.command}`);
          const stream = accept();
          conn.x11('127.0.0.1', 4321, mustCall((err, xstream) => {
            assert(!err, `Unexpected x11() error: ${err}`);
            xstream.resume();
            xstream.on('end', mustCall(() => {
              stream.exit(100);
              stream.end();
              conn.end();
            })).end();
          }));
        }));
      }));
    }));
  }));

  client.on('ready', mustCall(() => {
    client.on('x11', mustCall((info, accept, reject) => {
      assert.strictEqual(info.srcIP,
                         '127.0.0.1',
                         `Invalid x11 srcIP: ${info.srcIP}`);
      assert.strictEqual(info.srcPort,
                         4321,
                         `Invalid x11 srcPort: ${info.srcPort}`);
      accept();
    })).exec('foo --bar', { x11: true }, mustCall((err, stream) => {
      assert(!err, `Unexpected exec error: ${err}`);
      stream.resume();
    }));
  }));
}

{
  const { client, server } = setup(
    'Exec with X11 forwarding (custom X11 settings)'
  );

  const x11 = {
    single: true,
    screen: 1234,
    protocol: 'YUMMY-MAGIC-COOKIE-1',
    cookie: '00112233445566778899001122334455',
  };

  server.on('connection', mustCall((conn) => {
    conn.on('ready', mustCall(() => {
      conn.on('session', mustCall((accept, reject) => {
        let sawX11 = false;
        accept().on('x11', mustCall((accept, reject, info) => {
          assert.strictEqual(info.single,
                             x11.single,
                             `Wrong x11 single: ${info.single}`);
          assert.strictEqual(info.screen,
                             x11.screen,
                             `Wrong x11 screen: ${info.screen}`);
          assert.strictEqual(info.protocol,
                             x11.protocol,
                             `Wrong x11 protocol: ${info.protocol}`);
          assert(Buffer.isBuffer(info.cookie), 'Expected cookie Buffer');
          assert.strictEqual(info.cookie.toString(),
                             x11.cookie,
                             `Wrong x11 cookie: ${info.cookie}`);
          sawX11 = true;
          accept && accept();
        })).on('exec', mustCall((accept, reject, info) => {
          assert(sawX11, 'Expected x11 before exec');
          assert(info.command === 'foo --bar',
                 `Wrong exec command: ${info.command}`);
          const stream = accept();
          conn.x11('127.0.0.1', 4321, mustCall((err, xstream) => {
            assert(!err, `Unexpected x11() error: ${err}`);
            xstream.resume();
            xstream.on('end', mustCall(() => {
              stream.exit(100);
              stream.end();
              conn.end();
            })).end();
          }));
        }));
      }));
    }));
  }));

  client.on('ready', mustCall(() => {
    client.on('x11', mustCall((info, accept, reject) => {
      assert.strictEqual(info.srcIP,
                         '127.0.0.1',
                         `Invalid x11 srcIP: ${info.srcIP}`);
      assert.strictEqual(info.srcPort,
                         4321,
                         `Invalid x11 srcPort: ${info.srcPort}`);
      accept();
    })).exec('foo --bar', { x11 }, mustCall((err, stream) => {
      assert(!err, `Unexpected exec error: ${err}`);
      stream.resume();
    }));
  }));
}
