"use strict";

const {
    LUA_MULTRET,
    LUA_OK,
    LUA_TFUNCTION,
    LUA_TNIL,
    LUA_TNONE,
    LUA_TNUMBER,
    LUA_TSTRING,
    LUA_TTABLE,
    LUA_VERSION,
    LUA_YIELD,
    lua_call,
    lua_callk,
    lua_concat,
    lua_error,
    lua_getglobal,
    lua_geti,
    lua_getmetatable,
    lua_gettop,
    lua_insert,
    lua_isnil,
    lua_isnone,
    lua_isstring,
    lua_load,
    lua_next,
    lua_pcallk,
    lua_pop,
    lua_pushboolean,
    lua_pushcfunction,
    lua_pushglobaltable,
    lua_pushinteger,
    lua_pushliteral,
    lua_pushnil,
    lua_pushstring,
    lua_pushvalue,
    lua_rawequal,
    lua_rawget,
    lua_rawlen,
    lua_rawset,
    lua_remove,
    lua_replace,
    lua_rotate,
    lua_setfield,
    lua_setmetatable,
    lua_settop,
    lua_setupvalue,
    lua_stringtonumber,
    lua_toboolean,
    lua_tolstring,
    lua_tostring,
    lua_type,
    lua_typename
} = require('./lua.js');
const {
    luaL_argcheck,
    luaL_checkany,
    luaL_checkinteger,
    luaL_checkoption,
    luaL_checkstack,
    luaL_checktype,
    luaL_error,
    luaL_getmetafield,
    luaL_loadbufferx,
    luaL_loadfile,
    luaL_loadfilex,
    luaL_optinteger,
    luaL_optstring,
    luaL_setfuncs,
    luaL_tolstring,
    luaL_where
} = require('./lauxlib.js');
const {
    to_jsstring,
    to_luastring
} = require("./fengaricore.js");

let lua_writestring;
let lua_writeline;
if (typeof process === "undefined") {
    if (typeof TextDecoder === "function") { /* Older browsers don't have TextDecoder */
        let buff = "";
        let decoder = new TextDecoder("utf-8");
        lua_writestring = function(s) {
            buff += decoder.decode(s, {stream: true});
        };
        let empty = new Uint8Array(0);
        lua_writeline = function() {
            buff += decoder.decode(empty);
            console.log(buff);
            buff = "";
        };
    } else {
        let buff = [];
        lua_writestring = function(s) {
            try {
                /* If the string is valid utf8, then we can use to_jsstring */
                s = to_jsstring(s);
            } catch(e) {
                /* otherwise push copy of raw array */
                let copy = new Uint8Array(s.length);
                copy.set(s);
                s = copy;
            }
            buff.push(s);
        };
        lua_writeline = function() {
            console.log.apply(console.log, buff);
            buff = [];
        };
    }
} else {
    lua_writestring = function(s) {
        process.stdout.write(Buffer.from(s));
    };
    lua_writeline = function() {
        process.stdout.write("\n");
    };
}
const luaB_print = function(L) {
    let n = lua_gettop(L); /* number of arguments */
    lua_getglobal(L, to_luastring("tostring", true));
    for (let i = 1; i <= n; i++) {
        lua_pushvalue(L, -1);  /* function to be called */
        lua_pushvalue(L, i);  /* value to print */
        lua_call(L, 1, 1);
        let s = lua_tolstring(L, -1);
        if (s === null)
            return luaL_error(L, to_luastring("'tostring' must return a string to 'print'"));
        if (i > 1) lua_writestring(to_luastring("\t"));
        lua_writestring(s);
        lua_pop(L, 1);
    }
    lua_writeline();
    return 0;
};

const luaB_tostring = function(L) {
    luaL_checkany(L, 1);
    luaL_tolstring(L, 1);

    return 1;
};

const luaB_getmetatable = function(L) {
    luaL_checkany(L, 1);
    if (!lua_getmetatable(L, 1)) {
        lua_pushnil(L);
        return 1;  /* no metatable */
    }
    luaL_getmetafield(L, 1, to_luastring("__metatable", true));
    return 1;  /* returns either __metatable field (if present) or metatable */
};

