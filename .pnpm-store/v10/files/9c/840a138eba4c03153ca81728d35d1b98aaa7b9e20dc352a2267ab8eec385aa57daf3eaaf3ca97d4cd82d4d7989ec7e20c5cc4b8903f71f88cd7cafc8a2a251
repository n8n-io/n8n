"use strict";

const {
    is_luastring,
    luastring_eq,
    luastring_from,
    to_luastring
} = require('./defs.js');
const { lua_assert } = require("./llimits.js");

class TString {

    constructor(L, str) {
        this.hash = null;
        this.realstring = str;
    }

    getstr() {
        return this.realstring;
    }

    tsslen() {
        return this.realstring.length;
    }

}

const luaS_eqlngstr = function(a, b) {
    lua_assert(a instanceof TString);
    lua_assert(b instanceof TString);
    return a == b || luastring_eq(a.realstring, b.realstring);
};

/* converts strings (arrays) to a consistent map key
   make sure this doesn't conflict with any of the anti-collision strategies in ltable */
const luaS_hash = function(str) {
    lua_assert(is_luastring(str));
    let len = str.length;
    let s = "|";
    for (let i=0; i<len; i++)
        s += str[i].toString(16);
    return s;
};

const luaS_hashlongstr = function(ts) {
    lua_assert(ts instanceof TString);
    if(ts.hash === null) {
        ts.hash = luaS_hash(ts.getstr());
    }
    return ts.hash;
};

/* variant that takes ownership of array */
const luaS_bless = function(L, str) {
    lua_assert(str instanceof Uint8Array);
    return new TString(L, str);
};

/* makes a copy */
const luaS_new = function(L, str) {
    return luaS_bless(L, luastring_from(str));
};

/* takes a js string */
const luaS_newliteral = function(L, str) {
    return luaS_bless(L, to_luastring(str));
};

module.exports.luaS_eqlngstr    = luaS_eqlngstr;
module.exports.luaS_hash        = luaS_hash;
module.exports.luaS_hashlongstr = luaS_hashlongstr;
module.exports.luaS_bless       = luaS_bless;
module.exports.luaS_new         = luaS_new;
module.exports.luaS_newliteral  = luaS_newliteral;
module.exports.TString          = TString;
