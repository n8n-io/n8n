/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements. See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License. You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var util = require('util');
var http = require('http');
var https = require('https');
var EventEmitter = require('events').EventEmitter;
var thrift = require('./thrift');

var TBufferedTransport = require('./buffered_transport');
var TBinaryProtocol = require('./binary_protocol');
var InputBufferUnderrunError = require('./input_buffer_underrun_error');

var createClient = require('./create_client');

/**
 * @class
 * @name ConnectOptions
 * @property {string} transport - The Thrift layered transport to use (TBufferedTransport, etc).
 * @property {string} protocol - The Thrift serialization protocol to use (TBinaryProtocol, etc.).
 * @property {string} path - The URL path to POST to (e.g. "/", "/mySvc", "/thrift/quoteSvc", etc.).
 * @property {object} headers - A standard Node.js header hash, an object hash containing key/value
 *        pairs where the key is the header name string and the value is the header value string.
 * @property {boolean} https - True causes the connection to use https, otherwise http is used.
 * @property {object} nodeOptions - Options passed on to node.
 * @example
 *     //Use a connection that requires ssl/tls, closes the connection after each request,
 *     //  uses the buffered transport layer, uses the JSON protocol and directs RPC traffic
 *     //  to https://thrift.example.com:9090/hello
 *     var thrift = require('thrift');
 *     var options = {
 *        transport: thrift.TBufferedTransport,
 *        protocol: thrift.TJSONProtocol,
 *        path: "/hello",
 *        headers: {"Connection": "close"},
 *        https: true
 *     };
 *     var con = thrift.createHttpConnection("thrift.example.com", 9090, options);
 *     var client = thrift.createHttpClient(myService, connection);
 *     client.myServiceFunction();
 */

/**
 * Initializes a Thrift HttpConnection instance (use createHttpConnection() rather than
 *    instantiating directly).
 * @constructor
 * @param {ConnectOptions} options - The configuration options to use.
 * @throws {error} Exceptions other than InputBufferUnderrunError are rethrown
 * @event {error} The "error" event is fired when a Node.js error event occurs during
 *     request or response processing, in which case the node error is passed on. An "error"
 *     event may also be fired when the connection can not map a response back to the
 *     appropriate client (an internal error), generating a TApplicationException.
 * @classdesc HttpConnection objects provide Thrift end point transport
 *     semantics implemented over the Node.js http.request() method.
 * @see {@link createHttpConnection}
 */
