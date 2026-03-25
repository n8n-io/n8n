/**
 * Socket implementation that uses flash SocketPool class as a backend.
 *
 * @author Dave Longley
 *
 * Copyright (c) 2010-2013 Digital Bazaar, Inc.
 */
var forge = require('./forge');
require('./util');

// define net namespace
var net = module.exports = forge.net = forge.net || {};

// map of flash ID to socket pool
net.socketPools = {};

/**
 * Creates a flash socket pool.
 *
 * @param options:
 *          flashId: the dom ID for the flash object element.
 *          policyPort: the default policy port for sockets, 0 to use the
 *            flash default.
 *          policyUrl: the default policy file URL for sockets (if provided
 *            used instead of a policy port).
 *          msie: true if the browser is msie, false if not.
 *
 * @return the created socket pool.
 */
net.createSocketPool = function(options) {
  // set default
  options.msie = options.msie || false;

  // initialize the flash interface
  var spId = options.flashId;
  var api = document.getElementById(spId);
  api.init({marshallExceptions: !options.msie});

  // create socket pool entry
  var sp = {
    // ID of the socket pool
    id: spId,
    // flash interface
    flashApi: api,
    // map of socket ID to sockets
    sockets: {},
    // default policy port
    policyPort: options.policyPort || 0,
    // default policy URL
    policyUrl: options.policyUrl || null
  };
  net.socketPools[spId] = sp;

  // create event handler, subscribe to flash events
  if(options.msie === true) {
    sp.handler = function(e) {
      if(e.id in sp.sockets) {
        // get handler function
        var f;
        switch(e.type) {
        case 'connect':
          f = 'connected';
          break;
        case 'close':
          f = 'closed';
          break;
        case 'socketData':
          f = 'data';
          break;
        default:
          f = 'error';
          break;
        }
        /* IE calls javascript on the thread of the external object
          that triggered the event (in this case flash) ... which will
          either run concurrently with other javascript or pre-empt any
          running javascript in the middle of its execution (BAD!) ...
          calling setTimeout() will schedule the javascript to run on
          the javascript thread and solve this EVIL problem. */
        setTimeout(function() {sp.sockets[e.id][f](e);}, 0);
      }
    };
  } else {
    sp.handler = function(e) {
      if(e.id in sp.sockets) {
        // get handler function
        var f;
        switch(e.type) {
        case 'connect':
          f = 'connected';
          break;
        case 'close':
          f = 'closed';
          break;
        case 'socketData':
          f = 'data';
          break;
        default:
          f = 'error';
          break;
        }
        sp.sockets[e.id][f](e);
      }
    };
  }
  var handler = 'forge.net.socketPools[\'' + spId + '\'].handler';
  api.subscribe('connect', handler);
  api.subscribe('close', handler);
  api.subscribe('socketData', handler);
  api.subscribe('ioError', handler);
  api.subscribe('securityError', handler);

  /**
   * Destroys a socket pool. The socket pool still needs to be cleaned
   * up via net.cleanup().
   */
  sp.destroy = function() {
    delete net.socketPools[options.flashId];
    for(var id in sp.sockets) {
      sp.sockets[id].destroy();
    }
    sp.sockets = {};
    api.cleanup();
  };

  /**
   * Creates a new socket.
   *
   * @param options:
   *          connected: function(event) called when the socket connects.
   *          closed: function(event) called when the socket closes.
   *          data: function(event) called when socket data has arrived,
   *            it can be read from the socket using receive().
   *          error: function(event) called when a socket error occurs.
   */
   sp.createSocket = function(options) {
     // default to empty options
     options = options || {};

     // create flash socket
     var id = api.create();

     // create javascript socket wrapper
     var socket = {
       id: id,
       // set handlers
       connected: options.connected || function(e) {},
       closed: options.closed || function(e) {},
       data: options.data || function(e) {},
       error: options.error || function(e) {}
     };

     /**
      * Destroys this socket.
      */
     socket.destroy = function() {
       api.destroy(id);
       delete sp.sockets[id];
     };

     /**
      * Connects this socket.
      *
      * @param options:
      *          host: the host to connect to.
      *          port: the port to connect to.
      *          policyPort: the policy port to use (if non-default), 0 to
      *            use the flash default.
      *          policyUrl: the policy file URL to use (instead of port).
      */
     socket.connect = function(options) {
       // give precedence to policy URL over policy port
       // if no policy URL and passed port isn't 0, use default port,
       // otherwise use 0 for the port
       var policyUrl = options.policyUrl || null;
       var policyPort = 0;
       if(policyUrl === null && options.policyPort !== 0) {
         policyPort = options.policyPort || sp.policyPort;
       }
       api.connect(id, options.host, options.port, policyPort, policyUrl);
     };

     /**
      * Closes this socket.
      */
     socket.close = function() {
       api.close(id);
       socket.closed({
         id: socket.id,
         type: 'close',
         bytesAvailable: 0
       });
     };

     /**
      * Determines if the socket is connected or not.
      *
      * @return true if connected, false if not.
      */
     socket.isConnected = function() {
       return api.isConnected(id);
     };

     /**
      * Writes bytes to this socket.
      *
      * @param bytes the bytes (as a string) to write.
      *
      * @return true on success, false on failure.
      */
     socket.send = function(bytes) {
       return api.send(id, forge.util.encode64(bytes));
     };

     /**
      * Reads bytes from this socket (non-blocking). Fewer than the number
      * of bytes requested may be read if enough bytes are not available.
      *
      * This method should be called from the data handler if there are
      * enough bytes available. To see how many bytes are available, check
      * the 'bytesAvailable' property on the event in the data handler or
      * call the bytesAvailable() function on the socket. If the browser is
      * msie, then the bytesAvailable() function should be used to avoid
      * race conditions. Otherwise, using the property on the data handler's
      * event may be quicker.
      *
      * @param count the maximum number of bytes to read.
      *
      * @return the bytes read (as a string) or null on error.
      */
     socket.receive = function(count) {
       var rval = api.receive(id, count).rval;
       return (rval === null) ? null : forge.util.decode64(rval);
     };

     /**
      * Gets the number of bytes available for receiving on the socket.
      *
      * @return the number of bytes available for receiving.
      */
     socket.bytesAvailable = function() {
       return api.getBytesAvailable(id);
     };

     // store and return socket
     sp.sockets[id] = socket;
     return socket;
  };

  return sp;
};

/**
 * Destroys a flash socket pool.
 *
 * @param options:
 *          flashId: the dom ID for the flash object element.
 */
net.destroySocketPool = function(options) {
  if(options.flashId in net.socketPools) {
    var sp = net.socketPools[options.flashId];
    sp.destroy();
  }
};

/**
 * Creates a new socket.
 *
 * @param options:
 *          flashId: the dom ID for the flash object element.
 *          connected: function(event) called when the socket connects.
 *          closed: function(event) called when the socket closes.
 *          data: function(event) called when socket data has arrived, it
 *            can be read from the socket using receive().
 *          error: function(event) called when a socket error occurs.
 *
 * @return the created socket.
 */
net.createSocket = function(options) {
  var socket = null;
  if(options.flashId in net.socketPools) {
    // get related socket pool
    var sp = net.socketPools[options.flashId];
    socket = sp.createSocket(options);
  }
  return socket;
};
