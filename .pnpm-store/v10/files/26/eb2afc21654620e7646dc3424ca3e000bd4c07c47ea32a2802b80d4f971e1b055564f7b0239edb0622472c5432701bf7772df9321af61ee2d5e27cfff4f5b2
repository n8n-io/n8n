"use strict";

const {toByteCode} = require("./tests.js");

const lua = require('../src/lua.js');
const lauxlib = require('../src/lauxlib.js');
const lualib = require('../src/lualib.js');
const {to_luastring} = require("../src/fengaricore.js");

test('luaL_loadstring', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local a = "hello world"
        return a
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }
    expect(lua.lua_tojsstring(L, -1))
        .toBe("hello world");
});


test('load', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local f = load("return 'js running lua running lua'")
        return f()
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }
    expect(lua.lua_tojsstring(L, -1))
        .toBe("js running lua running lua");
});


test('undump empty string', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        assert(load(string.dump(function()
            local str = ""
            return #str -- something that inspects the string
        end)))()
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, 0);
    }
});


test('luaL_loadbuffer', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local a = "hello world"
        return a
    `;
    {
        lualib.luaL_openlibs(L);
        let bc = toByteCode(luaCode);
        lauxlib.luaL_loadbuffer(L, bc, null, to_luastring("test"));
        lua.lua_call(L, 0, -1);
    }
    expect(lua.lua_tojsstring(L, -1))
        .toBe("hello world");
});

// TODO: test stdin
test('loadfile', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local f = assert(loadfile("test/loadfile-test.lua"))
        return f()
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }
    expect(lua.lua_tojsstring(L, -1))
        .toBe("hello world");
});


test('loadfile (binary)', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local f = assert(loadfile("test/loadfile-test.bc"))
        return f()
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }
    expect(lua.lua_tojsstring(L, -1))
        .toBe("hello world");
});


test('dofile', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return dofile("test/loadfile-test.lua")
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }
    expect(lua.lua_tojsstring(L, -1))
        .toBe("hello world");
});
