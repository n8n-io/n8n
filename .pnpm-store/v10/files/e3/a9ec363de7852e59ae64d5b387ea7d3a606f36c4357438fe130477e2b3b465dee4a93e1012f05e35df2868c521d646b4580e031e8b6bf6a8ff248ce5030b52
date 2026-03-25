'use strict';

const assert = require('assert');
const { readFileSync } = require('fs');
const { join } = require('path');
const { inspect } = require('util');

const Client = require('../lib/client.js');
const Server = require('../lib/server.js');
const { parseKey } = require('../lib/protocol/keyParser.js');

const mustCallChecks = [];

const DEFAULT_TEST_TIMEOUT = 30 * 1000;

function noop() {}

function runCallChecks(exitCode) {
  if (exitCode !== 0) return;

  const failed = mustCallChecks.filter((context) => {
    if ('minimum' in context) {
      context.messageSegment = `at least ${context.minimum}`;
      return context.actual < context.minimum;
    }
    context.messageSegment = `exactly ${context.exact}`;
    return context.actual !== context.exact;
  });

  failed.forEach((context) => {
    console.error('Mismatched %s function calls. Expected %s, actual %d.',
                  context.name,
                  context.messageSegment,
                  context.actual);
    console.error(context.stack.split('\n').slice(2).join('\n'));
  });

  if (failed.length)
    process.exit(1);
}

function mustCall(fn, exact) {
  return _mustCallInner(fn, exact, 'exact');
}

function mustCallAtLeast(fn, minimum) {
  return _mustCallInner(fn, minimum, 'minimum');
}

function _mustCallInner(fn, criteria = 1, field) {
  if (process._exiting)
    throw new Error('Cannot use common.mustCall*() in process exit handler');

  if (typeof fn === 'number') {
    criteria = fn;
    fn = noop;
  } else if (fn === undefined) {
    fn = noop;
  }

  if (typeof criteria !== 'number')
    throw new TypeError(`Invalid ${field} value: ${criteria}`);

  const context = {
    [field]: criteria,
    actual: 0,
    stack: inspect(new Error()),
    name: fn.name || '<anonymous>'
  };

  // Add the exit listener only once to avoid listener leak warnings
  if (mustCallChecks.length === 0)
    process.on('exit', runCallChecks);

  mustCallChecks.push(context);

  function wrapped(...args) {
    ++context.actual;
    return fn.call(this, ...args);
  }
  // TODO: remove origFn?
  wrapped.origFn = fn;

  return wrapped;
}

function getCallSite(top) {
  const originalStackFormatter = Error.prepareStackTrace;
  Error.prepareStackTrace = (err, stack) =>
    `${stack[0].getFileName()}:${stack[0].getLineNumber()}`;
  const err = new Error();
  Error.captureStackTrace(err, top);
  // With the V8 Error API, the stack is not formatted until it is accessed
  // eslint-disable-next-line no-unused-expressions
  err.stack;
  Error.prepareStackTrace = originalStackFormatter;
  return err.stack;
}

function mustNotCall(msg) {
  const callSite = getCallSite(mustNotCall);
  return function mustNotCall(...args) {
    args = args.map(inspect).join(', ');
    const argsInfo = (args.length > 0
                      ? `\ncalled with arguments: ${args}`
                      : '');
    assert.fail(
      `${msg || 'function should not have been called'} at ${callSite}`
        + argsInfo);
  };
}

