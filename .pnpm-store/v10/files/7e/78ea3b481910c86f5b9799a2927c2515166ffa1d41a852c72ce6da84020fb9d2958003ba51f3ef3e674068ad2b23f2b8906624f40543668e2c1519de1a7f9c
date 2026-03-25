"use strict";

const lua = require('../../src/lua.js');
const lauxlib = require('../../src/lauxlib.js');
const lualib = require('../../src/lualib.js');
const {to_luastring} = require("../../src/fengaricore.js");

const prefix = `
    local function dostring(s) return assert(load(s))() end

    local testline = 5          -- line where 'test' is defined
    function test (s, l, p)     -- this must be line 5
      local a = 1 -- do something that's active instead of collectgarbage()
      local function f (event, line)
        assert(event == 'line')
        local l = table.remove(l, 1)
        if p then print(l, line) end
        assert(l == line, "wrong trace!!")
      end
      debug.sethook(f,"l"); load(s)(); debug.sethook()
      assert(#l == 0)
    end
`;

test("[test-suite] db: getinfo, ...line...", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        assert(not pcall(debug.getinfo, print, "X"))   -- invalid option
        assert(not debug.getinfo(1000))   -- out of range level
        assert(not debug.getinfo(-1))     -- out of range level
        local a = debug.getinfo(print)
        assert(a.what == "J" and a.short_src == "[JS]")
        a = debug.getinfo(print, "L")
        assert(a.activelines == nil)
        local b = debug.getinfo(test, "SfL")
        assert(b.name == nil and b.what == "Lua" and b.linedefined == testline and
               b.lastlinedefined == b.linedefined + 10 and
               b.func == test and string.find(b.short_src, "%["))
        assert(b.activelines[b.linedefined + 1] and
               b.activelines[b.lastlinedefined])
        assert(not b.activelines[b.linedefined] and
               not b.activelines[b.lastlinedefined + 1])
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: test file and string names truncation", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        a = "function f () end"
        local function dostring (s, x) return load(s, x)() end
        dostring(a)
        assert(debug.getinfo(f).short_src == string.format('[string "%s"]', a))
        dostring(a..string.format("; %s\\n=1", string.rep('p', 400)))
        assert(string.find(debug.getinfo(f).short_src, '^%[string [^\\n]*%.%.%."%]$'))
        dostring(a..string.format("; %s=1", string.rep('p', 400)))
        assert(string.find(debug.getinfo(f).short_src, '^%[string [^\\n]*%.%.%."%]$'))
        dostring("\\n"..a)
        assert(debug.getinfo(f).short_src == '[string "..."]')
        dostring(a, "")
        assert(debug.getinfo(f).short_src == '[string ""]')
        dostring(a, "@xuxu")
        assert(debug.getinfo(f).short_src == "xuxu")
        dostring(a, "@"..string.rep('p', 1000)..'t')
        assert(string.find(debug.getinfo(f).short_src, "^%.%.%.p*t$"))
        dostring(a, "=xuxu")
        assert(debug.getinfo(f).short_src == "xuxu")
        dostring(a, string.format("=%s", string.rep('x', 500)))
        assert(string.find(debug.getinfo(f).short_src, "^x*$"))
        dostring(a, "=")
        assert(debug.getinfo(f).short_src == "")
        a = nil; f = nil;
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});

