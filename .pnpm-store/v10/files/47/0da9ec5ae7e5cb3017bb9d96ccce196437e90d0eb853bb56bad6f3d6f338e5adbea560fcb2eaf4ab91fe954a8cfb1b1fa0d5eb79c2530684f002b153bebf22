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
 * @property {object} header - A standard Node.js header hash, an object hash containing key/value
 *        pairs where the key is the header name string and the value is the header value string.
 * @property {object} requestOptions - Options passed on to http request. Details:
 * https://developer.harmonyos.com/en/docs/documentation/doc-references/js-apis-net-http-0000001168304341#section12262183471518
 * @example
 *     //Use a connection that requires ssl/tls, closes the connection after each request,
 *     //  uses the buffered transport layer, uses the JSON protocol and directs RPC traffic
 *     //  to https://thrift.example.com:9090/hello
 *     import http from '@ohos.net.http' // HTTP module of OpenHarmonyOS
 *     var thrift = require('thrift');
 *     var options = {
 *        transport: thrift.TBufferedTransport,
 *        protocol: thrift.TJSONProtocol,
 *        path: "/hello",
 *        headers: {"Connection": "close"}
 *     };
 *     // With OpenHarmonyOS HTTP module, HTTPS is supported by default. To support HTTP, See:
 *     // https://developer.harmonyos.com/en/docs/documentation/doc-references/js-apis-net-http-0000001168304341#EN-US_TOPIC_0000001171944450__s56d19203690d4782bfc74069abb6bd71
 *     var con = thrift.createOhosConnection(http.createHttp, "thrift.example.com", 9090, options);
 *     var client = thrift.createOhosClient(myService, connection);
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
 * @classdesc OhosConnection objects provide Thrift end point transport
 *     semantics implemented over the OpenHarmonyOS http.request() method.
 * @see {@link createOhosConnection}
 */
var OhosConnection = exports.OhosConnection = function(options) {
  //Initialize the emitter base object
  EventEmitter.call(this);

  //Set configuration
  var self = this;
  this.options = options || {};
  this.host = this.options.host;
  this.port = this.options.port;
  this.path = this.options.path || '/';
  //OpenHarmonyOS needs URL for initiating an HTTP request.
  this.url =
    this.port === 80
      ? this.host.replace(/\/$/, '') + this.path
      : this.host.replace(/\/$/, '') + ':' + this.port + this.path;
  this.transport = this.options.transport || TBufferedTransport;
  this.protocol = this.options.protocol || TBinaryProtocol;
  //Inherit method from OpenHarmonyOS HTTP module
  this.createHttp = this.options.createHttp;

  //Prepare HTTP request options
  this.requestOptions = {
    method: 'POST',
    header: this.options.header || {},
    readTimeout: this.options.readTimeout || 60000,
    connectTimeout: this.options.connectTimeout || 60000
  };
  for (var attrname in this.options.requestOptions) {
    this.requestOptions[attrname] = this.options.requestOptions[attrname];
  }
  /*jshint -W069 */
  if (!this.requestOptions.header['Connection']) {
    this.requestOptions.header['Connection'] = 'keep-alive';
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
  this.responseCallback = function(error, response) {
    //Response will be a struct like:
    // https://developer.harmonyos.com/en/docs/documentation/doc-references/js-apis-net-http-0000001168304341#section15920192914312
    var data = [];
    var dataLen = 0;

    if (error) {
      self.emit('error', error);
      return;
    }

    if (!response || response.responseCode !== 200) {
      self.emit('error', new THTTPException(response));
    }

    // With OpenHarmonyOS running in a Browser (e.g. Browserify), chunk
    // will be a string or an ArrayBuffer.
    if (
      typeof response.result == 'string' ||
      Object.prototype.toString.call(response.result) == '[object Uint8Array]'
    ) {
      // Wrap ArrayBuffer/string in a Buffer so data[i].copy will work
      data.push(Buffer.from(response.result));
    }
    dataLen += response.result.length;

    var buf = Buffer.alloc(dataLen);
    for (var i = 0, len = data.length, pos = 0; i < len; i++) {
      data[i].copy(buf, pos);
      pos += data[i].length;
    }
    //Get the receiver function for the transport and
    //  call it with the buffer
    self.transport.receiver(decodeCallback)(buf);
  };

  /**
   * Writes Thrift message data to the connection
   * @param {Buffer} data - A Node.js Buffer containing the data to write
   * @returns {void} No return value.
   * @event {error} the "error" event is raised upon request failure passing the
   *     Node.js error object to the listener.
   */
  this.write = function(data) {
    //To initiate multiple HTTP requests, we must create an HttpRequest object
    // for each HTTP request
    var http = self.createHttp();
    var opts = self.requestOptions;
    opts.header["Content-length"] = data.length;
    if (!opts.header["Content-Type"])
      opts.header["Content-Type"] = "application/x-thrift";
    // extraData not support array data currently
    opts.extraData = data.toString();
    http.request(self.url, opts, self.responseCallback);
  };
};
util.inherits(OhosConnection, EventEmitter);

/**
 * Creates a new OhosConnection object, used by Thrift clients to connect
 *    to Thrift HTTP based servers.
 * @param {Function} createHttp - OpenHarmonyOS method to initiate or destroy an HTTP request.
 * @param {string} host - The host name or IP to connect to.
 * @param {number} port - The TCP port to connect to.
 * @param {ConnectOptions} options - The configuration options to use.
 * @returns {OhosConnection} The connection object.
 * @see {@link ConnectOptions}
 */
exports.createOhosConnection = function(createHttp, host, port, options) {
  options.createHttp = createHttp;
  options.host = host;
  options.port = port || 80;
  return new OhosConnection(options);
};

exports.createOhosClient = createClient;

function THTTPException(response) {
  thrift.TApplicationException.call(this);
  if (Error.captureStackTrace !== undefined) {
    Error.captureStackTrace(this, this.constructor);
  }

  this.name = this.constructor.name;
  this.responseCode = response.responseCode;
  this.response = response;
  this.type = thrift.TApplicationExceptionType.PROTOCOL_ERROR;
  this.message =
    'Received a response with a bad HTTP status code: ' + response.responseCode;
}
util.inherits(THTTPException, thrift.TApplicationException);
