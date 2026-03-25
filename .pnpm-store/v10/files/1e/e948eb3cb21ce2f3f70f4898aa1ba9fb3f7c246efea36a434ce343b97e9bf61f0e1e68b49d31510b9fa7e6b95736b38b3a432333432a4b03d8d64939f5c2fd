"use strict";

const lua = require("../src/lua.js");
const lauxlib = require("../src/lauxlib.js");
const lualib = require("../src/lualib.js");
const {to_luastring} = require("../src/fengaricore.js");

test('utf8.offset', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return utf8.offset("( ͡° ͜ʖ ͡° )", 5)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tointeger(L, -1)).toBe(7);
});


test('utf8.codepoint', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return utf8.codepoint("( ͡° ͜ʖ ͡° )", 5, 8)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tointeger(L, -3)).toBe(176);
    expect(lua.lua_tointeger(L, -2)).toBe(32);
    expect(lua.lua_tointeger(L, -1)).toBe(860);
});


test('utf8.char', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return utf8.char(40, 32, 865, 176, 32, 860, 662, 32, 865, 176, 32, 41)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -1)).toBe("( ͡° ͜ʖ ͡° )");
});


test('utf8.len', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return utf8.len("( ͡° ͜ʖ ͡° )")
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tointeger(L, -1)).toBe(12);
});


test('utf8.codes', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local s = "( ͡° ͜ʖ ͡° )"
        local results = ""
        for p, c in utf8.codes(s) do
            results = results .. "[" .. p .. "," .. c .. "] "
        end
        return results
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -1)).toBe("[1,40] [2,32] [3,865] [5,176] [7,32] [8,860] [10,662] [12,32] [13,865] [15,176] [17,32] [18,41] ");
});
