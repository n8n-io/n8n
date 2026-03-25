"use strict";

const lua = require('../../src/lua.js');
const lauxlib = require('../../src/lauxlib.js');
const lualib = require('../../src/lualib.js');
const {to_luastring} = require("../../src/fengaricore.js");

const prefix = `
    local unpack = table.unpack

    local maxI = math.maxinteger
    local minI = math.mininteger


    local function checkerror (msg, f, ...)
      local s, err = pcall(f, ...)
      assert(not s and string.find(err, msg))
    end

    function timesort (a, n, func, msg, pre)
      local x = os.clock()
      table.sort(a, func)
      x = (os.clock() - x) * 1000
      pre = pre or ""
      -- print(string.format("%ssorting %d %s elements in %.2f msec.", pre, n, msg, x))
      check(a, func)
    end

    limit = 50000
    if _soft then limit = 5000 end
`;

test("[test-suite] sort: testing unpack", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        checkerror("wrong number of arguments", table.insert, {}, 2, 3, 4)

        local x,y,z,a,n
        a = {}; lim = _soft and 200 or 2000
        for i=1, lim do a[i]=i end
        assert(select(lim, unpack(a)) == lim and select('#', unpack(a)) == lim)
        x = unpack(a)
        assert(x == 1)
        x = {unpack(a)}
        assert(#x == lim and x[1] == 1 and x[lim] == lim)
        x = {unpack(a, lim-2)}
        assert(#x == 3 and x[1] == lim-2 and x[3] == lim)
        x = {unpack(a, 10, 6)}
        assert(next(x) == nil)   -- no elements
        x = {unpack(a, 11, 10)}
        assert(next(x) == nil)   -- no elements
        x,y = unpack(a, 10, 10)
        assert(x == 10 and y == nil)
        x,y,z = unpack(a, 10, 11)
        assert(x == 10 and y == 11 and z == nil)
        a,x = unpack{1}
        assert(a==1 and x==nil)
        a,x = unpack({1,2}, 1, 1)
        assert(a==1 and x==nil)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] sort: testing unpack", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do
          local maxi = (1 << 31) - 1          -- maximum value for an int (usually)
          local mini = -(1 << 31)             -- minimum value for an int (usually)
          checkerror("too many results", unpack, {}, 0, maxi)
          checkerror("too many results", unpack, {}, 1, maxi)
          checkerror("too many results", unpack, {}, 0, maxI)
          checkerror("too many results", unpack, {}, 1, maxI)
          checkerror("too many results", unpack, {}, mini, maxi)
          checkerror("too many results", unpack, {}, -maxi, maxi)
          checkerror("too many results", unpack, {}, minI, maxI)
          unpack({}, maxi, 0)
          unpack({}, maxi, 1)
          unpack({}, maxI, minI)
          pcall(unpack, {}, 1, maxi + 1)
          local a, b = unpack({[maxi] = 20}, maxi, maxi)
          assert(a == 20 and b == nil)
          a, b = unpack({[maxi] = 20}, maxi - 1, maxi)
          assert(a == nil and b == 20)
          local t = {[maxI - 1] = 12, [maxI] = 23}
          a, b = unpack(t, maxI - 1, maxI); assert(a == 12 and b == 23)
          a, b = unpack(t, maxI, maxI); assert(a == 23 and b == nil)
          a, b = unpack(t, maxI, maxI - 1); assert(a == nil and b == nil)
          t = {[minI] = 12.3, [minI + 1] = 23.5}
          a, b = unpack(t, minI, minI + 1); assert(a == 12.3 and b == 23.5)
          a, b = unpack(t, minI, minI); assert(a == 12.3 and b == nil)
          a, b = unpack(t, minI + 1, minI); assert(a == nil and b == nil)
        end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] sort: testing unpack", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do   -- length is not an integer
          local t = setmetatable({}, {__len = function () return 'abc' end})
          assert(#t == 'abc')
          checkerror("object length is not an integer", table.insert, t, 1)
        end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] sort: testing pack", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        a = table.pack()
        assert(a[1] == nil and a.n == 0)

        a = table.pack(table)
        assert(a[1] == table and a.n == 1)

        a = table.pack(nil, nil, nil, nil)
        assert(a[1] == nil and a.n == 4)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] sort: testing move", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do

          checkerror("table expected", table.move, 1, 2, 3, 4)

          local function eqT (a, b)
            for k, v in pairs(a) do assert(b[k] == v) end
            for k, v in pairs(b) do assert(a[k] == v) end
          end

          local a = table.move({10,20,30}, 1, 3, 2)  -- move forward
          eqT(a, {10,10,20,30})

          -- move forward with overlap of 1
          a = table.move({10, 20, 30}, 1, 3, 3)
          eqT(a, {10, 20, 10, 20, 30})

          -- moving to the same table (not being explicit about it)
          a = {10, 20, 30, 40}
          table.move(a, 1, 4, 2, a)
          eqT(a, {10, 10, 20, 30, 40})

          a = table.move({10,20,30}, 2, 3, 1)   -- move backward
          eqT(a, {20,30,30})

          a = {}   -- move to new table
          assert(table.move({10,20,30}, 1, 3, 1, a) == a)
          eqT(a, {10,20,30})

          a = {}
          assert(table.move({10,20,30}, 1, 0, 3, a) == a)  -- empty move (no move)
          eqT(a, {})

          a = table.move({10,20,30}, 1, 10, 1)   -- move to the same place
          eqT(a, {10,20,30})

          -- moving on the fringes
          a = table.move({[maxI - 2] = 1, [maxI - 1] = 2, [maxI] = 3},
                         maxI - 2, maxI, -10, {})
          eqT(a, {[-10] = 1, [-9] = 2, [-8] = 3})

          a = table.move({[minI] = 1, [minI + 1] = 2, [minI + 2] = 3},
                         minI, minI + 2, -10, {})
          eqT(a, {[-10] = 1, [-9] = 2, [-8] = 3})

          a = table.move({45}, 1, 1, maxI)
          eqT(a, {45, [maxI] = 45})

          a = table.move({[maxI] = 100}, maxI, maxI, minI)
          eqT(a, {[minI] = 100, [maxI] = 100})

          a = table.move({[minI] = 100}, minI, minI, maxI)
          eqT(a, {[minI] = 100, [maxI] = 100})

          a = setmetatable({}, {
                __index = function (_,k) return k * 10 end,
                __newindex = error})
          local b = table.move(a, 1, 10, 3, {})
          eqT(a, {})
          eqT(b, {nil,nil,10,20,30,40,50,60,70,80,90,100})

          b = setmetatable({""}, {
                __index = error,
                __newindex = function (t,k,v)
                  t[1] = string.format("%s(%d,%d)", t[1], k, v)
              end})
          table.move(a, 10, 13, 3, b)
          assert(b[1] == "(3,100)(4,110)(5,120)(6,130)")
          local stat, msg = pcall(table.move, b, 10, 13, 3, b)
          assert(not stat and msg == b)
        end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] sort: testing long move", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do
          -- for very long moves, just check initial accesses and interrupt
          -- move with an error
          local function checkmove (f, e, t, x, y)
            local pos1, pos2
            local a = setmetatable({}, {
                        __index = function (_,k) pos1 = k end,
                        __newindex = function (_,k) pos2 = k; error() end, })
            local st, msg = pcall(table.move, a, f, e, t)
            assert(not st and not msg and pos1 == x and pos2 == y)
          end
          checkmove(1, maxI, 0, 1, 0)
          checkmove(0, maxI - 1, 1, maxI - 1, maxI)
          checkmove(minI, -2, -5, -2, maxI - 6)
          checkmove(minI + 1, -1, -2, -1, maxI - 3)
          checkmove(minI, -2, 0, minI, 0)  -- non overlapping
          checkmove(minI + 1, -1, 1, minI + 1, 1)  -- non overlapping
        end

        checkerror("too many", table.move, {}, 0, maxI, 1)
        checkerror("too many", table.move, {}, -1, maxI - 1, 1)
        checkerror("too many", table.move, {}, minI, -1, 1)
        checkerror("too many", table.move, {}, minI, maxI, 1)
        checkerror("wrap around", table.move, {}, 1, maxI, 2)
        checkerror("wrap around", table.move, {}, 1, 2, maxI)
        checkerror("wrap around", table.move, {}, minI, -2, 2)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] sort: testing sort, strange lengths", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local a = setmetatable({}, {__len = function () return -1 end})
        assert(#a == -1)
        table.sort(a, error)    -- should not compare anything
        a = setmetatable({}, {__len = function () return maxI end})
        checkerror("too big", table.sort, a)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] sort: test checks for invalid order functions", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local function check (t)
          local function f(a, b) assert(a and b); return true end
          checkerror("invalid order function", table.sort, t, f)
        end

        check{1,2,3,4}
        check{1,2,3,4,5}
        check{1,2,3,4,5,6}
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] sort: sort alpha", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        function check (a, f)
          f = f or function (x,y) return x<y end;
          for n = #a, 2, -1 do
            assert(not f(a[n], a[n-1]))
          end
        end

        a = {"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep",
             "Oct", "Nov", "Dec"}

        table.sort(a)
        check(a)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] sort: sort perm", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        function check (a, f)
          f = f or function (x,y) return x<y end;
          for n = #a, 2, -1 do
            assert(not f(a[n], a[n-1]))
          end
        end

        function perm (s, n)
          n = n or #s
          if n == 1 then
            local t = {unpack(s)}
            table.sort(t)
            check(t)
          else
            for i = 1, n do
              s[i], s[n] = s[n], s[i]
              perm(s, n - 1)
              s[i], s[n] = s[n], s[i]
            end
          end
        end

        perm{}
        perm{1}
        perm{1,2}
        perm{1,2,3}
        perm{1,2,3,4}
        perm{2,2,3,4}
        perm{1,2,3,4,5}
        perm{1,2,3,3,5}
        perm{1,2,3,4,5,6}
        perm{2,2,3,3,5,6}
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] sort: Invert-sorting", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        function check (a, f)
          f = f or function (x,y) return x<y end;
          for n = #a, 2, -1 do
            assert(not f(a[n], a[n-1]))
          end
        end

        a = {}
        for i=1,limit do
          a[i] = math.random()
        end

        x = os.clock(); i=0
        table.sort(a, function(x,y) i=i+1; return y<x end)
        x = (os.clock() - x) * 1000
        -- print(string.format("Invert-sorting other %d elements in %.2f msec., with %i comparisons",
        --       limit, x, i))
        check(a, function(x,y) return y<x end)

        table.sort{}  -- empty array

        for i=1,limit do a[i] = false end
        timesort(a, limit,  function(x,y) return nil end, "equal")

        for i,v in pairs(a) do assert(v == false) end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] sort: sorting", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        function check (a, f)
          f = f or function (x,y) return x<y end;
          for n = #a, 2, -1 do
            assert(not f(a[n], a[n-1]))
          end
        end

        A = {"álo", "\\0first :-)", "alo", "then this one", "45", "and a new"}
        table.sort(A)
        check(A)

        table.sort(A, function (x, y)
                  load(string.format("A[%q] = ''", x), "")()
                  -- collectgarbage()
                  return x<y
                end)


        tt = {__lt = function (a,b) return a.val < b.val end}
        a = {}
        for i=1,10 do  a[i] = {val=math.random(100)}; setmetatable(a[i], tt); end
        table.sort(a)
        check(a, tt.__lt)
        check(a)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});
