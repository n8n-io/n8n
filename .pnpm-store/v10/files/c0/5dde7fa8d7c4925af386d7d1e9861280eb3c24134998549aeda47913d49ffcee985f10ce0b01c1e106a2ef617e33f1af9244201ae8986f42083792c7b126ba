const http = require('http');
const https = require('https');
const ArgumentError = require('../errors/ArgumentError');

module.exports.default =  (options) => {
  if (options.fetcher) {
    return options.fetcher(options.uri);
  }

  return new Promise((resolve, reject) => {
    let url;
    try {
      url = new URL(options.uri);
    } catch (err) {
      throw new ArgumentError('Invalid JWKS URI: The provided URI is not a valid URL.');
    }
    const { hostname, port, protocol, pathname, search } = url;
    const path = pathname + search;

    const requestOptions = {
      hostname,
      path,
      port,
      method: 'GET',
      ...(options.headers && { headers: { ...options.headers } }),
      ...(options.timeout && { timeout: options.timeout }),
      ...(options.agent && { agent: options.agent })
    };

    const httpRequestLib = protocol === 'https:' ? https : http;
    const httpRequest = httpRequestLib.request(requestOptions, (res) => {
      let rawData = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          const errorMsg = res.body && (res.body.message || res.body) || res.statusMessage || `Http Error ${res.statusCode}`;
          reject({ errorMsg });
        } else {
          try {
            resolve(rawData && JSON.parse(rawData));
          } catch (error) {
            reject(error);
          }
        }
      });
    });

    httpRequest
      .on('timeout', () => httpRequest.destroy())
      .on('error', (e) => reject(e))
      .end();
  });
};
