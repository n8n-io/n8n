/**
 * Socket wrapping functions for TLS.
 *
 * @author Dave Longley
 *
 * Copyright (c) 2009-2012 Digital Bazaar, Inc.
 */
var forge = require('./forge');
require('./tls');

/**
 * Wraps a forge.net socket with a TLS layer.
 *
 * @param options:
 *   sessionId: a session ID to reuse, null for a new connection if no session
 *     cache is provided or it is empty.
 *   caStore: an array of certificates to trust.
 *   sessionCache: a session cache to use.
 *   cipherSuites: an optional array of cipher suites to use, see
 *     tls.CipherSuites.
 *   socket: the socket to wrap.
 *   virtualHost: the virtual server name to use in a TLS SNI extension.
 *   verify: a handler used to custom verify certificates in the chain.
 *   getCertificate: an optional callback used to get a certificate.
 *   getPrivateKey: an optional callback used to get a private key.
 *   getSignature: an optional callback used to get a signature.
 *   deflate: function(inBytes) if provided, will deflate TLS records using
 *     the deflate algorithm if the server supports it.
 *   inflate: function(inBytes) if provided, will inflate TLS records using
 *     the deflate algorithm if the server supports it.
 *
 * @return the TLS-wrapped socket.
 */
forge.tls.wrapSocket = function(options) {
  // get raw socket
  var socket = options.socket;

  // create TLS socket
  var tlsSocket = {
    id: socket.id,
    // set handlers
    connected: socket.connected || function(e) {},
    closed: socket.closed || function(e) {},
    data: socket.data || function(e) {},
    error: socket.error || function(e) {}
  };

  // create TLS connection
  var c = forge.tls.createConnection({
    server: false,
    sessionId: options.sessionId || null,
    caStore: options.caStore || [],
    sessionCache: options.sessionCache || null,
    cipherSuites: options.cipherSuites || null,
    virtualHost: options.virtualHost,
    verify: options.verify,
    getCertificate: options.getCertificate,
    getPrivateKey: options.getPrivateKey,
    getSignature: options.getSignature,
    deflate: options.deflate,
    inflate: options.inflate,
    connected: function(c) {
      // first handshake complete, call handler
      if(c.handshakes === 1) {
        tlsSocket.connected({
          id: socket.id,
          type: 'connect',
          bytesAvailable: c.data.length()
        });
      }
    },
    tlsDataReady: function(c) {
      // send TLS data over socket
      return socket.send(c.tlsData.getBytes());
    },
    dataReady: function(c) {
      // indicate application data is ready
      tlsSocket.data({
        id: socket.id,
        type: 'socketData',
        bytesAvailable: c.data.length()
      });
    },
    closed: function(c) {
      // close socket
      socket.close();
    },
    error: function(c, e) {
      // send error, close socket
      tlsSocket.error({
        id: socket.id,
        type: 'tlsError',
        message: e.message,
        bytesAvailable: 0,
        error: e
      });
      socket.close();
    }
  });

  // handle doing handshake after connecting
  socket.connected = function(e) {
    c.handshake(options.sessionId);
  };

  // handle closing TLS connection
  socket.closed = function(e) {
    if(c.open && c.handshaking) {
      // error
      tlsSocket.error({
        id: socket.id,
        type: 'ioError',
        message: 'Connection closed during handshake.',
        bytesAvailable: 0
      });
    }
    c.close();

    // call socket handler
    tlsSocket.closed({
      id: socket.id,
      type: 'close',
      bytesAvailable: 0
    });
  };

  // handle error on socket
  socket.error = function(e) {
    // error
    tlsSocket.error({
      id: socket.id,
      type: e.type,
      message: e.message,
      bytesAvailable: 0
    });
    c.close();
  };

  // handle receiving raw TLS data from socket
  var _requiredBytes = 0;
  socket.data = function(e) {
    // drop data if connection not open
    if(!c.open) {
      socket.receive(e.bytesAvailable);
    } else {
      // only receive if there are enough bytes available to
      // process a record
      if(e.bytesAvailable >= _requiredBytes) {
        var count = Math.max(e.bytesAvailable, _requiredBytes);
        var data = socket.receive(count);
        if(data !== null) {
          _requiredBytes = c.process(data);
        }
      }
    }
  };

  /**
   * Destroys this socket.
   */
  tlsSocket.destroy = function() {
    socket.destroy();
  };

  /**
   * Sets this socket's TLS session cache. This should be called before
   * the socket is connected or after it is closed.
   *
   * The cache is an object mapping session IDs to internal opaque state.
   * An application might need to change the cache used by a particular
   * tlsSocket between connections if it accesses multiple TLS hosts.
   *
   * @param cache the session cache to use.
   */
  tlsSocket.setSessionCache = function(cache) {
    c.sessionCache = tls.createSessionCache(cache);
  };

  /**
   * Connects this socket.
   *
   * @param options:
   *           host: the host to connect to.
   *           port: the port to connect to.
   *           policyPort: the policy port to use (if non-default), 0 to
   *              use the flash default.
   *           policyUrl: the policy file URL to use (instead of port).
   */
  tlsSocket.connect = function(options) {
    socket.connect(options);
  };

  /**
   * Closes this socket.
   */
  tlsSocket.close = function() {
    c.close();
  };

  /**
   * Determines if the socket is connected or not.
   *
   * @return true if connected, false if not.
   */
  tlsSocket.isConnected = function() {
    return c.isConnected && socket.isConnected();
  };

  /**
   * Writes bytes to this socket.
   *
   * @param bytes the bytes (as a string) to write.
   *
   * @return true on success, false on failure.
   */
  tlsSocket.send = function(bytes) {
    return c.prepare(bytes);
  };

  /**
   * Reads bytes from this socket (non-blocking). Fewer than the number of
   * bytes requested may be read if enough bytes are not available.
   *
   * This method should be called from the data handler if there are enough
   * bytes available. To see how many bytes are available, check the
   * 'bytesAvailable' property on the event in the data handler or call the
   * bytesAvailable() function on the socket. If the browser is msie, then the
   * bytesAvailable() function should be used to avoid race conditions.
   * Otherwise, using the property on the data handler's event may be quicker.
   *
   * @param count the maximum number of bytes to read.
   *
   * @return the bytes read (as a string) or null on error.
   */
  tlsSocket.receive = function(count) {
    return c.data.getBytes(count);
  };

  /**
   * Gets the number of bytes available for receiving on the socket.
   *
   * @return the number of bytes available for receiving.
   */
  tlsSocket.bytesAvailable = function() {
    return c.data.length();
  };

  return tlsSocket;
};
