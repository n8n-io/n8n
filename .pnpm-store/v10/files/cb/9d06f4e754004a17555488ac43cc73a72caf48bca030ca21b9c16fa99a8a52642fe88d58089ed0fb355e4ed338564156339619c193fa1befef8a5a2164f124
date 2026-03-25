"use strict";

const lua = require('../src/lua.js');
const lauxlib = require('../src/lauxlib.js');
const lualib = require('../src/lualib.js');
const {to_luastring} = require("../src/fengaricore.js");


test('print', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        print("hello", "world", 123)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }
});


test('setmetatable, getmetatable', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local mt = {
            __index = function ()
                return "hello"
            end
        }

        local t = {}

        setmetatable(t, mt);

        return t[1], getmetatable(t)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -2))
        .toBe("hello");

    expect(lua.lua_istable(L, -1)).toBe(true);
});


test('rawequal', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local mt = {
            __eq = function ()
                return true
            end
        }

        local t1 = {}
        local t2 = {}

        setmetatable(t1, mt);

        return rawequal(t1, t2), t1 == t2
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_toboolean(L, -2)).toBe(false);

    expect(lua.lua_toboolean(L, -1)).toBe(true);
});


test('rawset, rawget', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local mt = {
            __newindex = function (table, key, value)
                rawset(table, key, "hello")
            end
        }

        local t = {}

        setmetatable(t, mt);

        t["yo"] = "bye"
        rawset(t, "yoyo", "bye")

        return rawget(t, "yo"), t["yo"], rawget(t, "yoyo"), t["yoyo"]
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -4))
        .toBe("hello");

    expect(lua.lua_tojsstring(L, -3))
        .toBe("hello");

    expect(lua.lua_tojsstring(L, -2))
        .toBe("bye");

    expect(lua.lua_tojsstring(L, -1))
        .toBe("bye");
});


test('type', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return type(1), type(true), type("hello"), type({}), type(nil)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -5))
        .toBe("number");

    expect(lua.lua_tojsstring(L, -4))
        .toBe("boolean");

    expect(lua.lua_tojsstring(L, -3))
        .toBe("string");

    expect(lua.lua_tojsstring(L, -2))
        .toBe("table");

    expect(lua.lua_tojsstring(L, -1))
        .toBe("nil");
});


test('error', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        error("you fucked up")
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        expect(() => {
            lua.lua_call(L, 0, -1);
        }).toThrow(/you fucked up/);
    }
});


test('error, protected', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        error("you fucked up")
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_pcall(L, 0, -1, 0);
    }

    expect(lua.lua_tojsstring(L, -1)).toMatch(/you fucked up/);
});


test('pcall', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local willFail = function ()
            error("you fucked up")
        end

        return pcall(willFail)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -1)).toMatch(/you fucked up/);
});


test('xpcall', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local willFail = function ()
            error("you fucked up")
        end

        local msgh = function (err)
            return "Something's wrong: " .. err
        end

        return xpcall(willFail, msgh)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -1)).toMatch(/Something's wrong: .*you fucked up/);
});


test('ipairs', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local t = {1, 2, 3, 4, 5, ['yo'] = 'lo'}

        local sum = 0
        for i, v in ipairs(t) do
            sum = sum + v
        end

        return sum
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tointeger(L, -1)).toBe(15);
});


test('select', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return {select('#', 1, 2, 3)}, {select(2, 1, 2, 3)}, {select(-2, 1, 2, 3)}
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect([...lua.lua_topointer(L, -3).strong.entries()].map(e => e[1].value.value))
        .toEqual([3]);

    expect([...lua.lua_topointer(L, -2).strong.entries()].map(e => e[1].value.value).sort())
        .toEqual([2, 3]);

    expect([...lua.lua_topointer(L, -1).strong.entries()].map(e => e[1].value.value).sort())
        .toEqual([2, 3]);
});


test('tonumber', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return tonumber('foo'),
            tonumber('123'),
            tonumber('12.3'),
            tonumber('az', 36),
            tonumber('10', 2)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_isnil(L, -5)).toBe(true);
    expect(lua.lua_tonumber(L, -4)).toBe(123);
    expect(lua.lua_tonumber(L, -3)).toBe(12.3);
    expect(lua.lua_tonumber(L, -2)).toBe(395);
    expect(lua.lua_tonumber(L, -1)).toBe(2);
});


test('assert', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        assert(1 < 0, "this doesn't makes sense")
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_pcall(L, 0, -1, 0);
    }

    expect(lua.lua_tojsstring(L, -1)).toMatch(/this doesn't makes sense/);
});


test('rawlen', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return rawlen({1, 2, 3}), rawlen('hello')
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tonumber(L, -2)).toBe(3);
    expect(lua.lua_tonumber(L, -1)).toBe(5);
});


test('next', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local total = 0
        local t = {
            1,
            two = 2,
            3,
            four = 4
        }

        for k,v in next, t, nil do
            total = total + v
        end

        return total
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tonumber(L, -1)).toBe(10);
});


test('pairs', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local total = 0
        local t = {
            1,
            two = 2,
            3,
            four = 4
        }

        for k,v in pairs(t) do
            total = total + v
        end

        return total
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tonumber(L, -1)).toBe(10);
});


test('pairs with __pairs', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local total = 0

        local mt = {
            __pairs = function(t)
                return next, {5, 6, 7, 8}, nil
            end
        }

        local t = {
            1,
            two = 2,
            3,
            four = 4
        }

        setmetatable(t, mt)

        for k,v in pairs(t) do
            total = total + v
        end

        return total
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tonumber(L, -1)).toBe(26);
});
