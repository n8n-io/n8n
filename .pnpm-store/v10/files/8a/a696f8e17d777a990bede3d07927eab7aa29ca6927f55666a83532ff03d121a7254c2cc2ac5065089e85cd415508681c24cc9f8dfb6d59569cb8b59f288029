"use strict";

const lua = require('../../src/lua.js');
const lauxlib = require('../../src/lauxlib.js');
const lualib = require('../../src/lualib.js');
const {to_luastring} = require("../../src/fengaricore.js");

test("[test-suite] calls: test 'type'", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        assert(type(1<2) == 'boolean')
        assert(type(true) == 'boolean' and type(false) == 'boolean')
        assert(type(nil) == 'nil'
           and type(-3) == 'number'
           and type'x' == 'string'
           and type{} == 'table'
           and type(type) == 'function')

        assert(type(assert) == type(print))
        function f (x) return a:x (x) end
        assert(type(f) == 'function')
        assert(not pcall(type))
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] calls: test error in 'print'", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do    -- test error in 'print' too...
          local tostring = _ENV.tostring

          _ENV.tostring = nil
          local st, msg = pcall(print, 1)
          assert(st == false and string.find(msg, "attempt to call a nil value"))

          _ENV.tostring = function () return {} end
          local st, msg = pcall(print, 1)
          assert(st == false and string.find(msg, "must return a string"))

          _ENV.tostring = tostring
        end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] calls: testing local-function recursion", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        fact = false
        do
          local res = 1
          local function fact (n)
            if n==0 then return res
            else return n*fact(n-1)
            end
          end
          assert(fact(5) == 120)
        end
        assert(fact == false)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] calls: testing declarations", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        a = {i = 10}
        self = 20
        function a:x (x) return x+self.i end
        function a.y (x) return x+self end

        assert(a:x(1)+10 == a.y(1))

        a.t = {i=-100}
        a["t"].x = function (self, a,b) return self.i+a+b end

        assert(a.t:x(2,3) == -95)

        do
          local a = {x=0}
          function a:add (x) self.x, a.y = self.x+x, 20; return self end
          assert(a:add(10):add(20):add(30).x == 60 and a.y == 20)
        end

        local a = {b={c={}}}

        function a.b.c.f1 (x) return x+1 end
        function a.b.c:f2 (x,y) self[x] = y end
        assert(a.b.c.f1(4) == 5)
        a.b.c:f2('k', 12); assert(a.b.c.k == 12)


        t = nil   -- 'declare' t
        function f(a,b,c) local d = 'a'; t={a,b,c,d} end

        f(      -- this line change must be valid
          1,2)
        assert(t[1] == 1 and t[2] == 2 and t[3] == nil and t[4] == 'a')
        f(1,2,   -- this one too
              3,4)
        assert(t[1] == 1 and t[2] == 2 and t[3] == 3 and t[4] == 'a')

        function fat(x)
          if x <= 1 then return 1
          else return x*load("return fat(" .. x-1 .. ")", "")()
          end
        end

        assert(load "load 'assert(fat(6)==720)' () ")()
        a = load('return fat(5), 3')
        a,b = a()
        assert(a == 120 and b == 3)

        function err_on_n (n)
          if n==0 then error(); exit(1);
          else err_on_n (n-1); exit(1);
          end
        end

        do
          function dummy (n)
            if n > 0 then
              assert(not pcall(err_on_n, n))
              dummy(n-1)
            end
          end
        end

        dummy(10)

        function deep (n)
          if n>0 then deep(n-1) end
        end
        deep(10)
        deep(200)

        -- testing tail call
        function deep (n) if n>0 then return deep(n-1) else return 101 end end
        assert(deep(30000) == 101)
        a = {}
        function a:deep (n) if n>0 then return self:deep(n-1) else return 101 end end
        assert(a:deep(30000) == 101)



        a = nil
        (function (x) a=x end)(23)
        assert(a == 23 and (function (x) return x*2 end)(20) == 40)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] calls: testing closures", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        -- fixed-point operator
        Z = function (le)
              local function a (f)
                return le(function (x) return f(f)(x) end)
              end
              return a(a)
            end


        -- non-recursive factorial

        F = function (f)
              return function (n)
                       if n == 0 then return 1
                       else return n*f(n-1) end
                     end
            end

        fat = Z(F)

        assert(fat(0) == 1 and fat(4) == 24 and Z(F)(5)==5*Z(F)(4))

        local function g (z)
          local function f (a,b,c,d)
            return function (x,y) return a+b+c+d+a+x+y+z end
          end
          return f(z,z+1,z+2,z+3)
        end

        f = g(10)
        assert(f(9, 16) == 10+11+12+13+10+9+16+10)

        Z, F, f = nil
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] calls: testing multiple returns", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        function unlpack (t, i)
          i = i or 1
          if (i <= #t) then
            return t[i], unlpack(t, i+1)
          end
        end

        function equaltab (t1, t2)
          assert(#t1 == #t2)
          for i = 1, #t1 do
            assert(t1[i] == t2[i])
          end
        end

        local pack = function (...) return (table.pack(...)) end

        function f() return 1,2,30,4 end
        function ret2 (a,b) return a,b end

        local a,b,c,d = unlpack{1,2,3}
        assert(a==1 and b==2 and c==3 and d==nil)
        a = {1,2,3,4,false,10,'alo',false,assert}
        equaltab(pack(unlpack(a)), a)
        equaltab(pack(unlpack(a), -1), {1,-1})
        a,b,c,d = ret2(f()), ret2(f())
        assert(a==1 and b==1 and c==2 and d==nil)
        a,b,c,d = unlpack(pack(ret2(f()), ret2(f())))
        assert(a==1 and b==1 and c==2 and d==nil)
        a,b,c,d = unlpack(pack(ret2(f()), (ret2(f()))))
        assert(a==1 and b==1 and c==nil and d==nil)

        a = ret2{ unlpack{1,2,3}, unlpack{3,2,1}, unlpack{"a", "b"}}
        assert(a[1] == 1 and a[2] == 3 and a[3] == "a" and a[4] == "b")
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] calls: testing calls with 'incorrect' arguments", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        rawget({}, "x", 1)
        rawset({}, "x", 1, 2)
        assert(math.sin(1,2) == math.sin(1))
        table.sort({10,9,8,4,19,23,0,0}, function (a,b) return a<b end, "extra arg")
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] calls: test for generic load", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local x = "-- a comment\\0\\0\\0\\n  x = 10 + \\n23; \\
             local a = function () x = 'hi' end; \\
             return '\\0'"

        function read1 (x)
          local i = 0
          return function ()
            i=i+1
            return string.sub(x, i, i)
          end
        end

        function cannotload (msg, a,b)
          assert(not a and string.find(b, msg))
        end

        a = assert(load(read1(x), "modname", "t", _G))
        assert(a() == "\0" and _G.x == 33)
        assert(debug.getinfo(a).source == "modname")
        -- cannot read text in binary mode
        cannotload("attempt to load a text chunk", load(read1(x), "modname", "b", {}))
        cannotload("attempt to load a text chunk", load(x, "modname", "b"))

        a = assert(load(function () return nil end))
        a()  -- empty chunk

        assert(not load(function () return true end))

        local t = {nil, "return ", "3"}
        f, msg = load(function () return table.remove(t, 1) end)
        assert(f() == nil)   -- should read the empty chunk

        f = load(string.dump(function () return 1 end), nil, "b", {})
        assert(type(f) == "function" and f() == 1)


        x = string.dump(load("x = 1; return x"))
        a = assert(load(read1(x), nil, "b"))
        assert(a() == 1 and _G.x == 1)
        cannotload("attempt to load a binary chunk", load(read1(x), nil, "t"))
        cannotload("attempt to load a binary chunk", load(x, nil, "t"))

        assert(not pcall(string.dump, print))  -- no dump of C functions

        cannotload("unexpected symbol", load(read1("*a = 123")))
        cannotload("unexpected symbol", load("*a = 123"))
        cannotload("hhi", load(function () error("hhi") end))
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] calls: any value is valid for _ENV", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        assert(load("return _ENV", nil, nil, 123)() == 123)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] calls: load when _ENV is not first upvalue", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local x; XX = 123
        local function h ()
          local y=x   -- use 'x', so that it becomes 1st upvalue
          return XX   -- global name
        end
        local d = string.dump(h)
        x = load(d, "", "b")
        assert(debug.getupvalue(x, 2) == '_ENV')
        debug.setupvalue(x, 2, _G)
        assert(x() == 123)

        assert(assert(load("return XX + ...", nil, nil, {XX = 13}))(4) == 17)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] calls: test generic load with nested functions", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        function read1 (x)
          local i = 0
          return function ()
            i=i+1
            return string.sub(x, i, i)
          end
        end

        x = [[
          return function (x)
            return function (y)
             return function (z)
               return x+y+z
             end
           end
          end
        ]]

        a = assert(load(read1(x)))
        assert(a()(2)(3)(10) == 15)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] calls: test for dump/undump with upvalues", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local a, b = 20, 30
        x = load(string.dump(function (x)
          if x == "set" then a = 10+b; b = b+1 else
          return a
          end
        end), "", "b", nil)
        assert(x() == nil)
        assert(debug.setupvalue(x, 1, "hi") == "a")
        assert(x() == "hi")
        assert(debug.setupvalue(x, 2, 13) == "b")
        assert(not debug.setupvalue(x, 3, 10))   -- only 2 upvalues
        x("set")
        assert(x() == 23)
        x("set")
        assert(x() == 24)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] calls: test for dump/undump with many upvalues", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do
          local nup = 200    -- maximum number of local variables
          local prog = {"local a1"}
          for i = 2, nup do prog[#prog + 1] = ", a" .. i end
          prog[#prog + 1] = " = 1"
          for i = 2, nup do prog[#prog + 1] = ", " .. i end
          local sum = 1
          prog[#prog + 1] = "; return function () return a1"
          for i = 2, nup do prog[#prog + 1] = " + a" .. i; sum = sum + i end
          prog[#prog + 1] = " end"
          prog = table.concat(prog)
          local f = assert(load(prog))()
          assert(f() == sum)

          f = load(string.dump(f))   -- main chunk now has many upvalues
          local a = 10
          local h = function () return a end
          for i = 1, nup do
            debug.upvaluejoin(f, i, h, 1)
          end
          assert(f() == 10 * nup)
        end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] calls: test for long method names", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do
          local t = {x = 1}
          function t:_012345678901234567890123456789012345678901234567890123456789 ()
            return self.x
          end
          assert(t:_012345678901234567890123456789012345678901234567890123456789() == 1)
        end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] calls: test for bug in parameter adjustment", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        assert((function () return nil end)(4) == nil)
        assert((function () local a; return a end)(4) == nil)
        assert((function (a) return a end)() == nil)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] calls: testing binary chunks", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do
          local header = string.pack("c4BBc6BBBBBj",
            "\\27Lua",                -- signature
            5*16 + 3,                -- version 5.3
            0,                       -- format
            "\\x19\\x93\\r\\n\\x1a\\n",    -- data
            string.packsize("i"),    -- sizeof(int)
            string.packsize("T"),    -- sizeof(size_t)
            4,                       -- size of instruction
            string.packsize("j"),    -- sizeof(lua integer)
            string.packsize("n"),    -- sizeof(lua number)
            0x5678                   -- LUAC_INT
            -- LUAC_NUM may not have a unique binary representation (padding...)
          )
          local c = string.dump(function () local a = 1; local b = 3; return a+b*3 end)

          assert(string.sub(c, 1, #header) == header)

          -- corrupted header
          for i = 1, #header do
            local s = string.sub(c, 1, i - 1) ..
                      string.char(string.byte(string.sub(c, i, i)) + 1) ..
                      string.sub(c, i + 1, -1)
            assert(#s == #c)
            assert(not load(s))
          end

          -- loading truncated binary chunks
          for i = 1, #c - 1 do
            local st, msg = load(string.sub(c, 1, i))
            assert(not st and string.find(msg, "truncated"))
          end
          assert(assert(load(c))() == 10)
        end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});