test("[test-suite] db: local", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        repeat
          local g = {x = function ()
            local a = debug.getinfo(2)
            assert(a.name == 'f' and a.namewhat == 'local')
            a = debug.getinfo(1)
            assert(a.name == 'x' and a.namewhat == 'field')
            return 'xixi'
          end}
          local f = function () return 1+1 and (not 1 or g.x()) end
          assert(f() == 'xixi')
          g = debug.getinfo(f)
          assert(g.what == "Lua" and g.func == f and g.namewhat == "" and not g.name)

          function f (x, name)   -- local!
            name = name or 'f'
            local a = debug.getinfo(1)
            assert(a.name == name and a.namewhat == 'local')
            return x
          end

          -- breaks in different conditions
          if 3>4 then break end; f()
          if 3<4 then a=1 else break end; f()
          while 1 do local x=10; break end; f()
          local b = 1
          if 3>4 then return math.sin(1) end; f()
          a = 3<4; f()
          a = 3<4 or 1; f()
          repeat local x=20; if 4>3 then f() else break end; f() until 1
          g = {}
          f(g).x = f(2) and f(10)+f(9)
          assert(g.x == f(19))
          function g(x) if not x then return 3 end return (x('a', 'x')) end
          assert(g(f) == 'a')
        until 1
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: line hook", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        test([[if
        math.sin(1)
        then
          a=1
        else
          a=2
        end
        ]], {2,3,4,7})

        test([[--
        if nil then
          a=1
        else
          a=2
        end
        ]], {2,5,6})

        test([[a=1
        repeat
          a=a+1
        until a==3
        ]], {1,3,4,3,4})

        test([[ do
          return
        end
        ]], {2})

        test([[local a
        a=1
        while a<=3 do
          a=a+1
        end
        ]], {1,2,3,4,3,4,3,4,3,5})

        test([[while math.sin(1) do
          if math.sin(1)
          then break
          end
        end
        a=1]], {1,2,3,6})

        test([[for i=1,3 do
          a=i
        end
        ]], {1,2,1,2,1,2,1,3})

        test([[for i,v in pairs{'a','b'} do
          a=tostring(i) .. v
        end
        ]], {1,2,1,2,1,3})

        test([[for i=1,4 do a=1 end]], {1,1,1,1,1})
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: invalid levels in [gs]etlocal", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        assert(not pcall(debug.getlocal, 20, 1))
        assert(not pcall(debug.setlocal, -1, 1, 10))
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: parameter names", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local function foo (a,b,...) local d, e end
        local co = coroutine.create(foo)

        assert(debug.getlocal(foo, 1) == 'a')
        assert(debug.getlocal(foo, 2) == 'b')
        assert(not debug.getlocal(foo, 3))
        assert(debug.getlocal(co, foo, 1) == 'a')
        assert(debug.getlocal(co, foo, 2) == 'b')
        assert(not debug.getlocal(co, foo, 3))

        assert(not debug.getlocal(print, 1))
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: vararg", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local function foo (a, ...)
          local t = table.pack(...)
          for i = 1, t.n do
            local n, v = debug.getlocal(1, -i)
            assert(n == "(*vararg)" and v == t[i])
          end
          assert(not debug.getlocal(1, -(t.n + 1)))
          assert(not debug.setlocal(1, -(t.n + 1), 30))
          if t.n > 0 then
            (function (x)
              assert(debug.setlocal(2, -1, x) == "(*vararg)")
              assert(debug.setlocal(2, -t.n, x) == "(*vararg)")
             end)(430)
             assert(... == 430)
          end
        end

        foo()
        foo(print)
        foo(200, 3, 4)
        local a = {}
        for i = 1, (_soft and 100 or 1000) do a[i] = i end
        foo(table.unpack(a))
        a = nil
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: access to vararg in non-vararg function", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local function foo () return debug.getlocal(1, -1) end
        assert(not foo(10))
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: test hook presence in debug info", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do   -- test hook presence in debug info
          assert(not debug.gethook())
          local count = 0
          local function f ()
            assert(debug.getinfo(1).namewhat == "hook")
            local sndline = string.match(debug.traceback(), "\\n(.-)\\n")
            assert(string.find(sndline, "hook"))
            count = count + 1
          end
          debug.sethook(f, "l")
          local a = 0
          _ENV.a = a
          a = 1
          debug.sethook()
          assert(count == 4)
        end

        a = {}; L = nil
        local glob = 1
        local oldglob = glob
        debug.sethook(function (e,l)
          -- collectgarbage()   -- force GC during a hook
          local f, m, c = debug.gethook()
          assert(m == 'crl' and c == 0)
          if e == "line" then
            if glob ~= oldglob then
              L = l-1   -- get the first line where "glob" has changed
              oldglob = glob
            end
          elseif e == "call" then
              local f = debug.getinfo(2, "f").func
              a[f] = 1
          else assert(e == "return")
          end
        end, "crl")


        function f(a,b)
          -- collectgarbage()
          local _, x = debug.getlocal(1, 1)
          local _, y = debug.getlocal(1, 2)
          assert(x == a and y == b)
          assert(debug.setlocal(2, 3, "pera") == "AA".."AA")
          assert(debug.setlocal(2, 4, "maçã") == "B")
          x = debug.getinfo(2)
          assert(x.func == g and x.what == "Lua" and x.name == 'g' and x.nups == 1)
          glob = glob+1
          assert(debug.getinfo(1, "l").currentline == L+1)
          assert(debug.getinfo(1, "l").currentline == L+2)
        end

        function foo()
          glob = glob+1
          assert(debug.getinfo(1, "l").currentline == L+1)
        end; foo()  -- set L
        -- check line counting inside strings and empty lines

        _ = 'alo\\
        alo' .. [[

        ]]
        --[[
        ]]
        assert(debug.getinfo(1, "l").currentline == L+11)  -- check count of lines


        function g(...)
          local arg = {...}
          do local a,b,c; a=math.sin(40); end
          local feijao
          local AAAA,B = "xuxu", "mamão"
          f(AAAA,B)
          assert(AAAA == "pera" and B == "maçã")
          do
             local B = 13
             local x,y = debug.getlocal(1,5)
             assert(x == 'B' and y == 13)
          end
        end

        g()

        assert(a[f] and a[g] and a[assert] and a[debug.getlocal] and not a[print])
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: tests for manipulating non-registered locals (C and Lua temporaries)", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local n, v = debug.getlocal(0, 1)
        assert(v == 0 and n == "(*temporary)")
        local n, v = debug.getlocal(0, 2)
        assert(v == 2 and n == "(*temporary)")
        assert(not debug.getlocal(0, 3))
        assert(not debug.getlocal(0, 0))

        function f()
          assert(select(2, debug.getlocal(2,3)) == 1)
          assert(not debug.getlocal(2,4))
          debug.setlocal(2, 3, 10)
          return 20
        end

        function g(a,b) return (a+1) + f() end

        assert(g(0,0) == 30)


        debug.sethook(nil);
        assert(debug.gethook() == nil)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: testing access to function arguments", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local function collectlocals (level)
          local tab = {}
          for i = 1, math.huge do
            local n, v = debug.getlocal(level + 1, i)
            if not (n and string.find(n, "^[a-zA-Z0-9_]+$")) then
               break   -- consider only real variables
            end
            tab[n] = v
          end
          return tab
        end


        X = nil
        a = {}
        function a:f (a, b, ...) local arg = {...}; local c = 13 end
        debug.sethook(function (e)
          assert(e == "call")
          dostring("XX = 12")  -- test dostring inside hooks
          -- testing errors inside hooks
          assert(not pcall(load("a='joao'+1")))
          debug.sethook(function (e, l)
            assert(debug.getinfo(2, "l").currentline == l)
            local f,m,c = debug.gethook()
            assert(e == "line")
            assert(m == 'l' and c == 0)
            debug.sethook(nil)  -- hook is called only once
            assert(not X)       -- check that
            X = collectlocals(2)
          end, "l")
        end, "c")

        a:f(1,2,3,4,5)
        assert(X.self == a and X.a == 1   and X.b == 2 and X.c == nil)
        assert(XX == 12)
        assert(debug.gethook() == nil)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: testing access to local variables in return hook (bug in 5.2)", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local function collectlocals (level)
          local tab = {}
          for i = 1, math.huge do
            local n, v = debug.getlocal(level + 1, i)
            if not (n and string.find(n, "^[a-zA-Z0-9_]+$")) then
               break   -- consider only real variables
            end
            tab[n] = v
          end
          return tab
        end

        do
          local function foo (a, b)
            do local x,y,z end
            local c, d = 10, 20
            return
          end

          local function aux ()
            if debug.getinfo(2).name == "foo" then
              foo = nil   -- to signal that it found 'foo'
              local tab = {a = 100, b = 200, c = 10, d = 20}
              for n, v in pairs(collectlocals(2)) do
                assert(tab[n] == v)
                tab[n] = nil
              end
              assert(next(tab) == nil)    -- 'tab' must be empty
            end
          end

          debug.sethook(aux, "r"); foo(100, 200); debug.sethook()
          assert(foo == nil)
        end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: testing upvalue access", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local function getupvalues (f)
          local t = {}
          local i = 1
          while true do
            local name, value = debug.getupvalue(f, i)
            if not name then break end
            assert(not t[name])
            t[name] = value
            i = i + 1
          end
          return t
        end

        local a,b,c = 1,2,3
        local function foo1 (a) b = a; return c end
        local function foo2 (x) a = x; return c+b end
        assert(not debug.getupvalue(foo1, 3))
        assert(not debug.getupvalue(foo1, 0))
        assert(not debug.setupvalue(foo1, 3, "xuxu"))
        local t = getupvalues(foo1)
        assert(t.a == nil and t.b == 2 and t.c == 3)
        t = getupvalues(foo2)
        assert(t.a == 1 and t.b == 2 and t.c == 3)
        assert(debug.setupvalue(foo1, 1, "xuxu") == "b")
        assert(({debug.getupvalue(foo2, 3)})[2] == "xuxu")
        -- upvalues of C functions are allways "called" "" (the empty string)
        assert(debug.getupvalue(string.gmatch("x", "x"), 1) == "")
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: testing count hooks", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local a=0
        debug.sethook(function (e) a=a+1 end, "", 1)
        a=0; for i=1,1000 do end; assert(1000 < a and a < 1012)
        debug.sethook(function (e) a=a+1 end, "", 4)
        a=0; for i=1,1000 do end; assert(250 < a and a < 255)
        local f,m,c = debug.gethook()
        assert(m == "" and c == 4)
        debug.sethook(function (e) a=a+1 end, "", 4000)
        a=0; for i=1,1000 do end; assert(a == 0)

        do
          debug.sethook(print, "", 2^24 - 1)   -- count upperbound
          local f,m,c = debug.gethook()
          assert(({debug.gethook()})[3] == 2^24 - 1)
        end

        debug.sethook()
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: tests for tail calls", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local function f (x)
          if x then
            assert(debug.getinfo(1, "S").what == "Lua")
            assert(debug.getinfo(1, "t").istailcall == true)
            local tail = debug.getinfo(2)
            assert(tail.func == g1 and tail.istailcall == true)
            assert(debug.getinfo(3, "S").what == "main")
          end
        end

        function g(x) return f(x) end

        function g1(x) g(x) end

        local function h (x) local f=g1; return f(x) end

        h(true)

        local b = {}
        debug.sethook(function (e) table.insert(b, e) end, "cr")
        h(false)
        debug.sethook()
        local res = {"return",   -- first return (from sethook)
          "call", "tail call", "call", "tail call",
          "return", "return",
          "call",    -- last call (to sethook)
        }
        for i = 1, #res do assert(res[i] == table.remove(b, 1)) end

        b = 0
        debug.sethook(function (e)
                        if e == "tail call" then
                          b = b + 1
                          assert(debug.getinfo(2, "t").istailcall == true)
                        else
                          assert(debug.getinfo(2, "t").istailcall == false)
                        end
                      end, "c")
        h(false)
        debug.sethook()
        assert(b == 2)   -- two tail calls

        lim = _soft and 3000 or 30000
        local function foo (x)
          if x==0 then
            assert(debug.getinfo(2).what == "main")
            local info = debug.getinfo(1)
            assert(info.istailcall == true and info.func == foo)
          else return foo(x-1)
          end
        end

        foo(lim)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: testing local function information", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        co = load[[
          local A = function ()
            return x
          end
          return
        ]]

        local a = 0
        -- 'A' should be visible to debugger only after its complete definition
        debug.sethook(function (e, l)
          if l == 3 then a = a + 1; assert(debug.getlocal(2, 1) == "(*temporary)")
          elseif l == 4 then a = a + 1; assert(debug.getlocal(2, 1) == "A")
          end
        end, "l")
        co()  -- run local function definition
        debug.sethook()  -- turn off hook
        assert(a == 2)   -- ensure all two lines where hooked
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: testing traceback", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        assert(debug.traceback(print) == print)
        assert(debug.traceback(print, 4) == print)
        assert(string.find(debug.traceback("hi", 4), "^hi\\n"))
        assert(string.find(debug.traceback("hi"), "^hi\\n"))
        assert(not string.find(debug.traceback("hi"), "'debug.traceback'"))
        assert(string.find(debug.traceback("hi", 0), "'debug.traceback'"))
        assert(string.find(debug.traceback(), "^stack traceback:\\n"))

        do  -- C-function names in traceback
          local st, msg = (function () return pcall end)()(debug.traceback)
          assert(st == true and string.find(msg, "pcall"))
        end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: testing nparams, nups e isvararg", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local t = debug.getinfo(print, "u")
        assert(t.isvararg == true and t.nparams == 0 and t.nups == 0)

        t = debug.getinfo(function (a,b,c) end, "u")
        assert(t.isvararg == false and t.nparams == 3 and t.nups == 0)

        t = debug.getinfo(function (a,b,...) return t[a] end, "u")
        assert(t.isvararg == true and t.nparams == 2 and t.nups == 1)

        t = debug.getinfo(1)   -- main
        assert(t.isvararg == true and t.nparams == 0 and t.nups == 1 and
               debug.getupvalue(t.func, 1) == "_ENV")
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: testing debugging of coroutines", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local function checktraceback (co, p, level)
          local tb = debug.traceback(co, nil, level)
          local i = 0
          for l in string.gmatch(tb, "[^\\n]+\\n?") do
            assert(i == 0 or string.find(l, p[i]))
            i = i+1
          end
          assert(p[i] == nil)
        end


        local function f (n)
          if n > 0 then f(n-1)
          else coroutine.yield() end
        end

        local co = coroutine.create(f)
        coroutine.resume(co, 3)
        checktraceback(co, {"yield", "db.lua", "db.lua", "db.lua", "db.lua"})
        checktraceback(co, {"db.lua", "db.lua", "db.lua", "db.lua"}, 1)
        checktraceback(co, {"db.lua", "db.lua", "db.lua"}, 2)
        checktraceback(co, {"db.lua"}, 4)
        checktraceback(co, {}, 40)


        co = coroutine.create(function (x)
               local a = 1
               coroutine.yield(debug.getinfo(1, "l"))
               coroutine.yield(debug.getinfo(1, "l").currentline)
               return a
             end)

        local tr = {}
        local foo = function (e, l) if l then table.insert(tr, l) end end
        debug.sethook(co, foo, "lcr")

        local _, l = coroutine.resume(co, 10)
        local x = debug.getinfo(co, 1, "lfLS")
        assert(x.currentline == l.currentline and x.activelines[x.currentline])
        assert(type(x.func) == "function")
        for i=x.linedefined + 1, x.lastlinedefined do
          assert(x.activelines[i])
          x.activelines[i] = nil
        end
        assert(next(x.activelines) == nil)   -- no 'extra' elements
        assert(not debug.getinfo(co, 2))
        local a,b = debug.getlocal(co, 1, 1)
        assert(a == "x" and b == 10)
        a,b = debug.getlocal(co, 1, 2)
        assert(a == "a" and b == 1)
        debug.setlocal(co, 1, 2, "hi")
        assert(debug.gethook(co) == foo)
        assert(#tr == 2 and
               tr[1] == l.currentline-1 and tr[2] == l.currentline)

        a,b,c = pcall(coroutine.resume, co)
        assert(a and b and c == l.currentline+1)
        checktraceback(co, {"yield", "in function <"})

        a,b = coroutine.resume(co)
        assert(a and b == "hi")
        assert(#tr == 4 and tr[4] == l.currentline+2)
        assert(debug.gethook(co) == foo)
        assert(not debug.gethook())
        checktraceback(co, {})
    `;
    lualib.luaL_openlibs(L);
    let b = to_luastring(luaCode);
    if (lauxlib.luaL_loadbuffer(L, b, b.length, to_luastring("@db.lua")) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: check get/setlocal in coroutines", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        co = coroutine.create(function (x)
          local a, b = coroutine.yield(x)
          assert(a == 100 and b == nil)
          return x
        end)
        a, b = coroutine.resume(co, 10)
        assert(a and b == 10)
        a, b = debug.getlocal(co, 1, 1)
        assert(a == "x" and b == 10)
        assert(not debug.getlocal(co, 1, 5))
        assert(debug.setlocal(co, 1, 1, 30) == "x")
        assert(not debug.setlocal(co, 1, 5, 40))
        a, b = coroutine.resume(co, 100)
        assert(a and b == 30)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: check traceback of suspended (or dead with error) coroutines", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local function checktraceback (co, p, level)
          local tb = debug.traceback(co, nil, level)
          local i = 0
          for l in string.gmatch(tb, "[^\\n]+\\n?") do
            assert(i == 0 or string.find(l, p[i]))
            i = i+1
          end
          assert(p[i] == nil)
        end

        function f(i) if i==0 then error(i) else coroutine.yield(); f(i-1) end end

        co = coroutine.create(function (x) f(x) end)
        a, b = coroutine.resume(co, 3)
        t = {"'coroutine.yield'", "'f'", "in function <"}
        while coroutine.status(co) == "suspended" do
          checktraceback(co, t)
          a, b = coroutine.resume(co)
          table.insert(t, 2, "'f'")   -- one more recursive call to 'f'
        end
        t[1] = "'error'"
        checktraceback(co, t)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: check test acessing line numbers of a coroutine from a resume inside a C function", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local function g(x)
            coroutine.yield(x)
        end

        local function f (i)
          debug.sethook(function () end, "l")
          for j=1,1000 do
            g(i+j)
          end
        end

        local co = coroutine.wrap(f)
        co(10)
        pcall(co)
        pcall(co)


        assert(type(debug.getregistry()) == "table")
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: test tagmethod information", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local a = {}
        local function f (t)
          local info = debug.getinfo(1);
          assert(info.namewhat == "metamethod")
          a.op = info.name
          return info.name
        end
        setmetatable(a, {
          __index = f; __add = f; __div = f; __mod = f; __concat = f; __pow = f;
          __mul = f; __idiv = f; __unm = f; __len = f; __sub = f;
          __shl = f; __shr = f; __bor = f; __bxor = f;
          __eq = f; __le = f; __lt = f; __unm = f; __len = f; __band = f;
          __bnot = f;
        })

        local b = setmetatable({}, getmetatable(a))

        assert(a[3] == "__index" and a^3 == "__pow" and a..a == "__concat")
        assert(a/3 == "__div" and 3%a == "__mod")
        assert(a+3 == "__add" and 3-a == "__sub" and a*3 == "__mul" and
               -a == "__unm" and #a == "__len" and a&3 == "__band")
        assert(a|3 == "__bor" and 3~a == "__bxor" and a<<3 == "__shl" and
               a>>1 == "__shr")
        assert (a==b and a.op == "__eq")
        assert (a>=b and a.op == "__le")
        assert (a>b and a.op == "__lt")
        assert(~a == "__bnot")
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: testing for-iterator name", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do
          local function f()
            assert(debug.getinfo(1).name == "for iterator")
          end

          for i in f do end
        end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: testing traceback sizes", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local function countlines (s)
          return select(2, string.gsub(s, "\\n", ""))
        end

        local function deep (lvl, n)
          if lvl == 0 then
            return (debug.traceback("message", n))
          else
            return (deep(lvl-1, n))
          end
        end

        local function checkdeep (total, start)
          local s = deep(total, start)
          local rest = string.match(s, "^message\\nstack traceback:\\n(.*)$")
          local cl = countlines(rest)
          -- at most 10 lines in first part, 11 in second, plus '...'
          assert(cl <= 10 + 11 + 1)
          local brk = string.find(rest, "%.%.%.")
          if brk then   -- does message have '...'?
            local rest1 = string.sub(rest, 1, brk)
            local rest2 = string.sub(rest, brk, #rest)
            assert(countlines(rest1) == 10 and countlines(rest2) == 11)
          else
            assert(cl == total - start + 2)
          end
        end

        for d = 1, 51, 10 do
          for l = 1, d do
            -- use coroutines to ensure complete control of the stack
            coroutine.wrap(checkdeep)(d, l)
          end
        end
    `;
    lualib.luaL_openlibs(L);
    let b = to_luastring(luaCode);
    if (lauxlib.luaL_loadbuffer(L, b, b.length, to_luastring("@db.lua")) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: testing debug functions on chunk without debug info", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        prog = [[-- program to be loaded without debug information
        local debug = require'debug'
        local a = 12  -- a local variable

        local n, v = debug.getlocal(1, 1)
        assert(n == "(*temporary)" and v == debug)   -- unkown name but known value
        n, v = debug.getlocal(1, 2)
        assert(n == "(*temporary)" and v == 12)   -- unkown name but known value

        -- a function with an upvalue
        local f = function () local x; return a end
        n, v = debug.getupvalue(f, 1)
        assert(n == "(*no name)" and v == 12)
        assert(debug.setupvalue(f, 1, 13) == "(*no name)")
        assert(a == 13)

        local t = debug.getinfo(f)
        assert(t.name == nil and t.linedefined > 0 and
               t.lastlinedefined == t.linedefined and
               t.short_src == "?")
        assert(debug.getinfo(1).currentline == -1)

        t = debug.getinfo(f, "L").activelines
        assert(next(t) == nil)    -- active lines are empty

        -- dump/load a function without debug info
        f = load(string.dump(f))

        t = debug.getinfo(f)
        assert(t.name == nil and t.linedefined > 0 and
               t.lastlinedefined == t.linedefined and
               t.short_src == "?")
        assert(debug.getinfo(1).currentline == -1)

        return a
        ]]


        -- load 'prog' without debug info
        local f = assert(load(string.dump(load(prog), true)))

        assert(f() == 13)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] db: tests for 'source' in binary dumps", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do
          local prog = [[
            return function (x)
              return function (y)
                return x + y
              end
            end
          ]]
          local name = string.rep("x", 1000)
          local p = assert(load(prog, name))
          -- load 'p' as a binary chunk with debug information
          local c = string.dump(p)
          assert(#c > 1000 and #c < 2000)   -- no repetition of 'source' in dump
          local f = assert(load(c))
          local g = f()
          local h = g(3)
          assert(h(5) == 8)
          assert(debug.getinfo(f).source == name and   -- all functions have 'source'
                 debug.getinfo(g).source == name and
                 debug.getinfo(h).source == name)
          -- again, without debug info
          local c = string.dump(p, true)
          assert(#c < 500)   -- no 'source' in dump
          local f = assert(load(c))
          local g = f()
          local h = g(30)
          assert(h(50) == 80)
          assert(debug.getinfo(f).source == '=?' and   -- no function has 'source'
                 debug.getinfo(g).source == '=?' and
                 debug.getinfo(h).source == '=?')
        end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});
