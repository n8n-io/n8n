"use strict";

const lua = require('../../src/lua.js');
const lauxlib = require('../../src/lauxlib.js');
const lualib = require('../../src/lualib.js');
const {to_luastring} = require("../../src/fengaricore.js");

const ltests = require('./ltests.js');

test("[test-suite] events: testing metatable", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        X = 20; B = 30

        _ENV = setmetatable({}, {__index=_G})

        --collectgarbage()

        X = X+10
        assert(X == 30 and _G.X == 20)
        B = false
        assert(B == false)
        B = nil
        assert(B == 30)

        assert(getmetatable{} == nil)
        assert(getmetatable(4) == nil)
        assert(getmetatable(nil) == nil)
        a={name = "NAME"}; setmetatable(a, {__metatable = "xuxu",
                            __tostring=function(x) return x.name end})
        assert(getmetatable(a) == "xuxu")
        assert(tostring(a) == "NAME")
        -- cannot change a protected metatable
        assert(pcall(setmetatable, a, {}) == false)
        a.name = "gororoba"
        assert(tostring(a) == "gororoba")

        local a, t = {10,20,30; x="10", y="20"}, {}
        assert(setmetatable(a,t) == a)
        assert(getmetatable(a) == t)
        assert(setmetatable(a,nil) == a)
        assert(getmetatable(a) == nil)
        assert(setmetatable(a,t) == a)


        function f (t, i, e)
          assert(not e)
          local p = rawget(t, "parent")
          return (p and p[i]+3), "dummy return"
        end

        t.__index = f

        a.parent = {z=25, x=12, [4] = 24}
        assert(a[1] == 10 and a.z == 28 and a[4] == 27 and a.x == "10")

        --collectgarbage()

        a = setmetatable({}, t)
        function f(t, i, v) rawset(t, i, v-3) end
        setmetatable(t, t)   -- causes a bug in 5.1 !
        t.__newindex = f
        a[1] = 30; a.x = "101"; a[5] = 200
        assert(a[1] == 27 and a.x == 98 and a[5] == 197)

        do    -- bug in Lua 5.3.2
          local mt = {}
          mt.__newindex = mt
          local t = setmetatable({}, mt)
          t[1] = 10     -- will segfault on some machines
          assert(mt[1] == 10)
        end

        local c = {}
        a = setmetatable({}, t)
        t.__newindex = c
        a[1] = 10; a[2] = 20; a[3] = 90
        assert(c[1] == 10 and c[2] == 20 and c[3] == 90)

        do
          local a;
          a = setmetatable({}, {__index = setmetatable({},
                             {__index = setmetatable({},
                             {__index = function (_,n) return a[n-3]+4, "lixo" end})})})
          a[0] = 20
          for i=0,10 do
            assert(a[i*3] == 20 + i*4)
          end
        end

        do  -- newindex
          local foi
          local a = {}
          for i=1,10 do a[i] = 0; a['a'..i] = 0; end
          setmetatable(a, {__newindex = function (t,k,v) foi=true; rawset(t,k,v) end})
          foi = false; a[1]=0; assert(not foi)
          foi = false; a['a1']=0; assert(not foi)
          foi = false; a['a11']=0; assert(foi)
          foi = false; a[11]=0; assert(foi)
          foi = false; a[1]=nil; assert(not foi)
          foi = false; a[1]=nil; assert(foi)
        end

        setmetatable(t, nil)
        function f (t, ...) return t, {...} end
        t.__call = f

        do
          local x,y = a(table.unpack{'a', 1})
          assert(x==a and y[1]=='a' and y[2]==1 and y[3]==nil)
          x,y = a()
          assert(x==a and y[1]==nil)
        end


        local b = setmetatable({}, t)
        setmetatable(b,t)

        function f(op)
          return function (...) cap = {[0] = op, ...} ; return (...) end
        end
        t.__add = f("add")
        t.__sub = f("sub")
        t.__mul = f("mul")
        t.__div = f("div")
        t.__idiv = f("idiv")
        t.__mod = f("mod")
        t.__unm = f("unm")
        t.__pow = f("pow")
        t.__len = f("len")
        t.__band = f("band")
        t.__bor = f("bor")
        t.__bxor = f("bxor")
        t.__shl = f("shl")
        t.__shr = f("shr")
        t.__bnot = f("bnot")

        assert(b+5 == b)
        assert(cap[0] == "add" and cap[1] == b and cap[2] == 5 and cap[3]==nil)
        assert(b+'5' == b)
        assert(cap[0] == "add" and cap[1] == b and cap[2] == '5' and cap[3]==nil)
        assert(5+b == 5)
        assert(cap[0] == "add" and cap[1] == 5 and cap[2] == b and cap[3]==nil)
        assert('5'+b == '5')
        assert(cap[0] == "add" and cap[1] == '5' and cap[2] == b and cap[3]==nil)
        b=b-3; assert(getmetatable(b) == t)
        assert(5-a == 5)
        assert(cap[0] == "sub" and cap[1] == 5 and cap[2] == a and cap[3]==nil)
        assert('5'-a == '5')
        assert(cap[0] == "sub" and cap[1] == '5' and cap[2] == a and cap[3]==nil)
        assert(a*a == a)
        assert(cap[0] == "mul" and cap[1] == a and cap[2] == a and cap[3]==nil)
        assert(a/0 == a)
        assert(cap[0] == "div" and cap[1] == a and cap[2] == 0 and cap[3]==nil)
        assert(a%2 == a)
        assert(cap[0] == "mod" and cap[1] == a and cap[2] == 2 and cap[3]==nil)
        assert(a // (1/0) == a)
        assert(cap[0] == "idiv" and cap[1] == a and cap[2] == 1/0 and cap[3]==nil)
        assert(a & "hi" == a)
        assert(cap[0] == "band" and cap[1] == a and cap[2] == "hi" and cap[3]==nil)
        assert(a | "hi" == a)
        assert(cap[0] == "bor" and cap[1] == a and cap[2] == "hi" and cap[3]==nil)
        assert("hi" ~ a == "hi")
        assert(cap[0] == "bxor" and cap[1] == "hi" and cap[2] == a and cap[3]==nil)
        assert(-a == a)
        assert(cap[0] == "unm" and cap[1] == a)
        assert(a^4 == a)
        assert(cap[0] == "pow" and cap[1] == a and cap[2] == 4 and cap[3]==nil)
        assert(a^'4' == a)
        assert(cap[0] == "pow" and cap[1] == a and cap[2] == '4' and cap[3]==nil)
        assert(4^a == 4)
        assert(cap[0] == "pow" and cap[1] == 4 and cap[2] == a and cap[3]==nil)
        assert('4'^a == '4')
        assert(cap[0] == "pow" and cap[1] == '4' and cap[2] == a and cap[3]==nil)
        assert(#a == a)
        assert(cap[0] == "len" and cap[1] == a)
        assert(~a == a)
        assert(cap[0] == "bnot" and cap[1] == a)
        assert(a << 3 == a)
        assert(cap[0] == "shl" and cap[1] == a and cap[2] == 3)
        assert(1.5 >> a == 1.5)
        assert(cap[0] == "shr" and cap[1] == 1.5 and cap[2] == a)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] events: test for rawlen", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        t = setmetatable({1,2,3}, {__len = function () return 10 end})
        assert(#t == 10 and rawlen(t) == 3)
        assert(rawlen"abc" == 3)
        assert(not pcall(rawlen, io.stdin))
        assert(not pcall(rawlen, 34))
        assert(not pcall(rawlen))

        -- rawlen for long strings
        assert(rawlen(string.rep('a', 1000)) == 1000)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] events: test comparison", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        t = {}
        t.__lt = function (a,b,c)
          --collectgarbage()
          assert(c == nil)
          if type(a) == 'table' then a = a.x end
          if type(b) == 'table' then b = b.x end
         return a<b, "dummy"
        end

        function Op(x) return setmetatable({x=x}, t) end

        local function test ()
          assert(not(Op(1)<Op(1)) and (Op(1)<Op(2)) and not(Op(2)<Op(1)))
          assert(not(1 < Op(1)) and (Op(1) < 2) and not(2 < Op(1)))
          assert(not(Op('a')<Op('a')) and (Op('a')<Op('b')) and not(Op('b')<Op('a')))
          assert(not('a' < Op('a')) and (Op('a') < 'b') and not(Op('b') < Op('a')))
          assert((Op(1)<=Op(1)) and (Op(1)<=Op(2)) and not(Op(2)<=Op(1)))
          assert((Op('a')<=Op('a')) and (Op('a')<=Op('b')) and not(Op('b')<=Op('a')))
          assert(not(Op(1)>Op(1)) and not(Op(1)>Op(2)) and (Op(2)>Op(1)))
          assert(not(Op('a')>Op('a')) and not(Op('a')>Op('b')) and (Op('b')>Op('a')))
          assert((Op(1)>=Op(1)) and not(Op(1)>=Op(2)) and (Op(2)>=Op(1)))
          assert((1 >= Op(1)) and not(1 >= Op(2)) and (Op(2) >= 1))
          assert((Op('a')>=Op('a')) and not(Op('a')>=Op('b')) and (Op('b')>=Op('a')))
          assert(('a' >= Op('a')) and not(Op('a') >= 'b') and (Op('b') >= Op('a')))
        end

        test()

        t.__le = function (a,b,c)
          assert(c == nil)
          if type(a) == 'table' then a = a.x end
          if type(b) == 'table' then b = b.x end
         return a<=b, "dummy"
        end

        test()  -- retest comparisons, now using both 'lt' and 'le'
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] events: test 'partial order'", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        t = {}

        local function rawSet(x)
          local y = {}
          for _,k in pairs(x) do y[k] = 1 end
          return y
        end

        local function Set(x)
          return setmetatable(rawSet(x), t)
        end

        t.__lt = function (a,b)
          for k in pairs(a) do
            if not b[k] then return false end
            b[k] = nil
          end
          return next(b) ~= nil
        end

        t.__le = nil

        assert(Set{1,2,3} < Set{1,2,3,4})
        assert(not(Set{1,2,3,4} < Set{1,2,3,4}))
        assert((Set{1,2,3,4} <= Set{1,2,3,4}))
        assert((Set{1,2,3,4} >= Set{1,2,3,4}))
        assert((Set{1,3} <= Set{3,5}))   -- wrong!! model needs a 'le' method ;-)

        t.__le = function (a,b)
          for k in pairs(a) do
            if not b[k] then return false end
          end
          return true
        end

        assert(not (Set{1,3} <= Set{3,5}))   -- now its OK!
        assert(not(Set{1,3} <= Set{3,5}))
        assert(not(Set{1,3} >= Set{3,5}))

        t.__eq = function (a,b)
          for k in pairs(a) do
            if not b[k] then return false end
            b[k] = nil
          end
          return next(b) == nil
        end

        local s = Set{1,3,5}
        assert(s == Set{3,5,1})
        assert(not rawequal(s, Set{3,5,1}))
        assert(rawequal(s, s))
        assert(Set{1,3,5,1} == rawSet{3,5,1})
        assert(rawSet{1,3,5,1} == Set{3,5,1})
        assert(Set{1,3,5} ~= Set{3,5,1,6})

        -- '__eq' is not used for table accesses
        t[Set{1,3,5}] = 1
        assert(t[Set{1,3,5}] == nil)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] events: __eq between userdata", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        T = require('T')

        local u1 = T.newuserdata(0)
        local u2 = T.newuserdata(0)
        local u3 = T.newuserdata(0)
        assert(u1 ~= u2 and u1 ~= u3)
        debug.setuservalue(u1, 1);
        debug.setuservalue(u2, 2);
        debug.setuservalue(u3, 1);
        debug.setmetatable(u1, {__eq = function (a, b)
          return debug.getuservalue(a) == debug.getuservalue(b)
        end})
        debug.setmetatable(u2, {__eq = function (a, b)
          return true
        end})
        assert(u1 == u3 and u3 == u1 and u1 ~= u2)
        assert(u2 == u1 and u2 == u3 and u3 == u2)
        assert(u2 ~= {})   -- different types cannot be equal
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] events: concat", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        t = {}

        t.__concat = function (a,b,c)
          assert(c == nil)
          if type(a) == 'table' then a = a.val end
          if type(b) == 'table' then b = b.val end
          if A then return a..b
          else
            return setmetatable({val=a..b}, t)
          end
        end

        c = {val="c"}; setmetatable(c, t)
        d = {val="d"}; setmetatable(d, t)

        A = true
        assert(c..d == 'cd')
        assert(0 .."a".."b"..c..d.."e".."f"..(5+3).."g" == "0abcdef8g")

        A = false
        assert((c..d..c..d).val == 'cdcd')
        x = c..d
        assert(getmetatable(x) == t and x.val == 'cd')
        x = 0 .."a".."b"..c..d.."e".."f".."g"
        assert(x.val == "0abcdefg")
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] events: concat metamethod x numbers (bug in 5.1.1)", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        c = {}
        local x
        setmetatable(c, {__concat = function (a,b)
          assert(type(a) == "number" and b == c or type(b) == "number" and a == c)
          return c
        end})
        assert(c..5 == c and 5 .. c == c)
        assert(4 .. c .. 5 == c and 4 .. 5 .. 6 .. 7 .. c == c)
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] events: test comparison compatibilities", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local t1, t2, c, d
        t1 = {};  c = {}; setmetatable(c, t1)
        d = {}
        t1.__eq = function () return true end
        t1.__lt = function () return true end
        setmetatable(d, t1)
        assert(c == d and c < d and not(d <= c))
        t2 = {}
        t2.__eq = t1.__eq
        t2.__lt = t1.__lt
        setmetatable(d, t2)
        assert(c == d and c < d and not(d <= c))
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] events: test for several levels of callstest for several levels of calls", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local i
        local tt = {
          __call = function (t, ...)
            i = i+1
            if t.f then return t.f(...)
            else return {...}
            end
          end
        }

        local a = setmetatable({}, tt)
        local b = setmetatable({f=a}, tt)
        local c = setmetatable({f=b}, tt)

        i = 0
        x = c(3,4,5)
        assert(i == 3 and x[1] == 3 and x[3] == 5)
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] events: __index on _ENV", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local _g = _G
        _ENV = setmetatable({}, {__index=function (_,k) return _g[k] end})

        a = {}
        rawset(a, "x", 1, 2, 3)
        assert(a.x == 1 and rawget(a, "x", 3) == 1)
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] events: testing metatables for basic types", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        mt = {__index = function (a,b) return a+b end,
              __len = function (x) return math.floor(x) end}
        debug.setmetatable(10, mt)
        assert(getmetatable(-2) == mt)
        assert((10)[3] == 13)
        assert((10)["3"] == 13)
        assert(#3.45 == 3)
        debug.setmetatable(23, nil)
        assert(getmetatable(-2) == nil)

        debug.setmetatable(true, mt)
        assert(getmetatable(false) == mt)
        mt.__index = function (a,b) return a or b end
        assert((true)[false] == true)
        assert((false)[false] == false)
        debug.setmetatable(false, nil)
        assert(getmetatable(true) == nil)

        debug.setmetatable(nil, mt)
        assert(getmetatable(nil) == mt)
        mt.__add = function (a,b) return (a or 0) + (b or 0) end
        assert(10 + nil == 10)
        assert(nil + 23 == 23)
        assert(nil + nil == 0)
        debug.setmetatable(nil, nil)
        assert(getmetatable(nil) == nil)

        debug.setmetatable(nil, {})
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] events: loops in delegation", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        a = {}; setmetatable(a, a); a.__index = a; a.__newindex = a
        assert(not pcall(function (a,b) return a[b] end, a, 10))
        assert(not pcall(function (a,b,c) a[b] = c end, a, 10, true))
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] events: bug in 5.1", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        T, K, V = nil
        grandparent = {}
        grandparent.__newindex = function(t,k,v) T=t; K=k; V=v end

        parent = {}
        parent.__newindex = parent
        setmetatable(parent, grandparent)

        child = setmetatable({}, parent)
        child.foo = 10      --> CRASH (on some machines)
        assert(T == parent and K == "foo" and V == 10)
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});
