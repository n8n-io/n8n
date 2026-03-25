"use strict";

const lua     = require("../src/lua.js");
const lauxlib = require("../src/lauxlib.js");
const {to_luastring} = require("../src/fengaricore.js");

const toByteCode = function(luaCode) {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) !== lua.LUA_OK)
        throw Error(lua.lua_tojsstring(L, -1));

    let b = [];
    if (lua.lua_dump(L, function(L, b, size, B) {
        B.push(...b.slice(0, size));
        return 0;
    }, b, false) !== 0)
        throw Error("unable to dump given function");
    return Uint8Array.from(b);
};

module.exports.toByteCode = toByteCode;
