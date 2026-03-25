"use strict";
// DOMTokenList implementation based on https://github.com/Raynos/DOM-shim
var utils = require('./utils');

module.exports = DOMTokenList;

function DOMTokenList(getter, setter) {
  this._getString = getter;
  this._setString = setter;
  this._length = 0;
  this._lastStringValue = '';
  this._update();
}

Object.defineProperties(DOMTokenList.prototype, {
  length: { get: function() { return this._length; } },
  item: { value: function(index) {
    var list = getList(this);
    if (index < 0 || index >= list.length) {
      return null;
    }
    return list[index];
  }},

  contains: { value: function(token) {
    token = String(token); // no error checking for contains()
    var list = getList(this);
    return list.indexOf(token) > -1;
  }},

  add: { value: function() {
    var list = getList(this);
    for (var i = 0, len = arguments.length; i < len; i++) {
      var token = handleErrors(arguments[i]);
      if (list.indexOf(token) < 0) {
        list.push(token);
      }
    }
    // Note: as per spec, if handleErrors() throws any errors, we never
    // make it here and none of the changes take effect.
    // Also per spec: we run the "update steps" even if no change was
    // made (ie, if the token already existed)
    this._update(list);
  }},

  remove: { value: function() {
    var list = getList(this);
    for (var i = 0, len = arguments.length; i < len; i++) {
      var token = handleErrors(arguments[i]);
      var index = list.indexOf(token);
      if (index > -1) {
        list.splice(index, 1);
      }
    }
    // Note: as per spec, if handleErrors() throws any errors, we never
    // make it here and none of the changes take effect.
    // Also per spec: we run the "update steps" even if no change was
    // made (ie, if the token wasn't previously present)
    this._update(list);
  }},

  toggle: { value: function toggle(token, force) {
    token = handleErrors(token);
    if (this.contains(token)) {
      if (force === undefined || force === false) {
        this.remove(token);
        return false;
      }
      return true;
    } else {
      if (force === undefined || force === true) {
        this.add(token);
        return true;
      }
      return false;
    }
  }},

  replace: { value: function replace(token, newToken) {
    // weird corner case of spec: if `token` contains whitespace, but
    // `newToken` is the empty string, we must throw SyntaxError not
    // InvalidCharacterError (sigh)
    if (String(newToken)==='') { utils.SyntaxError(); }
    token = handleErrors(token);
    newToken = handleErrors(newToken);
    var list = getList(this);
    var idx = list.indexOf(token);
    if (idx < 0) {
      // Note that, per spec, we do not run the update steps on this path.
      return false;
    }
    var idx2 = list.indexOf(newToken);
    if (idx2 < 0) {
      list[idx] = newToken;
    } else {
      // "replace the first instance of either `token` or `newToken` with
      // `newToken` and remove all other instances"
      if (idx < idx2) {
        list[idx] = newToken;
        list.splice(idx2, 1);
      } else {
        // idx2 is already `newToken`
        list.splice(idx, 1);
      }
    }
    this._update(list);
    return true;
  }},

  toString: { value: function() {
    return this._getString();
  }},

  value: {
    get: function() {
      return this._getString();
    },
    set: function(v) {
      this._setString(v);
      this._update();
    }
  },

  // Called when the setter is called from outside this interface.
  _update: { value: function(list) {
    if (list) {
      fixIndex(this, list);
      this._setString(list.join(" ").trim());
    } else {
      fixIndex(this, getList(this));
    }
    this._lastStringValue = this._getString();
  } },
});

function fixIndex(clist, list) {
  var oldLength = clist._length;
  var i;
  clist._length = list.length;
  for (i = 0; i < list.length; i++) {
    clist[i] = list[i];
  }
  // Clear/free old entries.
  for (; i < oldLength; i++) {
    clist[i] = undefined;
  }
}

function handleErrors(token) {
  token = String(token);
  if (token === "") {
    utils.SyntaxError();
  }
  if (/[ \t\r\n\f]/.test(token)) {
    utils.InvalidCharacterError();
  }
  return token;
}

function toArray(clist) {
  var length = clist._length;
  var arr = Array(length);
  for (var i = 0; i < length; i++) {
    arr[i] = clist[i];
  }
  return arr;
}

function getList(clist) {
  var strProp = clist._getString();
  if (strProp === clist._lastStringValue) {
    return toArray(clist);
  }
  var str = strProp.replace(/(^[ \t\r\n\f]+)|([ \t\r\n\f]+$)/g, '');
  if (str === "") {
    return [];
  } else {
    var seen = Object.create(null);
    return str.split(/[ \t\r\n\f]+/g).filter(function(n) {
      var key = '$' + n;
      if (seen[key]) { return false; }
      seen[key] = true;
      return true;
    });
  }
}
