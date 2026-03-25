"use strict";

const assert   = require("assert");

const lua      = require('../../src/lua.js');
const lauxlib  = require('../../src/lauxlib.js');
const {
    luastring_eq,
    luastring_indexOf,
    to_jsstring,
    to_luastring
} = require("../../src/fengaricore.js");
const ljstype  = require('../../src/ljstype.js');
const lopcodes = require('../../src/lopcodes.js');
const { pushobj2s } = require('../../src/lobject.js');
const sprintf  = require('sprintf-js').sprintf;

const delimits = [" ", "\t", "\n", ",", ";"].map(e => e.charCodeAt(0));

const skip = function(pc) {
    for (;;) {
        if (pc.script[pc.offset] !== 0 && pc.offset < pc.script.length && delimits.indexOf(pc.script[pc.offset]) >= 0)
            pc.offset++;
        else if (pc.script[pc.offset] === '#'.charCodeAt(0)) {
            while (pc.script[pc.offset] !== '\n'.charCodeAt(0) && pc.script[pc.offset] !== 0 && pc.offset < pc.script.length)
                pc.offset++;
        } else break;
    }
};

const getnum = function(L, L1, pc) {
    let res = 0;
    let sig = 1;
    skip(pc);
    if (pc.script[pc.offset] === '.'.charCodeAt(0)) {
        res = lua.lua_tointeger(L1, -1);
        lua.lua_pop(L1, 1);
        pc.offset++;
        return res;
    } else if (pc.script[pc.offset] === '*'.charCodeAt(0)) {
        res = lua.lua_gettop(L1);
        pc.offset++;
        return res;
    }
    else if (pc.script[pc.offset] === '-'.charCodeAt(0)) {
        sig = -1;
        pc.offset++;
    }
    if (!ljstype.lisdigit(pc.script[pc.offset]))
        lauxlib.luaL_error(L, to_luastring("number expected (%s)"), pc.script);
    while (ljstype.lisdigit(pc.script[pc.offset])) res = res*10 + pc.script[pc.offset++] - '0'.charCodeAt(0);
    return sig*res;
};

const getstring = function(L, buff, pc) {
    let i = 0;
    skip(pc);
    if (pc.script[pc.offset] === '"'.charCodeAt(0) || pc.script[pc.offset] === '\''.charCodeAt(0)) {  /* quoted string? */
        let quote = pc.script[pc.offset++];
        while (pc.script[pc.offset] !== quote) {
            if (pc.script[pc.offset] === 0 || pc.offset >= pc.script.length)
                lauxlib.luaL_error(L, to_luastring("unfinished string in JS script", true));
            buff[i++] = pc.script[pc.offset++];
        }
        pc.offset++;
    } else {
        while (pc.script[pc.offset] !== 0 && pc.offset < pc.script.length && delimits.indexOf(pc.script[pc.offset]) < 0)
            buff[i++] = pc.script[pc.offset++];
    }
    return buff.subarray(0, i);
};

const getindex = function(L, L1, pc) {
    skip(pc);
    switch (pc.script[pc.offset++]) {
        case 'R'.charCodeAt(0): return lua.LUA_REGISTRYINDEX;
        case 'G'.charCodeAt(0): return lauxlib.luaL_error(L, to_luastring("deprecated index 'G'", true));
        case 'U'.charCodeAt(0): return lua.lua_upvalueindex(getnum(L, L1, pc));
        default: pc.offset--; return getnum(L, L1, pc);
    }
};

const codes = ["OK", "YIELD", "ERRRUN", "ERRSYNTAX", "ERRMEM", "ERRGCMM", "ERRERR"].map(e => to_luastring(e));

const pushcode = function(L, code) {
    lua.lua_pushstring(L, codes[code]);
};

const printstack = function(L) {
    let n = lua.lua_gettop(L);
    for (let i = 1; i <= n; i++) {
        console.log("${i}: %{to_jsstring(lauxlib.luaL_tolstring(L, i, null))}\n");
        lua.lua_pop(L, 1);
    }
    console.log("");
};

