/* jshint node: true */

// TODO: Add broadcast option to client `_emitMessage`, accessible for one-way
// messages.
// TODO: Add `server.mount` method to allow combining servers. The API is as
// follows: a mounted server's (i.e. the method's argument) handlers have lower
// precedence than the original server (i.e. `this`); the mounted server's
// middlewares are only invoked for its handlers.
// TODO: Change `objectMode` client and server channel option to `encoding`
// (accepting `'netty'`, `'standard'`, and `null` or `undefined`). Perhaps also
// expose encoders (API TBD).

'use strict';

/** This module implements Avro's IPC/RPC logic. */

var types = require('./types'),
    utils = require('./utils'),
    buffer = require('buffer'),
    events = require('events'),
    stream = require('stream'),
    util = require('util');

var Buffer = buffer.Buffer;

// A few convenience imports.
var Tap = utils.Tap;
var Type = types.Type;
var debug = util.debuglog('avsc:services');
var f = util.format;

// Various useful types. We instantiate options once, to share the registry.
var OPTS = {namespace: 'org.apache.avro.ipc'};

var BOOLEAN_TYPE = Type.forSchema('boolean', OPTS);

var MAP_BYTES_TYPE = Type.forSchema({type: 'map', values: 'bytes'}, OPTS);

var STRING_TYPE = Type.forSchema('string', OPTS);

var HANDSHAKE_REQUEST_TYPE = Type.forSchema({
  name: 'HandshakeRequest',
  type: 'record',
  fields: [
    {name: 'clientHash', type: {name: 'MD5', type: 'fixed', size: 16}},
    {name: 'clientProtocol', type: ['null', 'string'], 'default': null},
    {name: 'serverHash', type: 'MD5'},
    {name: 'meta', type: ['null', MAP_BYTES_TYPE], 'default': null}
  ]
}, OPTS);

var HANDSHAKE_RESPONSE_TYPE = Type.forSchema({
  name: 'HandshakeResponse',
  type: 'record',
  fields: [
    {
      name: 'match',
      type: {
        name: 'HandshakeMatch',
        type: 'enum',
        symbols: ['BOTH', 'CLIENT', 'NONE']
      }
    },
    {name: 'serverProtocol', type: ['null', 'string'], 'default': null},
    {name: 'serverHash', type: ['null', 'MD5'], 'default': null},
    {name: 'meta', type: ['null', MAP_BYTES_TYPE], 'default': null}
  ]
}, OPTS);

// Prefix used to differentiate between messages when sharing a stream. This
// length should be smaller than 16. The remainder is used for disambiguating
// between concurrent messages (the current value, 16, therefore supports ~64k
// concurrent messages).
var PREFIX_LENGTH = 16;

// Internal message, used to check protocol compatibility.
var PING_MESSAGE = new Message(
  '', // Empty name (invalid for other "normal" messages).
  Type.forSchema({name: 'PingRequest', type: 'record', fields: []}, OPTS),
  Type.forSchema(['string'], OPTS),
  Type.forSchema('null', OPTS)
);

/** An Avro message, containing its request, response, etc. */
function Message(name, reqType, errType, resType, oneWay, doc) {
  this.name = name;
  if (!Type.isType(reqType, 'record')) {
    throw new Error('invalid request type');
  }
  this.requestType = reqType;
  if (
    !Type.isType(errType, 'union') ||
    !Type.isType(errType.getTypes()[0], 'string')
  ) {
    throw new Error('invalid error type');
  }
  this.errorType = errType;
  if (oneWay) {
    if (!Type.isType(resType, 'null') || errType.getTypes().length > 1) {
      throw new Error('inapplicable one-way parameter');
    }
  }
  this.responseType = resType;
  this.oneWay = !!oneWay;
  this.doc = doc !== undefined ? '' + doc : undefined;
  Object.freeze(this);
}

Message.forSchema = function (name, schema, opts) {
  opts = opts || {};
  if (!utils.isValidName(name)) {
    throw new Error(f('invalid message name: %s', name));
  }
  // We use a record with a placeholder name here (the user might have set
  // `noAnonymousTypes`, so we can't use an anonymous one). We remove it from
  // the registry afterwards to avoid exposing it outside.
  if (!Array.isArray(schema.request)) {
    throw new Error(f('invalid message request: %s', name));
  }
  var recordName = f('%s.%sRequest', OPTS.namespace, utils.capitalize(name));
  var reqType = Type.forSchema({
    name: recordName,
    type: 'record',
    namespace: opts.namespace || '', // Don't leak request namespace.
    fields: schema.request
  }, opts);
  delete opts.registry[recordName];
  if (!schema.response) {
    throw new Error(f('invalid message response: %s', name));
  }
  var resType = Type.forSchema(schema.response, opts);
  if (schema.errors !== undefined && !Array.isArray(schema.errors)) {
    throw new Error(f('invalid message errors: %s', name));
  }
  var errType = Type.forSchema(['string'].concat(schema.errors || []), opts);
  var oneWay = !!schema['one-way'];
  return new Message(name, reqType, errType, resType, oneWay, schema.doc);
};

Message.prototype.schema = Type.prototype.getSchema;

Message.prototype._attrs = function (opts) {
  var reqSchema = this.requestType._attrs(opts);
  var schema = {
    request: reqSchema.fields,
    response: this.responseType._attrs(opts)
  };
  var msgDoc = this.doc;
  if (msgDoc !== undefined) {
    schema.doc = msgDoc;
  }
  var errSchema = this.errorType._attrs(opts);
  if (errSchema.length > 1) {
    schema.errors = errSchema.slice(1);
  }
  if (this.oneWay) {
    schema['one-way'] = true;
  }
  return schema;
};

// Deprecated.

utils.addDeprecatedGetters(
  Message,
  ['name', 'errorType', 'requestType', 'responseType']
);

Message.prototype.isOneWay = util.deprecate(
  function () { return this.oneWay; },
  'use `.oneWay` directly instead of `.isOneWay()`'
);

/**
 * An Avro RPC service.
 *
 * This constructor shouldn't be called directly, but via the
 * `Service.forProtocol` method. This function performs little logic to better
 * support efficient copy.
 */
function Service(name, messages, types, ptcl, server) {
  if (typeof name != 'string') {
    // Let's be helpful in case this class is instantiated directly.
    return Service.forProtocol(name, messages);
  }

  this.name = name;
  this._messagesByName = messages || {};
  this.messages = Object.freeze(utils.objectValues(this._messagesByName));

  this._typesByName = types || {};
  this.types = Object.freeze(utils.objectValues(this._typesByName));

  this.protocol = ptcl;
  // We cache a string rather than a buffer to not retain an entire slab.
  this._hashStr = utils.getHash(JSON.stringify(ptcl)).toString('binary');
  this.doc = ptcl.doc ? '' + ptcl.doc : undefined;

  // We add a server to each protocol for backwards-compatibility (to allow the
  // use of `protocol.on`). This covers all cases except the use of the
  // `strictErrors` option, which requires moving to the new API.
  this._server = server || this.createServer({silent: true});
  Object.freeze(this);
}

Service.Client = Client;

Service.Server = Server;

Service.compatible = function (clientSvc, serverSvc) {
  try {
    createReaders(clientSvc, serverSvc);
  } catch (err) {
    return false;
  }
  return true;
};

Service.forProtocol = function (ptcl, opts) {
  opts = opts || {};

  var name = ptcl.protocol;
  if (!name) {
    throw new Error('missing protocol name');
  }
  if (ptcl.namespace !== undefined) {
    opts.namespace = ptcl.namespace;
  } else {
    var match = /^(.*)\.[^.]+$/.exec(name);
    if (match) {
      opts.namespace = match[1];
    }
  }
  name = utils.qualify(name, opts.namespace);

  if (ptcl.types) {
    ptcl.types.forEach(function (obj) { Type.forSchema(obj, opts); });
  }
  var msgs;
  if (ptcl.messages) {
    msgs = {};
    Object.keys(ptcl.messages).forEach(function (key) {
      msgs[key] = Message.forSchema(key, ptcl.messages[key], opts);
    });
  }

  return new Service(name, msgs, opts.registry, ptcl);
};

Service.isService = function (any) {
  // Not fool-proof but likely sufficient.
  return !!any && any.hasOwnProperty('_hashStr');
};

Service.prototype.createClient = function (opts) {
  var client = new Client(this, opts);
  process.nextTick(function () {
    // We delay this processing such that we can attach handlers to the client
    // before any channels get created.
    if (opts && opts.server) {
      // Convenience in-memory client. This can be useful to make requests
      // relatively efficiently to an in-process server. Note that it is still
      // is less efficient than direct method calls (because of the
      // serialization, which does provide "type-safety" though).
      var obj = {objectMode: true};
      var pts = [new stream.PassThrough(obj), new stream.PassThrough(obj)];
      opts.server.createChannel({readable: pts[0], writable: pts[1]}, obj);
      client.createChannel({readable: pts[1], writable: pts[0]}, obj);
    } else if (opts && opts.transport) {
      // Convenience functionality for the common single channel use-case: we
      // add a single channel using default options to the client.
      client.createChannel(opts.transport);
    }
  });
  return client;
};

