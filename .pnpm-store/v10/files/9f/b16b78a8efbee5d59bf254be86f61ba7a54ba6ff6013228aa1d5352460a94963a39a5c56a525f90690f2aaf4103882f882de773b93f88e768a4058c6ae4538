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
var http = require('http');
var https = require('https');
var url = require("url");
var path = require("path");
var fs = require("fs");
var crypto = require("crypto");
var log = require('./log');

var MultiplexedProcessor = require('./multiplexed_processor').MultiplexedProcessor;

var TBufferedTransport = require('./buffered_transport');
var TBinaryProtocol = require('./binary_protocol');
var InputBufferUnderrunError = require('./input_buffer_underrun_error');

// WSFrame constructor and prototype
/////////////////////////////////////////////////////////////////////

/** Apache Thrift RPC Web Socket Transport
 *  Frame layout conforming to RFC 6455 circa 12/2011
 *
 * Theoretical frame size limit is 4GB*4GB, however the Node Buffer
 * limit is 1GB as of v0.10. The frame length encoding is also
 * configured for a max of 4GB presently and needs to be adjusted
 * if Node/Browsers become capabile of > 4GB frames.
 *
 *  - FIN is 1 if the message is complete
 *  - RSV1/2/3 are always 0
 *  - Opcode is 1(TEXT) for TJSONProtocol and 2(BIN) for TBinaryProtocol
 *  - Mask Present bit is 1 sending to-server and 0 sending to-client
 *  - Payload Len:
 *        + If < 126: then represented directly
 *        + If >=126: but within range of an unsigned 16 bit integer
 *             then Payload Len is 126 and the two following bytes store
 *             the length
 *        + Else: Payload Len is 127 and the following 8 bytes store the
 *             length as an unsigned 64 bit integer
 *  - Masking key is a 32 bit key only present when sending to the server
 *  - Payload follows the masking key or length
 *
 *     0                   1                   2                   3
 *     0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 *    +-+-+-+-+-------+-+-------------+-------------------------------+
 *    |F|R|R|R| opcode|M| Payload len |    Extended payload length    |
 *    |I|S|S|S|  (4)  |A|     (7)     |             (16/64)           |
 *    |N|V|V|V|       |S|             |   (if payload len==126/127)   |
 *    | |1|2|3|       |K|             |                               |
 *    +-+-+-+-+-------+-+-------------+ - - - - - - - - - - - - - - - +
 *    |     Extended payload length continued, if payload len == 127  |
 *    + - - - - - - - - - - - - - - - +-------------------------------+
 *    |                               |Masking-key, if MASK set to 1  |
 *    +-------------------------------+-------------------------------+
 *    | Masking-key (continued)       |          Payload Data         |
 *    +-------------------------------- - - - - - - - - - - - - - - - +
 *    :                     Payload Data continued ...                :
 *    + - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - +
 *    |                     Payload Data continued ...                |
 *    +---------------------------------------------------------------+
 */
