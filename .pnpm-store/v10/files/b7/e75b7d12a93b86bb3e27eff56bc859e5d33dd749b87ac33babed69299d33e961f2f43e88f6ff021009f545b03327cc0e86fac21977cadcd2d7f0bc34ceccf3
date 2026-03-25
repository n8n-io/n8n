"use strict";

const { lua_pop } = require('./lua.js');
const { luaL_requiref } = require('./lauxlib.js');
const { to_luastring } = require("./fengaricore.js");

const loadedlibs = {};

/* export before requiring lualib.js */
const luaL_openlibs = function(L) {
    /* "require" functions from 'loadedlibs' and set results to global table */
    for (let lib in loadedlibs) {
        luaL_requiref(L, to_luastring(lib), loadedlibs[lib], 1);
        lua_pop(L, 1); /* remove lib */
    }
};
module.exports.luaL_openlibs = luaL_openlibs;

const lualib = require('./lualib.js');
const { luaopen_base }      = require('./lbaselib.js');
const { luaopen_coroutine } = require('./lcorolib.js');
const { luaopen_debug }     = require('./ldblib.js');
const { luaopen_math }      = require('./lmathlib.js');
const { luaopen_package }   = require('./loadlib.js');
const { luaopen_os }        = require('./loslib.js');
const { luaopen_string }    = require('./lstrlib.js');
const { luaopen_table }     = require('./ltablib.js');
const { luaopen_utf8 }      = require('./lutf8lib.js');

loadedlibs["_G"] = luaopen_base,
loadedlibs[lualib.LUA_LOADLIBNAME] = luaopen_package;
loadedlibs[lualib.LUA_COLIBNAME] = luaopen_coroutine;
loadedlibs[lualib.LUA_TABLIBNAME] = luaopen_table;
loadedlibs[lualib.LUA_OSLIBNAME] = luaopen_os;
loadedlibs[lualib.LUA_STRLIBNAME] = luaopen_string;
loadedlibs[lualib.LUA_MATHLIBNAME] = luaopen_math;
loadedlibs[lualib.LUA_UTF8LIBNAME] = luaopen_utf8;
loadedlibs[lualib.LUA_DBLIBNAME] = luaopen_debug;
if (typeof process !== "undefined")
    loadedlibs[lualib.LUA_IOLIBNAME] = require('./liolib.js').luaopen_io;

/* Extension: fengari library */
const { luaopen_fengari } = require('./fengarilib.js');
loadedlibs[lualib.LUA_FENGARILIBNAME] = luaopen_fengari;
