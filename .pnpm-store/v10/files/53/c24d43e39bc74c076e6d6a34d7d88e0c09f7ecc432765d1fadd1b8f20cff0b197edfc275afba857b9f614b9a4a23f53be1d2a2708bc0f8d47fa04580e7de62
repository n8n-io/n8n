const {assertIsObject } = require('./utils');

function initializeOptions(options) {
    assertIsObject(options, 'options');
    options = Object.assign({}, options);
    options.allowHalfOpen = true;
    options.rejectUnauthorized = false;
    assertIsObject(options.settings, 'options.settings');
    options.settings = Object.assign({}, options.settings);
  
    // Used only with allowHTTP1
    options.Http1IncomingMessage = options.Http1IncomingMessage ||
      this.http.IncomingMessage;
    options.Http1ServerResponse = options.Http1ServerResponse ||
      this.http.ServerResponse;
  
    options.Http2ServerRequest = options.Http2ServerRequest ||
                                  ((this.http2 || {}).Http2ServerRequest);
    options.Http2ServerResponse = options.Http2ServerResponse ||
                                  ((this.http2 || {}).Http2ServerResponse);
    return options;
  }
  
  function initializeTLSOptions(options, servername) {
    options = initializeOptions.call(this,options);
    var ALPNProtocols = options.ALPNProtocols = [];
    if (this.http2Support)
      ALPNProtocols.push('h2');
    if (options.allowHTTP1 == true || !this.http2Support)
      ALPNProtocols.push('http/1.1');
    if (servername !== undefined && options.servername === undefined)
      options.servername = servername;
    return options;
  }

  module.exports = {
    initializeTLSOptions
  }