/*
** arithmetic operation encoding for 'arith' instruction
** LUA_OPIDIV  -> \
** LUA_OPSHL   -> <
** LUA_OPSHR   -> >
** LUA_OPUNM   -> _
** LUA_OPBNOT  -> !
*/
const ops = "+-*%^/\\&|~<>_!".split('').map(e => e.charCodeAt(0));

const runJS = function(L, L1, pc) {
    let buff = new Uint8Array(300);
    let status = 0;
    if (!pc || !pc.script) return lauxlib.luaL_error(L, to_luastring("attempt to runJS null script"));
    for (;;) {
        let inst = to_jsstring(getstring(L, buff, pc));
        if (inst.length === 0) return 0;
        switch (inst) {
            case "absindex": {
                lua.lua_pushnumber(L1, lua.lua_absindex(L1, getindex(L, L1, pc)));
                break;
            }
            case "append": {
                let t = getindex(L, L1, pc);
                let i = lua.lua_rawlen(L1, t);
                lua.lua_rawseti(L1, t, i + 1);
                break;
            }
            case "arith": {
                let op;
                skip(pc);
                op = ops.indexOf(pc.script[pc.offset++]);
                lua.lua_arith(L1, op);
                break;
            }
            case "call": {
                let narg = getnum(L, L1, pc);
                let nres = getnum(L, L1, pc);
                lua.lua_call(L1, narg, nres);
                break;
            }
            case "callk": {
                let narg = getnum(L, L1, pc);
                let nres = getnum(L, L1, pc);
                let i = getindex(L, L1, pc);
                lua.lua_callk(L1, narg, nres, i, Cfunck);
                break;
            }
            case "checkstack": {
                let sz = getnum(L, L1, pc);
                let msg = getstring(L, buff, pc);
                if (msg.length === 0)
                    msg = null;  /* to test 'luaL_checkstack' with no message */
                lauxlib.luaL_checkstack(L1, sz, msg);
                break;
            }
            case "compare": {
                let opt = getstring(L, buff, pc);  /* EQ, LT, or LE */
                let op = (opt[0] === 'E'.charCodeAt(0))
                    ? lua.LUA_OPEQ
                    : (opt[1] === 'T'.charCodeAt(0)) ? lua.LUA_OPLT : lua.LUA_OPLE;
                let a = getindex(L, L1, pc);
                let b = getindex(L, L1, pc);
                lua.lua_pushboolean(L1, lua.lua_compare(L1, a, b, op));
                break;
            }
            case "concat": {
                lua.lua_concat(L1, getnum(L, L1, pc));
                break;
            }
            case "copy": {
                let f = getindex(L, L1, pc);
                lua.lua_copy(L1, f, getindex(L, L1, pc));
                break;
            }
            case "func2num": {
                let func = lua.lua_tocfunction(L1, getindex(L, L1, pc));
                if (func === null) func = 0;
                else if (func.id) func = func.id;
                lua.lua_pushnumber(L1, func);
                break;
            }
            case "getfield": {
                let t = getindex(L, L1, pc);
                lua.lua_getfield(L1, t, getstring(L, buff, pc));
                break;
            }
            case "getglobal": {
                lua.lua_getglobal(L1, getstring(L, buff, pc));
                break;
            }
            case "getmetatable": {
                if (lua.lua_getmetatable(L1, getindex(L, L1, pc)) === 0)
                    lua.lua_pushnil(L1);
                break;
            }
            case "gettable": {
                lua.lua_gettable(L1, getindex(L, L1, pc));
                break;
            }
            case "gettop": {
                lua.lua_pushinteger(L1, lua.lua_gettop(L1));
                break;
            }
            case "gsub": {
                let a = getnum(L, L1, pc);
                let b = getnum(L, L1, pc);
                let c = getnum(L, L1, pc);
                lauxlib.luaL_gsub(L1, lua.lua_tostring(L1, a), lua.lua_tostring(L1, b), lua.lua_tostring(L1, c));
                break;
            }
            case "insert": {
                lua.lua_insert(L1, getnum(L, L1, pc));
                break;
            }
            case "iscfunction": {
                lua.lua_pushboolean(L1, lua.lua_iscfunction(L1, getindex(L, L1, pc)));
                break;
            }
            case "isfunction": {
                lua.lua_pushboolean(L1, lua.lua_isfunction(L1, getindex(L, L1, pc)));
                break;
            }
            case "isnil": {
                lua.lua_pushboolean(L1, lua.lua_isnil(L1, getindex(L, L1, pc)));
                break;
            }
            case "isnull": {
                lua.lua_pushboolean(L1, lua.lua_isnone(L1, getindex(L, L1, pc)));
                break;
            }
            case "isnumber": {
                lua.lua_pushboolean(L1, lua.lua_isnumber(L1, getindex(L, L1, pc)));
                break;
            }
            case "isstring": {
                lua.lua_pushboolean(L1, lua.lua_isstring(L1, getindex(L, L1, pc)));
                break;
            }
            case "istable": {
                lua.lua_pushboolean(L1, lua.lua_istable(L1, getindex(L, L1, pc)));
                break;
            }
            case "isudataval": {
                lua.lua_pushboolean(L1, lua.lua_islightuserdata(L1, getindex(L, L1, pc)));
                break;
            }
            case "isuserdata": {
                lua.lua_pushboolean(L1, lua.lua_isuserdata(L1, getindex(L, L1, pc)));
                break;
            }
            case "len": {
                lua.lua_len(L1, getindex(L, L1, pc));
                break;
            }
            case "Llen": {
                lua.lua_pushinteger(L1, lauxlib.luaL_len(L1, getindex(L, L1, pc)));
                break;
            }
            case "loadfile": {
                lauxlib.luaL_loadfile(L1, lauxlib.luaL_checkstring(L1, getnum(L, L1, pc)));
                break;
            }
            case "loadstring": {
                let s = lauxlib.luaL_checkstring(L1, getnum(L, L1, pc));
                lauxlib.luaL_loadstring(L1, s);
                break;
            }
            case "newmetatable": {
                lua.lua_pushboolean(L1, lauxlib.luaL_newmetatable(L1, getstring(L, buff, pc)));
                break;
            }
            case "newtable": {
                lua.lua_newtable(L1);
                break;
            }
            case "newthread": {
                lua.lua_newthread(L1);
                break;
            }
            case "newuserdata": {
                lua.lua_newuserdata(L1, getnum(L, L1, pc));
                break;
            }
            case "next": {
                lua.lua_next(L1, -2);
                break;
            }
            case "objsize": {
                lua.lua_pushinteger(L1, lua.lua_rawlen(L1, getindex(L, L1, pc)));
                break;
            }
            case "pcall": {
                let narg = getnum(L, L1, pc);
                let nres = getnum(L, L1, pc);
                status = lua.lua_pcall(L1, narg, nres, getnum(L, L1, pc));
                break;
            }
            case "pcallk": {
                let narg = getnum(L, L1, pc);
                let nres = getnum(L, L1, pc);
                let i = getindex(L, L1, pc);
                status = lua.lua_pcallk(L1, narg, nres, 0, i, Cfunck);
                break;
            }
            case "pop": {
                lua.lua_pop(L1, getnum(L, L1, pc));
                break;
            }
            case "print": {
                let n = getnum(L, L1, pc);
                if (n !== 0) {
                    console.log(`${lauxlib.luaL_tojsstring(L1, n, null)}\n`);
                    lua.lua_pop(L1, 1);
                }
                else printstack(L1);
                break;
            }
            case "pushbool": {
                lua.lua_pushboolean(L1, getnum(L, L1, pc));
                break;
            }
            case "pushcclosure": {
                lua.lua_pushcclosure(L1, testJS, getnum(L, L1, pc));
                break;
            }
            case "pushint": {
                lua.lua_pushinteger(L1, getnum(L, L1, pc));
                break;
            }
            case "pushnil": {
                lua.lua_pushnil(L1);
                break;
            }
            case "pushnum": {
                lua.lua_pushnumber(L1, getnum(L, L1, pc));
                break;
            }
            case "pushstatus": {
                pushcode(L1, status);
                break;
            }
            case "pushstring": {
                lua.lua_pushstring(L1, getstring(L, buff, pc));
                break;
            }
            case "pushupvalueindex": {
                lua.lua_pushinteger(L1, lua.lua_upvalueindex(getnum(L, L1, pc)));
                break;
            }
            case "pushvalue": {
                lua.lua_pushvalue(L1, getindex(L, L1, pc));
                break;
            }
            case "rawgeti": {
                let t = getindex(L, L1, pc);
                lua.lua_rawgeti(L1, t, getnum(L, L1, pc));
                break;
            }
            case "rawgetp": {
                let t = getindex(L, L1, pc);
                lua.lua_rawgetp(L1, t, getnum(L, L1, pc));
                break;
            }
            case "rawsetp": {
                let t = getindex(L, L1, pc);
                lua.lua_rawsetp(L1, t, getnum(L, L1, pc));
                break;
            }
            case "remove": {
                lua.lua_remove(L1, getnum(L, L1, pc));
                break;
            }
            case "replace": {
                lua.lua_replace(L1, getindex(L, L1, pc));
                break;
            }
            case "resume": {
                let i = getindex(L, L1, pc);
                status = lua.lua_resume(lua.lua_tothread(L1, i), L, getnum(L, L1, pc));
                break;
            }
            case "return": {
                let n = getnum(L, L1, pc);
                if (L1 != L) {
                    let i;
                    for (i = 0; i < n; i++)
                        lua.lua_pushstring(L, lua.lua_tostring(L1, -(n - i)));
                }
                return n;
            }
            case "rotate": {
                let i = getindex(L, L1, pc);
                lua.lua_rotate(L1, i, getnum(L, L1, pc));
                break;
            }
            case "setfield": {
                let t = getindex(L, L1, pc);
                lua.lua_setfield(L1, t, getstring(L, buff, pc));
                break;
            }
            case "setglobal": {
                lua.lua_setglobal(L1, getstring(L, buff, pc));
                break;
            }
            case "sethook": {
                let mask = getnum(L, L1, pc);
                let count = getnum(L, L1, pc);
                sethookaux(L1, mask, count, getstring(L, buff, pc));
                break;
            }
            case "setmetatable": {
                lua.lua_setmetatable(L1, getindex(L, L1, pc));
                break;
            }
            case "settable": {
                lua.lua_settable(L1, getindex(L, L1, pc));
                break;
            }
            case "settop": {
                lua.lua_settop(L1, getnum(L, L1, pc));
                break;
            }
            case "testudata": {
                let i = getindex(L, L1, pc);
                lua.lua_pushboolean(L1, lauxlib.luaL_testudata(L1, i, getstring(L, buff, pc)) !== null);
                break;
            }
            case "error": {
                lua.lua_error(L1);
                break;
            }
            case "throw": {
                throw new Error();
            }
            case "tobool": {
                lua.lua_pushboolean(L1, lua.lua_toboolean(L1, getindex(L, L1, pc)));
                break;
            }
            case "tocfunction": {
                lua.lua_pushcfunction(L1, lua.lua_tocfunction(L1, getindex(L, L1, pc)));
                break;
            }
            case "tointeger": {
                lua.lua_pushinteger(L1, lua.lua_tointeger(L1, getindex(L, L1, pc)));
                break;
            }
            case "tonumber": {
                lua.lua_pushnumber(L1, lua.lua_tonumber(L1, getindex(L, L1, pc)));
                break;
            }
            case "topointer": {
                let p = lua.lua_topointer(L1, getindex(L, L1, pc));
                if (p === null) p = 0;
                else if (p.id) p = p.id;
                lua.lua_pushnumber(L1, p);  /* in ltests.c, p is casted to a size_t so NULL gives 0 */
                break;
            }
            case "tostring": {
                let s = lua.lua_tostring(L1, getindex(L, L1, pc));
                let s1 = lua.lua_pushstring(L1, s);
                assert(luastring_eq(s, s1));
                break;
            }
            case "type": {
                lua.lua_pushstring(L1, lauxlib.luaL_typename(L1, getnum(L, L1, pc)));
                break;
            }
            case "xmove": {
                let f = getindex(L, L1, pc);
                let t = getindex(L, L1, pc);
                let fs = (f === 0) ? L1 : lua.lua_tothread(L1, f);
                let ts = (t === 0) ? L1 : lua.lua_tothread(L1, t);
                let n = getnum(L, L1, pc);
                if (n === 0) n = lua.lua_gettop(fs);
                lua.lua_xmove(fs, ts, n);
                break;
            }
            case "yield": {
                return lua.lua_yield(L1, getnum(L, L1, pc));
            }
            case "yieldk": {
                let nres = getnum(L, L1, pc);
                let i = getindex(L, L1, pc);
                return lua.lua_yieldk(L1, nres, i, Cfunck);
            }
            default:
                lauxlib.luaL_error(L, to_luastring("unknown instruction %s"), buff);
        }
    }
};


