"use strict";

const lua     = require('../src/lua.js');
const lauxlib = require('../src/lauxlib.js');
const lualib  = require('../src/lualib.js');
const {to_luastring} = require("../src/fengaricore.js");

// TODO: remove
test.skip('locals.lua', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        _soft = true
        require = function(lib) return _G[lib] end  -- NYI
        return dofile("tests/lua-tests/locals.lua")
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }
});


test.skip('constructs.lua', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        _soft = true
        require = function(lib) return _G[lib] end  -- NYI
        return dofile("tests/lua-tests/constructs.lua")
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }
});


test.skip('strings.lua', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return dofile("tests/lua-tests/strings.lua")
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }
});


test('__newindex leaves nils', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local x = setmetatable({}, {
          __newindex = function(t,k,v)
            rawset(t,'_'..k,v)
          end
        })
        x.test = 4
        for k,v in pairs(x) do
          assert(k ~= "test", "found phantom key")
        end
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }
});
