"use strict";

const {
    LUA_MASKCALL,
    LUA_MASKCOUNT,
    LUA_MASKLINE,
    LUA_MASKRET,
    LUA_REGISTRYINDEX,
    LUA_TFUNCTION,
    LUA_TNIL,
    LUA_TTABLE,
    LUA_TUSERDATA,
    lua_Debug,
    lua_call,
    lua_checkstack,
    lua_gethook,
    lua_gethookcount,
    lua_gethookmask,
    lua_getinfo,
    lua_getlocal,
    lua_getmetatable,
    lua_getstack,
    lua_getupvalue,
    lua_getuservalue,
    lua_insert,
    lua_iscfunction,
    lua_isfunction,
    lua_isnoneornil,
    lua_isthread,
    lua_newtable,
    lua_pcall,
    lua_pop,
    lua_pushboolean,
    lua_pushfstring,
    lua_pushinteger,
    lua_pushlightuserdata,
    lua_pushliteral,
    lua_pushnil,
    lua_pushstring,
    lua_pushvalue,
    lua_rawgetp,
    lua_rawsetp,
    lua_rotate,
    lua_setfield,
    lua_sethook,
    lua_setlocal,
    lua_setmetatable,
    lua_settop,
    lua_setupvalue,
    lua_setuservalue,
    lua_tojsstring,
    lua_toproxy,
    lua_tostring,
    lua_tothread,
    lua_touserdata,
    lua_type,
    lua_upvalueid,
    lua_upvaluejoin,
    lua_xmove
} = require('./lua.js');
const {
    luaL_argcheck,
    luaL_argerror,
    luaL_checkany,
    luaL_checkinteger,
    luaL_checkstring,
    luaL_checktype,
    luaL_error,
    luaL_loadbuffer,
    luaL_newlib,
    luaL_optinteger,
    luaL_optstring,
    luaL_traceback,
    lua_writestringerror
} = require('./lauxlib.js');
const lualib = require('./lualib.js');
const {
    luastring_indexOf,
    to_luastring
} = require("./fengaricore.js");

/*
** If L1 != L, L1 can be in any state, and therefore there are no
** guarantees about its stack space; any push in L1 must be
** checked.
*/
const checkstack = function(L, L1, n) {
    if (L !== L1 && !lua_checkstack(L1, n))
        luaL_error(L, to_luastring("stack overflow", true));
};

const db_getregistry = function(L) {
    lua_pushvalue(L, LUA_REGISTRYINDEX);
    return 1;
};

const db_getmetatable = function(L) {
    luaL_checkany(L, 1);
    if (!lua_getmetatable(L, 1)) {
        lua_pushnil(L);  /* no metatable */
    }
    return 1;
};

const db_setmetatable = function(L) {
    const t = lua_type(L, 2);
    luaL_argcheck(L, t == LUA_TNIL || t == LUA_TTABLE, 2, "nil or table expected");
    lua_settop(L, 2);
    lua_setmetatable(L, 1);
    return 1;  /* return 1st argument */
};

const db_getuservalue = function(L) {
    if (lua_type(L, 1) !== LUA_TUSERDATA)
        lua_pushnil(L);
    else
        lua_getuservalue(L, 1);
    return 1;
};


const db_setuservalue = function(L) {
    luaL_checktype(L, 1, LUA_TUSERDATA);
    luaL_checkany(L, 2);
    lua_settop(L, 2);
    lua_setuservalue(L, 1);
    return 1;
};

/*
** Auxiliary function used by several library functions: check for
** an optional thread as function's first argument and set 'arg' with
** 1 if this argument is present (so that functions can skip it to
** access their other arguments)
*/
const getthread = function(L) {
    if (lua_isthread(L, 1)) {
        return {
            arg: 1,
            thread: lua_tothread(L, 1)
        };
    } else {
        return {
            arg: 0,
            thread: L
        };  /* function will operate over current thread */
    }
};

/*
** Variations of 'lua_settable', used by 'db_getinfo' to put results
** from 'lua_getinfo' into result table. Key is always a string;
** value can be a string, an int, or a boolean.
*/
const settabss = function(L, k, v) {
    lua_pushstring(L, v);
    lua_setfield(L, -2, k);
};

const settabsi = function(L, k, v) {
    lua_pushinteger(L, v);
    lua_setfield(L, -2, k);
};

const settabsb = function(L, k, v) {
    lua_pushboolean(L, v);
    lua_setfield(L, -2, k);
};