const testJS = function(L) {
    let L1;
    let pc;
    if (lua.lua_isuserdata(L, 1)) {
        L1 = getstate(L);
        pc = lauxlib.luaL_checkstring(L, 2);
    } else if (lua.lua_isthread(L, 1)) {
        L1 = lua.lua_tothread(L, 1);
        pc = lauxlib.luaL_checkstring(L, 2);
    } else {
        L1 = L;
        pc = lauxlib.luaL_checkstring(L, 1);
    }
    return runJS(L, L1, { script: pc, offset: 0 });
};

const upvalue = function(L) {
    let n = lauxlib.luaL_checkinteger(L, 2);
    lauxlib.luaL_checktype(L, 1, lua.LUA_TFUNCTION);
    if (lua.lua_isnone(L, 3)) {
        let name = lua.lua_getupvalue(L, 1, n);
        if (name === null) return 0;
        lua.lua_pushstring(L, name);
        return 2;
    }
    else {
        let name = lua.lua_setupvalue(L, 1, n);
        lua.lua_pushstring(L, name);
        return 1;
    }
};

const pushuserdata = function(L) {
    let u = lauxlib.luaL_checkinteger(L, 1);
    lua.lua_pushlightuserdata(L, u);
    return 1;
};

const udataval = function(L) {
    lua.lua_pushinteger(L, lua.lua_touserdata(L, 1));
    return 1;
};

