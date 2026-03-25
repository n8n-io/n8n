"use strict";

const {toByteCode} = require("./tests.js");

const lua = require('../src/lua.js');
const lauxlib = require("../src/lauxlib.js");
const {to_luastring} = require("../src/fengaricore.js");


test('luaL_newstate, lua_pushnil, luaL_typename', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    {
        lua.lua_pushnil(L);
    }

    expect(lauxlib.luaL_typename(L, -1))
        .toEqual(to_luastring("nil"));
});


test('lua_pushnumber', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    {
        lua.lua_pushnumber(L, 10.5);
    }

    expect(lauxlib.luaL_typename(L, -1))
        .toEqual(to_luastring("number"));

    expect(lua.lua_tonumber(L, -1))
        .toBe(10.5);
});


test('lua_pushinteger', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    {
        lua.lua_pushinteger(L, 10);
    }

    expect(lauxlib.luaL_typename(L, -1))
        .toEqual(to_luastring("number"));

    expect(lua.lua_tointeger(L, -1))
        .toBe(10);
});


test('lua_pushliteral', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    {
        lua.lua_pushliteral(L, "hello");
    }

    expect(lauxlib.luaL_typename(L, -1))
        .toEqual(to_luastring("string"));

    expect(lua.lua_tojsstring(L, -1))
        .toBe("hello");
});


test('lua_pushboolean', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    {
        lua.lua_pushboolean(L, true);
    }

    expect(lauxlib.luaL_typename(L, -1))
        .toEqual(to_luastring("boolean"));

    expect(lua.lua_toboolean(L, -1))
        .toBe(true);
});


test('lua_pushvalue', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    {
        lua.lua_pushliteral(L, "hello");
        lua.lua_pushvalue(L, -1);
    }

    expect(lauxlib.luaL_typename(L, -1))
        .toEqual(to_luastring("string"));

    expect(lauxlib.luaL_typename(L, -2))
        .toEqual(to_luastring("string"));

    expect(lua.lua_tojsstring(L, -1))
        .toBe("hello");

    expect(lua.lua_tojsstring(L, -2))
        .toBe("hello");
});


test('lua_pushjsclosure', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    {
        let fn = function(L) {
            return 0;
        };
        lua.lua_pushliteral(L, "a value associated to the C closure");
        lua.lua_pushjsclosure(L, fn, 1);
    }

    expect(lauxlib.luaL_typename(L, -1))
        .toEqual(to_luastring("function"));
});


test('lua_pushjsfunction', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    {
        let fn = function(L) {
            return 0;
        };
        lua.lua_pushjsfunction(L, fn);
    }

    expect(lauxlib.luaL_typename(L, -1))
        .toEqual(to_luastring("function"));
});


test('lua_call (calling a light JS function)', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    {
        let fn = function(L) {
            lua.lua_pushliteral(L, "hello");
            return 1;
        };
        lua.lua_pushjsfunction(L, fn);
        lua.lua_call(L, 0, 1);
    }

    expect(lua.lua_tojsstring(L, -1))
        .toBe("hello");
});


test('lua_call (calling a JS closure)', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    {
        let fn = function(L) {
            lua.lua_pushstring(L, lua.lua_tostring(L, lua.lua_upvalueindex(1)));
            return 1;
        };
        lua.lua_pushliteral(L, "upvalue hello!");
        lua.lua_pushjsclosure(L, fn, 1);
        lua.lua_call(L, 0, 1);
    }

    expect(lua.lua_tojsstring(L, -1))
        .toBe("upvalue hello!");
});


test('lua_pcall (calling a light JS function)', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    {
        let fn = function(L) {
            lua.lua_pushliteral(L, "hello");
            return 1;
        };
        lua.lua_pushjsfunction(L, fn);
        expect(lua.lua_pcall(L, 0, 1, 0)).toBe(lua.LUA_OK);
    }

    expect(lua.lua_tojsstring(L, -1))
        .toBe("hello");
});


test('lua_pcall that breaks', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    {
        let fn = function(L) {
            return "undefined_value";
        };
        lua.lua_pushjsfunction(L, fn);
        expect(lua.lua_pcall(L, 0, 1, 0)).not.toBe(lua.LUA_OK);
    }
});


