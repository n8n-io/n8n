"use strict";

const lua = require('../src/lua.js');
const lauxlib = require('../src/lauxlib.js');
const lualib = require('../src/lualib.js');
const lstate = require('../src/lstate.js');
const {to_luastring} = require("../src/fengaricore.js");

test('coroutine.create, coroutine.yield, coroutine.resume', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local co = coroutine.create(function (start)
            local b = coroutine.yield(start * start);
            coroutine.yield(b * b)
        end)

        local success, pow = coroutine.resume(co, 5)
        success, pow = coroutine.resume(co, pow)

        return pow
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tonumber(L, -1))
        .toBe(625);
});


test('coroutine.status', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local co = coroutine.create(function (start)
            local b = coroutine.yield(start * start);
            coroutine.yield(b * b)
        end)

        local s1 = coroutine.status(co)

        local success, pow = coroutine.resume(co, 5)
        success, pow = coroutine.resume(co, pow)

        coroutine.resume(co, pow)

        local s2 = coroutine.status(co)

        return s1, s2
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -2))
        .toBe("suspended");

    expect(lua.lua_tojsstring(L, -1))
        .toBe("dead");
});


test('coroutine.isyieldable', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local co = coroutine.create(function ()
            coroutine.yield(coroutine.isyieldable());
        end)

        local succes, yieldable = coroutine.resume(co)

        return yieldable, coroutine.isyieldable()
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_toboolean(L, -2)).toBe(true);
    expect(lua.lua_toboolean(L, -1)).toBe(false);
});


test('coroutine.running', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local running, ismain

        local co = coroutine.create(function ()
            running, ismain = coroutine.running()
        end)

        coroutine.resume(co)

        return running, ismain
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tothread(L, -2)).toBeInstanceOf(lstate.lua_State);
    expect(lua.lua_toboolean(L, -1)).toBe(false);
});


test('coroutine.wrap', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local co = coroutine.wrap(function (start)
            local b = coroutine.yield(start * start);
            coroutine.yield(b * b)
        end)

        pow = co(5)
        pow = co(pow)

        return pow
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tonumber(L, -1))
        .toBe(625);
});
