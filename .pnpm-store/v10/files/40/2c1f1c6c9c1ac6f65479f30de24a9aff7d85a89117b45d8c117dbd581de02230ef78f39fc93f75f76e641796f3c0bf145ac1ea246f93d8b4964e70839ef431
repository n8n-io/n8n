"use strict";
var utils = require('./utils');

exports.property = function(attr) {
  if (Array.isArray(attr.type)) {
    var valid = Object.create(null);
    attr.type.forEach(function(val) {
      valid[val.value || val] = val.alias || val;
    });
    var missingValueDefault = attr.missing;
    if (missingValueDefault===undefined) { missingValueDefault = null; }
    var invalidValueDefault = attr.invalid;
    if (invalidValueDefault===undefined) { invalidValueDefault = missingValueDefault; }
    return {
      get: function() {
        var v = this._getattr(attr.name);
        if (v === null) return missingValueDefault;

        v = valid[v.toLowerCase()];
        if (v !== undefined) return v;
        if (invalidValueDefault !== null) return invalidValueDefault;
        return v;
      },
      set: function(v) {
        this._setattr(attr.name, v);
      }
    };
  }
  else if (attr.type === Boolean) {
    return {
      get: function() {
        return this.hasAttribute(attr.name);
      },
      set: function(v) {
        if (v) {
          this._setattr(attr.name, '');
        }
        else {
          this.removeAttribute(attr.name);
        }
      }
    };
  }
  else if (attr.type === Number ||
           attr.type === "long" ||
           attr.type === "unsigned long" ||
           attr.type === "limited unsigned long with fallback") {
    return numberPropDesc(attr);
  }
  else if (!attr.type || attr.type === String) {
    return {
      get: function() { return this._getattr(attr.name) || ''; },
      set: function(v) {
        if (attr.treatNullAsEmptyString && v === null) { v = ''; }
        this._setattr(attr.name, v);
      }
    };
  }
  else if (typeof attr.type === 'function') {
    return attr.type(attr.name, attr);
  }
  throw new Error('Invalid attribute definition');
};

// See http://www.whatwg.org/specs/web-apps/current-work/#reflect
//
// defval is the default value. If it is a function, then that function
// will be invoked as a method of the element to obtain the default.
// If no default is specified for a given attribute, then the default
// depends on the type of the attribute, but since this function handles
// 4 integer cases, you must specify the default value in each call
//
// min and max define a valid range for getting the attribute.
//
// setmin defines a minimum value when setting.  If the value is less
// than that, then throw INDEX_SIZE_ERR.
//
// Conveniently, JavaScript's parseInt function appears to be
// compatible with HTML's 'rules for parsing integers'
function numberPropDesc(a) {
  var def;
  if(typeof a.default === 'function') {
    def = a.default;
  }
  else if(typeof a.default === 'number') {
    def = function() { return a.default; };
  }
  else {
    def = function() { utils.assert(false, typeof a.default); };
  }
  var unsigned_long = (a.type === 'unsigned long');
  var signed_long = (a.type === 'long');
  var unsigned_fallback = (a.type === 'limited unsigned long with fallback');
  var min = a.min, max = a.max, setmin = a.setmin;
  if (min === undefined) {
    if (unsigned_long) min = 0;
    if (signed_long) min = -0x80000000;
    if (unsigned_fallback) min = 1;
  }
  if (max === undefined) {
    if (unsigned_long || signed_long || unsigned_fallback) max = 0x7FFFFFFF;
  }

  return {
    get: function() {
      var v = this._getattr(a.name);
      var n = a.float ? parseFloat(v) : parseInt(v, 10);
      if (v === null || !isFinite(n) || (min !== undefined && n < min) || (max !== undefined && n > max)) {
        return def.call(this);
      }
      if (unsigned_long || signed_long || unsigned_fallback) {
        if (!/^[ \t\n\f\r]*[-+]?[0-9]/.test(v)) { return def.call(this); }
        n = n|0; // jshint ignore:line
      }
      return n;
    },
    set: function(v) {
      if (!a.float) { v = Math.floor(v); }
      if (setmin !== undefined && v < setmin) {
        utils.IndexSizeError(a.name + ' set to ' + v);
      }
      if (unsigned_long) {
        v = (v < 0 || v > 0x7FFFFFFF) ? def.call(this) :
          (v|0);  // jshint ignore:line
      } else if (unsigned_fallback) {
        v = (v < 1 || v > 0x7FFFFFFF) ? def.call(this) :
          (v|0); // jshint ignore:line
      } else if (signed_long) {
        v = (v < -0x80000000 || v > 0x7FFFFFFF) ? def.call(this) :
          (v|0); // jshint ignore:line
      }
      this._setattr(a.name, String(v));
    }
  };
}

// This is a utility function for setting up change handler functions
// for attributes like 'id' that require special handling when they change.
exports.registerChangeHandler = function(c, name, handler) {
  var p = c.prototype;

  // If p does not already have its own _attributeChangeHandlers
  // then create one for it, inheriting from the inherited
  // _attributeChangeHandlers. At the top (for the Element class) the
  // _attributeChangeHandlers object will be created with a null prototype.
  if (!Object.prototype.hasOwnProperty.call(p, '_attributeChangeHandlers')) {
    p._attributeChangeHandlers =
      Object.create(p._attributeChangeHandlers || null);
  }

  p._attributeChangeHandlers[name] = handler;
};
