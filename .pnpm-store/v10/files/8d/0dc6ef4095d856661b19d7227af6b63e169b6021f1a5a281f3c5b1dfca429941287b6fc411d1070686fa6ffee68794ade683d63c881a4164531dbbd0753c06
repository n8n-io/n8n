var http = require('http');
var https = require('https');
var url = require('url');

var isHttpResource = require('../utils/is-http-resource');
var isHttpsResource = require('../utils/is-https-resource');
var override = require('../utils/override');

var HTTP_PROTOCOL = 'http:';

function loadRemoteResource(uri, inlineRequest, inlineTimeout, callback) {
  var proxyProtocol = inlineRequest.protocol || inlineRequest.hostname;
  var errorHandled = false;
  var requestOptions;
  var fetch;

  requestOptions = override(
    url.parse(uri),
    inlineRequest || {}
  );

  if (inlineRequest.hostname !== undefined) {
    // overwrite as we always expect a http proxy currently
    requestOptions.protocol = inlineRequest.protocol || HTTP_PROTOCOL;
    requestOptions.path = requestOptions.href;
  }

  fetch = (proxyProtocol && !isHttpsResource(proxyProtocol)) || isHttpResource(uri) ?
    http.get :
    https.get;

  fetch(requestOptions, function (res) {
    var chunks = [];
    var movedUri;

    if (errorHandled) {
      return;
    }

    if (res.statusCode < 200 || res.statusCode > 399) {
      return callback(res.statusCode, null);
    } else if (res.statusCode > 299) {
      movedUri = url.resolve(uri, res.headers.location);
      return loadRemoteResource(movedUri, inlineRequest, inlineTimeout, callback);
    }

    res.on('data', function (chunk) {
      chunks.push(chunk.toString());
    });
    res.on('end', function () {
      var body = chunks.join('');
      callback(null, body);
    });
  })
  .on('error', function (res) {
    if (errorHandled) {
      return;
    }

    errorHandled = true;
    callback(res.message, null);
  })
  .on('timeout', function () {
    if (errorHandled) {
      return;
    }

    errorHandled = true;
    callback('timeout', null);
  })
  .setTimeout(inlineTimeout);
}

module.exports = loadRemoteResource;