Service.prototype.createServer = function (opts) {
  return new Server(this, opts);
};

Object.defineProperty(Service.prototype, 'hash', {
  enumerable: true,
  get: function () { return utils.bufferFrom(this._hashStr, 'binary'); }
});

Service.prototype.message = function (name) {
  return this._messagesByName[name];
};

Service.prototype.type = function (name) {
  return this._typesByName[name];
};

Service.prototype.inspect = function () {
  return f('<Service %j>', this.name);
};

// Deprecated methods.

utils.addDeprecatedGetters(
  Service,
  ['message', 'messages', 'name', 'type', 'types']
);

Service.prototype.createEmitter = util.deprecate(
  function (transport, opts) {
    opts = opts || {};
    var client = this.createClient({
      cache: opts.cache,
      buffering: false,
      strictTypes: opts.strictErrors,
      timeout: opts.timeout
    });
    var channel = client.createChannel(transport, opts);
    forwardErrors(client, channel);
    return channel;
  },
  'use `.createClient()` instead of `.createEmitter()`'
);

Service.prototype.createListener = util.deprecate(
  function (transport, opts) {
    if (opts && opts.strictErrors) {
      throw new Error('use `.createServer()` to support strict errors');
    }
    return this._server.createChannel(transport, opts);
  },
  'use `.createServer().createChannel()` instead of `.createListener()`'
);

Service.prototype.emit = util.deprecate(
  function (name, req, channel, cb) {
    if (!channel || !this.equals(channel.client._svc$)) {
      throw new Error('invalid emitter');
    }

    var client = channel.client;
    // In case the method is overridden.
    Client.prototype.emitMessage.call(client, name, req, cb && cb.bind(this));
    return channel.getPending();
  },
  'create a client via `.createClient()` to emit messages instead of `.emit()`'
);

Service.prototype.equals = util.deprecate(
  function (any) {
    return (
      Service.isService(any) &&
      this.getFingerprint().equals(any.getFingerprint())
    );
  },
  'equality testing is deprecated, compare the `.protocol`s instead'
);

Service.prototype.getFingerprint = util.deprecate(
  function (algorithm) {
    return utils.getHash(JSON.stringify(this.protocol), algorithm);
  },
  'use `.hash` instead of `.getFingerprint()`'
);

Service.prototype.getSchema = util.deprecate(
  Type.prototype.getSchema,
  'use `.protocol` instead of `.getSchema()`'
);

Service.prototype.on = util.deprecate(
  function (name, handler) {
    var self = this; // This protocol.
    this._server.onMessage(name, function (req, cb) {
      return handler.call(self, req, this.channel, cb);
    });
    return this;
  },
  'use `.createServer().onMessage()` instead of `.on()`'
);

Service.prototype.subprotocol = util.deprecate(
  function () {
    var parent = this._server;
    var opts = {strictTypes: parent._strict, cache: parent._cache};
    var server = new Server(parent.service, opts);
    server._handlers = Object.create(parent._handlers);
    return new Service(
      this.name,
      this._messagesByName,
      this._typesByName,
      this.protocol,
      server
    );
  },
  '`.subprotocol()` will be removed in 5.1'
);

Service.prototype._attrs = function (opts) {
  var ptcl = {protocol: this.name};

  var types = [];
  this.types.forEach(function (t) {
    if (t.getName() === undefined) {
      // Don't include any unnamed types (e.g. primitives).
      return;
    }
    var typeSchema = t._attrs(opts);
    if (typeof typeSchema != 'string') {
      // Some of the named types might already have been defined in a
      // previous type, in this case we don't include its reference.
      types.push(typeSchema);
    }
  });
  if (types.length) {
    ptcl.types = types;
  }

  var msgNames = Object.keys(this._messagesByName);
  if (msgNames.length) {
    ptcl.messages = {};
    msgNames.forEach(function (name) {
      ptcl.messages[name] = this._messagesByName[name]._attrs(opts);
    }, this);
  }

  if (opts && opts.exportAttrs && this.doc !== undefined) {
    ptcl.doc = this.doc;
  }
  return ptcl;
};

/** Function to retrieve a remote service's protocol. */
function discoverProtocol(transport, opts, cb) {
  if (cb === undefined && typeof opts == 'function') {
    cb = opts;
    opts = undefined;
  }

  var svc = new Service({protocol: 'Empty'}, OPTS);
  var ptclStr;
  svc.createClient({timeout: opts && opts.timeout})
    .createChannel(transport, {
      scope: opts && opts.scope,
      endWritable: typeof transport == 'function' // Stateless transports only.
    }).once('handshake', function (hreq, hres) {
        ptclStr = hres.serverProtocol;
        this.destroy(true);
      })
      .once('eot', function (pending, err) {
        // Stateless transports will throw an interrupted error when the
        // channel is destroyed, we ignore it here.
        if (err && !/interrupted/.test(err)) {
          cb(err); // Likely timeout.
        } else {
          cb(null, JSON.parse(ptclStr));
        }
      });
}

/** Load-balanced message sender. */
function Client(svc, opts) {
  opts = opts || {};
  events.EventEmitter.call(this);

  // We have to suffix all client properties to be safe, since the message
  // names aren't prefixed with clients (unlike servers).
  this._svc$ = svc;
  this._channels$ = []; // Active channels.
  this._fns$ = []; // Middleware functions.

  this._buffering$ = !!opts.buffering;
  this._cache$ = opts.cache || {}; // For backwards compatibility.
  this._policy$ = opts.channelPolicy;
  this._strict$ = !!opts.strictTypes;
  this._timeout$ = utils.getOption(opts, 'timeout', 10000);

  if (opts.remoteProtocols) {
    insertRemoteProtocols(this._cache$, opts.remoteProtocols, svc, true);
  }

  this._svc$.messages.forEach(function (msg) {
    this[msg.name] = this._createMessageHandler$(msg);
  }, this);
}
util.inherits(Client, events.EventEmitter);

Client.prototype.activeChannels = function () {
  return this._channels$.slice();
};

Client.prototype.createChannel = function (transport, opts) {
  var objectMode = opts && opts.objectMode;
  var channel;
  if (typeof transport == 'function') {
    var writableFactory;
    if (objectMode) {
      writableFactory = transport;
    } else {
      // We provide a default standard-compliant codec. This should support
      // most use-cases (for example when speaking to the official Java and
      // Python implementations over HTTP, or when this library is used for
      // both the emitting and listening sides).
      writableFactory = function (cb) {
        var encoder = new FrameEncoder();
        var writable = transport(function (err, readable) {
          if (err) {
            cb(err);
            return;
          }
          // Since the decoder isn't exposed (so can't have an error handler
          // attached, we forward any errors to the client). Since errors would
          // only get thrown when the decoder flushes (if there is trailing
          // data), at which point the source will have ended, there is no need
          // to add re-piping logic (destination errors trigger an unpipe).
          var decoder = new FrameDecoder()
            .once('error', function (err) { channel.destroy(err); });
          cb(null, readable.pipe(decoder));
        });
        if (writable) {
          encoder.pipe(writable);
          return encoder;
        }
      };
    }
    channel = new StatelessClientChannel(this, writableFactory, opts);
  } else {
    var readable, writable;
    if (isStream(transport)) {
      readable = writable = transport;
    } else {
      readable = transport.readable;
      writable = transport.writable;
    }
    if (!objectMode) {
      // To ease communication with Java servers, we provide a default codec
      // compatible with Java servers' `NettyTransportCodec`'s implementation.
      var decoder = new NettyDecoder();
      readable = readable.pipe(decoder);
      var encoder = new NettyEncoder();
      encoder.pipe(writable);
      writable = encoder;
    }
    channel = new StatefulClientChannel(this, readable, writable, opts);
    if (!objectMode) {
      // Since we never expose the automatically created encoder and decoder,
      // we release them ourselves here when the channel ends. (Unlike for
      // stateless channels, it is conceivable for the underlying stream to be
      // reused afterwards).
      channel.once('eot', function () {
        readable.unpipe(decoder);
        encoder.unpipe(writable);
      });
      // We also forward any (trailing data) error.
      decoder.once('error', function (err) { channel.destroy(err); });
    }
  }
  var channels = this._channels$;
  channels.push(channel);
  channel.once('_drain', function () {
    // Remove the channel from the list of active ones.
    channels.splice(channels.indexOf(this), 1);
  });
  // We restrict buffering to startup, otherwise we risk silently hiding errors
  // (especially since channel timeouts don't apply yet).
  this._buffering$ = false;
  this.emit('channel', channel);
  return channel;
};