function setup(title, configs) {
  const {
    client: clientCfg_,
    server: serverCfg_,
    allReady: allReady_,
    timeout: timeout_,
    debug,
    noForceClientReady,
    noForceServerReady,
    noClientError,
    noServerError,
  } = configs;

  // Make shallow copies of client/server configs to avoid mutating them when
  // multiple tests share the same config object reference
  let clientCfg;
  if (clientCfg_)
    clientCfg = { ...clientCfg_ };
  let serverCfg;
  if (serverCfg_)
    serverCfg = { ...serverCfg_ };

  let clientClose = false;
  let clientReady = false;
  let serverClose = false;
  let serverReady = false;
  const msg = (text) => {
    return `${title}: ${text}`;
  };

  const timeout = (typeof timeout_ === 'number'
                   ? timeout_
                   : DEFAULT_TEST_TIMEOUT);

  const allReady = (typeof allReady_ === 'function' ? allReady_ : undefined);

  if (debug) {
    if (clientCfg) {
      clientCfg.debug = (...args) => {
        console.log(`[${title}][CLIENT]`, ...args);
      };
    }
    if (serverCfg) {
      serverCfg.debug = (...args) => {
        console.log(`[${title}][SERVER]`, ...args);
      };
    }
  }

  let timer;
  let client;
  let clientReadyFn;
  let server;
  let serverReadyFn;
  if (clientCfg) {
    client = new Client();
    if (!noClientError)
      client.on('error', onError);
    clientReadyFn = (noForceClientReady ? onReady : mustCall(onReady));
    client.on('ready', clientReadyFn)
          .on('close', mustCall(onClose));
  } else {
    clientReady = clientClose = true;
  }

  if (serverCfg) {
    server = new Server(serverCfg);
    if (!noServerError)
      server.on('error', onError);
    serverReadyFn = (noForceServerReady ? onReady : mustCall(onReady));
    server.on('connection', mustCall((conn) => {
      if (!noServerError)
        conn.on('error', onError);
      conn.on('ready', serverReadyFn);
      server.close();
    })).on('close', mustCall(onClose));
  } else {
    serverReady = serverClose = true;
  }

  function onError(err) {
    const which = (this === client ? 'client' : 'server');
    assert(false, msg(`Unexpected ${which} error: ${err.stack}\n`));
  }

  function onReady() {
    if (this === client) {
      assert(!clientReady,
             msg('Received multiple ready events for client'));
      clientReady = true;
    } else {
      assert(!serverReady,
             msg('Received multiple ready events for server'));
      serverReady = true;
    }
    clientReady && serverReady && allReady && allReady();
  }

  function onClose() {
    if (this === client) {
      assert(!clientClose,
             msg('Received multiple close events for client'));
      clientClose = true;
    } else {
      assert(!serverClose,
             msg('Received multiple close events for server'));
      serverClose = true;
    }
    if (clientClose && serverClose)
      clearTimeout(timer);
  }

  process.nextTick(mustCall(() => {
    function connectClient() {
      if (clientCfg.sock) {
        clientCfg.sock.connect(server.address().port, 'localhost');
      } else {
        clientCfg.host = 'localhost';
        clientCfg.port = server.address().port;
      }
      try {
        client.connect(clientCfg);
      } catch (ex) {
        ex.message = msg(ex.message);
        throw ex;
      }
    }

    if (server) {
      server.listen(0, 'localhost', mustCall(() => {
        if (timeout >= 0) {
          timer = setTimeout(() => {
            assert(false, msg('Test timed out'));
          }, timeout);
        }
        if (client)
          connectClient();
      }));
    }
  }));

  return { client, server };
}

const FIXTURES_DIR = join(__dirname, 'fixtures');
const fixture = (() => {
  const cache = new Map();
  return (file) => {
    const existing = cache.get(file);
    if (existing !== undefined)
      return existing;

    const result = readFileSync(join(FIXTURES_DIR, file));
    cache.set(file, result);
    return result;
  };
})();
const fixtureKey = (() => {
  const cache = new Map();
  return (file, passphrase, bypass) => {
    if (typeof passphrase === 'boolean') {
      bypass = passphrase;
      passphrase = undefined;
    }
    if (typeof bypass !== 'boolean' || !bypass) {
      const existing = cache.get(file);
      if (existing !== undefined)
        return existing;
    }
    const fullPath = join(FIXTURES_DIR, file);
    const raw = fixture(file);
    let key = parseKey(raw, passphrase);
    if (Array.isArray(key))
      key = key[0];
    const result = { key, raw, fullPath };
    cache.set(file, result);
    return result;
  };
})();

function setupSimple(debug, title) {
  const { client, server } = setup(title, {
    client: { username: 'Password User', password: '12345' },
    server: { hostKeys: [ fixtureKey('ssh_host_rsa_key').raw ] },
    debug,
  });
  server.on('connection', mustCall((conn) => {
    conn.on('authentication', mustCall((ctx) => {
      ctx.accept();
    }));
  }));
  return { client, server };
}

module.exports = {
  fixture,
  fixtureKey,
  FIXTURES_DIR,
  mustCall,
  mustCallAtLeast,
  mustNotCall,
  setup,
  setupSimple,
};
