"use strict";

const { luai_apicheck } = require("./luaconf.js");

const lua_assert = function(c) {
    if (!c) throw Error("assertion failed");
};
module.exports.lua_assert = lua_assert;

module.exports.luai_apicheck = luai_apicheck || function(l, e) { return lua_assert(e); };

const api_check = function(l, e, msg) {
    return luai_apicheck(l, e && msg);
};
module.exports.api_check = api_check;

const LUAI_MAXCCALLS = 200;
module.exports.LUAI_MAXCCALLS = LUAI_MAXCCALLS;

/* minimum size for string buffer */
const LUA_MINBUFFER = 32;
module.exports.LUA_MINBUFFER = LUA_MINBUFFER;

const luai_nummod = function(L, a, b) {
    let m = a % b;
    if ((m*b) < 0)
        m += b;
    return m;
};
module.exports.luai_nummod = luai_nummod;

// If later integers are more than 32bit, LUA_MAXINTEGER will then be != MAX_INT
const MAX_INT = 2147483647;
module.exports.MAX_INT = MAX_INT;
const MIN_INT = -2147483648;
module.exports.MIN_INT = MIN_INT;