Client.prototype.destroyChannels = function (opts) {
  this._channels$.forEach(function (channel) {
    channel.destroy(opts && opts.noWait);
  });
};

Client.prototype.emitMessage = function (name, req, opts, cb) {
  var msg = getExistingMessage(this._svc$, name);
  var wreq = new WrappedRequest(msg, {}, req);
  this._emitMessage$(wreq, opts, cb);
};

Client.prototype.remoteProtocols = function () {
  return getRemoteProtocols(this._cache$, true);
};

Object.defineProperty(Client.prototype, 'service', {
  enumerable: true,
  get: function () { return this._svc$; }
});

Client.prototype.use = function (/* fn ... */) {
  var i, l, fn;
  for (i = 0, l = arguments.length; i < l; i++) {
    fn = arguments[i];
    this._fns$.push(fn.length < 3 ? fn(this) : fn);
  }
  return this;
};

Client.prototype._emitMessage$ = function (wreq, opts, cb) {
  // Common logic between `client.emitMessage` and the "named" message methods.
  if (!cb && typeof opts === 'function') {
    cb = opts;
    opts = undefined;
  }
  var self = this;
  var channels = this._channels$;
  var numChannels = channels.length;
  if (!numChannels) {
    if (this._buffering$) {
      debug('no active client channels, buffering call');
      this.once('channel', function () {
        this._emitMessage$(wreq, opts, cb);
      });
    } else {
      var err = new Error('no active channels');
      process.nextTick(function () {
        if (cb) {
          cb.call(new CallContext(wreq._msg), err);
        } else {
          self.emit('error', err);
        }
      });
    }
    return;
  }

  opts = opts || {};
  if (opts.timeout === undefined) {
    opts.timeout = this._timeout$;
  }

  var channel;
  if (numChannels === 1) {
    // Common case, optimized away.
    channel = channels[0];
  } else if (this._policy$) {
    channel = this._policy$(this._channels$.slice());
    if (!channel) {
      debug('policy returned no channel, skipping call');
      return;
    }
  } else {
    // Random selection, cheap and likely good enough for most use-cases.
    channel = channels[Math.floor(Math.random() * numChannels)];
  }

  channel._emit(wreq, opts, function (err, wres) {
    var ctx = this; // Call context.
    var errType = ctx.message.errorType;
    if (err) {
      // System error, likely the message wasn't sent (or an error occurred
      // while decoding the response).
      if (self._strict$) {
        err = errType.clone(err.message, {wrapUnions: true});
      }
      done(err);
      return;
    }
    if (!wres) {
      // This is a one way message.
      done();
      return;
    }
    // Message transmission succeeded, we transmit the message data; massaging
    // any error strings into actual `Error` objects in non-strict mode.
    err = wres.error;
    if (!self._strict$) {
      // Try to coerce an eventual error into more idiomatic JavaScript types:
      // `undefined` becomes `null` and a remote string "system" error is
      // wrapped inside an actual `Error` object.
      if (err === undefined) {
        err = null;
      } else {
        if (Type.isType(errType, 'union:unwrapped')) {
          if (typeof err == 'string') {
            err = new Error(err);
          }
        } else if (err && err.string && typeof err.string == 'string') {
          err = new Error(err.string);
        }
      }
    }
    done(err, wres.response);

    function done(err, res) {
      if (cb) {
        cb.call(ctx, err, res);
      } else if (err) {
        self.emit('error', err);
      }
    }
  });
};

Client.prototype._createMessageHandler$ = function (msg) {
  // jshint -W054
  var fields = msg.requestType.getFields();
  var names = fields.map(function (f) { return f.getName(); });
  var body = 'return function ' + msg.name + '(';
  if (names.length) {
    body += names.join(', ') + ', ';
  }
  body += 'opts, cb) {\n';
  body += '  var req = {';
  body += names.map(function (n) { return n + ': ' + n; }).join(', ');
  body += '};\n';
  body += '  return this.emitMessage(\'' + msg.name + '\', req, opts, cb);\n';
  body += '};';
  return (new Function(body))();
};

/** Message receiver. */
function Server(svc, opts) {
  opts = opts || {};
  events.EventEmitter.call(this);

  this.service = svc;
  this._handlers = {};
  this._fns = []; // Middleware functions.
  this._channels = {}; // Active channels.
  this._nextChannelId = 1;

  this._cache = opts.cache || {}; // Deprecated.
  this._defaultHandler = opts.defaultHandler;
  this._sysErrFormatter = opts.systemErrorFormatter;
  this._silent = !!opts.silent;
  this._strict = !!opts.strictTypes;

  if (opts.remoteProtocols) {
    insertRemoteProtocols(this._cache, opts.remoteProtocols, svc, false);
  }

  svc.messages.forEach(function (msg) {
    var name = msg.name;
    if (!opts.noCapitalize) {
      name = utils.capitalize(name);
    }
    this['on' + name] = this._createMessageHandler(msg);
  }, this);
}
util.inherits(Server, events.EventEmitter);

Server.prototype.activeChannels = function () {
  return utils.objectValues(this._channels);
};

Server.prototype.createChannel = function (transport, opts) {
  var objectMode = opts && opts.objectMode;
  var channel;
  if (typeof transport == 'function') {
    var readableFactory;
    if (objectMode) {
      readableFactory = transport;
    } else {
      readableFactory = function (cb) {
        var decoder = new FrameDecoder()
          .once('error', function (err) { channel.destroy(err); });
        return transport(function (err, writable) {
          if (err) {
            cb(err);
            return;
          }
          var encoder = new FrameEncoder();
          encoder.pipe(writable);
          cb(null, encoder);
        }).pipe(decoder);
      };
    }
    channel = new StatelessServerChannel(this, readableFactory, opts);
  } else {
    var readable, writable;
    if (isStream(transport)) {
      readable = writable = transport;
    } else {
      readable = transport.readable;
      writable = transport.writable;
    }
    if (!objectMode) {
      var decoder = new NettyDecoder();
      readable = readable.pipe(decoder);
      var encoder = new NettyEncoder();
      encoder.pipe(writable);
      writable = encoder;
    }
    channel = new StatefulServerChannel(this, readable, writable, opts);
    if (!objectMode) {
      // Similar to client channels, since we never expose the encoder and
      // decoder, we must release them ourselves here.
      channel.once('eot', function () {
        readable.unpipe(decoder);
        encoder.unpipe(writable);
      });
      decoder.once('error', function (err) { channel.destroy(err); });
    }
  }

  if (!this.listeners('error').length) {
    this.on('error', this._onError);
  }
  var channelId = this._nextChannelId++;
  var channels = this._channels;
  channels[channelId] = channel
    .once('eot', function () { delete channels[channelId]; });
  this.emit('channel', channel);
  return channel;
};

Server.prototype.onMessage = function (name, handler) {
  getExistingMessage(this.service, name); // Check message existence.
  this._handlers[name] = handler;
  return this;
};

Server.prototype.remoteProtocols = function () {
  return getRemoteProtocols(this._cache, false);
};

Server.prototype.use = function (/* fn ... */) {
  var i, l, fn;
  for (i = 0, l = arguments.length; i < l; i++) {
    fn = arguments[i];
    this._fns.push(fn.length < 3 ? fn(this) : fn);
  }
  return this;
};

Server.prototype._createMessageHandler = function (msg) {
  // jshint -W054
  var name = msg.name;
  var fields = msg.requestType.fields;
  var numArgs = fields.length;
  var args = fields.length ?
    ', ' + fields.map(function (f) { return 'req.' + f.name; }).join(', ') :
    '';
  // We are careful to not lose the initial handler's number of arguments (or
  // more specifically whether it would have access to the callback or not).
  // This is useful to implement "smart promisification" logic downstream.
  var body = 'return function (handler) {\n';
  body += '  if (handler.length > ' + numArgs + ') {\n';
  body += '    return this.onMessage(\'' + name + '\', function (req, cb) {\n';
  body += '      return handler.call(this' + args + ', cb);\n';
  body += '    });\n';
  body += '  } else {\n';
  body += '    return this.onMessage(\'' + name + '\', function (req) {\n';
  body += '      return handler.call(this' + args + ');\n';
  body += '    });\n';
  body += '  }\n';
  body += '};\n';
  return (new Function(body))();
};

Server.prototype._onError = function (err) {
  /* istanbul ignore if */
  if (!this._silent && err.rpcCode !== 'UNKNOWN_PROTOCOL') {
    console.error();
    if (err.rpcCode) {
      console.error(err.rpcCode);
      console.error(err.cause);
    } else {
      console.error('INTERNAL_SERVER_ERROR');
      console.error(err);
    }
  }
};

