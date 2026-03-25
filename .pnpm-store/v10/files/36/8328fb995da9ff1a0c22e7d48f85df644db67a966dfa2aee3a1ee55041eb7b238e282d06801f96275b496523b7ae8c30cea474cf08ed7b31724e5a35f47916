/**
 * Wrapper for built-in http.js to emulate the browser XMLHttpRequest object.
 *
 * This can be used with JS designed for browsers to improve reuse of code and
 * allow the use of existing libraries.
 *
 * Usage: include("XMLHttpRequest.js") and use XMLHttpRequest per W3C specs.
 *
 * @author Dan DeFelippi <dan@driverdan.com>
 * @contributor David Ellis <d.f.ellis@ieee.org>
 * @license MIT
 */

var fs = require('fs');
var spawn = require('child_process').spawn;

/**
 * Module exports.
 */

module.exports = XMLHttpRequest;

// backwards-compat
XMLHttpRequest.XMLHttpRequest = XMLHttpRequest;

/**
 * `XMLHttpRequest` constructor.
 *
 * Supported options for the `opts` object are:
 *
 *  - `agent`: An http.Agent instance; http.globalAgent may be used; if 'undefined', agent usage is disabled
 *
 * @param {Object} opts optional "options" object
 */

function XMLHttpRequest(opts) {
  "use strict";

  // defines a list of default options to prevent parameters pollution
  var default_options = {
    pfx: undefined,
    key: undefined,
    passphrase: undefined,
    cert: undefined,
    ca: undefined,
    ciphers: undefined,
    rejectUnauthorized: true,
    autoUnref: false,
    agent: undefined,
    allowFileSystemResources: true,
    maxRedirects: 20, // Chrome standard
    origin: undefined
  };

  opts = Object.assign(default_options, opts);

  var sslOptions = {
    pfx: opts.pfx,
    key: opts.key,
    passphrase: opts.passphrase,
    cert: opts.cert,
    ca: opts.ca,
    ciphers: opts.ciphers,
    rejectUnauthorized: opts.rejectUnauthorized !== false
  };

  /**
   * Private variables
   */
  var self = this;
  var http = require('http');
  var https = require('https');

  var maxRedirects = opts.maxRedirects;
  if (typeof maxRedirects !== 'number' || Number.isNaN(maxRedirects)) maxRedirects = 20;
  else maxRedirects = Math.max(maxRedirects, 0);

  var redirectCount = 0;

  // Holds http.js objects
  var request;
  var response;

  // Request settings
  var settings = {};

  // Disable header blacklist.
  // Not part of XHR specs.
  var disableHeaderCheck = false;

  // Set some default headers
  var defaultHeaders = {
    "User-Agent": "node-XMLHttpRequest",
    "Accept": "*/*"
  };

  var headers = Object.assign({}, defaultHeaders);

  // These headers are not user setable.
  // The following are allowed but banned in the spec:
  // * user-agent
  var forbiddenRequestHeaders = [
    "accept-charset",
    "accept-encoding",
    "access-control-request-headers",
    "access-control-request-method",
    "connection",
    "content-length",
    "content-transfer-encoding",
    "cookie",
    "cookie2",
    "date",
    "expect",
    "host",
    "keep-alive",
    "origin",
    "referer",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "via"
  ];

  // These request methods are not allowed
  var forbiddenRequestMethods = [
    "TRACE",
    "TRACK",
    "CONNECT"
  ];

  // Send flag
  var sendFlag = false;
  // Error flag, used when errors occur or abort is called
  var errorFlag = false;
  var abortedFlag = false;

  // Event listeners
  var listeners = {};

  /**
   * Constants
   */

  this.UNSENT = 0;
  this.OPENED = 1;
  this.HEADERS_RECEIVED = 2;
  this.LOADING = 3;
  this.DONE = 4;

  /**
   * Public vars
   */

  // Current state
  this.readyState = this.UNSENT;

  // default ready state change handler in case one is not set or is set late
  this.onreadystatechange = null;

  // Result & response
  this.responseText = "";
  this.responseXML = "";
  this.responseURL = "";
  this.response = Buffer.alloc(0);
  this.status = null;
  this.statusText = null;

  // xhr.responseType is supported:
  //   When responseType is 'text' or '', self.responseText will be utf8 decoded text.
  //   When responseType is 'json', self.responseText initially will be utf8 decoded text,
  //   which is then JSON parsed into self.response.
  //   When responseType is 'arraybuffer', self.response is an ArrayBuffer.
  //   When responseType is 'blob', self.response is a Blob.
  // cf. section 3.6, subsections 8,9,10,11 of https://xhr.spec.whatwg.org/#the-response-attribute
  this.responseType = ""; /* 'arraybuffer' or 'text' or '' or 'json' or 'blob' */

  /**
   * Private methods
   */

  /**
   * Check if the specified header is allowed.
   *
   * @param string header Header to validate
   * @return boolean False if not allowed, otherwise true
   */
  var isAllowedHttpHeader = function(header) {
    return disableHeaderCheck || (header && forbiddenRequestHeaders.indexOf(header.toLowerCase()) === -1);
  };

  /**
   * Check if the specified method is allowed.
   *
   * @param string method Request method to validate
   * @return boolean False if not allowed, otherwise true
   */
  var isAllowedHttpMethod = function(method) {
    return (method && forbiddenRequestMethods.indexOf(method) === -1);
  };

  /**
   * When xhr.responseType === 'arraybuffer', xhr.response must have type ArrayBuffer according
   * to section 3.6.9 of https://xhr.spec.whatwg.org/#the-response-attribute .
   * However, bufTotal = Buffer.concat(...) often has byteOffset > 0, so bufTotal.buffer is larger
   * than the useable region in bufTotal. This means that a new copy of bufTotal would need to be
   * created to get the correct ArrayBuffer. Instead, do the concat by hand to create the right
   * sized ArrayBuffer in the first place.
   *
   * The return type is Uint8Array,
   * because often Buffer will have Buffer.length < Buffer.buffer.byteLength.
   *
   * @param {Array<Buffer>} bufferArray
   * @returns {Uint8Array}
   */
  var concat = function(bufferArray) {
    let length = 0, offset = 0;
    for (let k = 0; k < bufferArray.length; k++)
      length += bufferArray[k].length;
    const result = new Uint8Array(length);
    for (let k = 0; k < bufferArray.length; k++)
    {
      result.set(bufferArray[k], offset);
      offset += bufferArray[k].length;
    }
    return result;
  };

  /**
   * When xhr.responseType === 'arraybuffer', xhr.response must have type ArrayBuffer according
   * to section 3.6.9 of https://xhr.spec.whatwg.org/#the-response-attribute .
   * However, buf = Buffer.from(str) often has byteOffset > 0, so buf.buffer is larger than the
   * usable region in buf. This means that a new copy of buf would need to be created to get the
   * correct arrayBuffer. Instead, do it by hand to create the right sized ArrayBuffer in the
   * first place.
   *
   * @param {string} str
   * @returns {Buffer}
   */
  var stringToBuffer = function(str) {
    const ab = new ArrayBuffer(str.length)
    const buf = Buffer.from(ab);
    for (let k = 0; k < str.length; k++)
      buf[k] = Number(str.charCodeAt(k));
    return buf;
  }

  /**
   * Given a Buffer buf, check whether buf.buffer.byteLength > buf.length and if so,
   * create a new ArrayBuffer whose byteLength is buf.length, containing the bytes.
   * of buf. This function shouldn't usually be needed, unless there's a future
   * behavior change where buf.buffer.byteLength > buf.length unexpectedly.
   *
   * @param {Buffer} buf
   * @returns {ArrayBuffer}
   */
  var checkAndShrinkBuffer = function(buf) {
    if (buf.length === buf.buffer.byteLength)
      return buf.buffer;
    const ab = new ArrayBuffer(buf.length);
    const result = Buffer.from(ab);
    for (let k = 0; k < buf.length; k++)
      result[k] = buf[k];
    return ab;
  }

  /**
   * Public methods
   */

  /**
   * Open the connection. Currently supports local server requests.
   *
   * @param string method Connection method (eg GET, POST)
   * @param string url URL for the connection.
   * @param boolean async Asynchronous connection. Default is true.
   * @param string user Username for basic authentication (optional)
   * @param string password Password for basic authentication (optional)
   */
  this.open = function(method, url, async, user, password) {
    this.abort();
    errorFlag = false;
    abortedFlag = false;

    // Check for valid request method
    if (!isAllowedHttpMethod(method)) {
      throw new Error("SecurityError: Request method not allowed");
    }

    settings = {
      "method": method.toUpperCase(),
      "url": url,
      "async": (typeof async !== "boolean" ? true : async),
      "user": user || null,
      "password": password || null
    };

    // parse origin
    try {
      settings.origin = new URL(opts.origin);
    }
    catch (e) {
      settings.origin = null;
    }

    setState(this.OPENED);
  };

  /**
   * Disables or enables isAllowedHttpHeader() check the request. Enabled by default.
   * This does not conform to the W3C spec.
   *
   * @param boolean state Enable or disable header checking.
   */
  this.setDisableHeaderCheck = function(state) {
    disableHeaderCheck = state;
  };

  /**
   * Sets a header for the request.
   *
   * @param string header Header name
   * @param string value Header value
   * @return boolean Header added
   */
  this.setRequestHeader = function(header, value) {
    if (this.readyState != this.OPENED) {
      throw new Error("INVALID_STATE_ERR: setRequestHeader can only be called when state is OPEN");
    }
    if (!isAllowedHttpHeader(header)) {
      console.warn('Refused to set unsafe header "' + header + '"');
      return false;
    }
    if (sendFlag) {
      throw new Error("INVALID_STATE_ERR: send flag is true");
    }
    headers[header] = value;
    return true;
  };

  /**
   * Gets a header from the server response.
   *
   * @param string header Name of header to get.
   * @return string Text of the header or null if it doesn't exist.
   */
  this.getResponseHeader = function(header) {
    // in case of local request, headers are not present
    if (typeof header === "string"
      && this.readyState > this.OPENED
      && response.headers[header.toLowerCase()]
      && !errorFlag
      && response
      && response.headers
    ) {
      return response.headers[header.toLowerCase()];
    }

    return null;
  };

  /**
   * Gets all the response headers.
   *
   * @return string A string with all response headers separated by CR+LF
   */
  this.getAllResponseHeaders = function() {
    // in case of local request, headers are not present
    if (this.readyState < this.HEADERS_RECEIVED || errorFlag || !response || !response.headers) {
      return "";
    }
    var result = "";

    for (var i in response.headers) {
      // Cookie headers are excluded
      if (i !== "set-cookie" && i !== "set-cookie2") {
        result += i + ": " + response.headers[i] + "\r\n";
      }
    }
    return result.slice(0, -2);
  };

  /**
   * Gets a request header
   *
   * @param string name Name of header to get
   * @return string Returns the request header or empty string if not set
   */
  this.getRequestHeader = function(name) {
    // @TODO Make this case insensitive
    if (typeof name === "string" && headers[name]) {
      return headers[name];
    }

    return "";
  };

  /**
   * Convert from Data URI to Buffer
   * @param {URL} url URI to parse
   * @returns {Buffer} buffer
   */

  var bufferFromDataUri = function (url) {
    // Triming from original url object for more consistency
    var data = url.href.slice(5);

    // separator between header and actual data
    var parts = data.split(",", 2);

    if (parts.length < 2) throw "Invalid URL";

    // check if header part has base64 (from 2nd header onwards)
    var base64 = parts[0].split(";").some(function (dataHeader, index) {
      return index > 0 && dataHeader.toLowerCase() === "base64";
    });

    var responseData, inputData = decodeURIComponent(parts[1]);

    if (base64) {
      // remove any ASCII whitespaces
      inputData = inputData.replace(/(\s|\t|\r|\n|\v|\f)+/g, "");
      // check padding amount
      let padding = inputData.match(/=*$/)[0];
      if (padding.length + (inputData.length - padding.length) % 4 > 4) throw "invalid padding";
      inputData = inputData.slice(0, inputData.length - padding.length);
      responseData = Buffer.from(inputData, "base64");
      if (responseData.toString("base64").replace(/=+$/, "") !== inputData) throw "malformed base64 encoding";
      return responseData;
    }
    else {
      return Buffer.from(inputData);
    }
  }

  /**
   * Sends the request to the server.
   *
   * @param string data Optional data to send as request body.
   */
  this.send = function(data) {
    if (this.readyState != this.OPENED) {
      throw new Error("INVALID_STATE_ERR: connection must be opened before send() is called");
    }

    if (sendFlag) {
      throw new Error("INVALID_STATE_ERR: send has already been called");
    }

    var isSsl = false, isLocal = false, isDataUri = false;
    var url;
    try {
      if (settings.origin) {
        url = new URL(settings.url, settings.origin);
      }
      else {
        url = new URL(settings.url);
      }
      settings.url = url.href;
    }
    catch (e) {
      // URL parsing throws TypeError, here we only want to take its message
      self.handleError(new Error(e.message));
      return;
    }
    var host;
    // Determine the server
    switch (url.protocol) {
      case 'https:':
        isSsl = true;
        // SSL & non-SSL both need host, no break here.
      case 'http:':
        host = url.hostname;
        break;

      case 'data:':
        isDataUri = true;
      
      case 'file:':
        isLocal = true;
        break;

      case undefined:
      case '':
        host = "localhost";
        break;

      default:
        throw new Error("Protocol not supported.");
    }

    // Load files off the local filesystem (file://)
    // or data from Data URI (data:)
    if (isLocal) {
      if (isDataUri) try {
        self.status = 200;
        self.responseURL = settings.url;
        self.createFileOrSyncResponse(bufferFromDataUri(url));
        setState(self.DONE);
        return;
      }
      catch (e) {
        self.handleError(new Error("Invalid data URI"));
        return;
      }

      if (!opts.allowFileSystemResources) {
        self.handleError(new Error("Not allowed to load local resource: " + url.href));
        return;
      }

      if (settings.method !== "GET") {
        throw new Error("XMLHttpRequest: Only GET method is supported");
      }

      if (settings.async) {
        fs.readFile(unescape(url.pathname), function(error, data) {
          if (error) {
            self.handleError(error, error.errno || -1);
          } else {
            self.status = 200;
            self.responseURL = settings.url;
            // Use self.responseType to create the correct self.responseType, self.response.
            self.createFileOrSyncResponse(data);
            setState(self.DONE);
          }
        });
      } else {
        try {
          this.status = 200;
          const syncData = fs.readFileSync(unescape(url.pathname));
          // Use self.responseType to create the correct self.responseType, self.response.
          this.responseURL = settings.url;
          this.createFileOrSyncResponse(syncData);
          setState(self.DONE);
        } catch(e) {
          this.handleError(e, e.errno || -1);
        }
      }

      return;
    }

    // Default to port 80. If accessing localhost on another port be sure
    // to use http://localhost:port/path
    var port = url.port || (isSsl ? 443 : 80);
    // Add query string if one is used
    var uri = url.pathname + (url.search || '');

    // Set the Host header or the server may reject the request
    headers["Host"] = host;
    if (!((isSsl && port === 443) || port === 80)) {
      headers["Host"] += ':' + url.port;
    }

    // Set Basic Auth if necessary
    if (settings.user) {
      if (typeof settings.password === "undefined") {
        settings.password = "";
      }
      var authBuf = Buffer.from(settings.user + ":" + settings.password);
      headers["Authorization"] = "Basic " + authBuf.toString("base64");
    }

    // Set content length header
    if (settings.method === "GET" || settings.method === "HEAD") {
      data = null;
    } else if (data) {
      headers["Content-Length"] = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);

      var headersKeys = Object.keys(headers);
      if (!headersKeys.some(function (h) { return h.toLowerCase() === 'content-type' })) {
        headers["Content-Type"] = "text/plain;charset=UTF-8";
      }
    } else if (settings.method === "POST") {
      // For a post with no data set Content-Length: 0.
      // This is required by buggy servers that don't meet the specs.
      headers["Content-Length"] = 0;
    }

    var options = {
      host: host,
      port: port,
      path: uri,
      method: settings.method,
      headers: headers,
      agent: opts.agent || false
    };

    // Reset error flag
    errorFlag = false;
    // Handle async requests
    if (settings.async) {
      // Use the proper protocol
      var doRequest = isSsl ? https.request : http.request;

      // Request is being sent, set send flag
      sendFlag = true;

      // As per spec, this is called here for historical reasons.
      self.dispatchEvent("readystatechange");

      // Handler for the response
      var responseHandler = function(resp) {
        // Check for redirect
        if (
          resp.statusCode === 301 ||
          resp.statusCode === 302 ||
          resp.statusCode === 303 ||
          resp.statusCode === 307 ||
          resp.statusCode === 308
        ) {
          ++redirectCount;
          // end the response
          resp.destroy();
          if (redirectCount > maxRedirects) {
            self.handleError(new Error("Too many redirects"));
            return;
          }
          // Change URL to the redirect location
          var url;
          try {
            url = new URL(resp.headers.location, settings.url);
            // reject redirects to any protocols other than http and https
            if (url.protocol !== "https:" && url.protocol !== "http:") throw "bad protocol";
            settings.url = url.href;
          }
          catch (e) {
            self.handleError(new Error("Unsafe redirect"));
            return;
          }
          // change request options again to match with new redirect protocol
          isSsl = url.protocol === "https:";
          doRequest = isSsl ? https.request : http.request;

          // Set host and port var in case it's used later
          host = url.hostname;
          port = url.port || (isSsl ? 443 : 80);

          headers["Host"] = host;
          if (!((isSsl && port === 443) || port === 80)) {
            headers["Host"] += ':' + url.port;
          }

          // Options for the new request
          var newOptions = {
            hostname: url.hostname,
            port: port,
            path: url.pathname + (url.search || ''),
            method: resp.statusCode === 303 ? 'GET' : settings.method,
            headers: headers
          };

          // Issue the new request
          createRequest(newOptions);
          // @TODO Check if an XHR event needs to be fired here
          return;
        }

        // Set response var to the response we got back
        // This is so it remains accessable outside this scope
        response = resp;
        // Collect buffers and concatenate once.
        const buffers = [];

        setState(self.HEADERS_RECEIVED);

        // When responseType is 'text' or '', self.responseText will be utf8 decoded text.
        // When responseType is 'json', self.responseText initially will be utf8 decoded text,
        // which is then JSON parsed into self.response.
        // When responseType is 'arraybuffer', self.response is an ArrayBuffer.
        // When responseType is 'blob', self.response is a Blob.
        // cf. section 3.6, subsections 8,9,10,11 of https://xhr.spec.whatwg.org/#the-response-attribute
        const isUtf8 = self.responseType === "" || self.responseType === "text" || self.responseType === "json";
        if (isUtf8 && response.setEncoding) {
          response.setEncoding("utf8");
        }

        self.status = response.statusCode;

        response.on('data', function(chunk) {
          // Make sure there's some data
          if (chunk) {
            if (isUtf8) {
              // When responseType is 'text', '', 'json',
              //   then each chunk is already utf8 decoded.
              self.responseText += chunk;
            } else {
              // Otherwise collect the chunk buffers.
              buffers.push(chunk);
            }
          }
          // Don't emit state changes if the connection has been aborted.
          if (sendFlag) {
            setState(self.LOADING);
          }
        }.bind(response));

        response.on('end', function() {
          if (sendFlag) {
            // The sendFlag needs to be set before setState is called.  Otherwise if we are chaining callbacks
            // there can be a timing issue (the callback is called and a new call is made before the flag is reset).
            sendFlag = false;
            // Create the correct response for responseType.
            self.createResponse(buffers);
            self.statusText = this.statusMessage;
            self.responseURL = settings.url;
            // Discard the 'end' event if the connection has been aborted
            setState(self.DONE);
          }
        }.bind(response));

        response.on('error', function(error) {
          self.handleError(error);
        }.bind(response));
      }

      // Error handler for the request
      var errorHandler = function(error) {
        // In the case of https://nodejs.org/api/http.html#requestreusedsocket triggering an ECONNRESET,
        // don't fail the xhr request, attempt again.
        if (request.reusedSocket && error.code === 'ECONNRESET')
          return doRequest(options, responseHandler).on('error', errorHandler);
        self.handleError(error);
      }

      var createRequest = function (opt) {
        opt = Object.assign({}, opt);
        if (isSsl) Object.assign(opt, sslOptions);

        request = doRequest(opt, responseHandler).on('error', errorHandler);

        if (opts.autoUnref) {
          request.on('socket', function (socket) {
            socket.unref();
          });
        }

        // Node 0.4 and later won't accept empty data. Make sure it's needed.
        if (data) {
          request.write(data);
        }

        request.end();
      }

      // Create the request
      createRequest(options);

      self.dispatchEvent("loadstart");
    } else { // Synchronous
      // Create a temporary file for communication with the other Node process
      var contentFile = ".node-xmlhttprequest-content-" + process.pid;
      var syncFile = ".node-xmlhttprequest-sync-" + process.pid;
      fs.writeFileSync(syncFile, "", "utf8");
      // The async request the other Node process executes
      var execString = "'use strict';"
        + "var http = require('http'), https = require('https'), fs = require('fs');"
        + "function concat(bufferArray) {"
        + "  let length = 0, offset = 0;"
        + "  for (let k = 0; k < bufferArray.length; k++)"
        + "    length += bufferArray[k].length;"
        + "  const result = Buffer.alloc(length);"
        + "  for (let k = 0; k < bufferArray.length; k++) {"
        + "    for (let i = 0; i < bufferArray[k].length; i++) {"
        + "      result[offset+i] = bufferArray[k][i]"
        + "    }"
        + "    offset += bufferArray[k].length;"
        + "  }"
        + "  return result;"
        + "};"
        + "var doRequest = http" + (isSsl ? "s" : "") + ".request;"
        + "var isSsl = " + !!isSsl + ";"
        + "var options = " + JSON.stringify(options) + ";"
        + "var sslOptions = " + JSON.stringify(sslOptions) + ";"
        + "var responseData = Buffer.alloc(0);"
        + "var buffers = [];"
        + "var url = new URL(" + JSON.stringify(settings.url) + ");"
        + "var maxRedirects = " + maxRedirects + ", redirects_count = 0;"
        + "var makeRequest = function () {"
        + "  var opt = Object.assign({}, options);"
        + "  if (isSsl) Object.assign(opt, sslOptions);"
        + "  var req = doRequest(opt, function(response) {"
        + "    if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 303 || response.statusCode === 307 || response.statusCode === 308) {"
        + "      response.destroy();"
        + "      ++redirects_count;"
        + "      if (redirects_count > maxRedirects) {"
        + "        fs.writeFileSync('" + contentFile + "', 'NODE-XMLHTTPREQUEST-ERROR-REDIRECT: Too many redirects', 'utf8');"
        + "        fs.unlinkSync('" + syncFile + "');"
        + "        return;"
        + "      }"
        + "      try {"
        + "        url = new URL(response.headers.location, url);"
        + "        if (url.protocol !== 'https:' && url.protocol !== 'http:') throw 'bad protocol';"
        + "      }"
        + "      catch (e) {"
        + "        fs.writeFileSync('" + contentFile + "', 'NODE-XMLHTTPREQUEST-ERROR-REDIRECT: Unsafe redirect', 'utf8');"
        + "        fs.unlinkSync('" + syncFile + "');"
        + "        return;"
        + "      };"
        + "      isSsl = url.protocol === 'https:';"
        + "      doRequest = isSsl ? https.request : http.request;"
        + "      var port = url.port;"
        + "      options = {"
        + "        hostname: url.hostname,"
        + "        port: port,"
        + "        path: url.pathname + (url.search || ''),"
        + "        method: response.statusCode === 303 ? 'GET' : options.method,"
        + "        headers: options.headers"
        + "      };"
        + "      options.headers['Host'] = url.host;"
        + "      if (!((isSsl && port === 443) || port === 80)) options.headers['Host'] += ':' + port;"
        + "      makeRequest();"
        + "      return;"
        + "    }"
        + "    response.on('data', function(chunk) {"
        + "      buffers.push(chunk);"
        + "    });"
        + "    response.on('end', function() {"
        + "      responseData = concat(buffers);"
        + "      fs.writeFileSync('" + contentFile + "', JSON.stringify({err: null, data: {url: url.href, statusCode: response.statusCode, statusText: response.statusMessage, headers: response.headers, data: responseData.toString('utf8')}}), 'utf8');"
        + "      fs.unlinkSync('" + syncFile + "');"
        + "    });"
        + "    response.on('error', function(error) {"
        + "      fs.writeFileSync('" + contentFile + "', 'NODE-XMLHTTPREQUEST-ERROR:' + JSON.stringify(error), 'utf8');"
        + "      fs.unlinkSync('" + syncFile + "');"
        + "    });"
        + "  }).on('error', function(error) {"
        + "    fs.writeFileSync('" + contentFile + "', 'NODE-XMLHTTPREQUEST-ERROR:' + JSON.stringify(error), 'utf8');"
        + "    fs.unlinkSync('" + syncFile + "');"
        + "  });"
        + "  " + (data ? "req.write('" + JSON.stringify(data).slice(1,-1).replace(/'/g, "\\'") + "');":"")
        + "  req.end();"
        + "};"
        + "makeRequest();"
      // Start the other Node Process, executing this string
      var syncProc = spawn(process.argv[0], ["-e", execString]);
      while(fs.existsSync(syncFile)) {
        // Wait while the sync file is empty
      }
      self.responseText = fs.readFileSync(contentFile, 'utf8');
      // Kill the child process once the file has data
      syncProc.stdin.end();
      // Remove the temporary file
      fs.unlinkSync(contentFile);
      if (self.responseText.match(/^NODE-XMLHTTPREQUEST-ERROR(-REDIRECT){0,1}:/)) {
        // If the file returned an error, handle it
        if (self.responseText.startsWith('NODE-XMLHTTPREQUEST-ERROR-REDIRECT')) {
          self.handleError(new Error(self.responseText.replace(/^NODE-XMLHTTPREQUEST-ERROR-REDIRECT: /, "")));
        }
        else {
          var errorObj = JSON.parse(self.responseText.replace(/^NODE-XMLHTTPREQUEST-ERROR:/, ""));
          self.handleError(errorObj, 503);
        }
      } else {
        // If the file returned okay, parse its data and move to the DONE state
        const resp = JSON.parse(self.responseText);
        self.status = resp.data.statusCode;
        self.statusText = resp.data.statusText;
        self.responseURL = resp.data.url;
        self.response = stringToBuffer(resp.data.data);
        // Use self.responseType to create the correct self.responseType, self.response, self.responseXML.
        self.createFileOrSyncResponse(self.response);
        // Set up response correctly.
        response = {
          statusCode: self.status,
          headers: resp.data.headers
        };
        setState(self.DONE);
      }
    }
  };

  /**
   * Called when an error is encountered to deal with it.
   * @param  status  {number}    HTTP status code to use rather than the default (0) for XHR errors.
   */
  this.handleError = function(error, status) {
    this.status = status || 0;
    this.statusText = error.message || "";
    this.responseText = "";
    this.responseXML = "";
    this.responseURL = "";
    this.response = Buffer.alloc(0);
    errorFlag = true;
    setState(this.DONE);
    if (!settings.async) throw error;
  };

  /**
   * Aborts a request.
   */
  this.abort = function() {
    if (request) {
      request.abort();
      request = null;
    }

    headers = Object.assign({}, defaultHeaders);
    this.responseText = "";
    this.responseXML = "";
    this.response = Buffer.alloc(0);

    errorFlag = abortedFlag = true
    if (this.readyState !== this.UNSENT
        && (this.readyState !== this.OPENED || sendFlag)
        && this.readyState !== this.DONE) {
      sendFlag = false;
      setState(this.DONE);
    }
    this.readyState = this.UNSENT;
  };

  /**
   * Adds an event listener. Preferred method of binding to events.
   */
  this.addEventListener = function(event, callback) {
    if (!(event in listeners)) {
      listeners[event] = [];
    }
    // Currently allows duplicate callbacks. Should it?
    listeners[event].push(callback);
  };

  /**
   * Remove an event callback that has already been bound.
   * Only works on the matching funciton, cannot be a copy.
   */
  this.removeEventListener = function(event, callback) {
    if (event in listeners) {
      // Filter will return a new array with the callback removed
      listeners[event] = listeners[event].filter(function(ev) {
        return ev !== callback;
      });
    }
  };

  /**
   * Dispatch any events, including both "on" methods and events attached using addEventListener.
   */
  this.dispatchEvent = function (event) {
    let argument = { type: event };
    if (typeof self["on" + event] === "function") {
      if (this.readyState === this.DONE && settings.async)
        setTimeout(function() { self["on" + event](argument) }, 0)
      else
        self["on" + event](argument)
    }
    if (event in listeners) {
      for (let i = 0, len = listeners[event].length; i < len; i++) {
        if (this.readyState === this.DONE)
          setTimeout(function() { listeners[event][i].call(self, argument) }, 0)
        else
          listeners[event][i].call(self, argument)
      }
    }
  };

  /**
   * Construct the correct form of response, given responseType when in non-file based, asynchronous mode.
   *
   * When self.responseType is "", "text", "json", self.responseText is a utf8 string.
   * When self.responseType is "arraybuffer", "blob", the response is in the buffers parameter,
   * an Array of Buffers. Then concat(buffers) is Uint8Array, from which checkAndShrinkBuffer
   * extracts the correct sized ArrayBuffer.
   *
   * @param {Array<Buffer>} buffers
   */
  this.createResponse = function(buffers) {
    self.responseXML = '';
    switch (self.responseType) {
      case "":
      case "text":
        self.response = self.responseText;
        break;
      case 'json':
        self.response = JSON.parse(self.responseText);
        self.responseText = '';
        break;
      default:
        self.responseText = '';
        const totalResponse = concat(buffers);
        // When self.responseType === 'arraybuffer', self.response is an ArrayBuffer.
        // Get the correct sized ArrayBuffer.
        self.response = checkAndShrinkBuffer(totalResponse);
        if (self.responseType === 'blob' && typeof Blob === 'function') {
          // Construct the Blob object that contains response.
          self.response = new Blob([self.response]);
        }
        break;
    }
  }

  /**
   * Construct the correct form of response, given responseType when in synchronous mode or file based.
   *
   * The input is the response parameter which is a Buffer.
   * When self.responseType is "", "text", "json",
   *   the input is further refined to be: response.toString('utf8').
   * When self.responseType is "arraybuffer", "blob",
   *   the input is further refined to be: checkAndShrinkBuffer(response).
   *
   * @param {Buffer} response
   */
  this.createFileOrSyncResponse = function(response) {
    self.responseText = '';
    self.responseXML = '';
    switch (self.responseType) {
      case "":
      case "text":
        self.responseText = response.toString('utf8');
        self.response = self.responseText;
        break;
      case 'json':
        self.response = JSON.parse(response.toString('utf8'));
        break;
      default:
        // When self.responseType === 'arraybuffer', self.response is an ArrayBuffer.
        // Get the correct sized ArrayBuffer.
        self.response = checkAndShrinkBuffer(response);
        if (self.responseType === 'blob' && typeof Blob === 'function') {
          // Construct the Blob object that contains response.
          self.response = new Blob([self.response]);
        }
        break;
    }
  }

  /**
   * Changes readyState and calls onreadystatechange.
   *
   * @param int state New state
   */
  var setState = function(state) {
    if ((self.readyState === state) || (self.readyState === self.UNSENT && abortedFlag))
      return

    self.readyState = state;

    if (settings.async || self.readyState < self.OPENED || self.readyState === self.DONE) {
      self.dispatchEvent("readystatechange");
    }

    if (self.readyState === self.DONE) {
      let fire

      if (abortedFlag)
        fire = "abort"
      else if (errorFlag)
        fire = "error"
      else
        fire = "load"

      self.dispatchEvent(fire)

      // @TODO figure out InspectorInstrumentation::didLoadXHR(cookie)
      self.dispatchEvent("loadend");
    }
  };
};
