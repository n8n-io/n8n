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
  const { client, server } = setup('Simple shell()');

  const OUTPUT = 'shell output!\n';

  server.on('connection', mustCall((conn) => {
    conn.on('ready', mustCall(() => {
      conn.on('session', mustCall((accept, reject) => {
        const session = accept();
        session.on('pty', mustCall((accept, reject, info) => {
          accept();
          session.on('shell', mustCall((accept, reject) => {
            let input = '';
            const stream = accept();
            stream.write(OUTPUT);
            stream.on('data', mustCallAtLeast((data) => {
              input += data;
              if (input === 'exit\n') {
                stream.end();
                conn.end();
              }
            }));
          }));
        }));
      }));
    }));
  }));

  client.on('ready', mustCall(() => {
    let output = '';
    client.on('close', mustCall(() => {
      assert(output === OUTPUT, `Wrong shell output: ${inspect(output)}`);
    })).shell(mustCall((err, stream) => {
      assert(!err, `Unexpected shell error: ${err}`);
      stream.write('exit\n');
      stream.on('data', mustCallAtLeast((d) => {
        output += d;
      })).on('close', mustCall(() => {}));
    }));
  }));
}

{
  const { client, server } = setup('Shell with environment set');

  const OUTPUT = 'shell output!\n';
  const clientEnv = { SSH2NODETEST: 'foo' };

  server.on('connection', mustCall((conn) => {
    conn.on('ready', mustCall(() => {
      conn.on('session', mustCall((accept, reject) => {
        let pty = false;
        let env = false;
        accept().on('pty', mustCall((accept, reject, info) => {
          accept();
          pty = true;
        })).on('env', mustCall((accept, reject, info) => {
          accept && accept();
          env = true;
          assert(info.key === Object.keys(clientEnv)[0],
                 `Wrong env key: ${inspect(info.key)}`);
          assert(info.val === Object.values(clientEnv)[0],
                 `Wrong env value: ${inspect(info.val)}`);
        })).on('shell', mustCall((accept, reject) => {
          assert(pty, 'Expected pty before shell');
          assert(env, 'Expected env before shell');
          let input = '';
          const stream = accept();
          stream.write(OUTPUT);
          stream.on('data', mustCallAtLeast((data) => {
            input += data;
            if (input === 'exit\n') {
              stream.end();
              conn.end();
            }
          }));
        }));
      }));
    }));
  }));

  client.on('ready', mustCall(() => {
    let output = '';
    client.on('close', mustCall(() => {
      assert(output === OUTPUT, `Wrong shell output: ${inspect(output)}`);
    })).shell({ env: clientEnv }, mustCall((err, stream) => {
      assert(!err, `Unexpected shell error: ${err}`);
      stream.write('exit\n');
      stream.on('data', mustCallAtLeast((d) => {
        output += d;
      })).on('close', mustCall(() => {}));
    }));
  }));
}
