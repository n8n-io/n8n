"use strict";

const lua = require('../../src/lua.js');
const lauxlib = require('../../src/lauxlib.js');
const lualib = require('../../src/lualib.js');
const {to_luastring} = require("../../src/fengaricore.js");

test("[test-suite] goto: error messages", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local function errmsg (code, m)
          local st, msg = load(code)
          assert(not st and string.find(msg, m))
        end

        -- cannot see label inside block
        errmsg([[ goto l1; do ::l1:: end ]], "label 'l1'")
        errmsg([[ do ::l1:: end goto l1; ]], "label 'l1'")

        -- repeated label
        errmsg([[ ::l1:: ::l1:: ]], "label 'l1'")


        -- undefined label
        errmsg([[ goto l1; local aa ::l1:: ::l2:: print(3) ]], "local 'aa'")

        -- jumping over variable definition
        errmsg([[
        do local bb, cc; goto l1; end
        local aa
        ::l1:: print(3)
        ]], "local 'aa'")

        -- jumping into a block
        errmsg([[ do ::l1:: end goto l1 ]], "label 'l1'")
        errmsg([[ goto l1 do ::l1:: end ]], "label 'l1'")

        -- cannot continue a repeat-until with variables
        errmsg([[
          repeat
            if x then goto cont end
            local xuxu = 10
            ::cont::
          until xuxu < x
        ]], "local 'xuxu'")
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] goto", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        -- simple gotos
        local x
        do
          local y = 12
          goto l1
          ::l2:: x = x + 1; goto l3
          ::l1:: x = y; goto l2
        end
        ::l3:: ::l3_1:: assert(x == 13)

        -- long labels
        do
          local prog = [[
          do
            local a = 1
            goto l%sa; a = a + 1
           ::l%sa:: a = a + 10
            goto l%sb; a = a + 2
           ::l%sb:: a = a + 20
            return a
          end
          ]]
          local label = string.rep("0123456789", 40)
          prog = string.format(prog, label, label, label, label)
          assert(assert(load(prog))() == 31)
        end

        -- goto to correct label when nested
        do goto l3; ::l3:: end   -- does not loop jumping to previous label 'l3'

        -- ok to jump over local dec. to end of block
        do
          goto l1
          local a = 23
          x = a
          ::l1::;
        end

        while true do
          goto l4
          goto l1  -- ok to jump over local dec. to end of block
          goto l1  -- multiple uses of same label
          local x = 45
          ::l1:: ;;;
        end
        ::l4:: assert(x == 13)

        if print then
          goto l1   -- ok to jump over local dec. to end of block
          error("should not be here")
          goto l2   -- ok to jump over local dec. to end of block
          local x
          ::l1:: ; ::l2:: ;;
        else end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] goto: to repeat a label in a different function is OK", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local function foo ()
          local a = {}
          goto l3
          ::l1:: a[#a + 1] = 1; goto l2;
          ::l2:: a[#a + 1] = 2; goto l5;
          ::l3::
          ::l3a:: a[#a + 1] = 3; goto l1;
          ::l4:: a[#a + 1] = 4; goto l6;
          ::l5:: a[#a + 1] = 5; goto l4;
          ::l6:: assert(a[1] == 3 and a[2] == 1 and a[3] == 2 and
                      a[4] == 5 and a[5] == 4)
          if not a[6] then a[6] = true; goto l3a end   -- do it twice
        end

        ::l6:: foo()
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] goto: bug in 5.2 -> 5.3.2", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do   -- bug in 5.2 -> 5.3.2
          local x
          ::L1::
          local y             -- cannot join this SETNIL with previous one
          assert(y == nil)
          y = true
          if x == nil then
            x = 1
            goto L1
          else
            x = x + 1
          end
          assert(x == 2 and y == true)
        end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] goto: testing closing of upvalues", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local function foo ()
          local t = {}
          do
          local i = 1
          local a, b, c, d
          t[1] = function () return a, b, c, d end
          ::l1::
          local b
          do
            local c
            t[#t + 1] = function () return a, b, c, d end    -- t[2], t[4], t[6]
            if i > 2 then goto l2 end
            do
              local d
              t[#t + 1] = function () return a, b, c, d end   -- t[3], t[5]
              i = i + 1
              local a
              goto l1
            end
          end
          end
          ::l2:: return t
        end

        local a = foo()
        assert(#a == 6)

        -- all functions share same 'a'
        for i = 2, 6 do
          assert(debug.upvalueid(a[1], 1) == debug.upvalueid(a[i], 1))
        end

        -- 'b' and 'c' are shared among some of them
        for i = 2, 6 do
          -- only a[1] uses external 'b'/'b'
          assert(debug.upvalueid(a[1], 2) ~= debug.upvalueid(a[i], 2))
          assert(debug.upvalueid(a[1], 3) ~= debug.upvalueid(a[i], 3))
        end

        for i = 3, 5, 2 do
          -- inner functions share 'b'/'c' with previous ones
          assert(debug.upvalueid(a[i], 2) == debug.upvalueid(a[i - 1], 2))
          assert(debug.upvalueid(a[i], 3) == debug.upvalueid(a[i - 1], 3))
          -- but not with next ones
          assert(debug.upvalueid(a[i], 2) ~= debug.upvalueid(a[i + 1], 2))
          assert(debug.upvalueid(a[i], 3) ~= debug.upvalueid(a[i + 1], 3))
        end

        -- only external 'd' is shared
        for i = 2, 6, 2 do
          assert(debug.upvalueid(a[1], 4) == debug.upvalueid(a[i], 4))
        end

        -- internal 'd's are all different
        for i = 3, 5, 2 do
          for j = 1, 6 do
            assert((debug.upvalueid(a[i], 4) == debug.upvalueid(a[j], 4))
              == (i == j))
          end
        end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] goto: testing if x goto optimizations", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local function testG (a)
          if a == 1 then
            goto l1
            error("should never be here!")
          elseif a == 2 then goto l2
          elseif a == 3 then goto l3
          elseif a == 4 then
            goto l1  -- go to inside the block
            error("should never be here!")
            ::l1:: a = a + 1   -- must go to 'if' end
          else
            goto l4
            ::l4a:: a = a * 2; goto l4b
            error("should never be here!")
            ::l4:: goto l4a
            error("should never be here!")
            ::l4b::
          end
          do return a end
          ::l2:: do return "2" end
          ::l3:: do return "3" end
          ::l1:: return "1"
        end

        assert(testG(1) == "1")
        assert(testG(2) == "2")
        assert(testG(3) == "3")
        assert(testG(4) == 5)
        assert(testG(5) == 10)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});