var HttpConnection = exports.HttpConnection = function(options) {
  //Initialize the emitter base object
  EventEmitter.call(this);

  //Set configuration
  var self = this;
  this.options = options || {};
  this.host = this.options.host;
  this.port = this.options.port;
  this.socketPath = this.options.socketPath;
  this.https = this.options.https || false;
  this.transport = this.options.transport || TBufferedTransport;
  this.protocol = this.options.protocol || TBinaryProtocol;

  //Prepare Node.js options
  this.nodeOptions = {
    host: this.host,
    port: this.port,
    socketPath: this.socketPath,
    path: this.options.path || '/',
    method: 'POST',
    headers: this.options.headers || {},
    responseType: this.options.responseType || null
  };
  for (var attrname in this.options.nodeOptions) {
    this.nodeOptions[attrname] = this.options.nodeOptions[attrname];
  }
  /*jshint -W069 */
  if (! this.nodeOptions.headers['Connection']) {
    this.nodeOptions.headers['Connection'] = 'keep-alive';
  }
  /*jshint +W069 */

  //The sequence map is used to map seqIDs back to the
  //  calling client in multiplexed scenarios
  this.seqId2Service = {};

  function decodeCallback(transport_with_data) {
    var proto = new self.protocol(transport_with_data);
    try {
      while (true) {
        var header = proto.readMessageBegin();
        var dummy_seqid = header.rseqid * -1;
        var client = self.client;
        //The Multiplexed Protocol stores a hash of seqid to service names
        //  in seqId2Service. If the SeqId is found in the hash we need to
        //  lookup the appropriate client for this call.
        //  The client var is a single client object when not multiplexing,
        //  when using multiplexing it is a service name keyed hash of client
        //  objects.
        //NOTE: The 2 way interdependencies between protocols, transports,
        //  connections and clients in the Node.js implementation are irregular
        //  and make the implementation difficult to extend and maintain. We
        //  should bring this stuff inline with typical thrift I/O stack
        //  operation soon.
        //  --ra
        var service_name = self.seqId2Service[header.rseqid];
        if (service_name) {
          client = self.client[service_name];
          delete self.seqId2Service[header.rseqid];
        }
        /*jshint -W083 */
        client._reqs[dummy_seqid] = function(err, success){
          transport_with_data.commitPosition();
          var clientCallback = client._reqs[header.rseqid];
          delete client._reqs[header.rseqid];
          if (clientCallback) {
            process.nextTick(function() {
              clientCallback(err, success);
            });
          }
        };
        /*jshint +W083 */
        if(client['recv_' + header.fname]) {
          client['recv_' + header.fname](proto, header.mtype, dummy_seqid);
        } else {
          delete client._reqs[dummy_seqid];
          self.emit("error",
                    new thrift.TApplicationException(
                       thrift.TApplicationExceptionType.WRONG_METHOD_NAME,
                       "Received a response to an unknown RPC function"));
        }
      }
    }
    catch (e) {
      if (e instanceof InputBufferUnderrunError) {
        transport_with_data.rollbackPosition();
      } else {
        self.emit('error', e);
      }
    }
  }


  //Response handler
  //////////////////////////////////////////////////
  this.responseCallback = function(response) {
    var data = [];
    var dataLen = 0;

    if (response.statusCode !== 200) {
      this.emit("error", new THTTPException(response));
    }

    response.on('error', function (e) {
      self.emit("error", e);
    });

    // When running directly under node, chunk will be a buffer,
    // however, when running in a Browser (e.g. Browserify), chunk
    // will be a string or an ArrayBuffer.
    response.on('data', function (chunk) {
      if ((typeof chunk == 'string') ||
          (Object.prototype.toString.call(chunk) == '[object Uint8Array]')) {
        // Wrap ArrayBuffer/string in a Buffer so data[i].copy will work
        data.push(new Buffer(chunk));
      } else {
        data.push(chunk);
      }
      dataLen += chunk.length;
    });

    response.on('end', function(){
      var buf = new Buffer(dataLen);
      for (var i=0, len=data.length, pos=0; i<len; i++) {
        data[i].copy(buf, pos);
        pos += data[i].length;
      }
      //Get the receiver function for the transport and
      //  call it with the buffer
      self.transport.receiver(decodeCallback)(buf);
    });
  };
};
util.inherits(HttpConnection, EventEmitter);

/**
 * Writes Thrift message data to the connection
 * @param {Buffer} data - A Node.js Buffer containing the data to write
 * @returns {void} No return value.
 * @event {error} the "error" event is raised upon request failure passing the
 *     Node.js error object to the listener.
 */
HttpConnection.prototype.write = function(data) {
  var self = this;
  var opts = self.nodeOptions;
  opts.headers["Content-length"] = data.length;
  if (!opts.headers["Content-Type"])
    opts.headers["Content-Type"] = "application/x-thrift";
  var req = (self.https) ?
      https.request(opts, self.responseCallback) :
      http.request(opts, self.responseCallback);
  req.on('error', function(err) {
    self.emit("error", err);
  });
  req.write(data);
  req.end();
};

/**
 * Creates a new HttpConnection object, used by Thrift clients to connect
 *    to Thrift HTTP based servers.
 * @param {string} host - The host name or IP to connect to.
 * @param {number} port - The TCP port to connect to.
 * @param {ConnectOptions} options - The configuration options to use.
 * @returns {HttpConnection} The connection object.
 * @see {@link ConnectOptions}
 */
exports.createHttpConnection = function(host, port, options) {
  options.host = host;
  options.port = port || 80;
  return new HttpConnection(options);
};

exports.createHttpUDSConnection = function(path, options) {
  options.socketPath = path;
  return new HttpConnection(options);
};

exports.createHttpClient = createClient


function THTTPException(response) {
  thrift.TApplicationException.call(this);
  if (Error.captureStackTrace !== undefined) {
    Error.captureStackTrace(this, this.constructor);
  }

  this.name = this.constructor.name;
  this.statusCode = response.statusCode;
  this.response = response;
  this.type = thrift.TApplicationExceptionType.PROTOCOL_ERROR;
  this.message = "Received a response with a bad HTTP status code: " + response.statusCode;
}
util.inherits(THTTPException, thrift.TApplicationException);