const d2s = function(L) {
    let d = lauxlib.luaL_checknumber(L, 1);
    let b = new ArrayBuffer(8);
    new DataView(b).setFloat64(0, d, true);
    lua.lua_pushlstring(L, new Uint8Array(b), 8);
    return 1;
};

const s2d = function(L) {
    let b = lauxlib.luaL_checkstring(L, 1);
    let dv = new DataView(b.buffer);
    lua.lua_pushnumber(L, dv.getFloat64(0, true));
    return 1;
};

const newstate = function(L) {
    let L1 = lua.lua_newstate();
    if (L1) {
        lua.lua_atpanic(L1, tpanic);
        lua.lua_pushlightuserdata(L, L1);
    }
    else
        lua.lua_pushnil(L);
    return 1;
};

const getstate = function(L) {
    let L1 = lua.lua_touserdata(L, 1);
    lauxlib.luaL_argcheck(L, L1 !== null, 1, "state expected");
    return L1;
};

const luaopen_base      = require("../../src/lbaselib.js").luaopen_base;
const luaopen_coroutine = require("../../src/lcorolib.js").luaopen_coroutine;
const luaopen_debug     = require("../../src/ldblib.js").luaopen_debug;
const luaopen_io        = require("../../src/liolib.js").luaopen_io;
const luaopen_os        = require("../../src/loslib.js").luaopen_os;
const luaopen_math      = require("../../src/lmathlib.js").luaopen_math;
const luaopen_string    = require("../../src/lstrlib.js").luaopen_string;
const luaopen_table     = require("../../src/ltablib.js").luaopen_table;
const luaopen_package   = require("../../src/loadlib.js").luaopen_package;

