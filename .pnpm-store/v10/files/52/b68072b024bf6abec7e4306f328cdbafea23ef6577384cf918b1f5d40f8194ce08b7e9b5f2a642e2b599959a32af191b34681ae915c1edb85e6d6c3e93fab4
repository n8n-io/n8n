(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.FakeXMLHttpRequest = factory());
}(this, (function () { 'use strict';

  /**
   * Minimal Event interface implementation
   *
   * Original implementation by Sven Fuchs: https://gist.github.com/995028
   * Modifications and tests by Christian Johansen.
   *
   * @author Sven Fuchs (svenfuchs@artweb-design.de)
   * @author Christian Johansen (christian@cjohansen.no)
   * @license BSD
   *
   * Copyright (c) 2011 Sven Fuchs, Christian Johansen
   */

  var _Event = function Event(type, bubbles, cancelable, target) {
    this.type = type;
    this.bubbles = bubbles;
    this.cancelable = cancelable;
    this.target = target;
  };

  _Event.prototype = {
    stopPropagation: function () {},
    preventDefault: function () {
      this.defaultPrevented = true;
    }
  };

  /*
    Used to set the statusText property of an xhr object
  */
  var httpStatusCodes = {
    100: "Continue",
    101: "Switching Protocols",
    200: "OK",
    201: "Created",
    202: "Accepted",
    203: "Non-Authoritative Information",
    204: "No Content",
    205: "Reset Content",
    206: "Partial Content",
    300: "Multiple Choice",
    301: "Moved Permanently",
    302: "Found",
    303: "See Other",
    304: "Not Modified",
    305: "Use Proxy",
    307: "Temporary Redirect",
    400: "Bad Request",
    401: "Unauthorized",
    402: "Payment Required",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    406: "Not Acceptable",
    407: "Proxy Authentication Required",
    408: "Request Timeout",
    409: "Conflict",
    410: "Gone",
    411: "Length Required",
    412: "Precondition Failed",
    413: "Request Entity Too Large",
    414: "Request-URI Too Long",
    415: "Unsupported Media Type",
    416: "Requested Range Not Satisfiable",
    417: "Expectation Failed",
    422: "Unprocessable Entity",
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
    505: "HTTP Version Not Supported"
  };


  /*
    Cross-browser XML parsing. Used to turn
    XML responses into Document objects
    Borrowed from JSpec
  */
  function parseXML(text) {
    var xmlDoc;

    if (typeof DOMParser != "undefined") {
      var parser = new DOMParser();
      xmlDoc = parser.parseFromString(text, "text/xml");
    } else {
      xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
      xmlDoc.async = "false";
      xmlDoc.loadXML(text);
    }

    return xmlDoc;
  }

  /*
    Without mocking, the native XMLHttpRequest object will throw
    an error when attempting to set these headers. We match this behavior.
  */
  var unsafeHeaders = {
    "Accept-Charset": true,
    "Accept-Encoding": true,
    "Connection": true,
    "Content-Length": true,
    "Cookie": true,
    "Cookie2": true,
    "Content-Transfer-Encoding": true,
    "Date": true,
    "Expect": true,
    "Host": true,
    "Keep-Alive": true,
    "Referer": true,
    "TE": true,
    "Trailer": true,
    "Transfer-Encoding": true,
    "Upgrade": true,
    "User-Agent": true,
    "Via": true
  };

  /*
    Adds an "event" onto the fake xhr object
    that just calls the same-named method. This is
    in case a library adds callbacks for these events.
  */
  function _addEventListener(eventName, xhr){
    xhr.addEventListener(eventName, function (event) {
      var listener = xhr["on" + eventName];

      if (listener && typeof listener == "function") {
        listener.call(event.target, event);
      }
    });
  }

  function EventedObject() {
    this._eventListeners = {};
    var events = ["loadstart", "progress", "load", "abort", "loadend"];
    for (var i = events.length - 1; i >= 0; i--) {
      _addEventListener(events[i], this);
    }
  }
  EventedObject.prototype = {
    /*
      Duplicates the behavior of native XMLHttpRequest's addEventListener function
    */
    addEventListener: function addEventListener(event, listener) {
      this._eventListeners[event] = this._eventListeners[event] || [];
      this._eventListeners[event].push(listener);
    },

    /*
      Duplicates the behavior of native XMLHttpRequest's removeEventListener function
    */
    removeEventListener: function removeEventListener(event, listener) {
      var listeners = this._eventListeners[event] || [];

      for (var i = 0, l = listeners.length; i < l; ++i) {
        if (listeners[i] == listener) {
          return listeners.splice(i, 1);
        }
      }
    },

    /*
      Duplicates the behavior of native XMLHttpRequest's dispatchEvent function
    */
    dispatchEvent: function dispatchEvent(event) {
      var type = event.type;
      var listeners = this._eventListeners[type] || [];

      for (var i = 0; i < listeners.length; i++) {
        if (typeof listeners[i] == "function") {
          listeners[i].call(this, event);
        } else {
          listeners[i].handleEvent(event);
        }
      }

      return !!event.defaultPrevented;
    },

    /*
      Triggers an `onprogress` event with the given parameters.
    */
    _progress: function _progress(lengthComputable, loaded, total) {
      var event = new _Event('progress');
      event.target = this;
      event.lengthComputable = lengthComputable;
      event.loaded = loaded;
      event.total = total;
      this.dispatchEvent(event);
    }
  };

  /*
    Constructor for a fake window.XMLHttpRequest
  */
  function FakeXMLHttpRequest() {
    EventedObject.call(this);
    this.readyState = FakeXMLHttpRequest.UNSENT;
    this.requestHeaders = {};
    this.requestBody = null;
    this.status = 0;
    this.statusText = "";
    this.upload = new EventedObject();
    this.onabort= null;
    this.onerror= null;
    this.onload= null;
    this.onloadend= null;
    this.onloadstart= null;
    this.onprogress= null;
    this.onreadystatechange= null;
    this.ontimeout= null;
  }

  FakeXMLHttpRequest.prototype = new EventedObject();

  // These status codes are available on the native XMLHttpRequest
  // object, so we match that here in case a library is relying on them.
  FakeXMLHttpRequest.UNSENT = 0;
  FakeXMLHttpRequest.OPENED = 1;
  FakeXMLHttpRequest.HEADERS_RECEIVED = 2;
  FakeXMLHttpRequest.LOADING = 3;
  FakeXMLHttpRequest.DONE = 4;

  var FakeXMLHttpRequestProto = {
    UNSENT: 0,
    OPENED: 1,
    HEADERS_RECEIVED: 2,
    LOADING: 3,
    DONE: 4,
    async: true,
    withCredentials: false,

    /*
      Duplicates the behavior of native XMLHttpRequest's open function
    */
    open: function open(method, url, async, username, password) {
      this.method = method;
      this.url = url;
      this.async = typeof async == "boolean" ? async : true;
      this.username = username;
      this.password = password;
      this.responseText = null;
      this.response = this.responseText;
      this.responseXML = null;
      this.responseURL = url;
      this.requestHeaders = {};
      this.sendFlag = false;
      this._readyStateChange(FakeXMLHttpRequest.OPENED);
    },

    /*
      Duplicates the behavior of native XMLHttpRequest's setRequestHeader function
    */
    setRequestHeader: function setRequestHeader(header, value) {
      verifyState(this);

      if (unsafeHeaders[header] || /^(Sec-|Proxy-)/.test(header)) {
        throw new Error("Refused to set unsafe header \"" + header + "\"");
      }

      if (this.requestHeaders[header]) {
        this.requestHeaders[header] += "," + value;
      } else {
        this.requestHeaders[header] = value;
      }
    },

    /*
      Duplicates the behavior of native XMLHttpRequest's send function
    */
    send: function send(data) {
      verifyState(this);

      if (!/^(get|head)$/i.test(this.method)) {
        var hasContentTypeHeader = false;

        Object.keys(this.requestHeaders).forEach(function (key) {
          if (key.toLowerCase() === 'content-type') {
            hasContentTypeHeader = true;
          }
        });

        if (!hasContentTypeHeader && !(data || '').toString().match('FormData')) {
          this.requestHeaders["Content-Type"] = "text/plain;charset=UTF-8";
        }

        this.requestBody = data;
      }

      this.errorFlag = false;
      this.sendFlag = this.async;
      this._readyStateChange(FakeXMLHttpRequest.OPENED);

      if (typeof this.onSend == "function") {
        this.onSend(this);
      }

      this.dispatchEvent(new _Event("loadstart", false, false, this));
    },

    /*
      Duplicates the behavior of native XMLHttpRequest's abort function
    */
    abort: function abort() {
      this.aborted = true;
      this.responseText = null;
      this.response = this.responseText;
      this.errorFlag = true;
      this.requestHeaders = {};

      this.dispatchEvent(new _Event("abort", false, false, this));

      if (this.readyState > FakeXMLHttpRequest.UNSENT && this.sendFlag) {
        this._readyStateChange(FakeXMLHttpRequest.UNSENT);
        this.sendFlag = false;
      }

      if (typeof this.onerror === "function") {
        this.onerror();
      }
    },

    /*
      Duplicates the behavior of native XMLHttpRequest's getResponseHeader function
    */
    getResponseHeader: function getResponseHeader(header) {
      if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
        return null;
      }

      if (/^Set-Cookie2?$/i.test(header)) {
        return null;
      }

      header = header.toLowerCase();

      for (var h in this.responseHeaders) {
        if (h.toLowerCase() == header) {
          return this.responseHeaders[h];
        }
      }

      return null;
    },

    /*
      Duplicates the behavior of native XMLHttpRequest's getAllResponseHeaders function
    */
    getAllResponseHeaders: function getAllResponseHeaders() {
      if (this.readyState < FakeXMLHttpRequest.HEADERS_RECEIVED) {
        return "";
      }

      var headers = "";

      for (var header in this.responseHeaders) {
        if (this.responseHeaders.hasOwnProperty(header) && !/^Set-Cookie2?$/i.test(header)) {
          headers += header + ": " + this.responseHeaders[header] + "\r\n";
        }
      }

      return headers;
    },

    /*
     Duplicates the behavior of native XMLHttpRequest's overrideMimeType function
     */
    overrideMimeType: function overrideMimeType(mimeType) {
      if (typeof mimeType === "string") {
        this.forceMimeType = mimeType.toLowerCase();
      }
    },


    /*
      Places a FakeXMLHttpRequest object into the passed
      state.
    */
    _readyStateChange: function _readyStateChange(state) {
      this.readyState = state;

      if (typeof this.onreadystatechange == "function") {
        this.onreadystatechange(new _Event("readystatechange"));
      }

      this.dispatchEvent(new _Event("readystatechange"));

      if (this.readyState == FakeXMLHttpRequest.DONE) {
        this.dispatchEvent(new _Event("load", false, false, this));
      }
      if (this.readyState == FakeXMLHttpRequest.UNSENT || this.readyState == FakeXMLHttpRequest.DONE) {
        this.dispatchEvent(new _Event("loadend", false, false, this));
      }
    },


    /*
      Sets the FakeXMLHttpRequest object's response headers and
      places the object into readyState 2
    */
    _setResponseHeaders: function _setResponseHeaders(headers) {
      this.responseHeaders = {};

      for (var header in headers) {
        if (headers.hasOwnProperty(header)) {
            this.responseHeaders[header] = headers[header];
        }
      }

      if (this.forceMimeType) {
        this.responseHeaders['Content-Type'] = this.forceMimeType;
      }

      if (this.async) {
        this._readyStateChange(FakeXMLHttpRequest.HEADERS_RECEIVED);
      } else {
        this.readyState = FakeXMLHttpRequest.HEADERS_RECEIVED;
      }
    },

    /*
      Sets the FakeXMLHttpRequest object's response body and
      if body text is XML, sets responseXML to parsed document
      object
    */
    _setResponseBody: function _setResponseBody(body) {
      verifyRequestSent(this);
      verifyHeadersReceived(this);
      verifyResponseBodyType(body);

      var chunkSize = this.chunkSize || 10;
      var index = 0;
      this.responseText = "";
      this.response = this.responseText;

      do {
        if (this.async) {
          this._readyStateChange(FakeXMLHttpRequest.LOADING);
        }

        this.responseText += body.substring(index, index + chunkSize);
        this.response = this.responseText;
        index += chunkSize;
      } while (index < body.length);

      var type = this.getResponseHeader("Content-Type");

      if (this.responseText && (!type || /(text\/xml)|(application\/xml)|(\+xml)/.test(type))) {
        try {
          this.responseXML = parseXML(this.responseText);
        } catch (e) {
          // Unable to parse XML - no biggie
        }
      }

      if (this.async) {
        this._readyStateChange(FakeXMLHttpRequest.DONE);
      } else {
        this.readyState = FakeXMLHttpRequest.DONE;
      }
    },

    /*
      Forces a response on to the FakeXMLHttpRequest object.

      This is the public API for faking responses. This function
      takes a number status, headers object, and string body:

      ```
      xhr.respond(404, {Content-Type: 'text/plain'}, "Sorry. This object was not found.")

      ```
    */
    respond: function respond(status, headers, body) {
      this._setResponseHeaders(headers || {});
      this.status = typeof status == "number" ? status : 200;
      this.statusText = httpStatusCodes[this.status];
      this._setResponseBody(body || "");
    }
  };

  for (var property in FakeXMLHttpRequestProto) {
    FakeXMLHttpRequest.prototype[property] = FakeXMLHttpRequestProto[property];
  }

  function verifyState(xhr) {
    if (xhr.readyState !== FakeXMLHttpRequest.OPENED) {
      throw new Error("INVALID_STATE_ERR");
    }

    if (xhr.sendFlag) {
      throw new Error("INVALID_STATE_ERR");
    }
  }


  function verifyRequestSent(xhr) {
      if (xhr.readyState == FakeXMLHttpRequest.DONE) {
          throw new Error("Request done");
      }
  }

  function verifyHeadersReceived(xhr) {
      if (xhr.async && xhr.readyState != FakeXMLHttpRequest.HEADERS_RECEIVED) {
          throw new Error("No headers received");
      }
  }

  function verifyResponseBodyType(body) {
      if (typeof body != "string") {
          var error = new Error("Attempted to respond to fake XMLHttpRequest with " +
                               body + ", which is not a string.");
          error.name = "InvalidBodyException";
          throw error;
      }
  }

  return FakeXMLHttpRequest;

})));
//# sourceMappingURL=fake_xml_http_request.js.map
