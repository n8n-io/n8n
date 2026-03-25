"use strict";

const lua = require('../src/lua.js');
const lauxlib = require('../src/lauxlib.js');
const lualib = require('../src/lualib.js');
const {to_luastring} = require("../src/fengaricore.js");

test('math.abs, math.sin, math.cos, math.tan, math.asin, math.acos, math.atan', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return math.abs(-10), math.abs(-10.5), math.cos(10), math.tan(10),
               math.asin(1), math.acos(0.5), math.atan(10)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tointeger(L, -7)).toBe(10);
    expect(lua.lua_tonumber(L, -6)).toBe(10.5);
    expect(lua.lua_tonumber(L, -5)).toBe(-0.8390715290764524);
    expect(lua.lua_tonumber(L, -4)).toBe(0.6483608274590866);
    expect(lua.lua_tonumber(L, -3)).toBe(1.5707963267948966);
    expect(lua.lua_tonumber(L, -2)).toBe(1.0471975511965979);
    expect(lua.lua_tonumber(L, -1)).toBe(1.4711276743037347);
});


test('math.ceil, math.floor', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return math.ceil(10.5), math.floor(10.5)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tointeger(L, -2)).toBe(11);
    expect(lua.lua_tointeger(L, -1)).toBe(10);
});


test('math.deg, math.rad', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return math.deg(10), math.rad(10)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tonumber(L, -2)).toBe(572.9577951308232);
    expect(lua.lua_tonumber(L, -1)).toBe(0.17453292519943295);
});


test('math.log', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return math.log(10), math.log(10, 2), math.log(10, 10)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tonumber(L, -3)).toBe(2.302585092994046);
    expect(lua.lua_tonumber(L, -2)).toBe(3.321928094887362);
    expect(lua.lua_tonumber(L, -1)).toBe(1);
});


/* Node.js 6 has incorrect results for Math.exp */
(parseInt(process.versions.node) > 6 ? test : test.skip)('math.exp', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return math.exp(10)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tonumber(L, -1)).toBe(22026.465794806718);
});


test('math.min, math.max', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return math.max(10, 5, 23), math.min(10, 5, 23)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tonumber(L, -2)).toBe(23);
    expect(lua.lua_tonumber(L, -1)).toBe(5);
});


test('math.random', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return math.random(), math.random(10, 15)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    {
        let r = expect(lua.lua_tonumber(L, -2));
        r.toBeGreaterThanOrEqual(0);
        r.toBeLessThanOrEqual(1);
    }
    {
        let r = expect(lua.lua_tonumber(L, -1));
        r.toBeGreaterThanOrEqual(10);
        r.toBeLessThanOrEqual(15);
    }
});


test('math.sqrt', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return math.sqrt(10)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tonumber(L, -1)).toBe(3.1622776601683795);
});


test('math.tointeger', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return math.tointeger('10')
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tonumber(L, -1)).toBe(10);
});


test('math.type', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return math.type(10), math.type(10.5), math.type('hello')
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -3)).toBe("integer");
    expect(lua.lua_tojsstring(L, -2)).toBe("float");
    expect(lua.lua_tojsstring(L, -1)).toBe(null);
});


test('math.ult', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return math.ult(5, 200)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_toboolean(L, -1)).toBe(true);
});


test('math.fmod', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return math.fmod(2,5)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tonumber(L, -1)).toBe(2);
});


test('math.modf', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return math.modf(3.4, 0.6)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tonumber(L, -2)).toBe(3);
    expect(lua.lua_tonumber(L, -1)).toBe(0.3999999999999999);
});