test('lua_pop', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    {
        lua.lua_pushliteral(L, "hello");
        lua.lua_pushliteral(L, "world");
        lua.lua_pop(L, 1);
    }

    expect(lua.lua_tojsstring(L, -1))
        .toBe("hello");
});


test('lua_load with no chunkname', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    {
        lua.lua_load(L, function(L, s) {
            let r = s.code;
            s.code = null;
            return r;
        }, {
            code: to_luastring("return 'hello'")
        }, null, null);
        lua.lua_call(L, 0, 1);
    }

    expect(lua.lua_tojsstring(L, -1))
        .toBe("hello");
});

test('lua_load and lua_call it', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    {
        let luaCode = `
            local a = "JS > Lua > JS \\\\o/"
            return a
        `;
        let bc = toByteCode(luaCode);
        lua.lua_load(L, function(L, s) {
            let r = s.bc;
            s.bc = null;
            return r;
        }, {bc: bc}, to_luastring("test-lua_load"), to_luastring("binary"));
        lua.lua_call(L, 0, 1);
    }

    expect(lua.lua_tojsstring(L, -1))
        .toBe("JS > Lua > JS \\o/");
});


test('lua script reads js upvalues', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    {
        let luaCode = `
            return js .. " world"
        `;
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_pushliteral(L, "hello");
        lua.lua_setglobal(L, to_luastring("js"));
        lua.lua_call(L, 0, 1);
    }

    expect(lua.lua_tojsstring(L, -1))
        .toBe("hello world");
});


test('lua_createtable', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    {
        lua.lua_createtable(L, 3, 3);
    }

    expect(lua.lua_istable(L, -1)).toBe(true);
});


test('lua_newtable', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    {
        lua.lua_newtable(L);
    }

    expect(lua.lua_istable(L, -1)).toBe(true);
});


test('lua_settable, lua_gettable', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    {
        lua.lua_newtable(L);

        lua.lua_pushliteral(L, "key");
        lua.lua_pushliteral(L, "value");

        lua.lua_settable(L, -3);

        lua.lua_pushliteral(L, "key");
        lua.lua_gettable(L, -2);
    }

    expect(lua.lua_tojsstring(L, -1))
        .toBe("value");
});

describe('lua_atnativeerror', () => {
    test('no native error handler', () => {
        let L = lauxlib.luaL_newstate();
        if (!L) throw Error("failed to create lua state");

        let errob = {};

        lua.lua_pushcfunction(L, function(L) {
            throw errob;
        });
        // without a native error handler pcall should be -1
        expect(lua.lua_pcall(L, 0, 0, 0)).toBe(-1);
    });

    test('native error handler returns string', () => {
        let L = lauxlib.luaL_newstate();
        if (!L) throw Error("failed to create lua state");

        let errob = {};

        lua.lua_atnativeerror(L, function(L) {
            let e = lua.lua_touserdata(L, 1);
            expect(e).toBe(errob);
            lua.lua_pushstring(L, to_luastring("runtime error!"));
            return 1;
        });
        lua.lua_pushcfunction(L, function(L) {
            throw errob;
        });
        expect(lua.lua_pcall(L, 0, 0, 0)).toBe(lua.LUA_ERRRUN);
        expect(lua.lua_tojsstring(L, -1)).toBe("runtime error!");
    });

    test('native error handler rethrows lua error', () => {
        let L = lauxlib.luaL_newstate();
        if (!L) throw Error("failed to create lua state");

        let errob = {};

        lua.lua_atnativeerror(L, function(L) {
            let e = lua.lua_touserdata(L, 1);
            expect(e).toBe(errob);
            lauxlib.luaL_error(L, to_luastring("runtime error!"));
        });
        lua.lua_pushcfunction(L, function(L) {
            throw errob;
        });
        expect(lua.lua_pcall(L, 0, 0, 0)).toBe(lua.LUA_ERRRUN);
        expect(lua.lua_tojsstring(L, -1)).toBe("runtime error!");
    });
});
