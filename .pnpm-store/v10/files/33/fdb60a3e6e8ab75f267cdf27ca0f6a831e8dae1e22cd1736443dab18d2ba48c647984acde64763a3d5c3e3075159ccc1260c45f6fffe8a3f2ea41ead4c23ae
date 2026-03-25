"use strict";

const lua = require('../../src/lua.js');
const lauxlib = require('../../src/lauxlib.js');
const lualib = require('../../src/lualib.js');
const {to_luastring} = require("../../src/fengaricore.js");

test("[test-suite] attrib: testing require", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        assert(require"string" == string)
        assert(require"math" == math)
        assert(require"table" == table)
        assert(require"io" == io)
        assert(require"os" == os)
        assert(require"coroutine" == coroutine)

        assert(type(package.path) == "string")
        assert(type(package.jspath) == "string")
        assert(type(package.loaded) == "table")
        assert(type(package.preload) == "table")

        assert(type(package.config) == "string")
        -- print("package config: "..string.gsub(package.config, "\\n", "|"))

        do
          -- create a path with 'max' templates,
          -- each with 1-10 repetitions of '?'
          local max = _soft and 100 or 2000
          local t = {}
          for i = 1,max do t[i] = string.rep("?", i%10 + 1) end
          t[#t + 1] = ";"    -- empty template
          local path = table.concat(t, ";")
          -- use that path in a search
          local s, err = package.searchpath("xuxu", path)
          -- search fails; check that message has an occurence of
          -- '??????????' with ? replaced by xuxu and at least 'max' lines
          assert(not s and
                 string.find(err, string.rep("xuxu", 10)) and
                 #string.gsub(err, "[^\\n]", "") >= max)
          -- path with one very long template
          local path = string.rep("?", max)
          local s, err = package.searchpath("xuxu", path)
          assert(not s and string.find(err, string.rep('xuxu', max)))
        end

        do
          local oldpath = package.path
          package.path = {}
          local s, err = pcall(require, "no-such-file")
          assert(not s and string.find(err, "package.path"))
          package.path = oldpath
        end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


// TODO: when io.write etc.
test.skip("[test-suite] attrib: system specific tests for 'require'", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");
});


test("[test-suite] attrib: testing assignments, logical operators, and constructors", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local res, res2 = 27

        a, b = 1, 2+3
        assert(a==1 and b==5)
        a={}
        function f() return 10, 11, 12 end
        a.x, b, a[1] = 1, 2, f()
        assert(a.x==1 and b==2 and a[1]==10)
        a[f()], b, a[f()+3] = f(), a, 'x'
        assert(a[10] == 10 and b == a and a[13] == 'x')

        do
          local f = function (n) local x = {}; for i=1,n do x[i]=i end;
                                 return table.unpack(x) end;
          local a,b,c
          a,b = 0, f(1)
          assert(a == 0 and b == 1)
          A,b = 0, f(1)
          assert(A == 0 and b == 1)
          a,b,c = 0,5,f(4)
          assert(a==0 and b==5 and c==1)
          a,b,c = 0,5,f(0)
          assert(a==0 and b==5 and c==nil)
        end

        a, b, c, d = 1 and nil, 1 or nil, (1 and (nil or 1)), 6
        assert(not a and b and c and d==6)

        d = 20
        a, b, c, d = f()
        assert(a==10 and b==11 and c==12 and d==nil)
        a,b = f(), 1, 2, 3, f()
        assert(a==10 and b==1)

        assert(a<b == false and a>b == true)
        assert((10 and 2) == 2)
        assert((10 or 2) == 10)
        assert((10 or assert(nil)) == 10)
        assert(not (nil and assert(nil)))
        assert((nil or "alo") == "alo")
        assert((nil and 10) == nil)
        assert((false and 10) == false)
        assert((true or 10) == true)
        assert((false or 10) == 10)
        assert(false ~= nil)
        assert(nil ~= false)
        assert(not nil == true)
        assert(not not nil == false)
        assert(not not 1 == true)
        assert(not not a == true)
        assert(not not (6 or nil) == true)
        assert(not not (nil and 56) == false)
        assert(not not (nil and true) == false)
        assert(not 10 == false)
        assert(not {} == false)
        assert(not 0.5 == false)
        assert(not "x" == false)

        assert({} ~= {})

        a = {}
        a[true] = 20
        a[false] = 10
        assert(a[1<2] == 20 and a[1>2] == 10)

        function f(a) return a end

        local a = {}
        for i=3000,-3000,-1 do a[i + 0.0] = i; end
        a[10e30] = "alo"; a[true] = 10; a[false] = 20
        assert(a[10e30] == 'alo' and a[not 1] == 20 and a[10<20] == 10)
        for i=3000,-3000,-1 do assert(a[i] == i); end
        a[print] = assert
        a[f] = print
        a[a] = a
        assert(a[a][a][a][a][print] == assert)
        a[print](a[a[f]] == a[print])
        assert(not pcall(function () local a = {}; a[nil] = 10 end))
        assert(not pcall(function () local a = {[nil] = 10} end))
        assert(a[nil] == nil)
        a = nil

        a = {10,9,8,7,6,5,4,3,2; [-3]='a', [f]=print, a='a', b='ab'}
        a, a.x, a.y = a, a[-3]
        assert(a[1]==10 and a[-3]==a.a and a[f]==print and a.x=='a' and not a.y)
        a[1], f(a)[2], b, c = {['alo']=assert}, 10, a[1], a[f], 6, 10, 23, f(a), 2
        a[1].alo(a[2]==10 and b==10 and c==print)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] attrib: test of large float/integer indices ", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        a = {}
        a[true] = 20
        a[false] = 10
        assert(a[1<2] == 20 and a[1>2] == 10)

        function f(a) return a end

        local a = {}
        for i=3000,-3000,-1 do a[i + 0.0] = i; end
        a[10e30] = "alo"; a[true] = 10; a[false] = 20
        assert(a[10e30] == 'alo' and a[not 1] == 20 and a[10<20] == 10)
        for i=3000,-3000,-1 do assert(a[i] == i); end
        a[print] = assert
        a[f] = print
        a[a] = a
        assert(a[a][a][a][a][print] == assert)
        a[print](a[a[f]] == a[print])
        assert(not pcall(function () local a = {}; a[nil] = 10 end))
        assert(not pcall(function () local a = {[nil] = 10} end))
        assert(a[nil] == nil)
        a = nil

        a = {10,9,8,7,6,5,4,3,2; [-3]='a', [f]=print, a='a', b='ab'}
        a, a.x, a.y = a, a[-3]
        assert(a[1]==10 and a[-3]==a.a and a[f]==print and a.x=='a' and not a.y)
        a[1], f(a)[2], b, c = {['alo']=assert}, 10, a[1], a[f], 6, 10, 23, f(a), 2
        a[1].alo(a[2]==10 and b==10 and c==print)

        -- compute maximum integer where all bits fit in a float
        local maxint = math.maxinteger

        while maxint - 1.0 == maxint - 0.0 do   -- trim (if needed) to fit in a float
          maxint = maxint // 2
        end

        maxintF = maxint + 0.0   -- float version

        assert(math.type(maxintF) == "float" and maxintF >= 2.0^14)

        -- floats and integers must index the same places
        a[maxintF] = 10; a[maxintF - 1.0] = 11;
        a[-maxintF] = 12; a[-maxintF + 1.0] = 13;

        assert(a[maxint] == 10 and a[maxint - 1] == 11 and
               a[-maxint] == 12 and a[-maxint + 1] == 13)

        a[maxint] = 20
        a[-maxint] = 22

        assert(a[maxintF] == 20 and a[maxintF - 1.0] == 11 and
               a[-maxintF] == 22 and a[-maxintF + 1.0] == 13)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] attrib: test conflicts in multiple assignment", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do
          local a,i,j,b
          a = {'a', 'b'}; i=1; j=2; b=a
          i, a[i], a, j, a[j], a[i+j] = j, i, i, b, j, i
          assert(i == 2 and b[1] == 1 and a == 1 and j == b and b[2] == 2 and
                 b[3] == 1)
        end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] attrib: repeat test with upvalues", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do
          local a,i,j,b
          a = {'a', 'b'}; i=1; j=2; b=a
          local function foo ()
            i, a[i], a, j, a[j], a[i+j] = j, i, i, b, j, i
          end
          foo()
          assert(i == 2 and b[1] == 1 and a == 1 and j == b and b[2] == 2 and
                 b[3] == 1)
          local t = {}
          (function (a) t[a], a = 10, 20  end)(1);
          assert(t[1] == 10)
        end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] attrib: bug in 5.2 beta", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local function foo ()
          local a
          return function ()
            local b
            a, b = 3, 14    -- local and upvalue have same index
            return a, b
          end
        end

        local a, b = foo()()
        assert(a == 3 and b == 14)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});