var wsFrame = {
  /** Encodes a WebSocket frame
   *
   * @param {Buffer} data - The raw data to encode
   * @param {Buffer} mask - The mask to apply when sending to server, null for no mask
   * @param {Boolean} binEncoding - True for binary encoding, false for text encoding
   * @returns {Buffer} - The WebSocket frame, ready to send
   */
  encode: function(data, mask, binEncoding) {
      var frame = new Buffer(wsFrame.frameSizeFromData(data, mask));
      //Byte 0 - FIN & OPCODE
      frame[0] = wsFrame.fin.FIN +
          (binEncoding ? wsFrame.frameOpCodes.BIN : wsFrame.frameOpCodes.TEXT);
      //Byte 1 or 1-3 or 1-9 - MASK FLAG & SIZE
      var payloadOffset = 2;
      if (data.length < 0x7E) {
        frame[1] = data.length + (mask ? wsFrame.mask.TO_SERVER : wsFrame.mask.TO_CLIENT);
      } else if (data.length < 0xFFFF) {
        frame[1] = 0x7E + (mask ? wsFrame.mask.TO_SERVER : wsFrame.mask.TO_CLIENT);
        frame.writeUInt16BE(data.length, 2, true);
        payloadOffset = 4;
      } else {
        frame[1] = 0x7F + (mask ? wsFrame.mask.TO_SERVER : wsFrame.mask.TO_CLIENT);
        frame.writeUInt32BE(0, 2, true);
        frame.writeUInt32BE(data.length, 6, true);
        payloadOffset = 10;
      }
      //MASK
      if (mask) {
        mask.copy(frame, payloadOffset, 0, 4);
        payloadOffset += 4;
      }
      //Payload
      data.copy(frame, payloadOffset);
      if (mask) {
        wsFrame.applyMask(frame.slice(payloadOffset), frame.slice(payloadOffset-4,payloadOffset));
      }
      return frame;
  },

  /**
   * @class
   * @name WSDecodeResult
   * @property {Buffer} data - The decoded data for the first ATRPC message
   * @property {Buffer} mask - The frame mask
   * @property {Boolean} binEncoding - True if binary (TBinaryProtocol),
   *                                   False if text (TJSONProtocol)
   * @property {Buffer} nextFrame - Multiple ATRPC messages may be sent in a
   *                                single WebSocket frame, this Buffer contains
   *                                any bytes remaining to be decoded
   * @property {Boolean} FIN - True is the message is complete
   */

   /** Decodes a WebSocket frame
   *
   * @param {Buffer} frame - The raw inbound frame, if this is a continuation
   *                         frame it must have a mask property with the mask.
   * @returns {WSDecodeResult} - The decoded payload
   *
   * @see {@link WSDecodeResult}
   */
  decode: function(frame) {
      var result = {
        data: null,
        mask: null,
        binEncoding: false,
        nextFrame: null,
        FIN: true
      };

      //Byte 0 - FIN & OPCODE
      if (wsFrame.fin.FIN != (frame[0] & wsFrame.fin.FIN)) {
        result.FIN = false;
      }
      result.binEncoding = (wsFrame.frameOpCodes.BIN == (frame[0] & wsFrame.frameOpCodes.BIN));
      //Byte 1 or 1-3 or 1-9 - SIZE
      var lenByte = (frame[1] & 0x0000007F);
      var len = lenByte;
      var dataOffset = 2;
      if (lenByte == 0x7E) {
        len = frame.readUInt16BE(2);
        dataOffset = 4;
      } else if (lenByte == 0x7F) {
        len = frame.readUInt32BE(6);
        dataOffset = 10;
      }
      //MASK
      if (wsFrame.mask.TO_SERVER == (frame[1] & wsFrame.mask.TO_SERVER)) {
        result.mask = new Buffer(4);
        frame.copy(result.mask, 0, dataOffset, dataOffset + 4);
        dataOffset += 4;
      }
      //Payload
      result.data = new Buffer(len);
      frame.copy(result.data, 0, dataOffset, dataOffset+len);
      if (result.mask) {
        wsFrame.applyMask(result.data, result.mask);
      }
      //Next Frame
      if (frame.length > dataOffset+len) {
        result.nextFrame = new Buffer(frame.length - (dataOffset+len));
        frame.copy(result.nextFrame, 0, dataOffset+len, frame.length);
      }
      //Don't forward control frames
      if (frame[0] & wsFrame.frameOpCodes.FINCTRL) {
        result.data = null;
      }

      return result;
  },

  /** Masks/Unmasks data
   *
   * @param {Buffer} data - data to mask/unmask in place
   * @param {Buffer} mask - the mask
   */
  applyMask: function(data, mask){
    //TODO: look into xoring words at a time
    var dataLen = data.length;
    var maskLen = mask.length;
    for (var i = 0; i < dataLen; i++) {
      data[i] = data[i] ^ mask[i%maskLen];
    }
  },

  /** Computes frame size on the wire from data to be sent
   *
   * @param {Buffer} data - data.length is the assumed payload size
   * @param {Boolean} mask - true if a mask will be sent (TO_SERVER)
   */
  frameSizeFromData: function(data, mask) {
    var headerSize = 10;
    if (data.length < 0x7E) {
      headerSize = 2;
    } else if (data.length < 0xFFFF) {
      headerSize = 4;
    }
    return headerSize + data.length + (mask ? 4 : 0);
  },

  frameOpCodes: {
    CONT:     0x00,
    TEXT:     0x01,
    BIN:      0x02,
    CTRL:     0x80
  },

  mask: {
    TO_SERVER: 0x80,
    TO_CLIENT: 0x00
  },

  fin: {
    CONT: 0x00,
    FIN: 0x80
  }
};


// createWebServer constructor and options
/////////////////////////////////////////////////////////////////////

/**
 * @class
 * @name ServerOptions
 * @property {array} cors - Array of CORS origin strings to permit requests from.
 * @property {string} files - Path to serve static files from, if absent or ""
 *                               static file service is disabled.
 * @property {object} headers - An object hash mapping header strings to header value
 *                              strings, these headers are transmitted in response to
 *                              static file GET operations.
 * @property {object} services - An object hash mapping service URI strings
 *                               to ServiceOptions objects
 * @property {object} tls - Node.js TLS options (see: nodejs.org/api/tls.html),
 *                          if not present or null regular http is used,
 *                          at least a key and a cert must be defined to use SSL/TLS
 * @see {@link ServiceOptions}
 */