/** Base message emitter class. See below for the two available variants. */
function ClientChannel(client, opts) {
  opts = opts || {};
  events.EventEmitter.call(this);

  this.client = client;
  this.timeout = utils.getOption(opts, 'timeout', client._timeout$);
  this._endWritable = !!utils.getOption(opts, 'endWritable', true);
  this._prefix = normalizedPrefix(opts.scope);

  var cache = client._cache$;
  var clientSvc = client._svc$;
  var hash = opts.serverHash;
  if (!hash) {
    hash = clientSvc.hash;
  }
  var adapter = cache[hash];
  if (!adapter) {
    // This might happen even if the server hash option was set if the cache
    // doesn't contain the corresponding adapter. In this case we fall back to
    // the client's protocol (as mandated by the spec).
    hash = clientSvc.hash;
    adapter = cache[hash] = new Adapter(clientSvc, clientSvc, hash);
  }
  this._adapter = adapter;

  this._registry = new Registry(this, PREFIX_LENGTH);
  this.pending = 0;
  this.destroyed = false;
  this.draining = false;
  this.once('_eot', function (pending, err) {
    // Since this listener is only run once, we will only forward an error if
    // it is present during the initial `destroy` call, which is OK.
    debug('client channel EOT');
    this.destroyed = true;
    this.emit('eot', pending, err);
  });
}
util.inherits(ClientChannel, events.EventEmitter);

ClientChannel.prototype.destroy = function (noWait) {
  debug('destroying client channel');
  if (!this.draining) {
    this.draining = true;
    this.emit('_drain');
  }
  var registry = this._registry;
  var pending = this.pending;
  if (noWait) {
    registry.clear();
  }
  if (noWait || !pending) {
    if (isError(noWait)) {
      debug('fatal client channel error: %s', noWait);
      this.emit('_eot', pending, noWait);
    } else {
      this.emit('_eot', pending);
    }
  } else {
    debug('client channel entering drain mode (%s pending)', pending);
  }
};

ClientChannel.prototype.ping = function (timeout, cb) {
  if (!cb && typeof timeout == 'function') {
    cb = timeout;
    timeout = undefined;
  }
  var self = this;
  var wreq = new WrappedRequest(PING_MESSAGE);
  this._emit(wreq, {timeout: timeout}, function (err) {
    if (cb) {
      cb.call(self, err);
    } else if (err) {
      self.destroy(err);
    }
  });
};

ClientChannel.prototype._createHandshakeRequest = function (adapter, noSvc) {
  var svc = this.client._svc$;
  return {
    clientHash: svc.hash,
    clientProtocol: noSvc ? null : JSON.stringify(svc.protocol),
    serverHash: adapter._hash
  };
};

ClientChannel.prototype._emit = function (wreq, opts, cb) {
  var msg = wreq._msg;
  var wres = msg.oneWay ? undefined : new WrappedResponse(msg, {});
  var ctx = new CallContext(msg, this);
  var self = this;
  this.pending++;
  process.nextTick(function () {
    if (!msg.name) {
      // Ping request, bypass middleware.
      onTransition(wreq, wres, onCompletion);
    } else {
      self.emit('outgoingCall', ctx, opts);
      var fns = self.client._fns$;
      debug('starting client middleware chain (%s middleware)', fns.length);
      chainMiddleware({
        fns: fns,
        ctx: ctx,
        wreq: wreq,
        wres: wres,
        onTransition: onTransition,
        onCompletion: onCompletion,
        onError: onError
      });
    }
  });

  function onTransition(wreq, wres, prev) {
    // Serialize the message.
    var err, reqBuf;
    if (self.destroyed) {
      err = new Error('channel destroyed');
    } else {
      try {
        reqBuf = wreq.toBuffer();
      } catch (cause) {
        err = serializationError(
          f('invalid %j request', msg.name),
          wreq,
          [
            {name: 'headers', type: MAP_BYTES_TYPE},
            {name: 'request', type: msg.requestType}
          ]
        );
      }
    }
    if (err) {
      prev(err);
      return;
    }

    // Generate the response callback.
    var timeout = (opts && opts.timeout !== undefined) ?
      opts.timeout :
      self.timeout;
    var id = self._registry.add(timeout, function (err, resBuf, adapter) {
      if (!err && !msg.oneWay) {
        try {
          adapter._decodeResponse(resBuf, wres, msg);
        } catch (cause) {
          err = cause;
        }
      }
      prev(err);
    });
    id |= self._prefix;

    debug('sending message %s', id);
    self._send(id, reqBuf, !!msg && msg.oneWay);
  }

  function onCompletion(err) {
    self.pending--;
    cb.call(ctx, err, wres);
    if (self.draining && !self.destroyed && !self.pending) {
      self.destroy();
    }
  }

  function onError(err) {
    // This will happen if a middleware callback is called multiple times. We
    // forward the error to the client rather than emit it on the channel since
    // middleware are a client-level abstraction, so better handled there.
    self.client.emit('error', err, self);
  }
};

ClientChannel.prototype._getAdapter = function (hres) {
  var hash = hres.serverHash;
  var cache = this.client._cache$;
  var adapter = cache[hash];
  if (adapter) {
    return adapter;
  }
  var ptcl = JSON.parse(hres.serverProtocol);
  var serverSvc = Service.forProtocol(ptcl);
  adapter = new Adapter(this.client._svc$, serverSvc, hash, true);
  return cache[hash] = adapter;
};

ClientChannel.prototype._matchesPrefix = function (id) {
  return matchesPrefix(id, this._prefix);
};

ClientChannel.prototype._send = utils.abstractFunction;

// Deprecated.

utils.addDeprecatedGetters(ClientChannel, ['pending', 'timeout']);

ClientChannel.prototype.getCache = util.deprecate(
  function () { return this.client._cache$; },
  'use `.remoteProtocols()` instead of `.getCache()`'
);

ClientChannel.prototype.getProtocol = util.deprecate(
  function () {
    return this.client._svc$;
  },
  'use `.service` instead or `.getProtocol()`'
);

ClientChannel.prototype.isDestroyed = util.deprecate(
  function () { return this.destroyed; },
  'use `.destroyed` instead of `.isDestroyed`'
);

/**
 * Factory-based client channel.
 *
 * This channel doesn't keep a persistent connection to the server and requires
 * prepending a handshake to each message emitted. Usage examples include
 * talking to an HTTP server (where the factory returns an HTTP request).
 *
 * Since each message will use its own writable/readable stream pair, the
 * advantage of this channel is that it is able to keep track of which response
 * corresponds to each request without relying on transport ordering. In
 * particular, this means these channels are compatible with any server
 * implementation.
 */
function StatelessClientChannel(client, writableFactory, opts) {
  ClientChannel.call(this, client, opts);
  this._writableFactory = writableFactory;

  if (!opts || !opts.noPing) {
    // Ping the server to check whether the remote protocol is compatible.
    // If not, this will throw an error on the channel.
    debug('emitting ping request');
    this.ping();
  }
}
util.inherits(StatelessClientChannel, ClientChannel);

StatelessClientChannel.prototype._send = function (id, reqBuf) {
  var cb = this._registry.get(id);
  var adapter = this._adapter;
  var self = this;
  process.nextTick(emit);
  return true;

  function emit(retry) {
    if (self.destroyed) {
      // The request's callback will already have been called.
      return;
    }

    var hreq = self._createHandshakeRequest(adapter, !retry);

    var writable = self._writableFactory.call(self, function (err, readable) {
      if (err) {
        cb(err);
        return;
      }
      readable.on('data', function (obj) {
        debug('received response %s', obj.id);
        // We don't check that the prefix matches since the ID likely hasn't
        // been propagated to the response (see default stateless codec).
        var buf = Buffer.concat(obj.payload);
        try {
          var parts = readHead(HANDSHAKE_RESPONSE_TYPE, buf);
          var hres = parts.head;
          if (hres.serverHash) {
            adapter = self._getAdapter(hres);
          }
        } catch (cause) {
          cb(cause);
          return;
        }
        var match = hres.match;
        debug('handshake match: %s', match);
        self.emit('handshake', hreq, hres);
        if (match === 'NONE') {
          // Try again, including the full protocol this time.
          process.nextTick(function() { emit(true); });
        } else {
          // Change the default adapter.
          self._adapter = adapter;
          cb(null, parts.tail, adapter);
        }
      });
    });
    if (!writable) {
      cb(new Error('invalid writable stream'));
      return;
    }
    writable.write({
      id: id,
      payload: [HANDSHAKE_REQUEST_TYPE.toBuffer(hreq), reqBuf]
    });
    if (self._endWritable) {
      writable.end();
    }
  }
};

/**
 * Multiplexing client channel.
 *
 * These channels reuse the same streams (both readable and writable) for all
 * messages. This avoids a lot of overhead (e.g. creating new connections,
 * re-issuing handshakes) but requires the underlying transport to support
 * forwarding message IDs.
 */