const luaB_setmetatable = function(L) {
    let t = lua_type(L, 2);
    luaL_checktype(L, 1, LUA_TTABLE);
    luaL_argcheck(L, t === LUA_TNIL || t === LUA_TTABLE, 2, "nil or table expected");
    if (luaL_getmetafield(L, 1, to_luastring("__metatable", true)) !== LUA_TNIL)
        return luaL_error(L, to_luastring("cannot change a protected metatable"));
    lua_settop(L, 2);
    lua_setmetatable(L, 1);
    return 1;
};

const luaB_rawequal = function(L) {
    luaL_checkany(L, 1);
    luaL_checkany(L, 2);
    lua_pushboolean(L, lua_rawequal(L, 1, 2));
    return 1;
};

const luaB_rawlen = function(L) {
    let t = lua_type(L, 1);
    luaL_argcheck(L, t === LUA_TTABLE || t === LUA_TSTRING, 1, "table or string expected");
    lua_pushinteger(L, lua_rawlen(L, 1));
    return 1;
};

const luaB_rawget = function(L) {
    luaL_checktype(L, 1, LUA_TTABLE);
    luaL_checkany(L, 2);
    lua_settop(L, 2);
    lua_rawget(L, 1);
    return 1;
};

const luaB_rawset = function(L) {
    luaL_checktype(L, 1, LUA_TTABLE);
    luaL_checkany(L, 2);
    luaL_checkany(L, 3);
    lua_settop(L, 3);
    lua_rawset(L, 1);
    return 1;
};

const opts = [
    "stop", "restart", "collect",
    "count", "step", "setpause", "setstepmul",
    "isrunning"
].map((e) => to_luastring(e));
const luaB_collectgarbage = function(L) {
    luaL_checkoption(L, 1, "collect", opts);
    luaL_optinteger(L, 2, 0);
    luaL_error(L, to_luastring("lua_gc not implemented"));
};

const luaB_type = function(L) {
    let t = lua_type(L, 1);
    luaL_argcheck(L, t !== LUA_TNONE, 1, "value expected");
    lua_pushstring(L, lua_typename(L, t));
    return 1;
};

const pairsmeta = function(L, method, iszero, iter) {
    luaL_checkany(L, 1);
    if (luaL_getmetafield(L, 1, method) === LUA_TNIL) {  /* no metamethod? */
        lua_pushcfunction(L, iter);  /* will return generator, */
        lua_pushvalue(L, 1);  /* state, */
        if (iszero) lua_pushinteger(L, 0);  /* and initial value */
        else lua_pushnil(L);
    } else {
        lua_pushvalue(L, 1);  /* argument 'self' to metamethod */
        lua_call(L, 1, 3);  /* get 3 values from metamethod */
    }
    return 3;
};

const luaB_next = function(L) {
    luaL_checktype(L, 1, LUA_TTABLE);
    lua_settop(L, 2);  /* create a 2nd argument if there isn't one */
    if (lua_next(L, 1))
        return 2;
    else {
        lua_pushnil(L);
        return 1;
    }
};

const luaB_pairs = function(L) {
    return pairsmeta(L, to_luastring("__pairs", true), 0, luaB_next);
};

/*
** Traversal function for 'ipairs'
*/
const ipairsaux = function(L) {
    let i = luaL_checkinteger(L, 2) + 1;
    lua_pushinteger(L, i);
    return lua_geti(L, 1, i) === LUA_TNIL ? 1 : 2;
};

/*
** 'ipairs' function. Returns 'ipairsaux', given "table", 0.
** (The given "table" may not be a table.)
*/
const luaB_ipairs = function(L) {
    // Lua 5.2
    // return pairsmeta(L, "__ipairs", 1, ipairsaux);

    luaL_checkany(L, 1);
    lua_pushcfunction(L, ipairsaux);  /* iteration function */
    lua_pushvalue(L, 1);  /* state */
    lua_pushinteger(L, 0);  /* initial value */
    return 3;
};

const b_str2int = function(s, base) {
    try {
        s = to_jsstring(s);
    } catch (e) {
        return null;
    }
    let r = /^[\t\v\f \n\r]*([+-]?)0*([0-9A-Za-z]+)[\t\v\f \n\r]*$/.exec(s);
    if (!r) return null;
    let v = parseInt(r[1]+r[2], base);
    if (isNaN(v)) return null;
    return v|0;
};

