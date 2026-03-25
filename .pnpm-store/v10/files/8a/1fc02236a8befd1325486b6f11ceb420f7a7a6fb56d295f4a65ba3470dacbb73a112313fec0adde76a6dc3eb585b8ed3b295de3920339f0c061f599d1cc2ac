"use strict";

const lua = require('../src/lua.js');
const lauxlib = require('../src/lauxlib.js');
const lualib = require('../src/lualib.js');
const {to_luastring} = require("../src/fengaricore.js");

test('string.len', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local a = "world"
        return string.len("hello"), a:len()
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tointeger(L, -2)).toBe(5);
    expect(lua.lua_tointeger(L, -1)).toBe(5);
});


test('string.char', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return string.char(104, 101, 108, 108, 111)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -1)).toBe("hello");
});


test('string.upper, string.lower', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return string.upper("hello"), string.lower("HELLO")
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -2)).toBe("HELLO");
    expect(lua.lua_tojsstring(L, -1)).toBe("hello");
});


test('string.rep', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return string.rep("hello", 3, ", ")
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -1)).toBe("hello, hello, hello");
});


test('string.reverse', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return string.reverse("olleh")
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -1)).toBe("hello");
});


test('string.byte', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return string.byte("hello", 2, 4)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tointeger(L, -3)).toBe(101);
    expect(lua.lua_tointeger(L, -2)).toBe(108);
    expect(lua.lua_tointeger(L, -1)).toBe(108);
});


test('string.format', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return string.format("%%%d %010d", 10, 23)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -1)).toBe("%10 0000000023");
});


test('string.format', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return string.format("%07X", 0xFFFFFFF)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -1)).toBe("FFFFFFF");
});


test('string.format', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return string.format("%q", 'a string with "quotes" and \\n new line')
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -1)).toBe('"a string with \\"quotes\\" and \\\n new line"',
        "Correct element(s) on the stack"
    );
});


test('string.sub', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return string.sub("123456789",2,4),  -- "234"
            string.sub("123456789",7),       -- "789"
            string.sub("123456789",7,6),     --  ""
            string.sub("123456789",7,7),     -- "7"
            string.sub("123456789",0,0),     --  ""
            string.sub("123456789",-10,10),  -- "123456789"
            string.sub("123456789",1,9),     -- "123456789"
            string.sub("123456789",-10,-20), --  ""
            string.sub("123456789",-1),      -- "9"
            string.sub("123456789",-4),      -- "6789"
            string.sub("123456789",-6, -4)   -- "456"
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -11)).toBe("234");
    expect(lua.lua_tojsstring(L, -10)).toBe("789");
    expect(lua.lua_tojsstring(L, -9)).toBe("");
    expect(lua.lua_tojsstring(L, -8)).toBe("7");
    expect(lua.lua_tojsstring(L, -7)).toBe("");
    expect(lua.lua_tojsstring(L, -6)).toBe("123456789");
    expect(lua.lua_tojsstring(L, -5)).toBe("123456789");
    expect(lua.lua_tojsstring(L, -4)).toBe("");
    expect(lua.lua_tojsstring(L, -3)).toBe("9");
    expect(lua.lua_tojsstring(L, -2)).toBe("6789");
    expect(lua.lua_tojsstring(L, -1)).toBe("456");
});


test('string.dump', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local todump = function()
            local s = "hello"
            local i = 12
            local f = 12.5
            local b = true

            return s .. i .. f
        end

        return string.dump(todump)
    `;
    {
        lualib.luaL_openlibs(L);
        lauxlib.luaL_loadstring(L, to_luastring(luaCode.trim()));
        lua.lua_call(L, 0, -1);
        let str = lua.lua_tostring(L, -1);
        lua.lua_load(L, function(L, s) {
            let r = s.str;
            s.str = null;
            return r;
        }, {str: str}, to_luastring("test"), to_luastring("binary"));
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -1)).toBe("hello1212.5");
});


test('string.pack/unpack/packsize', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local s1, n, s2 = "hello", 2, "you"
        local packed = string.pack("c5jc3", s1, n, s2)
        local us1, un, us2 = string.unpack("c5jc3", packed)
        return string.packsize("c5jc3"), s1 == us1 and n == un and s2 == us2
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tointeger(L, -2)).toBe(12);
    expect(lua.lua_toboolean(L, -1)).toBe(true);
});


test('string.find without pattern', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return string.find("hello to you", " to ")
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tointeger(L, -2)).toBe(6);
    expect(lua.lua_tointeger(L, -1)).toBe(9);
});


test('string.match', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return string.match("foo: 123 bar: 456", "(%a+):%s*(%d+)")
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -2)).toBe("foo");
    expect(lua.lua_tojsstring(L, -1)).toBe("123");
});


test('string.find', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return string.find("foo: 123 bar: 456", "(%a+):%s*(%d+)")
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tointeger(L, -4)).toBe(1);
    expect(lua.lua_tointeger(L, -3)).toBe(8);
    expect(lua.lua_tojsstring(L, -2)).toBe("foo");
    expect(lua.lua_tojsstring(L, -1)).toBe("123");
});


test('string.gmatch', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local s = "hello world from Lua"
        local t = {}

        for w in string.gmatch(s, "%a+") do
            table.insert(t, w)
        end

        return table.unpack(t)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -4)).toBe("hello");
    expect(lua.lua_tojsstring(L, -3)).toBe("world");
    expect(lua.lua_tojsstring(L, -2)).toBe("from");
    expect(lua.lua_tojsstring(L, -1)).toBe("Lua");
});


test('string.gsub', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return string.gsub("hello world", "(%w+)", "%1 %1")
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -2)).toBe("hello hello world world");
    expect(lua.lua_tointeger(L, -1)).toBe(2);
});


test('string.gsub (number)', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return string.gsub("hello world", "%w+", "%0 %0", 1)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -2)).toBe("hello hello world");
    expect(lua.lua_tointeger(L, -1)).toBe(1);
});


test('string.gsub (pattern)', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return string.gsub("hello world from Lua", "(%w+)%s*(%w+)", "%2 %1")
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -2)).toBe("world hello Lua from");
    expect(lua.lua_tointeger(L, -1)).toBe(2);
});


test('string.gsub (function)', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        return string.gsub("4+5 = $return 4+5$", "%$(.-)%$", function (s)
            return load(s)()
        end)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -2)).toBe("4+5 = 9");
    expect(lua.lua_tointeger(L, -1)).toBe(1);
});



test('string.gsub (table)', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local t = {name="lua", version="5.3"}
        return string.gsub("$name-$version.tar.gz", "%$(%w+)", t)
    `;
    {
        lualib.luaL_openlibs(L);
        expect(lauxlib.luaL_loadstring(L, to_luastring(luaCode))).toBe(lua.LUA_OK);
        lua.lua_call(L, 0, -1);
    }

    expect(lua.lua_tojsstring(L, -2)).toBe("lua-5.3.tar.gz");
    expect(lua.lua_tointeger(L, -1)).toBe(2);
});