function StatefulClientChannel(client, readable, writable, opts) {
  ClientChannel.call(this, client, opts);
  this._readable = readable;
  this._writable = writable;
  this._connected = !!(opts && opts.noPing);
  this._readable.on('end', onEnd);
  this._writable.on('finish', onFinish);

  var self = this;
  var timer = null;
  this.once('eot', function () {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!self._connected) {
      // Clear any buffered calls (they are guaranteed to error out when
      // reaching the transition phase).
      self.emit('_ready');
    }
    // Remove references to this channel to avoid potential memory leaks.
    this._writable.removeListener('finish', onFinish);
    if (this._endWritable) {
      debug('ending transport');
      this._writable.end();
    }
    this._readable
      .removeListener('data', onPing)
      .removeListener('data', onMessage)
      .removeListener('end', onEnd);
  });

  var hreq; // For handshake events.
  if (this._connected) {
    this._readable.on('data', onMessage);
  } else {
    this._readable.on('data', onPing);
    process.nextTick(ping);
    if (self.timeout) {
      timer = setTimeout(function () {
        self.destroy(new Error('timeout'));
      }, self.timeout);
    }
  }

  function ping(retry) {
    if (self.destroyed) {
      return;
    }
    hreq = self._createHandshakeRequest(self._adapter, !retry);
    var payload = [
      HANDSHAKE_REQUEST_TYPE.toBuffer(hreq),
      utils.bufferFrom([0, 0]) // No header, no data (empty message name).
    ];
    // We can use a static ID here since we are guaranteed that this message is
    // the only one on the channel (for this scope at least).
    self._writable.write({id: self._prefix, payload: payload});
  }

  function onPing(obj) {
    if (!self._matchesPrefix(obj.id)) {
      debug('discarding unscoped response %s (still connecting)', obj.id);
      return;
    }
    var buf = Buffer.concat(obj.payload);
    try {
      var hres = readHead(HANDSHAKE_RESPONSE_TYPE, buf).head;
      if (hres.serverHash) {
        self._adapter = self._getAdapter(hres);
      }
    } catch (cause) {
      // This isn't a recoverable error.
      self.destroy(cause);
      return;
    }
    var match = hres.match;
    debug('handshake match: %s', match);
    self.emit('handshake', hreq, hres);
    if (match === 'NONE') {
      process.nextTick(function () { ping(true); });
    } else {
      debug('successfully connected');
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      self._readable.removeListener('data', onPing).on('data', onMessage);
      self._connected = true;
      self.emit('_ready');
      hreq = null; // Release reference.
    }
  }

  // Callback used after a connection has been established.
  function onMessage(obj) {
    var id = obj.id;
    if (!self._matchesPrefix(id)) {
      debug('discarding unscoped message %s', id);
      return;
    }
    var cb = self._registry.get(id);
    if (cb) {
      process.nextTick(function () {
        debug('received message %s', id);
        // Ensure that the initial callback gets called asynchronously, even
        // for completely synchronous transports (otherwise the number of
        // pending requests will sometimes be inconsistent between stateful and
        // stateless transports).
        cb(null, Buffer.concat(obj.payload), self._adapter);
      });
    }
  }

  function onEnd() { self.destroy(true); }
  function onFinish() { self.destroy(); }
}
util.inherits(StatefulClientChannel, ClientChannel);

StatefulClientChannel.prototype._emit = function () {
  // Override this method to allow calling `_emit` even before the channel is
  // connected. Note that we don't perform this logic in `_send` since we want
  // to guarantee that `'handshake'` events are emitted before any
  // `'outgoingCall'` events.
  if (this._connected || this.draining) {
    ClientChannel.prototype._emit.apply(this, arguments);
  } else {
    debug('queuing request');
    var args = [];
    var i, l;
    for (i = 0, l = arguments.length; i < l; i++) {
      args.push(arguments[i]);
    }
    this.once('_ready', function () { this._emit.apply(this, args); });
  }
};

StatefulClientChannel.prototype._send = function (id, reqBuf, oneWay) {
  if (oneWay) {
    var self = this;
    // Clear the callback, passing in an empty header.
    process.nextTick(function () {
      self._registry.get(id)(null, utils.bufferFrom([0, 0, 0]), self._adapter);
    });
  }
  return this._writable.write({id: id, payload: [reqBuf]});
};

/** The server-side emitter equivalent. */
function ServerChannel(server, opts) {
  opts = opts || {};
  events.EventEmitter.call(this);

  this.server = server;
  this._endWritable = !!utils.getOption(opts, 'endWritable', true);
  this._prefix = normalizedPrefix(opts.scope);

  var cache = server._cache;
  var svc = server.service;
  var hash = svc.hash;
  if (!cache[hash]) {
    // Add the channel's protocol to the cache if it isn't already there. This
    // will save a handshake the first time on channels with the same protocol.
    cache[hash] = new Adapter(svc, svc, hash);
  }
  this._adapter = null;

  this.destroyed = false;
  this.draining = false;
  this.pending = 0;
  this.once('_eot', function (pending, err) {
    debug('server channel EOT');
    this.emit('eot', pending, err);
  });
}
util.inherits(ServerChannel, events.EventEmitter);

ServerChannel.prototype.destroy = function (noWait) {
  if (!this.draining) {
    this.draining = true;
    this.emit('_drain');
  }
  if (noWait || !this.pending) {
    this.destroyed = true;
    if (isError(noWait)) {
      debug('fatal server channel error: %s', noWait);
      this.emit('_eot', this.pending, noWait);
    } else {
      this.emit('_eot', this.pending);
    }
  }
};

ServerChannel.prototype._createHandshakeResponse = function (err, hreq) {
  var svc = this.server.service;
  var buf = svc.hash;
  var serverMatch = hreq && hreq.serverHash.equals(buf);
  return {
    match: err ? 'NONE' : (serverMatch ? 'BOTH' : 'CLIENT'),
    serverProtocol: serverMatch ? null : JSON.stringify(svc.protocol),
    serverHash: serverMatch ? null : buf
  };
};

ServerChannel.prototype._getAdapter = function (hreq) {
  var hash = hreq.clientHash;
  var adapter = this.server._cache[hash];
  if (adapter) {
    return adapter;
  }
  if (!hreq.clientProtocol) {
    throw toRpcError('UNKNOWN_PROTOCOL');
  }
  var ptcl = JSON.parse(hreq.clientProtocol);
  var clientSvc = Service.forProtocol(ptcl);
  adapter = new Adapter(clientSvc, this.server.service, hash, true);
  return this.server._cache[hash] = adapter;
};

ServerChannel.prototype._matchesPrefix = function (id) {
  return matchesPrefix(id, this._prefix);
};

ServerChannel.prototype._receive = function (reqBuf, adapter, cb) {
  var self = this;
  var wreq;
  try {
    wreq = adapter._decodeRequest(reqBuf);
  } catch (cause) {
    cb(self._encodeSystemError(toRpcError('INVALID_REQUEST', cause)));
    return;
  }

  var msg = wreq._msg;
  var wres = new WrappedResponse(msg, {});
  if (!msg.name) {
    // Ping message, we don't invoke middleware logic in this case.
    wres.response = null;
    cb(wres.toBuffer(), false);
    return;
  }

  var ctx = new CallContext(msg, this);
  self.emit('incomingCall', ctx);
  var fns = this.server._fns;
  debug('starting server middleware chain (%s middleware)', fns.length);
  self.pending++;
  chainMiddleware({
    fns: fns,
    ctx: ctx,
    wreq: wreq,
    wres: wres,
    onTransition: onTransition,
    onCompletion: onCompletion,
    onError: onError
  });

  function onTransition(wreq, wres, prev) {
    var handler = self.server._handlers[msg.name];
    if (!handler) {
      // The underlying service hasn't implemented a handler.
      var defaultHandler = self.server._defaultHandler;
      if (defaultHandler) {
        // We call the default handler with arguments similar (slightly
        // simpler, there are no phases here) to middleware such that it can
        // easily access the message name (useful to implement proxies).
        defaultHandler.call(ctx, wreq, wres, prev);
      } else {
        var cause = new Error(f('no handler for %s', msg.name));
        prev(toRpcError('NOT_IMPLEMENTED', cause));
      }
    } else {
      var pending = !msg.oneWay;
      try {
        if (pending) {
          handler.call(ctx, wreq.request, function (err, res) {
            pending = false;
            wres.error = err;
            wres.response = res;
            prev();
          });
        } else {
          handler.call(ctx, wreq.request);
          prev();
        }
      } catch (err) {
        // We catch synchronous failures (same as express) and return the
        // failure. Note that the server process can still crash if an error
        // is thrown after the handler returns but before the response is
        // sent (again, same as express). We are careful to only trigger the
        // response callback once, emitting the errors afterwards instead.
        if (pending) {
          pending = false;
          prev(err);
        } else {
          onError(err);
        }
      }
    }
  }

  function onCompletion(err) {
    self.pending--;
    var server = self.server;
    var resBuf;
    if (!err) {
      var resErr = wres.error;
      var isStrict = server._strict;
      if (!isStrict) {
        if (isError(resErr)) {
          // If the error type is wrapped, we must wrap the error too.
          wres.error = msg.errorType.clone(resErr.message, {wrapUnions: true});
        } else if (resErr === null) {
          // We also allow `null`'s as error in this mode, converting them to
          // the Avro-compatible `undefined`.
          resErr = wres.error = undefined;
        }
        if (
          resErr === undefined &&
          wres.response === undefined &&
          msg.responseType.isValid(null)
        ) {
          // Finally, for messages with `null` as acceptable response type, we
          // allow `undefined`; converting them to `null`. This allows users to
          // write a more natural `cb()` instead of `cb(null, null)`.
          wres.response = null;
        }
      }
      try {
        resBuf = wres.toBuffer();
      } catch (cause) {
        // Note that we don't add an RPC code here such that the client
        // receives the default `INTERNAL_SERVER_ERROR` one.
        if (wres.error !== undefined) {
          err = serializationError(
            f('invalid %j error', msg.name), // Sic.
            wres,
            [
              {name: 'headers', type: MAP_BYTES_TYPE},
              {name: 'error', type: msg.errorType}
            ]
          );
        } else {
          err = serializationError(
            f('invalid %j response', msg.name),
            wres,
            [
              {name: 'headers', type: MAP_BYTES_TYPE},
              {name: 'response', type: msg.responseType}
            ]
          );
        }
      }
    }
    if (!resBuf) {
      // The headers are only available if the message isn't one-way.
      resBuf = self._encodeSystemError(err, wres.headers);
    } else if (resErr !== undefined) {
      server.emit('error', toRpcError('APPLICATION_ERROR', resErr));
    }
    cb(resBuf, msg.oneWay);
    if (self.draining && !self.pending) {
      self.destroy();
    }
  }

  function onError(err) {
    // Similar to the client equivalent, we redirect this error to the server
    // since middleware are defined at server-level.
    self.server.emit('error', err, self);
  }
};

