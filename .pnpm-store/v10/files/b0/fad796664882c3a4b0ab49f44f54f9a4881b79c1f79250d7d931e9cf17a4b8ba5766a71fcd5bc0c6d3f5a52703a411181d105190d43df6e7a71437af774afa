"use strict";

const lua     = require('../src/lua.js');
const lauxlib = require('../src/lauxlib.js');
const lualib  = require('../src/lualib.js');
const {to_luastring} = require("../src/fengaricore.js");

test('os.time', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return os.time()
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_isinteger(L, -1)).toBe(true);
});


test('os.time (with format)', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return os.time({
            day = 8,
            month = 2,
            year = 2015
        })
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tointeger(L, -1))
        .toBe(new Date(2015, 1, 8, 12, 0, 0, 0).getTime() / 1000);
});


test('os.difftime', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local t1 = os.time()
        local t2 = os.time()
        return os.difftime(t2, t1)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_isnumber(L, -1)).toBe(true);
});


test('os.date', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return os.date('%Y-%m-%d', os.time({
            day = 8,
            month = 2,
            year = 2015
        }))
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -1)).toBe("2015-02-08");
});


test('os.date normalisation', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return os.date('%Y-%m-%d', os.time({
            day = 0,
            month = 0,
            year = 2014
        }))
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -1)).toBe("2013-11-30");
});


test('os.time normalisation of table', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local t = {
            day = 20,
            month = 2,
            year = 2018
        }
        os.time(t)
        assert(t.day == 20, "unmodified day")
        assert(t.month == 2, "unmodified month")
        assert(t.year == 2018, "unmodified year")
        assert(t.wday == 3, "correct wday")
        assert(t.yday == 51, "correct yday")
    `;
    lualib.luaL_openlibs(L);
    expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
    lua.lua_call(L, 0, 0);
});


test('os.getenv', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return os.getenv('PATH')
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_isstring(L, -1)).toBe(true);
});
