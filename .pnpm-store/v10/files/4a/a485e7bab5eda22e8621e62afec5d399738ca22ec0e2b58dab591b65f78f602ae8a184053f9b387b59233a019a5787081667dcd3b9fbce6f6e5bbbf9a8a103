"use strict";

const fs      = require('fs');

const {
    LUA_REGISTRYINDEX,
    lua_getfield,
    lua_gettop,
    lua_isnone,
    lua_isnoneornil,
    lua_newuserdata,
    lua_pop,
    lua_pushliteral,
    lua_pushnil,
    lua_pushstring,
    lua_pushvalue,
    lua_setfield,
    lua_tostring,
    lua_touserdata
} = require('./lua.js');
const {
    LUA_FILEHANDLE,
    luaL_checkany,
    luaL_checklstring,
    luaL_checkudata,
    luaL_error,
    luaL_fileresult,
    luaL_newlib,
    luaL_newmetatable,
    luaL_setfuncs,
    luaL_setmetatable,
    luaL_testudata
} = require('./lauxlib.js');
const lualib = require('./lualib.js');
const { to_luastring } = require("./fengaricore.js");

const IO_PREFIX = "_IO_";
const IOPREF_LEN = IO_PREFIX.length;
const IO_INPUT = to_luastring(IO_PREFIX + "input");
const IO_OUTPUT = to_luastring(IO_PREFIX + "output");

const tolstream = function(L) {
    return luaL_checkudata(L, 1, LUA_FILEHANDLE);
};

const isclosed = function(p) {
    return p.closef === null;
};

const io_type = function(L) {
    luaL_checkany(L, 1);
    let p = luaL_testudata(L, 1, LUA_FILEHANDLE);
    if (p === null)
        lua_pushnil(L);  /* not a file */
    else if (isclosed(p))
        lua_pushliteral(L, "closed file");
    else
        lua_pushliteral(L, "file");
    return 1;
};

const f_tostring = function(L) {
    let p = tolstream(L);
    if (isclosed(p))
        lua_pushliteral(L, "file (closed)");
    else
        lua_pushstring(L, to_luastring(`file (${p.f.toString()})`));
    return 1;
};

const tofile = function(L) {
    let p = tolstream(L);
    if (isclosed(p))
        luaL_error(L, to_luastring("attempt to use a closed file"));
    lualib.lua_assert(p.f);
    return p.f;
};

const newprefile = function(L) {
    let p = lua_newuserdata(L);
    p.f = null;
    p.closef = null;
    luaL_setmetatable(L, LUA_FILEHANDLE);
    return p;
};

const aux_close = function(L) {
    let p = tolstream(L);
    let cf = p.closef;
    p.closef = null;
    return cf(L);
};

const io_close = function(L) {
    if (lua_isnone(L, 1))  /* no argument? */
        lua_getfield(L, LUA_REGISTRYINDEX, IO_OUTPUT);  /* use standard output */
    tofile(L);  /* make sure argument is an open stream */
    return aux_close(L);
};

const getiofile = function(L, findex) {
    lua_getfield(L, LUA_REGISTRYINDEX, findex);
    let p = lua_touserdata(L, -1);
    if (isclosed(p))
        luaL_error(L, to_luastring("standard %s file is closed"), findex.subarray(IOPREF_LEN));
    return p.f;
};

const g_iofile = function(L, f, mode) {
    if (!lua_isnoneornil(L, 1)) {
        let filename = lua_tostring(L, 1);
        if (filename)
            luaL_error(L, to_luastring("opening files not yet implemented"));
        else {
            tofile(L);  /* check that it's a valid file handle */
            lua_pushvalue(L, 1);
        }
        lua_setfield(L, LUA_REGISTRYINDEX, f);
    }
    /* return current value */
    lua_getfield(L, LUA_REGISTRYINDEX, f);
    return 1;
};

const io_input = function(L) {
    return g_iofile(L, IO_INPUT, "r");
};

const io_output = function(L) {
    return g_iofile(L, IO_OUTPUT, "w");
};

/* node <= 6 doesn't support passing a Uint8Array to fs.writeSync */
const prepare_string_for_write = process.versions.node > 6 ?
    (s) => s : // identity function
    (s) => Buffer.from(s.buffer, s.byteOffset, s.byteLength);

const g_write = function(L, f, arg) {
    let nargs = lua_gettop(L) - arg;
    let status = true;
    let err;
    for (; nargs--; arg++) {
        let s = luaL_checklstring(L, arg);
        try {
            status = status && (fs.writeSync(f.fd, prepare_string_for_write(s), 0, s.length) === s.length);
        } catch (e) {
            status = false;
            err = e;
        }
    }
    if (status) return 1;  /* file handle already on stack top */
    else return luaL_fileresult(L, status, null, err);
};

const io_write = function(L) {
    return g_write(L, getiofile(L, IO_OUTPUT), 1);
};

const f_write = function(L) {
    let f = tofile(L);
    lua_pushvalue(L, 1); /* push file at the stack top (to be returned) */
    return g_write(L, f, 2);
};

const io_flush = function (L) {
    /* stub, as node doesn't have synchronized buffered IO */
    getiofile(L, IO_OUTPUT);
    return luaL_fileresult(L, true, null, null);
};

const f_flush = function (L) {
    /* stub, as node doesn't have synchronized buffered IO */
    tofile(L);
    return luaL_fileresult(L, true, null, null);
};

const iolib = {
    "close": io_close,
    "flush": io_flush,
    "input": io_input,
    "output": io_output,
    "type": io_type,
    "write": io_write
};

const flib = {
    "close": io_close,
    "flush": f_flush,
    "write": f_write,
    "__tostring": f_tostring
};

const createmeta = function(L) {
    luaL_newmetatable(L, LUA_FILEHANDLE);  /* create metatable for file handles */
    lua_pushvalue(L, -1);  /* push metatable */
    lua_setfield(L, -2, to_luastring("__index", true));  /* metatable.__index = metatable */
    luaL_setfuncs(L, flib, 0);  /* add file methods to new metatable */
    lua_pop(L, 1);  /* pop new metatable */
};

const io_noclose = function(L) {
    let p = tolstream(L);
    p.closef = io_noclose;
    lua_pushnil(L);
    lua_pushliteral(L, "cannot close standard file");
    return 2;
};

const createstdfile = function(L, f, k, fname) {
    let p = newprefile(L);
    p.f = f;
    p.closef = io_noclose;
    if (k !== null) {
        lua_pushvalue(L, -1);
        lua_setfield(L, LUA_REGISTRYINDEX, k);  /* add file to registry */
    }
    lua_setfield(L, -2, fname);  /* add file to module */
};

const luaopen_io = function(L) {
    luaL_newlib(L, iolib);
    createmeta(L);
    /* create (and set) default files */
    createstdfile(L, process.stdin, IO_INPUT, to_luastring("stdin"));
    createstdfile(L, process.stdout, IO_OUTPUT, to_luastring("stdout"));
    createstdfile(L, process.stderr, null, to_luastring("stderr"));
    return 1;
};

module.exports.luaopen_io = luaopen_io;