// Deprecated.

utils.addDeprecatedGetters(ServerChannel, ['pending']);

ServerChannel.prototype.getCache = util.deprecate(
  function () { return this.server._cache; },
  'use `.remoteProtocols()` instead of `.getCache()`'
);

ServerChannel.prototype.getProtocol = util.deprecate(
  function () {
    return this.server.service;
  },
  'use `.service` instead of `.getProtocol()`'
);

ServerChannel.prototype.isDestroyed = util.deprecate(
  function () { return this.destroyed; },
  'use `.destroyed` instead of `.isDestroyed`'
);

/**
 * Encode an error and optional header into a valid Avro response.
 *
 * @param err {Error} Error to encode.
 * @param header {Object} Optional response header.
 */
ServerChannel.prototype._encodeSystemError = function (err, header) {
  var server = this.server;
  server.emit('error', err, this);
  var errStr;
  if (server._sysErrFormatter) {
    // Format the error into a string to send over the wire.
    errStr = server._sysErrFormatter.call(this, err);
  } else if (err.rpcCode) {
    // By default, only forward the error's message when the RPC code is set
    // (i.e. when this isn't an internal server error).
    errStr = err.message;
  }
  var hdrBuf;
  if (header) {
    try {
      // Propagate the header if possible.
      hdrBuf = MAP_BYTES_TYPE.toBuffer(header);
    } catch (cause) {
      server.emit('error', cause, this);
    }
  }
  return Buffer.concat([
    hdrBuf || utils.bufferFrom([0]),
    utils.bufferFrom([1, 0]), // Error flag and first union index.
    STRING_TYPE.toBuffer(errStr || 'internal server error')
  ]);
};

/**
 * Server channel for stateless transport.
 *
 * This channel expect a handshake to precede each message.
 */
function StatelessServerChannel(server, readableFactory, opts) {
  ServerChannel.call(this, server, opts);

  this._writable = undefined;
  var self = this;
  var readable;

  process.nextTick(function () {
    // Delay listening to allow handlers to be attached even if the factory is
    // purely synchronous.
    readable = readableFactory.call(self, function (err, writable) {
      process.nextTick(function () {
        // We delay once more here in case this call is synchronous, to allow
        // the readable to always be populated first.
        if (err) {
          onFinish(err);
          return;
        }
        self._writable = writable.on('finish', onFinish);
        self.emit('_writable');
      });
    }).on('data', onRequest).on('end', onEnd);
  });


  function onRequest(obj) {
    var id = obj.id;
    var buf = Buffer.concat(obj.payload);
    var err;
    try {
      var parts = readHead(HANDSHAKE_REQUEST_TYPE, buf);
      var hreq = parts.head;
      var adapter = self._getAdapter(hreq);
    } catch (cause) {
      err = toRpcError('INVALID_HANDSHAKE_REQUEST', cause);
    }

    var hres = self._createHandshakeResponse(err, hreq);
    self.emit('handshake', hreq, hres);
    if (err) {
      done(self._encodeSystemError(err));
    } else {
      self._receive(parts.tail, adapter, done);
    }

    function done(resBuf) {
      if (!self.destroyed) {
        if (!self._writable) {
          self.once('_writable', function () { done(resBuf); });
          return;
        }
        self._writable.write({
          id: id,
          payload: [HANDSHAKE_RESPONSE_TYPE.toBuffer(hres), resBuf]
        });
      }
      if (self._writable && self._endWritable) {
        self._writable.end();
      }
    }
  }

  function onEnd() { self.destroy(); }

  function onFinish(err) {
    readable
      .removeListener('data', onRequest)
      .removeListener('end', onEnd);
    self.destroy(err || true);
  }
}
util.inherits(StatelessServerChannel, ServerChannel);

/**
 * Stateful transport listener.
 *
 * A handshake is done when the channel first receives a message, then all
 * messages are sent without.
 */
function StatefulServerChannel(server, readable, writable, opts) {
  ServerChannel.call(this, server, opts);
  this._adapter = undefined;
  this._writable = writable.on('finish', onFinish);
  this._readable = readable.on('data', onHandshake).on('end', onEnd);

  this
    .once('_drain', function () {
      // Stop listening to incoming events.
      this._readable
        .removeListener('data', onHandshake)
        .removeListener('data', onRequest)
        .removeListener('end', onEnd);
    })
    .once('eot', function () {
      // Clean up any references to the channel on the underlying streams.
      this._writable.removeListener('finish', onFinish);
      if (this._endWritable) {
        this._writable.end();
      }
    });

  var self = this;

  function onHandshake(obj) {
    var id = obj.id;
    if (!self._matchesPrefix(id)) {
      return;
    }
    var buf = Buffer.concat(obj.payload);
    var err;
    try {
      var parts = readHead(HANDSHAKE_REQUEST_TYPE, buf);
      var hreq = parts.head;
      self._adapter = self._getAdapter(hreq);
    } catch (cause) {
      err = toRpcError('INVALID_HANDSHAKE_REQUEST', cause);
    }
    var hres = self._createHandshakeResponse(err, hreq);
    self.emit('handshake', hreq, hres);
    if (err) {
      // Either the client's protocol was unknown or it isn't compatible.
      done(self._encodeSystemError(err));
    } else {
      self._readable
        .removeListener('data', onHandshake)
        .on('data', onRequest);
      self._receive(parts.tail, self._adapter, done);
    }

    function done(resBuf) {
      if (self.destroyed) {
        return;
      }
      self._writable.write({
        id: id,
        payload: [HANDSHAKE_RESPONSE_TYPE.toBuffer(hres), resBuf]
      });
    }
  }

  function onRequest(obj) {
    // These requests are not prefixed with handshakes.
    var id = obj.id;
    if (!self._matchesPrefix(id)) {
      return;
    }
    var reqBuf = Buffer.concat(obj.payload);
    self._receive(reqBuf, self._adapter, function (resBuf, oneWay) {
      if (self.destroyed || oneWay) {
        return;
      }
      self._writable.write({id: id, payload: [resBuf]});
    });
  }

  function onEnd() { self.destroy(); }

  function onFinish() { self.destroy(true); }
}
util.inherits(StatefulServerChannel, ServerChannel);

// Helpers.

/** Enhanced request, used inside forward middleware functions. */
function WrappedRequest(msg, hdrs, req) {
  this._msg = msg;
  this.headers = hdrs || {};
  this.request = req || {};
}

WrappedRequest.prototype.toBuffer = function () {
  var msg = this._msg;
  return Buffer.concat([
    MAP_BYTES_TYPE.toBuffer(this.headers),
    STRING_TYPE.toBuffer(msg.name),
    msg.requestType.toBuffer(this.request)
  ]);
};

/** Enhanced response, used inside forward middleware functions. */
function WrappedResponse(msg, hdr, err, res) {
  this._msg = msg;
  this.headers = hdr;
  this.error = err;
  this.response = res;
}