/*
** In function 'db_getinfo', the call to 'lua_getinfo' may push
** results on the stack; later it creates the result table to put
** these objects. Function 'treatstackoption' puts the result from
** 'lua_getinfo' on top of the result table so that it can call
** 'lua_setfield'.
*/
const treatstackoption = function(L, L1, fname) {
    if (L == L1)
        lua_rotate(L, -2, 1);  /* exchange object and table */
    else
        lua_xmove(L1, L, 1);  /* move object to the "main" stack */
    lua_setfield(L, -2, fname);  /* put object into table */
};

/*
** Calls 'lua_getinfo' and collects all results in a new table.
** L1 needs stack space for an optional input (function) plus
** two optional outputs (function and line table) from function
** 'lua_getinfo'.
*/
const db_getinfo = function(L) {
    let ar = new lua_Debug();
    let thread = getthread(L);
    let arg = thread.arg;
    let L1 = thread.thread;
    let options = luaL_optstring(L, arg + 2, "flnStu");
    checkstack(L, L1, 3);
    if (lua_isfunction(L, arg + 1)) {  /* info about a function? */
        options = lua_pushfstring(L, to_luastring(">%s"), options);  /* add '>' to 'options' */
        lua_pushvalue(L, arg + 1);  /* move function to 'L1' stack */
        lua_xmove(L, L1, 1);
    } else {  /* stack level */
        if (!lua_getstack(L1, luaL_checkinteger(L, arg + 1), ar)) {
            lua_pushnil(L);  /* level out of range */
            return 1;
        }
    }

    if (!lua_getinfo(L1, options, ar))
        luaL_argerror(L, arg + 2, "invalid option");
    lua_newtable(L);  /* table to collect results */
    if (luastring_indexOf(options, 83 /* 'S'.charCodeAt(0) */) > -1) {
        settabss(L, to_luastring("source", true), ar.source);
        settabss(L, to_luastring("short_src", true), ar.short_src);
        settabsi(L, to_luastring("linedefined", true), ar.linedefined);
        settabsi(L, to_luastring("lastlinedefined", true), ar.lastlinedefined);
        settabss(L, to_luastring("what", true), ar.what);
    }
    if (luastring_indexOf(options, 108 /* 'l'.charCodeAt(0) */) > -1)
        settabsi(L, to_luastring("currentline", true), ar.currentline);
    if (luastring_indexOf(options, 117 /* 'u'.charCodeAt(0) */) > -1) {
        settabsi(L, to_luastring("nups", true), ar.nups);
        settabsi(L, to_luastring("nparams", true), ar.nparams);
        settabsb(L, to_luastring("isvararg", true), ar.isvararg);
    }
    if (luastring_indexOf(options, 110 /* 'n'.charCodeAt(0) */) > -1) {
        settabss(L, to_luastring("name", true), ar.name);
        settabss(L, to_luastring("namewhat", true), ar.namewhat);
    }
    if (luastring_indexOf(options, 116 /* 't'.charCodeAt(0) */) > -1)
        settabsb(L, to_luastring("istailcall", true), ar.istailcall);
    if (luastring_indexOf(options, 76 /* 'L'.charCodeAt(0) */) > -1)
        treatstackoption(L, L1, to_luastring("activelines", true));
    if (luastring_indexOf(options, 102 /* 'f'.charCodeAt(0) */) > -1)
        treatstackoption(L, L1, to_luastring("func", true));
    return 1;  /* return table */
};

const db_getlocal = function(L) {
    let thread = getthread(L);
    let L1 = thread.thread;
    let arg = thread.arg;
    let ar = new lua_Debug();
    let nvar = luaL_checkinteger(L, arg + 2);  /* local-variable index */
    if (lua_isfunction(L, arg + 1)) {
        lua_pushvalue(L, arg + 1);  /* push function */
        lua_pushstring(L, lua_getlocal(L, null, nvar));  /* push local name */
        return 1;  /* return only name (there is no value) */
    } else {  /* stack-level argument */
        let level = luaL_checkinteger(L, arg + 1);
        if (!lua_getstack(L1, level, ar))  /* out of range? */
            return luaL_argerror(L, arg+1, "level out of range");
        checkstack(L, L1, 1);
        let name = lua_getlocal(L1, ar, nvar);
        if (name) {
            lua_xmove(L1, L, 1);  /* move local value */
            lua_pushstring(L, name);  /* push name */
            lua_rotate(L, -2, 1);  /* re-order */
            return 2;
        }
        else {
            lua_pushnil(L);  /* no name (nor value) */
            return 1;
        }
    }
};

