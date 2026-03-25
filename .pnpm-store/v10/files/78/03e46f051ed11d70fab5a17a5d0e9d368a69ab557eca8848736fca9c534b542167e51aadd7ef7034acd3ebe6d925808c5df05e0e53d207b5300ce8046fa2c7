//
//
//

// General-purpose API for glueing everything together.

'use strict';

var URL = require('url-parse');
var QS = require('querystring');
var Connection = require('./connection').Connection;
var fmt = require('util').format;
var credentials = require('./credentials');

function copyInto(obj, target) {
  var keys = Object.keys(obj);
  var i = keys.length;
  while (i--) {
    var k = keys[i];
    target[k] = obj[k];
  }
  return target;
}

// Adapted from util._extend, which is too fringe to use.
function clone(obj) {
  return copyInto(obj, {});
}

var CLIENT_PROPERTIES = {
  "product": "amqplib",
  "version": require('../package.json').version,
  "platform": fmt('Node.JS %s', process.version),
  "information": "https://amqp-node.github.io/amqplib/",
  "capabilities": {
    "publisher_confirms": true,
    "exchange_exchange_bindings": true,
    "basic.nack": true,
    "consumer_cancel_notify": true,
    "connection.blocked": true,
    "authentication_failure_close": true
  }
};

// Construct the main frames used in the opening handshake
function openFrames(vhost, query, credentials, extraClientProperties) {
  if (!vhost)
    vhost = '/';
  else
    vhost = QS.unescape(vhost);

  var query = query || {};

  function intOrDefault(val, def) {
    return (val === undefined) ? def : parseInt(val);
  }

  var clientProperties = Object.create(CLIENT_PROPERTIES);

  return {
    // start-ok
    'clientProperties': copyInto(extraClientProperties, clientProperties),
    'mechanism': credentials.mechanism,
    'response': credentials.response(),
    'locale': query.locale || 'en_US',

    // tune-ok
    'channelMax': intOrDefault(query.channelMax, 0),
    'frameMax': intOrDefault(query.frameMax, 131072),
    'heartbeat': intOrDefault(query.heartbeat, 0),

    // open
    'virtualHost': vhost,
    'capabilities': '',
    'insist': 0
  };
}

// Decide on credentials based on what we're supplied.
function credentialsFromUrl(parts) {
  var user = 'guest', passwd = 'guest';
  if (parts.username != '' || parts.password != '') {
    user = (parts.username) ? unescape(parts.username) : '';
    passwd = (parts.password) ? unescape(parts.password) : '';
  }
  return credentials.plain(user, passwd);
}

function connect(url, socketOptions, openCallback) {
  // tls.connect uses `util._extend()` on the options given it, which
  // copies only properties mentioned in `Object.keys()`, when
  // processing the options. So I have to make copies too, rather
  // than using `Object.create()`.
  var sockopts = clone(socketOptions || {});
  url = url || 'amqp://localhost';

  var noDelay = !!sockopts.noDelay;
  var timeout = sockopts.timeout;
  var keepAlive = !!sockopts.keepAlive;
  // 0 is default for node
  var keepAliveDelay = sockopts.keepAliveDelay || 0;

  var extraClientProperties = sockopts.clientProperties || {};

  var protocol, fields;
  if (typeof url === 'object') {
    protocol = (url.protocol || 'amqp') + ':';
    sockopts.host = url.hostname;
    sockopts.servername = sockopts.servername || url.hostname;
    sockopts.port = url.port || ((protocol === 'amqp:') ? 5672 : 5671);

    var user, pass;
    // Only default if both are missing, to have the same behaviour as
    // the stringly URL.
    if (url.username == undefined && url.password == undefined) {
      user = 'guest'; pass = 'guest';
    } else {
      user = url.username || '';
      pass = url.password || '';
    }

    var config = {
      locale: url.locale,
      channelMax: url.channelMax,
      frameMax: url.frameMax,
      heartbeat: url.heartbeat,
    };

    fields = openFrames(url.vhost, config, sockopts.credentials || credentials.plain(user, pass), extraClientProperties);
  } else {
    var parts = URL(url, true); // yes, parse the query string
    protocol = parts.protocol;
    sockopts.host = parts.hostname;
    sockopts.servername = sockopts.servername || parts.hostname;
    sockopts.port = parseInt(parts.port) || ((protocol === 'amqp:') ? 5672 : 5671);
    var vhost = parts.pathname ? parts.pathname.substr(1) : null;
    fields = openFrames(vhost, parts.query, sockopts.credentials || credentialsFromUrl(parts), extraClientProperties);
  }

  var sockok = false;
  var sock;

  function onConnect() {
    sockok = true;
    sock.setNoDelay(noDelay);
    if (keepAlive) sock.setKeepAlive(keepAlive, keepAliveDelay);

    var c = new Connection(sock);
    c.open(fields, function(err, ok) {
      // disable timeout once the connection is open, we don't want
      // it fouling things
      if (timeout) sock.setTimeout(0);
      if (err === null) {
        openCallback(null, c);
      } else {
        // The connection isn't closed by the server on e.g. wrong password
        sock.end();
        sock.destroy();
        openCallback(err);
      }
    });
  }

  if (protocol === 'amqp:') {
    sock = require('net').connect(sockopts, onConnect);
  }
  else if (protocol === 'amqps:') {
    sock = require('tls').connect(sockopts, onConnect);
  }
  else {
    throw new Error("Expected amqp: or amqps: as the protocol; got " + protocol);
  }

  if (timeout) {
    sock.setTimeout(timeout, function() {
      sock.end();
      sock.destroy();
      openCallback(new Error('connect ETIMEDOUT'));
    });
  }

  sock.once('error', function(err) {
    if (!sockok) openCallback(err);
  });

}

module.exports.connect = connect;
module.exports.credentialsFromUrl = credentialsFromUrl;
