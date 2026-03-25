#!/usr/bin/env node
"use strict";

const lua     = require('../../src/lua.js');
const lauxlib = require('../../src/lauxlib.js');
const lualib  = require('../../src/lualib.js');
const {to_luastring} = require("../../src/fengaricore.js");

let luaCode = `
    a = "debug me"
    debug.debug()
`, L;

L = lauxlib.luaL_newstate();

lualib.luaL_openlibs(L);

lauxlib.luaL_loadstring(L, to_luastring(luaCode));

lua.lua_call(L, 0, 0);
