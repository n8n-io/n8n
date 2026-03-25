//Based on follow-redirects v0.0.x

var nativeHttps = require('https'),
  nativeHttp = require('http'),
  url = require('url'),
  utils = require('./utils');

var maxRedirects = module.exports.maxRedirects = 5;

var protocols = {
  https: nativeHttps,
  http: nativeHttp
};

for (var protocol in protocols) {
  var h = function() {};
  h.prototype = protocols[protocol];
  h = new h();

  h.request = function(h) {
    return function(options, callback, redirectOptions) {

      redirectOptions = redirectOptions || {};

      var max = (typeof options === 'object' && 'maxRedirects' in options) ? options.maxRedirects : exports.maxRedirects;

      var redirect = utils.extend({
        count: 0,
        max: max,
        clientRequest: null,
        userCallback: callback
      }, redirectOptions);

      if (redirect.count > redirect.max) {
        var err = new Error('Max redirects exceeded. To allow more redirects, pass options.maxRedirects property.');
        redirect.clientRequest.emit('error', err);
        return redirect.clientRequest;
      }

      redirect.count++;

      var reqUrl;
      if (typeof options === 'string') {
        reqUrl = options;
      } else {
        reqUrl = url.format(utils.extend({
          protocol: protocol
        }, options));
      }

      var clientRequest = Object.getPrototypeOf(h).request(options, redirectCallback(reqUrl, redirect));

      if (!redirect.clientRequest) redirect.clientRequest = clientRequest;

      function redirectCallback(reqUrl, redirect) {
        return function(res) {
          if (res.statusCode < 300 || res.statusCode > 399) {
            return redirect.userCallback(res);
          }

          if (!('location' in res.headers)) {
            return redirect.userCallback(res);
          }

          var redirectUrl = url.resolve(reqUrl, res.headers.location);

          var proto = url.parse(redirectUrl).protocol;
          proto = proto.substr(0, proto.length - 1);
          return module.exports[proto].get(redirectUrl, redirectCallback(reqUrl, redirect), redirect);
        };
      }

      return clientRequest;
    };
  }(h);

  // see https://github.com/joyent/node/blob/master/lib/http.js#L1623
  h.get = function(h) {
    return function(options, cb, redirectOptions) {
      var req = h.request(options, cb, redirectOptions);
      req.end();
      return req;
    };
  }(h);

  module.exports[protocol] = h;
}