const loadlib = function(L) {
    let libs = {
        "_G": luaopen_base,
        "coroutine": luaopen_coroutine,
        "debug": luaopen_debug,
        "io": luaopen_io,
        "os": luaopen_os,
        "math": luaopen_math,
        "string": luaopen_string,
        "table": luaopen_table
    };
    let L1 = getstate(L);
    lauxlib.luaL_requiref(L1, to_luastring("package", true), luaopen_package, 0);
    assert(lua.lua_type(L1, -1) == lua.LUA_TTABLE);
    /* 'requiref' should not reload module already loaded... */
    lauxlib.luaL_requiref(L1, to_luastring("package", true), null, 1);    /* seg. fault if it reloads */
    /* ...but should return the same module */
    assert(lua.lua_compare(L1, -1, -2, lua.LUA_OPEQ));
    lauxlib.luaL_getsubtable(L1, lua.LUA_REGISTRYINDEX, lauxlib.LUA_PRELOAD_TABLE);
    for (let name in libs) {
        lua.lua_pushcfunction(L1, libs[name]);
        lua.lua_setfield(L1, -2, to_luastring(name, true));
    }
    return 0;
};

const closestate = function(L) {
    let L1 = getstate(L);
    lua.lua_close(L1);
    return 0;
};

const doremote = function(L) {
    let L1 = getstate(L);
    let lcode;
    let code = lauxlib.luaL_checklstring(L, 2, lcode);
    let status;
    lua.lua_settop(L1, 0);
    status = lauxlib.luaL_loadbuffer(L1, code, lcode, code);
    if (status === lua.LUA_OK)
        status = lua.lua_pcall(L1, 0, lua.LUA_MULTRET, 0);
    if (status !== lua.LUA_OK) {
        lua.lua_pushnil(L);
        lua.lua_pushstring(L, lua.lua_tostring(L1, -1));
        lua.lua_pushinteger(L, status);
        return 3;
    }
    else {
        let i = 0;
        while (!lua.lua_isnone(L1, ++i))
            lua.lua_pushstring(L, lua.lua_tostring(L1, i));
        lua.lua_pop(L1, i-1);
        return i-1;
    }
};