WrappedResponse.prototype.toBuffer = function () {
  var hdr = MAP_BYTES_TYPE.toBuffer(this.headers);
  var hasError = this.error !== undefined;
  return Buffer.concat([
    hdr,
    BOOLEAN_TYPE.toBuffer(hasError),
    hasError ?
      this._msg.errorType.toBuffer(this.error) :
      this._msg.responseType.toBuffer(this.response)
  ]);
};

/**
 * Context for all middleware and handlers.
 *
 * It exposes a `locals` object which can be used to pass information between
 * each other during a given call.
 */
function CallContext(msg, channel) {
  this.channel = channel;
  this.locals = {};
  this.message = msg;
  Object.freeze(this);
}

/**
 * Callback registry.
 *
 * Callbacks added must accept an error as first argument. This is used by
 * client channels to store pending calls. This class isn't exposed by the
 * public API.
 */
function Registry(ctx, prefixLength) {
  this._ctx = ctx; // Context for all callbacks.
  this._mask = ~0 >>> (prefixLength | 0); // 16 bits by default.
  this._id = 0; // Unique integer ID for each call.
  this._n = 0; // Number of pending calls.
  this._cbs = {};
}

Registry.prototype.get = function (id) { return this._cbs[id & this._mask]; };

Registry.prototype.add = function (timeout, fn) {
  this._id = (this._id + 1) & this._mask;

  var self = this;
  var id = this._id;
  var timer;
  if (timeout > 0) {
    timer = setTimeout(function () { cb(new Error('timeout')); }, timeout);
  }

  this._cbs[id] = cb;
  this._n++;
  return id;

  function cb() {
    if (!self._cbs[id]) {
      // The callback has already run.
      return;
    }
    delete self._cbs[id];
    self._n--;
    if (timer) {
      clearTimeout(timer);
    }
    fn.apply(self._ctx, arguments);
  }
};

Registry.prototype.clear = function () {
  Object.keys(this._cbs).forEach(function (id) {
    this._cbs[id](new Error('interrupted'));
  }, this);
};

/**
 * Service resolution helper.
 *
 * It is used both by client and server channels, to respectively decode errors
 * and responses, or requests.
 */
function Adapter(clientSvc, serverSvc, hash, isRemote) {
  this._clientSvc = clientSvc;
  this._serverSvc = serverSvc;
  this._hash = hash; // Convenience to access it when creating handshakes.
  this._isRemote = !!isRemote;
  this._readers = createReaders(clientSvc, serverSvc);
}

Adapter.prototype._decodeRequest = function (buf) {
  var tap = new Tap(buf);
  var hdr = MAP_BYTES_TYPE._read(tap);
  var name = STRING_TYPE._read(tap);
  var msg, req;
  if (name) {
    msg = this._serverSvc.message(name);
    req = this._readers[name + '?']._read(tap);
  } else {
    msg = PING_MESSAGE;
  }
  if (!tap.isValid()) {
    throw new Error(f('truncated %s request', name || 'ping$'));
  }
  return new WrappedRequest(msg, hdr, req);
};

Adapter.prototype._decodeResponse = function (buf, wres, msg) {
  var tap = new Tap(buf);
  utils.copyOwnProperties(MAP_BYTES_TYPE._read(tap), wres.headers, true);
  var isError = BOOLEAN_TYPE._read(tap);
  var name = msg.name;
  if (name) {
    var reader = this._readers[name + (isError ? '*' : '!')];
    msg = this._clientSvc.message(name);
    if (isError) {
      wres.error = reader._read(tap);
    } else {
      wres.response = reader._read(tap);
    }
    if (!tap.isValid()) {
      throw new Error(f('truncated %s response', name));
    }
  } else {
    msg = PING_MESSAGE;
  }
};

/** Standard "un-framing" stream. */
function FrameDecoder() {
  stream.Transform.call(this, {readableObjectMode: true});
  this._id = undefined;
  this._buf = utils.newBuffer(0);
  this._bufs = [];

  this.on('finish', function () { this.push(null); });
}
util.inherits(FrameDecoder, stream.Transform);

FrameDecoder.prototype._transform = function (buf, encoding, cb) {
  buf = Buffer.concat([this._buf, buf]);
  var frameLength;
  while (
    buf.length >= 4 &&
    buf.length >= (frameLength = buf.readInt32BE(0)) + 4
  ) {
    if (frameLength) {
      this._bufs.push(buf.slice(4, frameLength + 4));
    } else {
      var bufs = this._bufs;
      this._bufs = [];
      this.push({id: null, payload: bufs});
    }
    buf = buf.slice(frameLength + 4);
  }
  this._buf = buf;
  cb();
};

FrameDecoder.prototype._flush = function (cb) {
  if (this._buf.length || this._bufs.length) {
    var bufs = this._bufs.slice();
    bufs.unshift(this._buf);
    var err = toRpcError('TRAILING_DATA');
    // Attach the data to help debugging (e.g. if the encoded bytes contain a
    // human-readable protocol like HTTP).
    err.trailingData = Buffer.concat(bufs).toString();
    this.emit('error', err);
  }
  cb();
};

/** Standard framing stream. */
function FrameEncoder() {
  stream.Transform.call(this, {writableObjectMode: true});
  this.on('finish', function () { this.push(null); });
}
util.inherits(FrameEncoder, stream.Transform);

FrameEncoder.prototype._transform = function (obj, encoding, cb) {
  var bufs = obj.payload;
  var i, l, buf;
  for (i = 0, l = bufs.length; i < l; i++) {
    buf = bufs[i];
    this.push(intBuffer(buf.length));
    this.push(buf);
  }
  this.push(intBuffer(0));
  cb();
};

/** Netty-compatible decoding stream. */
function NettyDecoder() {
  stream.Transform.call(this, {readableObjectMode: true});
  this._id = undefined;
  this._frameCount = 0;
  this._buf = utils.newBuffer(0);
  this._bufs = [];

  this.on('finish', function () { this.push(null); });
}
util.inherits(NettyDecoder, stream.Transform);

NettyDecoder.prototype._transform = function (buf, encoding, cb) {
  buf = Buffer.concat([this._buf, buf]);

  while (true) {
    if (this._id === undefined) {
      if (buf.length < 8) {
        this._buf = buf;
        cb();
        return;
      }
      this._id = buf.readInt32BE(0);
      this._frameCount = buf.readInt32BE(4);
      buf = buf.slice(8);
    }

    var frameLength;
    while (
      this._frameCount &&
      buf.length >= 4 &&
      buf.length >= (frameLength = buf.readInt32BE(0)) + 4
    ) {
      this._frameCount--;
      this._bufs.push(buf.slice(4, frameLength + 4));
      buf = buf.slice(frameLength + 4);
    }

    if (this._frameCount) {
      this._buf = buf;
      cb();
      return;
    } else {
      var obj = {id: this._id, payload: this._bufs};
      this._bufs = [];
      this._id = undefined;
      this.push(obj);
    }
  }
};

NettyDecoder.prototype._flush = FrameDecoder.prototype._flush;

/** Netty-compatible encoding stream. */
function NettyEncoder() {
  stream.Transform.call(this, {writableObjectMode: true});
  this.on('finish', function () { this.push(null); });
}
util.inherits(NettyEncoder, stream.Transform);

NettyEncoder.prototype._transform = function (obj, encoding, cb) {
  var bufs = obj.payload;
  var l = bufs.length;
  var buf;
  // Header: [ ID, number of frames ]
  buf = utils.newBuffer(8);
  buf.writeInt32BE(obj.id, 0);
  buf.writeInt32BE(l, 4);
  this.push(buf);
  // Frames, each: [ length, bytes ]
  var i;
  for (i = 0; i < l; i++) {
    buf = bufs[i];
    this.push(intBuffer(buf.length));
    this.push(buf);
  }
  cb();
};

/**
 * Returns a buffer containing an integer's big-endian representation.
 *
 * @param n {Number} Integer.
 */
function intBuffer(n) {
  var buf = utils.newBuffer(4);
  buf.writeInt32BE(n);
  return buf;
}

/**
 * Decode a type used as prefix inside a buffer.
 *
 * @param type {Type} The type of the prefix.
 * @param buf {Buffer} Encoded bytes.
 *
 * This function will return an object `{head, tail}` where head contains the
 * decoded value and tail the rest of the buffer. An error will be thrown if
 * the prefix cannot be decoded.
 */
function readHead(type, buf) {
  var tap = new Tap(buf);
  var head = type._read(tap);
  if (!tap.isValid()) {
    throw new Error(f('truncated %j', type.schema()));
  }
  return {head: head, tail: tap.buf.slice(tap.pos)};
}

/**
 * Generate a decoder, optimizing the case where reader and writer are equal.
 *
 * @param rtype {Type} Reader's type.
 * @param wtype {Type} Writer's type.
 */
function createReader(rtype, wtype) {
  return rtype.equals(wtype) ? rtype : rtype.createResolver(wtype);
}

/**
 * Generate all readers for a given protocol combination.
 *
 * @param clientSvc {Service} Client service.
 * @param serverSvc {Service} Client service.
 */
