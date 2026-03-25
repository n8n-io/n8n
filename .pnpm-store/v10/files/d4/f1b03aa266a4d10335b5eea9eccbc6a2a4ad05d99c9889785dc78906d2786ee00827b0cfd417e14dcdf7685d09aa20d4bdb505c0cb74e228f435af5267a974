"use strict";

const lua = require('../src/lua.js');
const lauxlib = require('../src/lauxlib.js');
const lualib = require('../src/lualib.js');
const {to_luastring} = require("../src/fengaricore.js");

test('luaG_typeerror', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local a = true
        return #a
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_pcall(L, 0, -1, 0);
    }

    expect(lua.lua_tojsstring(L, -1))
        .toMatch("attempt to get length of a boolean value (local 'a')");
});


test('luaG_typeerror', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local a = true
        return a.yo
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_pcall(L, 0, -1, 0);
    }

    expect(lua.lua_tojsstring(L, -1))
        .toMatch("attempt to index a boolean value (local 'a')");
});


test('luaG_typeerror', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local a = true
        return a.yo
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_pcall(L, 0, -1, 0);
    }

    expect(lua.lua_tojsstring(L, -1))
        .toMatch("attempt to index a boolean value (local 'a')");
});


test('luaG_typeerror', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local a = true
        a.yo = 1
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_pcall(L, 0, -1, 0);
    }

    expect(lua.lua_tojsstring(L, -1))
        .toMatch("attempt to index a boolean value (local 'a')");
});


test('luaG_concaterror', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return {} .. 'hello'
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_pcall(L, 0, -1, 0);
    }

    expect(lua.lua_tojsstring(L, -1))
        .toMatch("attempt to concatenate a table value");
});


test('luaG_opinterror', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return {} + 'hello'
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_pcall(L, 0, -1, 0);
    }

    expect(lua.lua_tojsstring(L, -1))
        .toMatch("attempt to perform arithmetic on a table value");
});


test('luaG_tointerror', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return 123.5 & 12
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_pcall(L, 0, -1, 0);
    }

    expect(lua.lua_tojsstring(L, -1))
        .toMatch("number has no integer representation");
});