const tpanic = function(L) {
    console.error(`PANIC: unprotected error in call to Lua API (${lua.lua_tojsstring(L, -1)})\n`);
    return process.exit(1);  /* do not return to Lua */
};

const newuserdata = function(L) {
    lua.lua_newuserdata(L, lauxlib.luaL_checkinteger(L, 1));
    return 1;
};

/*
** C hook that runs the C script stored in registry.C_HOOK[L]
*/
const Chook = function(L, ar) {
    let scpt;
    let events = ["call", "ret", "line", "count", "tailcall"].map(e => to_luastring(e));
    lua.lua_getfield(L, lua.LUA_REGISTRYINDEX, to_luastring("JS_HOOK", true));
    lua.lua_pushlightuserdata(L, L);
    lua.lua_gettable(L, -2);  /* get C_HOOK[L] (script saved by sethookaux) */
    scpt = lua.lua_tostring(L, -1);  /* not very religious (string will be popped) */
    lua.lua_pop(L, 2);  /* remove C_HOOK and script */
    lua.lua_pushstring(L, events[ar.event]);  /* may be used by script */
    lua.lua_pushinteger(L, ar.currentline);  /* may be used by script */
    runJS(L, L, { script: scpt, offset: 0 });  /* run script from C_HOOK[L] */
};

class Aux {
    constructor() {
        this.paniccode = null;
        this.L = null;
    }
}

/*
** does a long-jump back to "main program".
*/
const panicback = function(L) {
    let b = new Aux();
    lua.lua_checkstack(L, 1);    /* open space for 'Aux' struct */
    lua.lua_getfield(L, lua.LUA_REGISTRYINDEX, to_luastring("_jmpbuf", true));    /* get 'Aux' struct */
    b = lua.lua_touserdata(L, -1);
    lua.lua_pop(L, 1);    /* remove 'Aux' struct */
    runJS(b.L, L, { script: b.paniccode, offset: 0 });    /* run optional panic code */
    throw 1;
};

