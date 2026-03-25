"use strict";

const lua = require('../src/lua.js');
const lauxlib = require('../src/lauxlib.js');
const lualib = require('../src/lualib.js');
const {to_luastring} = require("../src/fengaricore.js");

test('debug.sethook', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local result = ""

        debug.sethook(function (event)
            result = result .. event .. " "
        end, "crl", 1)

        local l = function() end

        l()
        l()
        l()

        return result
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -1))
        .toBe("return count line count line count line call count line return count line count line call count line return count line count line call count line return count line ");
});


test('debug.gethook', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local result = ""

        debug.sethook(function (event)
            result = result .. event .. " "
        end, "crl", 1)

        local l = function() end

        l()
        l()
        l()

        return debug.gethook()
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_typename(L, lua.lua_type(L, -3)))
        .toEqual(to_luastring("function"));
    expect(lua.lua_tojsstring(L, -2)).toBe("crl");
    expect(lua.lua_tointeger(L, -1)).toBe(1);
});


test('debug.getlocal', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local alocal = "alocal"
        local another = "another"

        local result = ""

        local l = function()
            local infunction = "infunction"
            local anotherin = "anotherin"
            result = table.concat(table.pack(debug.getlocal(2, 1)), " ")
                .. table.concat(table.pack(debug.getlocal(2, 2)), " ")
                .. table.concat(table.pack(debug.getlocal(1, 1)), " ")
                .. table.concat(table.pack(debug.getlocal(1, 2)), " ")
        end

        l()

        return result
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -1))
        .toBe("alocal alocalanother anotherinfunction infunctionanotherin anotherin");
});

test('debug.setlocal', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local alocal = "alocal"
        local another = "another"

        local l = function()
            local infunction = "infunction"
            local anotherin = "anotherin"

            debug.setlocal(2, 1, 1)
            debug.setlocal(2, 2, 2)
            debug.setlocal(1, 1, 3)
            debug.setlocal(1, 2, 4)

            return infunction, anotherin
        end

        local a, b = l()

        return alocal, another, a, b
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tointeger(L, -4)).toBe(1);
    expect(lua.lua_tointeger(L, -3)).toBe(2);
    expect(lua.lua_tointeger(L, -2)).toBe(3);
    expect(lua.lua_tointeger(L, -1)).toBe(4);
});

test('debug.upvalueid', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local upvalue = "upvalue"

        local l = function()
            return upvalue
        end

        return debug.upvalueid(l, 1)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_touserdata(L, -1)).toBeTruthy();
});


test('debug.upvaluejoin', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local upvalue1 = "upvalue1"
        local upvalue2 = "upvalue2"

        local l1 = function()
            return upvalue1
        end

        local l2 = function()
            return upvalue2
        end

        debug.upvaluejoin(l1, 1, l2, 1)

        return l1()
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -1))
        .toBe("upvalue2");
});


test('debug.traceback (with a global)', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local trace

        rec = function(n)
            n = n or 0
            if n < 10 then
                rec(n + 1)
            else
                trace = debug.traceback()
            end
        end

        rec()

        return trace
    `;
    {
        lualib.luaL_openlibs(L);
        luaCode = to_luastring(luaCode);
        lauxlib.luaL_loadbuffer(L, luaCode, luaCode.length, to_luastring("traceback-test"));
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -1))
        .toBe(`stack traceback:
\t[string "traceback-test"]:9: in function 'rec'
\t[string "traceback-test"]:7: in function 'rec'
\t[string "traceback-test"]:7: in function 'rec'
\t[string "traceback-test"]:7: in function 'rec'
\t[string "traceback-test"]:7: in function 'rec'
\t[string "traceback-test"]:7: in function 'rec'
\t[string "traceback-test"]:7: in function 'rec'
\t[string "traceback-test"]:7: in function 'rec'
\t[string "traceback-test"]:7: in function 'rec'
\t[string "traceback-test"]:7: in function 'rec'
\t[string "traceback-test"]:7: in function 'rec'
\t[string "traceback-test"]:13: in main chunk`);
});


test('debug.traceback (with a upvalue)', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local trace
        local rec

        rec = function(n)
            n = n or 0
            if n < 10 then
                rec(n + 1)
            else
                trace = debug.traceback()
            end
        end

        rec()

        return trace
    `;
    {
        lualib.luaL_openlibs(L);
        luaCode = to_luastring(luaCode);
        lauxlib.luaL_loadbuffer(L, luaCode, luaCode.length, to_luastring("traceback-test"));
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -1))
        .toBe(`stack traceback:
\t[string "traceback-test"]:10: in upvalue 'rec'
\t[string "traceback-test"]:8: in upvalue 'rec'
\t[string "traceback-test"]:8: in upvalue 'rec'
\t[string "traceback-test"]:8: in upvalue 'rec'
\t[string "traceback-test"]:8: in upvalue 'rec'
\t[string "traceback-test"]:8: in upvalue 'rec'
\t[string "traceback-test"]:8: in upvalue 'rec'
\t[string "traceback-test"]:8: in upvalue 'rec'
\t[string "traceback-test"]:8: in upvalue 'rec'
\t[string "traceback-test"]:8: in upvalue 'rec'
\t[string "traceback-test"]:8: in local 'rec'
\t[string "traceback-test"]:14: in main chunk`);
});

test('debug.getinfo', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local alocal = function(p1, p2) end
        global = function() return alocal end

        local d1 = debug.getinfo(alocal)
        local d2 = debug.getinfo(global)

        return d1.short_src, d1.nups, d1.what, d1.nparams,
               d2.short_src, d2.nups, d2.what, d2.nparams
    `;
    {
        lualib.luaL_openlibs(L);
        luaCode = to_luastring(luaCode);
        lauxlib.luaL_loadbuffer(L, luaCode, luaCode.length, to_luastring("getinfo-test"));
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -8)).toBe(`[string "getinfo-test"]`);
    expect(lua.lua_tointeger(L, -7)).toBe(0);
    expect(lua.lua_tojsstring(L, -6)).toBe(`Lua`);
    expect(lua.lua_tointeger(L, -5)).toBe(2);
    expect(lua.lua_tojsstring(L, -4)).toBe(`[string "getinfo-test"]`);
    expect(lua.lua_tointeger(L, -3)).toBe(1);
    expect(lua.lua_tojsstring(L, -2)).toBe(`Lua`);
    expect(lua.lua_tointeger(L, -1)).toBe(0);
});
