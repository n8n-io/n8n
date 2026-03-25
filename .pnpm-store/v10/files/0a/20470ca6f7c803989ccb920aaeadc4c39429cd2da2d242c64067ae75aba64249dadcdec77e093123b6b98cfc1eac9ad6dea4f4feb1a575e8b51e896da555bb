"use strict";
module.exports = URL;

function URL(url) {
  if (!url) return Object.create(URL.prototype);
  // Can't use String.trim() since it defines whitespace differently than HTML
  this.url = url.replace(/^[ \t\n\r\f]+|[ \t\n\r\f]+$/g, "");

  // See http://tools.ietf.org/html/rfc3986#appendix-B
  // and https://url.spec.whatwg.org/#parsing
  var match = URL.pattern.exec(this.url);
  if (match) {
    if (match[2]) this.scheme = match[2];
    if (match[4]) {
      // parse username/password
      var userinfo = match[4].match(URL.userinfoPattern);
      if (userinfo) {
        this.username = userinfo[1];
        this.password = userinfo[3];
        match[4] = match[4].substring(userinfo[0].length);
      }
      if (match[4].match(URL.portPattern)) {
        var pos = match[4].lastIndexOf(':');
        this.host = match[4].substring(0, pos);
        this.port = match[4].substring(pos+1);
      }
      else {
        this.host = match[4];
      }
    }
    if (match[5]) this.path = match[5];
    if (match[6]) this.query = match[7];
    if (match[8]) this.fragment = match[9];
  }
}

URL.pattern = /^(([^:\/?#]+):)?(\/\/([^\/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/;
URL.userinfoPattern = /^([^@:]*)(:([^@]*))?@/;
URL.portPattern = /:\d+$/;
URL.authorityPattern = /^[^:\/?#]+:\/\//;
URL.hierarchyPattern = /^[^:\/?#]+:\//;

// Return a percentEncoded version of s.
// S should be a single-character string
// XXX: needs to do utf-8 encoding?
URL.percentEncode = function percentEncode(s) {
  var c = s.charCodeAt(0);
  if (c < 256) return "%" + c.toString(16);
  else throw Error("can't percent-encode codepoints > 255 yet");
};

URL.prototype = {
  constructor: URL,

  // XXX: not sure if this is the precise definition of absolute
  isAbsolute: function() { return !!this.scheme; },
  isAuthorityBased: function() {
    return URL.authorityPattern.test(this.url);
  },
  isHierarchical: function() {
    return URL.hierarchyPattern.test(this.url);
  },

  toString: function() {
    var s = "";
    if (this.scheme !== undefined) s += this.scheme + ":";
    if (this.isAbsolute()) {
      s += '//';
      if (this.username || this.password) {
        s += this.username || '';
        if (this.password) {
          s += ':' + this.password;
        }
        s += '@';
      }
      if (this.host) {
        s += this.host;
      }
    }
    if (this.port !== undefined) s += ":" + this.port;
    if (this.path !== undefined) s += this.path;
    if (this.query !== undefined) s += "?" + this.query;
    if (this.fragment !== undefined) s += "#" + this.fragment;
    return s;
  },

  // See: http://tools.ietf.org/html/rfc3986#section-5.2
  // and https://url.spec.whatwg.org/#constructors
  resolve: function(relative) {
    var base = this;           // The base url we're resolving against
    var r = new URL(relative); // The relative reference url to resolve
    var t = new URL();         // The absolute target url we will return

    if (r.scheme !== undefined) {
      t.scheme = r.scheme;
      t.username = r.username;
      t.password = r.password;
      t.host = r.host;
      t.port = r.port;
      t.path = remove_dot_segments(r.path);
      t.query = r.query;
    }
    else {
      t.scheme = base.scheme;
      if (r.host !== undefined) {
        t.username = r.username;
        t.password = r.password;
        t.host = r.host;
        t.port = r.port;
        t.path = remove_dot_segments(r.path);
        t.query = r.query;
      }
      else {
        t.username = base.username;
        t.password = base.password;
        t.host = base.host;
        t.port = base.port;
        if (!r.path) { // undefined or empty
          t.path = base.path;
          if (r.query !== undefined)
            t.query = r.query;
          else
            t.query = base.query;
        }
        else {
          if (r.path.charAt(0) === "/") {
            t.path = remove_dot_segments(r.path);
          }
          else {
            t.path = merge(base.path, r.path);
            t.path = remove_dot_segments(t.path);
          }
          t.query = r.query;
        }
      }
    }
    t.fragment = r.fragment;

    return t.toString();


    function merge(basepath, refpath) {
      if (base.host !== undefined && !base.path)
        return "/" + refpath;

      var lastslash = basepath.lastIndexOf("/");
      if (lastslash === -1)
        return refpath;
      else
        return basepath.substring(0, lastslash+1) + refpath;
    }

    function remove_dot_segments(path) {
      if (!path) return path; // For "" or undefined

      var output = "";
      while(path.length > 0) {
        if (path === "." || path === "..") {
          path = "";
          break;
        }

        var twochars = path.substring(0,2);
        var threechars = path.substring(0,3);
        var fourchars = path.substring(0,4);
        if (threechars === "../") {
          path = path.substring(3);
        }
        else if (twochars === "./") {
          path = path.substring(2);
        }
        else if (threechars === "/./") {
          path = "/" + path.substring(3);
        }
        else if (twochars === "/." && path.length === 2) {
          path = "/";
        }
        else if (fourchars === "/../" ||
             (threechars === "/.." && path.length === 3)) {
          path = "/" + path.substring(4);

          output = output.replace(/\/?[^\/]*$/, "");
        }
        else {
          var segment = path.match(/(\/?([^\/]*))/)[0];
          output += segment;
          path = path.substring(segment.length);
        }
      }

      return output;
    }
  },
};