const checkpanic = function(L) {
    let b = new Aux();
    let code = lauxlib.luaL_checkstring(L, 1);
    b.paniccode = lauxlib.luaL_optstring(L, 2, "");
    b.L = L;
    let L1 = lua.lua_newstate();    /* create new state */
    if (L1 === null) {    /* error? */
        lua.lua_pushnil(L);
        return 1;
    }
    lua.lua_atpanic(L1, panicback);    /* set its panic function */
    lua.lua_pushlightuserdata(L1, b);
    lua.lua_setfield(L1, lua.LUA_REGISTRYINDEX, to_luastring("_jmpbuf", true));    /* store 'Aux' struct */
    try {    /* set jump buffer */
        runJS(L, L1, { script: code, offset: 0 });    /* run code unprotected */
        lua.lua_pushliteral(L, "no errors");
    } catch (e) {    /* error handling */
        /* move error message to original state */
        lua.lua_pushstring(L, lua.lua_tostring(L1, -1));
    }
    lua.lua_close(L1);
    return 1;
};

/*
** sets 'registry.C_HOOK[L] = scpt' and sets 'Chook' as a hook
*/
const sethookaux = function(L, mask, count, scpt) {
    if (scpt.length <= 0) {  /* no script? */
        lua.lua_sethook(L, null, 0, 0);  /* turn off hooks */
        return;
    }
    lua.lua_getfield(L, lua.LUA_REGISTRYINDEX, to_luastring("JS_HOOK", true));  /* get C_HOOK table */
    if (!lua.lua_istable(L, -1)) {  /* no hook table? */
        lua.lua_pop(L, 1);  /* remove previous value */
        lua.lua_newtable(L);  /* create new C_HOOK table */
        lua.lua_pushvalue(L, -1);
        lua.lua_setfield(L, lua.LUA_REGISTRYINDEX, to_luastring("JS_HOOK", true));  /* register it */
    }
    lua.lua_pushlightuserdata(L, L);
    lua.lua_pushstring(L, scpt);
    lua.lua_settable(L, -3);  /* C_HOOK[L] = script */
    lua.lua_sethook(L, Chook, mask, count);
};

const sethook = function(L) {
    if (lua.lua_isnoneornil(L, 1))
        lua.lua_sethook(L, null, 0, 0);  /* turn off hooks */
    else {
        const scpt = lauxlib.luaL_checkstring(L, 1);
        const smask = lauxlib.luaL_checkstring(L, 2);
        let count = lauxlib.luaL_optinteger(L, 3, 0);
        let mask = 0;
        if (luastring_indexOf(smask, 'c'.charCodeAt(0)) >= 0) mask |= lua.LUA_MASKCALL;
        if (luastring_indexOf(smask, 'r'.charCodeAt(0)) >= 0) mask |= lua.LUA_MASKRET;
        if (luastring_indexOf(smask, 'l'.charCodeAt(0)) >= 0) mask |= lua.LUA_MASKLINE;
        if (count > 0) mask |= lua.LUA_MASKCOUNT;
        sethookaux(L, mask, count, scpt);
    }
    return 0;
};

const Cfunc = function(L) {
    return runJS(L, L, { script: lua.lua_tostring(L, lua.lua_upvalueindex(1)), offset: 0 });
};

const Cfunck = function(L, status, ctx) {
    pushcode(L, status);
    lua.lua_setglobal(L, to_luastring("status", true));
    lua.lua_pushinteger(L, ctx);
    lua.lua_setglobal(L, to_luastring("ctx", true));
    return runJS(L, L, { script: lua.lua_tostring(L, ctx), offset: 0 });
};

const makeCfunc = function(L) {
    lauxlib.luaL_checkstring(L, 1);
    lua.lua_pushcclosure(L, Cfunc, lua.lua_gettop(L));
    return 1;
};

const coresume = function(L) {
    let status;
    let co = lua.lua_tothread(L, 1);
    lauxlib.luaL_argcheck(L, co, 1, "coroutine expected");
    status = lua.lua_resume(co, L, 0);
    if (status != lua.LUA_OK && status !== lua.LUA_YIELD) {
        lua.lua_pushboolean(L, 0);
        lua.lua_insert(L, -2);
        return 2;  /* return false + error message */
    }
    else {
        lua.lua_pushboolean(L, 1);
        return 1;
    }
};

const obj_at = function(L, k) {
    return L.stack[L.ci.funcOff + k].value.p;
};