function createReaders(clientSvc, serverSvc) {
  var obj = {};
  clientSvc.messages.forEach(function (c) {
    var n = c.name;
    var s = serverSvc.message(n);
    try {
      if (!s) {
        throw new Error(f('missing server message: %s', n));
      }
      if (s.oneWay !== c.oneWay) {
        throw new Error(f('inconsistent one-way message: %s', n));
      }
      obj[n + '?'] = createReader(s.requestType, c.requestType);
      obj[n + '*'] = createReader(c.errorType, s.errorType);
      obj[n + '!'] = createReader(c.responseType, s.responseType);
    } catch (cause) {
      throw toRpcError('INCOMPATIBLE_PROTOCOL', cause);
    }
  });
  return obj;
}

/**
 * Populate a cache from a list of protocols.
 *
 * @param cache {Object} Cache of adapters.
 * @param svc {Service} The local service (either client or server).
 * @param ptcls {Array} Array of protocols to insert.
 * @param isClient {Boolean} Whether the local service is a client's or
 * server's.
 */
function insertRemoteProtocols(cache, ptcls, svc, isClient) {
  Object.keys(ptcls).forEach(function (hash) {
    var ptcl = ptcls[hash];
    var clientSvc, serverSvc;
    if (isClient) {
      clientSvc = svc;
      serverSvc = Service.forProtocol(ptcl);
    } else {
      clientSvc = Service.forProtocol(ptcl);
      serverSvc = svc;
    }
    cache[hash] = new Adapter(clientSvc, serverSvc, hash, true);
  });
}

/**
 * Extract remote protocols from a cache
 *
 * @param cache {Object} Cache of adapters.
 * @param isClient {Boolean} Whether the remote protocols extracted should be
 * the servers' or clients'.
 */
function getRemoteProtocols(cache, isClient) {
  var ptcls = {};
  Object.keys(cache).forEach(function (hs) {
    var adapter = cache[hs];
    if (adapter._isRemote) {
      var svc = isClient ? adapter._serverSvc : adapter._clientSvc;
      ptcls[hs] = svc.protocol;
    }
  });
  return ptcls;
}

/**
 * Check whether something is an `Error`.
 *
 * @param any {Object} Any object.
 */
function isError(any) {
  // Also not ideal, but avoids brittle `instanceof` checks.
  return !!any && Object.prototype.toString.call(any) === '[object Error]';
}

/**
 * Forward any errors emitted on the source to the destination.
 *
 * @param src {EventEmitter} The initial source of error events.
 * @param dst {EventEmitter} The new target of the source's error events. The
 * original source will be provided as second argument (the error being the
 * first).
 *
 * As a convenience, the source will be returned.
 */
function forwardErrors(src, dst) {
  return src.on('error', function (err) {
    dst.emit('error', err, src);
  });
}

/**
 * Create an error.
 *
 * @param msg {String} Error message.
 * @param cause {Error} The cause of the error. It is available as `cause`
 * field on the outer error.
 */
function toError(msg, cause) {
  var err = new Error(msg);
  err.cause = cause;
  return err;
}

/**
 * Mark an error.
 *
 * @param rpcCode {String} Code representing the failure.
 * @param cause {Error} The cause of the error. It is available as `cause`
 * field on the outer error.
 *
 * This is used to keep the argument of channels' `'error'` event errors.
 */
function toRpcError(rpcCode, cause) {
  var err = toError(rpcCode.toLowerCase().replace(/_/g, ' '), cause);
  err.rpcCode = (cause && cause.rpcCode) ? cause.rpcCode : rpcCode;
  return err;
}

/**
 * Provide a helpful error to identify why serialization failed.
 *
 * @param err {Error} The error to decorate.
 * @param obj {...} The object containing fields to validated.
 * @param fields {Array} Information about the fields to validate.
 */
function serializationError(msg, obj, fields) {
  var details = [];
  var i, l, field;
  for (i = 0, l = fields.length; i < l; i++) {
    field = fields[i];
    field.type.isValid(obj[field.name], {errorHook: errorHook});
  }
  var detailsStr = details
    .map(function (obj) {
      return f('%s = %j but expected %s', obj.path, obj.value, obj.type);
    })
    .join(', ');
  var err = new Error(f('%s (%s)', msg, detailsStr));
  err.details = details;
  return err;

  function errorHook(parts, any, type) {
    var strs = [];
    var i, l, part;
    for (i = 0, l = parts.length; i < l; i++) {
      part = parts[i];
      if (isNaN(part)) {
        strs.push('.' + part);
      } else {
        strs.push('[' + part + ']');
      }
    }
    details.push({
      path: field.name + strs.join(''),
      value: any,
      type: type
    });
  }
}

/**
 * Compute a prefix of fixed length from a string.
 *
 * @param scope {String} Namespace to be hashed.
 */
function normalizedPrefix(scope) {
  return scope ?
    utils.getHash(scope).readInt16BE(0) << (32 - PREFIX_LENGTH) :
    0;
}

/**
 * Check whether an ID matches the prefix.
 *
 * @param id {Integer} Number to check.
 * @param prefix {Integer} Already shifted prefix.
 */
function matchesPrefix(id, prefix) {
  return ((id ^ prefix) >> (32 - PREFIX_LENGTH)) === 0;
}

/**
 * Check whether something is a stream.
 *
 * @param any {Object} Any object.
 */
function isStream(any) {
  // This is a hacky way of checking that the transport is a stream-like
  // object. We unfortunately can't use `instanceof Stream` checks since
  // some libraries (e.g. websocket-stream) return streams which don't
  // inherit from it.
  return !!(any && any.pipe);
}

/**
 * Get a message, asserting that it exists.
 *
 * @param svc {Service} The protocol to look into.
 * @param name {String} The message's name.
 */
function getExistingMessage(svc, name) {
  var msg = svc.message(name);
  if (!msg) {
    throw new Error(f('unknown message: %s', name));
  }
  return msg;
}

/**
 * Middleware logic.
 *
 * This is used both in clients and servers to intercept call handling (e.g. to
 * populate headers, do access control).
 *
 * @param params {Object} The following parameters:
 *  + fns {Array} Array of middleware functions.
 *  + ctx {Object} Context used to call the middleware functions, onTransition,
 *    and onCompletion.
 *  + wreq {WrappedRequest}
 *  + wres {WrappedResponse}
 *  + onTransition {Function} End of forward phase callback. It accepts an
 *    eventual error as single argument. This will be used for the backward
 *    phase. This function is guaranteed to be called at most once.
 *  + onCompletion {Function} Final handler, it takes an error as unique
 *    argument. This function is guaranteed to be only at most once.
 *  + onError {Function} Error handler, called if an intermediate callback is
 *    called multiple times.
 */
function chainMiddleware(params) {
  var args = [params.wreq, params.wres];
  var cbs = [];
  var cause; // Backpropagated error.
  forward(0);

  function forward(pos) {
    var isDone = false;
    if (pos < params.fns.length) {
      params.fns[pos].apply(params.ctx, args.concat(function (err, cb) {
        if (isDone) {
          params.onError(toError('duplicate forward middleware call', err));
          return;
        }
        isDone = true;
        if (
          err || (
            params.wres && ( // Non one-way messages.
              params.wres.error !== undefined ||
              params.wres.response !== undefined
            )
          )
        ) {
          // Stop the forward phase, bypass the handler, and start the backward
          // phase. Note that we ignore any callback argument in this case.
          cause = err;
          backward();
          return;
        }
        if (cb) {
          cbs.push(cb);
        }
        forward(++pos);
      }));
    } else {
      // Done with the middleware forward functions, call the handler.
      params.onTransition.apply(params.ctx, args.concat(function (err) {
        if (isDone) {
          params.onError(toError('duplicate handler call', err));
          return;
        }
        isDone = true;
        cause = err;
        process.nextTick(backward);
      }));
    }
  }

  function backward() {
    var cb = cbs.pop();
    if (cb) {
      var isDone = false;
      cb.call(params.ctx, cause, function (err) {
        if (isDone) {
          params.onError(toError('duplicate backward middleware call', err));
          return;
        }
        // Substitute the error.
        cause = err;
        isDone = true;
        backward();
      });
    } else {
      // Done with all middleware calls.
      params.onCompletion.call(params.ctx, cause);
    }
  }
}


module.exports = {
  Adapter: Adapter,
  HANDSHAKE_REQUEST_TYPE: HANDSHAKE_REQUEST_TYPE,
  HANDSHAKE_RESPONSE_TYPE: HANDSHAKE_RESPONSE_TYPE,
  Message: Message,
  Registry: Registry,
  Service: Service,
  discoverProtocol: discoverProtocol,
  streams: {
    FrameDecoder: FrameDecoder,
    FrameEncoder: FrameEncoder,
    NettyDecoder: NettyDecoder,
    NettyEncoder: NettyEncoder
  }
};