const db_setlocal = function(L) {
    let thread = getthread(L);
    let L1 = thread.thread;
    let arg = thread.arg;
    let ar = new lua_Debug();
    let level = luaL_checkinteger(L, arg + 1);
    let nvar = luaL_checkinteger(L, arg + 2);
    if (!lua_getstack(L1, level, ar))  /* out of range? */
        return luaL_argerror(L, arg + 1, "level out of range");
    luaL_checkany(L, arg + 3);
    lua_settop(L, arg + 3);
    checkstack(L, L1, 1);
    lua_xmove(L, L1, 1);
    let name = lua_setlocal(L1, ar, nvar);
    if (name === null)
        lua_pop(L1, 1);  /* pop value (if not popped by 'lua_setlocal') */
    lua_pushstring(L, name);
    return 1;
};

/*
** get (if 'get' is true) or set an upvalue from a closure
*/
const auxupvalue = function(L, get) {
    let n = luaL_checkinteger(L, 2);  /* upvalue index */
    luaL_checktype(L, 1, LUA_TFUNCTION);  /* closure */
    let name = get ? lua_getupvalue(L, 1, n) : lua_setupvalue(L, 1, n);
    if (name === null) return 0;
    lua_pushstring(L, name);
    lua_insert(L, -(get+1));  /* no-op if get is false */
    return get + 1;
};


const db_getupvalue = function(L) {
    return auxupvalue(L, 1);
};

const db_setupvalue = function(L) {
    luaL_checkany(L, 3);
    return auxupvalue(L, 0);
};

/*
** Check whether a given upvalue from a given closure exists and
** returns its index
*/
const checkupval = function(L, argf, argnup) {
    let nup = luaL_checkinteger(L, argnup);  /* upvalue index */
    luaL_checktype(L, argf, LUA_TFUNCTION);  /* closure */
    luaL_argcheck(L, (lua_getupvalue(L, argf, nup) !== null), argnup, "invalid upvalue index");
    return nup;
};

const db_upvalueid = function(L) {
    let n = checkupval(L, 1, 2);
    lua_pushlightuserdata(L, lua_upvalueid(L, 1, n));
    return 1;
};

const db_upvaluejoin = function(L) {
    let n1 = checkupval(L, 1, 2);
    let n2 = checkupval(L, 3, 4);
    luaL_argcheck(L, !lua_iscfunction(L, 1), 1, "Lua function expected");
    luaL_argcheck(L, !lua_iscfunction(L, 3), 3, "Lua function expected");
    lua_upvaluejoin(L, 1, n1, 3, n2);
    return 0;
};

/*
** The hook table at registry[HOOKKEY] maps threads to their current
** hook function. (We only need the unique address of 'HOOKKEY'.)
*/
const HOOKKEY = to_luastring("__hooks__", true);

const hooknames = ["call", "return", "line", "count", "tail call"].map(e => to_luastring(e));

/*
** Call hook function registered at hook table for the current
** thread (if there is one)
*/
const hookf = function(L, ar) {
    lua_rawgetp(L, LUA_REGISTRYINDEX, HOOKKEY);
    let hooktable = lua_touserdata(L, -1);
    let proxy = hooktable.get(L);
    if (proxy) {  /* is there a hook function? */
        proxy(L);
        lua_pushstring(L, hooknames[ar.event]);  /* push event name */
        if (ar.currentline >= 0)
            lua_pushinteger(L, ar.currentline);  /* push current line */
        else lua_pushnil(L);
        lualib.lua_assert(lua_getinfo(L, to_luastring("lS"), ar));
        lua_call(L, 2, 0);  /* call hook function */
    }
};

/*
** Convert a string mask (for 'sethook') into a bit mask
*/
const makemask = function(smask, count) {
    let mask = 0;
    if (luastring_indexOf(smask, 99 /* 'c'.charCodeAt(0) */) > -1) mask |= LUA_MASKCALL;
    if (luastring_indexOf(smask, 114 /* 'r'.charCodeAt(0) */) > -1) mask |= LUA_MASKRET;
    if (luastring_indexOf(smask, 108 /* 'l'.charCodeAt(0) */) > -1) mask |= LUA_MASKLINE;
    if (count > 0) mask |= LUA_MASKCOUNT;
    return mask;
};

/*
** Convert a bit mask (for 'gethook') into a string mask
*/
const unmakemask = function(mask, smask) {
    let i = 0;
    if (mask & LUA_MASKCALL) smask[i++] = 99 /* 'c'.charCodeAt(0) */;
    if (mask & LUA_MASKRET) smask[i++] = 114 /* 'r'.charCodeAt(0) */;
    if (mask & LUA_MASKLINE) smask[i++] = 108 /* 'l'.charCodeAt(0) */;
    return smask.subarray(0, i);
};

