"use strict";

const lua = require('../../src/lua.js');
const lauxlib = require('../../src/lauxlib.js');
const lualib = require('../../src/lualib.js');
const {to_luastring} = require("../../src/fengaricore.js");

test("[test-suite] vararg: testing vararg", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        function f(a, ...)
          local arg = {n = select('#', ...), ...}
          for i=1,arg.n do assert(a[i]==arg[i]) end
          return arg.n
        end

        function c12 (...)
          assert(arg == _G.arg)    -- no local 'arg'
          local x = {...}; x.n = #x
          local res = (x.n==2 and x[1] == 1 and x[2] == 2)
          if res then res = 55 end
          return res, 2
        end

        function vararg (...) return {n = select('#', ...), ...} end

        local call = function (f, args) return f(table.unpack(args, 1, args.n)) end

        assert(f() == 0)
        assert(f({1,2,3}, 1, 2, 3) == 3)
        assert(f({"alo", nil, 45, f, nil}, "alo", nil, 45, f, nil) == 5)

        assert(c12(1,2)==55)
        a,b = assert(call(c12, {1,2}))
        assert(a == 55 and b == 2)
        a = call(c12, {1,2;n=2})
        assert(a == 55 and b == 2)
        a = call(c12, {1,2;n=1})
        assert(not a)
        assert(c12(1,2,3) == false)
        local a = vararg(call(next, {_G,nil;n=2}))
        local b,c = next(_G)
        assert(a[1] == b and a[2] == c and a.n == 2)
        a = vararg(call(call, {c12, {1,2}}))
        assert(a.n == 2 and a[1] == 55 and a[2] == 2)
        a = call(function()end, {'+'})
        assert(a == nil)

        local t = {1, 10}
        function t:f (...) local arg = {...}; return self[...]+#arg end
        assert(t:f(1,4) == 3 and t:f(2) == 11)

        lim = 20
        local i, a = 1, {}
        while i <= lim do a[i] = i+0.3; i=i+1 end

        function f(a, b, c, d, ...)
          local more = {...}
          assert(a == 1.3 and more[1] == 5.3 and
                 more[lim-4] == lim+0.3 and not more[lim-3])
        end

        function g(a,b,c)
          assert(a == 1.3 and b == 2.3 and c == 3.3)
        end

        call(f, a)
        call(g, a)

        a = {}
        i = 1
        while i <= lim do a[i] = i; i=i+1 end
        assert(call(math.max, a) == lim)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] vararg: new-style varargs", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        function oneless (a, ...) return ... end

        function f (n, a, ...)
          local b
          assert(arg == _G.arg)   -- no local 'arg'
          if n == 0 then
            local b, c, d = ...
            return a, b, c, d, oneless(oneless(oneless(...)))
          else
            n, b, a = n-1, ..., a
            assert(b == ...)
            return f(n, a, ...)
          end
        end

        a,b,c,d,e = assert(f(10,5,4,3,2,1))
        assert(a==5 and b==4 and c==3 and d==2 and e==1)

        a,b,c,d,e = f(4)
        assert(a==nil and b==nil and c==nil and d==nil and e==nil)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] vararg: varargs for main chunks", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        f = load[[ return {...} ]]
        x = f(2,3)
        assert(x[1] == 2 and x[2] == 3 and x[3] == nil)


        f = load[[
          local x = {...}
          for i=1,select('#', ...) do assert(x[i] == select(i, ...)) end
          assert(x[select('#', ...)+1] == nil)
          return true
        ]]

        assert(f("a", "b", nil, {}, assert))
        assert(f())

        a = {select(3, table.unpack{10,20,30,40})}
        assert(#a == 2 and a[1] == 30 and a[2] == 40)
        a = {select(1)}
        assert(next(a) == nil)
        a = {select(-1, 3, 5, 7)}
        assert(a[1] == 7 and a[2] == nil)
        a = {select(-2, 3, 5, 7)}
        assert(a[1] == 5 and a[2] == 7 and a[3] == nil)
        pcall(select, 10000)
        pcall(select, -10000)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] vararg: bug in 5.2.2", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        function f(p1, p2, p3, p4, p5, p6, p7, p8, p9, p10,
        p11, p12, p13, p14, p15, p16, p17, p18, p19, p20,
        p21, p22, p23, p24, p25, p26, p27, p28, p29, p30,
        p31, p32, p33, p34, p35, p36, p37, p38, p39, p40,
        p41, p42, p43, p44, p45, p46, p48, p49, p50, ...)
          local a1,a2,a3,a4,a5,a6,a7
          local a8,a9,a10,a11,a12,a13,a14
        end

        -- assertion fail here
        f()
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});