const setnameval = function(L, name, val) {
    lua.lua_pushstring(L, name);
    lua.lua_pushinteger(L, val);
    lua.lua_settable(L, -3);
};

const pushobject = function(L, o){
    pushobj2s(L, o);
    assert(L.top <= L.ci.top, "stack overflow");
};

const buildop = function(p, pc) {
    let i = p.code[pc];
    let o = lopcodes.GET_OPCODE(i);
    let name = lopcodes.OpCodes[o];
    let line = p.lineinfo.length !== 0 ? p.lineinfo[pc] : -1;
    let result = sprintf("(%4d) %4d - ", line, pc); //`(${line}) ${pc} - `;
    switch (lopcodes.getOpMode(o)) {
        case lopcodes.iABC:
            result += sprintf("%-12s%4d %4d %4d", name, lopcodes.GETARG_A(i), lopcodes.GETARG_B(i), lopcodes.GETARG_C(i)); // `${name} ${lopcodes.GETARG_A(i)} ${lopcodes.GETARG_B(i)} ${lopcodes.GETARG_C(i)}`;
            break;
        case lopcodes.iABx:
            result += sprintf("%-12s%4d %4d", name, lopcodes.GETARG_A(i), lopcodes.GETARG_Bx(i)); // `${name} ${lopcodes.GETARG_A(i)} ${lopcodes.GETARG_Bx(i)}`;
            break;
        case lopcodes.iAsBx:
            result += sprintf("%-12s%4d %4d", name, lopcodes.GETARG_A(i), lopcodes.GETARG_sBx(i)); // `${name} ${lopcodes.GETARG_A(i)} ${lopcodes.GETARG_sBx(i)}`;
            break;
        case lopcodes.iAx:
            result += sprintf("%-12s%4d", name, lopcodes.GETARG_Ax(i)); // `${name} ${lopcodes.GETARG_Ax(i)}`;
            break;
    }

    return to_luastring(result);
};

const listcode = function(L) {
    lauxlib.luaL_argcheck(L, lua.lua_isfunction(L, 1) && !lua.lua_iscfunction(L, 1),
        1, "Lua function expected");
    let p = obj_at(L, 1);
    lua.lua_newtable(L);
    setnameval(L, to_luastring("maxstack", true), p.maxstacksize);
    setnameval(L, to_luastring("numparams", true), p.numparams);
    for (let pc = 0; pc < p.code.length; pc++) {
        lua.lua_pushinteger(L, pc+1);
        lua.lua_pushstring(L, buildop(p, pc));
        lua.lua_settable(L, -3);
    }
    return 1;
};

const listk = function(L) {
    lauxlib.luaL_argcheck(L,
        lua.lua_isfunction(L, 1) && !lua.lua_iscfunction(L, 1),
        1, "Lua function expected");
    let p = obj_at(L, 1);
    lua.lua_createtable(L, p.k.length, 0);
    for (let i = 0; i < p.k.length; i++) {
        pushobject(L, p.k[i]);
        lua.lua_rawseti(L, -2, i + 1);
    }
    return 1;
};

const tests_funcs = {
    "checkpanic":   checkpanic,
    "closestate":   closestate,
    "d2s":          d2s,
    "doremote":     doremote,
    "listcode":     listcode,
    "listk":        listk,
    "loadlib":      loadlib,
    "makeCfunc":    makeCfunc,
    "newstate":     newstate,
    "newuserdata":  newuserdata,
    "pushuserdata": pushuserdata,
    "resume":       coresume,
    "s2d":          s2d,
    "sethook":      sethook,
    "testC":        testJS,
    "testJS":       testJS,
    "udataval":     udataval,
    "upvalue":      upvalue
};

const luaB_opentests = function(L) {
    lua.lua_atpanic(L, tpanic);
    lauxlib.luaL_newlib(L, tests_funcs);
    return 1;
};

const luaopen_tests = function(L) {
    lauxlib.luaL_requiref(L, to_luastring("T"), luaB_opentests, 1);
    lua.lua_pop(L, 1); /* remove lib */
};

module.exports.luaopen_tests = luaopen_tests;