const luaB_tonumber = function(L) {
    if (lua_type(L, 2) <= 0) {  /* standard conversion? */
        luaL_checkany(L, 1);
        if (lua_type(L, 1) === LUA_TNUMBER) {  /* already a number? */
            lua_settop(L, 1);
            return 1;
        } else {
            let s = lua_tostring(L, 1);
            if (s !== null && lua_stringtonumber(L, s) === s.length+1)
                return 1;  /* successful conversion to number */
        }
    } else {
        let base = luaL_checkinteger(L, 2);
        luaL_checktype(L, 1, LUA_TSTRING);  /* no numbers as strings */
        let s = lua_tostring(L, 1);
        luaL_argcheck(L, 2 <= base && base <= 36, 2, "base out of range");
        let n = b_str2int(s, base);
        if (n !== null) {
            lua_pushinteger(L, n);
            return 1;
        }
    }

    lua_pushnil(L);
    return 1;
};

const luaB_error = function(L) {
    let level = luaL_optinteger(L, 2, 1);
    lua_settop(L, 1);
    if (lua_type(L, 1) === LUA_TSTRING && level > 0) {
        luaL_where(L, level);  /* add extra information */
        lua_pushvalue(L, 1);
        lua_concat(L, 2);
    }
    return lua_error(L);
};

const luaB_assert = function(L) {
    if (lua_toboolean(L, 1))  /* condition is true? */
        return lua_gettop(L);  /* return all arguments */
    else {
        luaL_checkany(L, 1);  /* there must be a condition */
        lua_remove(L, 1);  /* remove it */
        lua_pushliteral(L, "assertion failed!");  /* default message */
        lua_settop(L, 1);  /* leave only message (default if no other one) */
        return luaB_error(L);  /* call 'error' */
    }
};

const luaB_select = function(L) {
    let n = lua_gettop(L);
    if (lua_type(L, 1) === LUA_TSTRING && lua_tostring(L, 1)[0] === 35 /* '#'.charCodeAt(0) */) {
        lua_pushinteger(L, n - 1);
        return 1;
    } else {
        let i = luaL_checkinteger(L, 1);
        if (i < 0) i = n + i;
        else if (i > n) i = n;
        luaL_argcheck(L, 1 <= i, 1, "index out of range");
        return n - i;
    }
};

/*
** Continuation function for 'pcall' and 'xpcall'. Both functions
** already pushed a 'true' before doing the call, so in case of success
** 'finishpcall' only has to return everything in the stack minus
** 'extra' values (where 'extra' is exactly the number of items to be
** ignored).
*/
const finishpcall = function(L, status, extra) {
    if (status !== LUA_OK && status !== LUA_YIELD) {  /* error? */
        lua_pushboolean(L, 0);  /* first result (false) */
        lua_pushvalue(L, -2);  /* error message */
        return 2;  /* return false, msg */
    } else
        return lua_gettop(L) - extra;
};

const luaB_pcall = function(L) {
    luaL_checkany(L, 1);
    lua_pushboolean(L, 1);  /* first result if no errors */
    lua_insert(L, 1);  /* put it in place */
    let status = lua_pcallk(L, lua_gettop(L) - 2, LUA_MULTRET, 0, 0, finishpcall);
    return finishpcall(L, status, 0);
};

/*
** Do a protected call with error handling. After 'lua_rotate', the
** stack will have <f, err, true, f, [args...]>; so, the function passes
** 2 to 'finishpcall' to skip the 2 first values when returning results.
*/
const luaB_xpcall = function(L) {
    let n = lua_gettop(L);
    luaL_checktype(L, 2, LUA_TFUNCTION);  /* check error function */
    lua_pushboolean(L, 1);  /* first result */
    lua_pushvalue(L, 1);  /* function */
    lua_rotate(L, 3, 2);  /* move them below function's arguments */
    let status = lua_pcallk(L, n - 2, LUA_MULTRET, 2, 2, finishpcall);
    return finishpcall(L, status, 2);
};

const load_aux = function(L, status, envidx) {
    if (status === LUA_OK) {
        if (envidx !== 0) {  /* 'env' parameter? */
            lua_pushvalue(L, envidx);  /* environment for loaded function */
            if (!lua_setupvalue(L, -2, 1))  /* set it as 1st upvalue */
                lua_pop(L, 1);  /* remove 'env' if not used by previous call */
        }
        return 1;
    } else {  /* error (message is on top of the stack) */
        lua_pushnil(L);
        lua_insert(L, -2);  /* put before error message */
        return 2;  /* return nil plus error message */
    }
};

