var httpNative   = require('http'),
    httpsNative  = require('https'),
    web_o  = require('./web-outgoing'),
    common = require('../common'),
    followRedirects = require('follow-redirects');

web_o = Object.keys(web_o).map(function(pass) {
  return web_o[pass];
});

var nativeAgents = { http: httpNative, https: httpsNative };

/*!
 * Array of passes.
 *
 * A `pass` is just a function that is executed on `req, res, options`
 * so that you can easily add new checks while still keeping the base
 * flexible.
 */


module.exports = {

  /**
   * Sets `content-length` to '0' if request is of DELETE type.
   *
   * @param {ClientRequest} Req Request object
   * @param {IncomingMessage} Res Response object
   * @param {Object} Options Config object passed to the proxy
   *
   * @api private
   */

  deleteLength: function deleteLength(req, res, options) {
    if((req.method === 'DELETE' || req.method === 'OPTIONS')
       && !req.headers['content-length']) {
      req.headers['content-length'] = '0';
      delete req.headers['transfer-encoding'];
    }
  },

  /**
   * Sets timeout in request socket if it was specified in options.
   *
   * @param {ClientRequest} Req Request object
   * @param {IncomingMessage} Res Response object
   * @param {Object} Options Config object passed to the proxy
   *
   * @api private
   */

  timeout: function timeout(req, res, options) {
    if(options.timeout) {
      req.socket.setTimeout(options.timeout);
    }
  },

  /**
   * Sets `x-forwarded-*` headers if specified in config.
   *
   * @param {ClientRequest} Req Request object
   * @param {IncomingMessage} Res Response object
   * @param {Object} Options Config object passed to the proxy
   *
   * @api private
   */

  XHeaders: function XHeaders(req, res, options) {
    if(!options.xfwd) return;

    var encrypted = req.isSpdy || common.hasEncryptedConnection(req);
    var values = {
      for  : req.connection.remoteAddress || req.socket.remoteAddress,
      port : common.getPort(req),
      proto: encrypted ? 'https' : 'http'
    };

    ['for', 'port', 'proto'].forEach(function(header) {
      req.headers['x-forwarded-' + header] =
        (req.headers['x-forwarded-' + header] || '') +
        (req.headers['x-forwarded-' + header] ? ',' : '') +
        values[header];
    });

    req.headers['x-forwarded-host'] = req.headers['x-forwarded-host'] || req.headers['host'] || '';
  },

  /**
   * Does the actual proxying. If `forward` is enabled fires up
   * a ForwardStream, same happens for ProxyStream. The request
   * just dies otherwise.
   *
   * @param {ClientRequest} Req Request object
   * @param {IncomingMessage} Res Response object
   * @param {Object} Options Config object passed to the proxy
   *
   * @api private
   */

  stream: function stream(req, res, options, _, server, clb) {

    // And we begin!
    server.emit('start', req, res, options.target || options.forward);

    var agents = options.followRedirects ? followRedirects : nativeAgents;
    var http = agents.http;
    var https = agents.https;

    if(options.forward) {
      // If forward enable, so just pipe the request
      var forwardReq = (options.forward.protocol === 'https:' ? https : http).request(
        common.setupOutgoing(options.ssl || {}, options, req, 'forward')
      );

      // error handler (e.g. ECONNRESET, ECONNREFUSED)
      // Handle errors on incoming request as well as it makes sense to
      var forwardError = createErrorHandler(forwardReq, options.forward);
      req.on('error', forwardError);
      forwardReq.on('error', forwardError);

      (options.buffer || req).pipe(forwardReq);
      if(!options.target) { return res.end(); }
    }

    // Request initalization
    var proxyReq = (options.target.protocol === 'https:' ? https : http).request(
      common.setupOutgoing(options.ssl || {}, options, req)
    );

    // Enable developers to modify the proxyReq before headers are sent
    proxyReq.on('socket', function(socket) {
      if(server && !proxyReq.getHeader('expect')) {
        server.emit('proxyReq', proxyReq, req, res, options);
      }
    });

    // allow outgoing socket to timeout so that we could
    // show an error page at the initial request
    if(options.proxyTimeout) {
      proxyReq.setTimeout(options.proxyTimeout, function() {
         proxyReq.abort();
      });
    }

    // Ensure we abort proxy if request is aborted
    req.on('aborted', function () {
      proxyReq.abort();
    });

    // handle errors in proxy and incoming request, just like for forward proxy
    var proxyError = createErrorHandler(proxyReq, options.target);
    req.on('error', proxyError);
    proxyReq.on('error', proxyError);

    function createErrorHandler(proxyReq, url) {
      return function proxyError(err) {
        if (req.socket.destroyed && err.code === 'ECONNRESET') {
          server.emit('econnreset', err, req, res, url);
          return proxyReq.abort();
        }

        if (clb) {
          clb(err, req, res, url);
        } else {
          server.emit('error', err, req, res, url);
        }
      }
    }

    (options.buffer || req).pipe(proxyReq);

    proxyReq.on('response', function(proxyRes) {
      if(server) { server.emit('proxyRes', proxyRes, req, res); }

      if(!res.headersSent && !options.selfHandleResponse) {
        for(var i=0; i < web_o.length; i++) {
          if(web_o[i](req, res, proxyRes, options)) { break; }
        }
      }

      if (!res.finished) {
        // Allow us to listen when the proxy has completed
        proxyRes.on('end', function () {
          if (server) server.emit('end', req, res, proxyRes);
        });
        // We pipe to the response unless its expected to be handled by the user
        if (!options.selfHandleResponse) proxyRes.pipe(res);
      } else {
        if (server) server.emit('end', req, res, proxyRes);
      }
    });
  }

};