const db_sethook = function(L) {
    let mask, count, func;
    let thread = getthread(L);
    let L1 = thread.thread;
    let arg = thread.arg;
    if (lua_isnoneornil(L, arg+1)) {  /* no hook? */
        lua_settop(L, arg+1);
        func = null; mask = 0; count = 0;  /* turn off hooks */
    }
    else {
        const smask = luaL_checkstring(L, arg + 2);
        luaL_checktype(L, arg+1, LUA_TFUNCTION);
        count = luaL_optinteger(L, arg + 3, 0);
        func = hookf; mask = makemask(smask, count);
    }
    /* as weak tables are not supported; use a JS weak-map */
    let hooktable;
    if (lua_rawgetp(L, LUA_REGISTRYINDEX, HOOKKEY) === LUA_TNIL) {
        hooktable = new WeakMap();
        lua_pushlightuserdata(L, hooktable);
        lua_rawsetp(L, LUA_REGISTRYINDEX, HOOKKEY);  /* set it in position */
    } else {
        hooktable = lua_touserdata(L, -1);
    }
    let proxy = lua_toproxy(L, arg + 1);  /* value (hook function) */
    hooktable.set(L1, proxy);
    lua_sethook(L1, func, mask, count);
    return 0;
};

const db_gethook = function(L) {
    let thread = getthread(L);
    let L1 = thread.thread;
    let buff = new Uint8Array(5);
    let mask = lua_gethookmask(L1);
    let hook = lua_gethook(L1);
    if (hook === null)  /* no hook? */
        lua_pushnil(L);
    else if (hook !== hookf)  /* external hook? */
        lua_pushliteral(L, "external hook");
    else {  /* hook table must exist */
        lua_rawgetp(L, LUA_REGISTRYINDEX, HOOKKEY);
        let hooktable = lua_touserdata(L, -1);
        let proxy = hooktable.get(L1);
        proxy(L);
    }
    lua_pushstring(L, unmakemask(mask, buff));  /* 2nd result = mask */
    lua_pushinteger(L, lua_gethookcount(L1));  /* 3rd result = count */
    return 3;
};

const db_traceback = function(L) {
    let thread = getthread(L);
    let L1 = thread.thread;
    let arg = thread.arg;
    let msg = lua_tostring(L, arg + 1);
    if (msg === null && !lua_isnoneornil(L, arg + 1))  /* non-string 'msg'? */
        lua_pushvalue(L, arg + 1);  /* return it untouched */
    else {
        let level = luaL_optinteger(L, arg + 2, L === L1 ? 1 : 0);
        luaL_traceback(L, L1, msg, level);
    }
    return 1;
};

const dblib = {
    "gethook":      db_gethook,
    "getinfo":      db_getinfo,
    "getlocal":     db_getlocal,
    "getmetatable": db_getmetatable,
    "getregistry":  db_getregistry,
    "getupvalue":   db_getupvalue,
    "getuservalue": db_getuservalue,
    "sethook":      db_sethook,
    "setlocal":     db_setlocal,
    "setmetatable": db_setmetatable,
    "setupvalue":   db_setupvalue,
    "setuservalue": db_setuservalue,
    "traceback":    db_traceback,
    "upvalueid":    db_upvalueid,
    "upvaluejoin":  db_upvaluejoin
};

let getinput;
if (typeof process !== "undefined") { // Only with Node
    const readlineSync = require('readline-sync');
    readlineSync.setDefaultOptions({
        prompt: 'lua_debug> '
    });
    getinput = function() {
        return readlineSync.prompt();
    };
} else if (typeof window !== "undefined") {
    /* if in browser use window.prompt. Doesn't work from web workers.
       See https://developer.mozilla.org/en-US/docs/Web/API/Window/prompt
    */
    getinput = function() {
        let input = prompt("lua_debug>", "");
        return (input !== null) ? input : "";
    };
}
if (getinput) {
    dblib.debug = function(L) {
        for (;;) {
            let input = getinput();

            if (input === "cont")
                return 0;

            if (input.length === 0)
                continue;

            let buffer = to_luastring(input);
            if (luaL_loadbuffer(L, buffer, buffer.length, to_luastring("=(debug command)", true))
                || lua_pcall(L, 0, 0, 0)) {
                lua_writestringerror(lua_tojsstring(L, -1), "\n");
            }
            lua_settop(L, 0);  /* remove eventual returns */
        }
    };
}

const luaopen_debug = function(L) {
    luaL_newlib(L, dblib);
    return 1;
};

module.exports.luaopen_debug = luaopen_debug;