/*
** reserved slot, above all arguments, to hold a copy of the returned
** string to avoid it being collected while parsed. 'load' has four
** optional arguments (chunk, source name, mode, and environment).
*/
const RESERVEDSLOT = 5;

/*
** Reader for generic 'load' function: 'lua_load' uses the
** stack for internal stuff, so the reader cannot change the
** stack top. Instead, it keeps its resulting string in a
** reserved slot inside the stack.
*/
const generic_reader = function(L, ud) {
    luaL_checkstack(L, 2, "too many nested functions");
    lua_pushvalue(L, 1);  /* get function */
    lua_call(L, 0, 1);  /* call it */
    if (lua_isnil(L, -1)) {
        lua_pop(L, 1);  /* pop result */
        return null;
    } else if (!lua_isstring(L, -1))
        luaL_error(L, to_luastring("reader function must return a string"));
    lua_replace(L, RESERVEDSLOT);  /* save string in reserved slot */
    return lua_tostring(L, RESERVEDSLOT);
};

const luaB_load = function(L) {
    let s = lua_tostring(L, 1);
    let mode = luaL_optstring(L, 3, "bt");
    let env = !lua_isnone(L, 4) ? 4 : 0;  /* 'env' index or 0 if no 'env' */
    let status;
    if (s !== null) {  /* loading a string? */
        let chunkname = luaL_optstring(L, 2, s);
        status = luaL_loadbufferx(L, s, s.length, chunkname, mode);
    } else {  /* loading from a reader function */
        let chunkname = luaL_optstring(L, 2, "=(load)");
        luaL_checktype(L, 1, LUA_TFUNCTION);
        lua_settop(L, RESERVEDSLOT);  /* create reserved slot */
        status = lua_load(L, generic_reader, null, chunkname, mode);
    }
    return load_aux(L, status, env);
};

const luaB_loadfile = function(L) {
    let fname = luaL_optstring(L, 1, null);
    let mode = luaL_optstring(L, 2, null);
    let env = !lua_isnone(L, 3) ? 3 : 0;  /* 'env' index or 0 if no 'env' */
    let status = luaL_loadfilex(L, fname, mode);
    return load_aux(L, status, env);
};

const dofilecont = function(L, d1, d2) {
    return lua_gettop(L) - 1;
};

const luaB_dofile = function(L) {
    let fname = luaL_optstring(L, 1, null);
    lua_settop(L, 1);
    if (luaL_loadfile(L, fname) !== LUA_OK)
        return lua_error(L);
    lua_callk(L, 0, LUA_MULTRET, 0, dofilecont);
    return dofilecont(L, 0, 0);
};

const base_funcs = {
    "assert":         luaB_assert,
    "collectgarbage": luaB_collectgarbage,
    "dofile":         luaB_dofile,
    "error":          luaB_error,
    "getmetatable":   luaB_getmetatable,
    "ipairs":         luaB_ipairs,
    "load":           luaB_load,
    "loadfile":       luaB_loadfile,
    "next":           luaB_next,
    "pairs":          luaB_pairs,
    "pcall":          luaB_pcall,
    "print":          luaB_print,
    "rawequal":       luaB_rawequal,
    "rawget":         luaB_rawget,
    "rawlen":         luaB_rawlen,
    "rawset":         luaB_rawset,
    "select":         luaB_select,
    "setmetatable":   luaB_setmetatable,
    "tonumber":       luaB_tonumber,
    "tostring":       luaB_tostring,
    "type":           luaB_type,
    "xpcall":         luaB_xpcall
};

const luaopen_base = function(L) {
    /* open lib into global table */
    lua_pushglobaltable(L);
    luaL_setfuncs(L, base_funcs, 0);
    /* set global _G */
    lua_pushvalue(L, -1);
    lua_setfield(L, -2, to_luastring("_G"));
    /* set global _VERSION */
    lua_pushliteral(L, LUA_VERSION);
    lua_setfield(L, -2, to_luastring("_VERSION"));
    return 1;
};

module.exports.luaopen_base = luaopen_base;