/**
 * @class
 * @name ServiceOptions
 * @property {object} transport - The layered transport to use (defaults
 *                                to TBufferedTransport).
 * @property {object} protocol - The serialization Protocol to use (defaults to
 *                               TBinaryProtocol).
 * @property {object} processor - The Thrift Service class/processor generated
 *                                by the IDL Compiler for the service (the "cls"
 *                                key can also be used for this attribute).
 * @property {object} handler - The handler methods for the Thrift Service.
 */

/**
 * Create a Thrift server which can serve static files and/or one or
 * more Thrift Services.
 * @param {ServerOptions} options - The server configuration.
 * @returns {object} - The Apache Thrift Web Server.
 */
exports.createWebServer = function(options) {
  var baseDir = options.files;
  var contentTypesByExtension = {
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.css': 'text/css',
    '.xml': 'application/xml',
    '.json': 'application/json',
    '.js': 'application/javascript',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
  };

  //Setup all of the services
  var services = options.services;
  for (var uri in services) {
    var svcObj = services[uri];

    //Setup the processor
    if (svcObj.processor instanceof MultiplexedProcessor) {
      //Multiplex processors have pre embedded processor/handler pairs, save as is
      svcObj.processor = svcObj.processor;
    } else {
      //For historical reasons Node.js supports processors passed in directly or via the
      //  IDL Compiler generated class housing the processor. Also, the options property
      //  for a Processor has been called both cls and processor at different times. We
      //  support any of the four possibilities here.
      var processor = (svcObj.processor) ? (svcObj.processor.Processor || svcObj.processor) :
                                           (svcObj.cls.Processor || svcObj.cls);
      //Processors can be supplied as constructed objects with handlers already embedded,
      //  if a handler is provided we construct a new processor, if not we use the processor
      //  object directly
      if (svcObj.handler) {
        svcObj.processor = new processor(svcObj.handler);
      } else {
        svcObj.processor = processor;
      }
    }
    svcObj.transport = svcObj.transport ? svcObj.transport : TBufferedTransport;
    svcObj.protocol = svcObj.protocol ? svcObj.protocol : TBinaryProtocol;
  }

  //Verify CORS requirements
  function VerifyCORSAndSetHeaders(request, response) {
    if (request.headers.origin && options.cors) {
      if (options.cors["*"] || options.cors[request.headers.origin]) {
        //Allow, origin allowed
        response.setHeader("access-control-allow-origin", request.headers.origin);
        response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
        response.setHeader("access-control-allow-headers", "content-type, accept");
        response.setHeader("access-control-max-age", "60");
        return true;
      } else {
        //Disallow, origin denied
        return false;
      }
    }
    //Allow, CORS is not in use
    return true;
  }


  //Handle OPTIONS method (CORS)
  ///////////////////////////////////////////////////
  function processOptions(request, response) {
    if (VerifyCORSAndSetHeaders(request, response)) {
      response.writeHead("204", "No Content", {"content-length": 0});
    } else {
      response.writeHead("403", "Origin " + request.headers.origin + " not allowed", {});
    }
    response.end();
  }


  //Handle POST methods (TXHRTransport)
  ///////////////////////////////////////////////////
  function processPost(request, response) {
    //Lookup service
    var uri = url.parse(request.url).pathname;
    var svc = services[uri];
    if (!svc) {
      response.writeHead("403", "No Apache Thrift Service at " + uri, {});
      response.end();
      return;
    }

    //Verify CORS requirements
    if (!VerifyCORSAndSetHeaders(request, response)) {
      response.writeHead("403", "Origin " + request.headers.origin + " not allowed", {});
      response.end();
      return;
    }

    //Process XHR payload
    request.on('data', svc.transport.receiver(function(transportWithData) {
      var input = new svc.protocol(transportWithData);
      var output = new svc.protocol(new svc.transport(undefined, function(buf) {
        try {
          response.writeHead(200);
          response.end(buf);
        } catch (err) {
          response.writeHead(500);
          response.end();
        }
      }));

      try {
        svc.processor.process(input, output);
        transportWithData.commitPosition();
      } catch (err) {
        if (err instanceof InputBufferUnderrunError) {
          transportWithData.rollbackPosition();
        } else {
          response.writeHead(500);
          response.end();
        }
      }
    }));
  }


  //Handle GET methods (Static Page Server)
  ///////////////////////////////////////////////////
  function processGet(request, response) {
    //Undefined or empty base directory means do not serve static files
    if (!baseDir || "" === baseDir) {
      response.writeHead(404);
      response.end();
      return;
    }

    //Verify CORS requirements
    if (!VerifyCORSAndSetHeaders(request, response)) {
      response.writeHead("403", "Origin " + request.headers.origin + " not allowed", {});
      response.end();
      return;
    }

    //Locate the file requested and send it
    var uri = url.parse(request.url).pathname;
    var filename = path.resolve(path.join(baseDir, uri));

    //Ensure the basedir path is not able to be escaped
    if (filename.indexOf(baseDir) != 0) {
      response.writeHead(400, "Invalid request path", {});
      response.end();
      return;
    }

    fs.exists(filename, function(exists) {
      if(!exists) {
        response.writeHead(404);
        response.end();
        return;
      }

      if (fs.statSync(filename).isDirectory()) {
        filename += '/index.html';
      }

      fs.readFile(filename, "binary", function(err, file) {
        if (err) {
          response.writeHead(500);
          response.end(err + "\n");
          return;
        }
        var headers = {};
        var contentType = contentTypesByExtension[path.extname(filename)];
        if (contentType) {
          headers["Content-Type"] = contentType;
        }
        for (var k in options.headers) {
          headers[k] = options.headers[k];
        }
        response.writeHead(200, headers);
        response.write(file, "binary");
        response.end();
      });
    });
  }


  //Handle WebSocket calls (TWebSocketTransport)
  ///////////////////////////////////////////////////
  function processWS(data, socket, svc, binEncoding) {
    svc.transport.receiver(function(transportWithData) {
      var input = new svc.protocol(transportWithData);
      var output = new svc.protocol(new svc.transport(undefined, function(buf) {
        try {
          var frame = wsFrame.encode(buf, null, binEncoding);
          socket.write(frame);
        } catch (err) {
          //TODO: Add better error processing
        }
      }));

      try {
        svc.processor.process(input, output);
        transportWithData.commitPosition();
      }
      catch (err) {
        if (err instanceof InputBufferUnderrunError) {
          transportWithData.rollbackPosition();
        }
        else {
          //TODO: Add better error processing
        }
      }
    })(data);
  }

  //Create the server (HTTP or HTTPS)
  var server = null;
  if (options.tls) {
    server = https.createServer(options.tls);
  } else {
    server = http.createServer();
  }

  //Wire up listeners for upgrade(to WebSocket) & request methods for:
  //   - GET static files,
  //   - POST XHR Thrift services
  //   - OPTIONS CORS requests
  server.on('request', function(request, response) {
    if (request.method === 'POST') {
      processPost(request, response);
    } else if (request.method === 'GET') {
      processGet(request, response);
    } else if (request.method === 'OPTIONS') {
      processOptions(request, response);
    } else {
      response.writeHead(500);
      response.end();
    }
  }).on('upgrade', function(request, socket, head) {
    //Lookup service
    var svc;
    try {
      svc = services[Object.keys(services)[0]];
    } catch(e) {
      socket.write("HTTP/1.1 403 No Apache Thrift Service available\r\n\r\n");
      return;
    }
    //Perform upgrade
    var hash = crypto.createHash("sha1");
    hash.update(request.headers['sec-websocket-key'] + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11");
    socket.write("HTTP/1.1 101 Switching Protocols\r\n" +
                   "Upgrade: websocket\r\n" +
                   "Connection: Upgrade\r\n" +
                   "Sec-WebSocket-Accept: " + hash.digest("base64") + "\r\n" +
                   "Sec-WebSocket-Origin: " + request.headers.origin + "\r\n" +
                   "Sec-WebSocket-Location: ws://" + request.headers.host + request.url + "\r\n" +
                   "\r\n");
    //Handle WebSocket traffic
    var data = null;
    socket.on('data', function(frame) {
      try {
        while (frame) {
          var result = wsFrame.decode(frame);
          //Prepend any existing decoded data
          if (data) {
            if (result.data) {
              var newData = new Buffer(data.length + result.data.length);
              data.copy(newData);
              result.data.copy(newData, data.length);
              result.data = newData;
            } else {
              result.data = data;
            }
            data = null;
          }
          //If this completes a message process it
          if (result.FIN) {
            processWS(result.data, socket, svc, result.binEncoding);
          } else {
            data = result.data;
          }
          //Prepare next frame for decoding (if any)
          frame = result.nextFrame;
        }
      } catch(e) {
        log.error('TWebSocketTransport Exception: ' + e);
        socket.destroy();
      }
    });
  });

  //Return the server
  return server;
};
