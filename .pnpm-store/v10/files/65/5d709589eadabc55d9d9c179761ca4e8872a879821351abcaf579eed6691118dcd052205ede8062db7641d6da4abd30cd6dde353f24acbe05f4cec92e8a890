"use strict";

const lua = require('../../src/lua.js');
const lauxlib = require('../../src/lauxlib.js');
const lualib = require('../../src/lualib.js');
const {to_luastring} = require("../../src/fengaricore.js");

const ltests = require('./ltests.js');

test("[test-suite] code: testing reuse in constant table", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local function checkKlist (func, list)
          local k = T.listk(func)
          assert(#k == #list)
          for i = 1, #k do
            assert(k[i] == list[i] and math.type(k[i]) == math.type(list[i]))
          end
        end

        local function foo ()
          local a
          a = 3;
          a = 0; a = 0.0; a = -7 + 7
          a = 3.78/4; a = 3.78/4
          a = -3.78/4; a = 3.78/4; a = -3.78/4
          a = -3.79/4; a = 0.0; a = -0;
          a = 3; a = 3.0; a = 3; a = 3.0
        end

        checkKlist(foo, {3, 0, 0.0, 3.78/4, -3.78/4, -3.79/4, 3.0})
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


const prefix = `
    function check (f, ...)
      local arg = {...}
      local c = T.listcode(f)
      for i=1, #arg do
        -- print(arg[i], c[i])
        assert(string.find(c[i], '- '..arg[i]..' *%d'))
      end
      assert(c[#arg+2] == nil)
    end


    function checkequal (a, b)
      a = T.listcode(a)
      b = T.listcode(b)
      for i = 1, #a do
        a[i] = string.gsub(a[i], '%b()', '')   -- remove line number
        b[i] = string.gsub(b[i], '%b()', '')   -- remove line number
        assert(a[i] == b[i])
      end
    end
`;


test("[test-suite] code: some basic instructions", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        check(function ()
          (function () end){f()}
        end, 'CLOSURE', 'NEWTABLE', 'GETTABUP', 'CALL', 'SETLIST', 'CALL', 'RETURN')
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] code: sequence of LOADNILs", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        check(function ()
          local a,b,c
          local d; local e;
          local f,g,h;
          d = nil; d=nil; b=nil; a=nil; c=nil;
        end, 'LOADNIL', 'RETURN')

        check(function ()
          local a,b,c,d = 1,1,1,1
          d=nil;c=nil;b=nil;a=nil
        end, 'LOADK', 'LOADK', 'LOADK', 'LOADK', 'LOADNIL', 'RETURN')

        do
          local a,b,c,d = 1,1,1,1
          d=nil;c=nil;b=nil;a=nil
          assert(a == nil and b == nil and c == nil and d == nil)
        end
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] code: single return", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        check (function (a,b,c) return a end, 'RETURN')
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] code: infinite loops", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        check(function () while true do local a = -1 end end,
        'LOADK', 'JMP', 'RETURN')

        check(function () while 1 do local a = -1 end end,
        'LOADK', 'JMP', 'RETURN')

        check(function () repeat local x = 1 until true end,
        'LOADK', 'RETURN')
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] code: concat optimization", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        check(function (a,b,c,d) return a..b..c..d end,
          'MOVE', 'MOVE', 'MOVE', 'MOVE', 'CONCAT', 'RETURN')
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] code: not", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        check(function () return not not nil end, 'LOADBOOL', 'RETURN')
        check(function () return not not false end, 'LOADBOOL', 'RETURN')
        check(function () return not not true end, 'LOADBOOL', 'RETURN')
        check(function () return not not 1 end, 'LOADBOOL', 'RETURN')
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] code: direct access to locals", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        check(function ()
          local a,b,c,d
          a = b*2
          c[2], a[b] = -((a + d/2 - a[b]) ^ a.x), b
        end,
          'LOADNIL',
          'MUL',
          'DIV', 'ADD', 'GETTABLE', 'SUB', 'GETTABLE', 'POW',
            'UNM', 'SETTABLE', 'SETTABLE', 'RETURN')
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] code: direct access to constants", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        check(function ()
          local a,b
          a.x = 3.2
          a.x = b
          a[b] = 'x'
        end,
          'LOADNIL', 'SETTABLE', 'SETTABLE', 'SETTABLE', 'RETURN')

        check(function ()
          local a,b
          a = 1 - a
          b = 1/a
          b = 5-4
        end,
          'LOADNIL', 'SUB', 'DIV', 'LOADK', 'RETURN')

        check(function ()
          local a,b
          a[true] = false
        end,
          'LOADNIL', 'SETTABLE', 'RETURN')
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] code: constant folding", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local function checkK (func, val)
          check(func, 'LOADK', 'RETURN')
          local k = T.listk(func)
          assert(#k == 1 and k[1] == val and math.type(k[1]) == math.type(val))
          assert(func() == val)
        end
        checkK(function () return 0.0 end, 0.0)
        checkK(function () return 0 end, 0)
        checkK(function () return -0//1 end, 0)
        checkK(function () return 3^-1 end, 1/3)
        checkK(function () return (1 + 1)^(50 + 50) end, 2^100)
        checkK(function () return (-2)^(31 - 2) end, -0x20000000 + 0.0)
        checkK(function () return (-3^0 + 5) // 3.0 end, 1.0)
        checkK(function () return -3 % 5 end, 2)
        checkK(function () return -((2.0^8 + -(-1)) % 8)/2 * 4 - 3 end, -5.0)
        checkK(function () return -((2^8 + -(-1)) % 8)//2 * 4 - 3 end, -7.0)
        checkK(function () return 0xF0.0 | 0xCC.0 ~ 0xAA & 0xFD end, 0xF4)
        checkK(function () return ~(~0xFF0 | 0xFF0) end, 0)
        checkK(function () return ~~-100024.0 end, -100024)
        checkK(function () return ((100 << 6) << -4) >> 2 end, 100)
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] code: no folding", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        check(function () return -0.0 end, 'LOADK', 'UNM', 'RETURN')
        check(function () return 3/0 end, 'DIV', 'RETURN')
        check(function () return 0%0 end, 'MOD', 'RETURN')
        check(function () return -4//0 end, 'IDIV', 'RETURN')
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] code: bug in constant folding for 5.1", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        check(function () return -nil end, 'LOADNIL', 'UNM', 'RETURN')


        check(function ()
          local a,b,c
          b[c], a = c, b
          b[a], a = c, b
          a, b = c, a
          a = a
        end,
          'LOADNIL',
          'MOVE', 'MOVE', 'SETTABLE',
          'MOVE', 'MOVE', 'MOVE', 'SETTABLE',
          'MOVE', 'MOVE', 'MOVE',
          -- no code for a = a
          'RETURN')
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] code: x == nil , x ~= nil", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        checkequal(function () if (a==nil) then a=1 end; if a~=nil then a=1 end end,
                   function () if (a==9) then a=1 end; if a~=9 then a=1 end end)

        check(function () if a==nil then a='a' end end,
            'GETTABUP', 'EQ', 'JMP', 'SETTABUP', 'RETURN')

        checkequal(function () local a; if not (a or b) then b=a end end,
           function () local a; if (not a and not b) then b=a end end)

        checkequal(function (l) local a; return 0 <= a and a <= l end,
                   function (l) local a; return not (not(a >= 0) or not(a <= l)) end)
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] code: if-goto optimizations", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        check(function (a, b, c, d, e)
                if a == b then goto l1
                elseif a == c then goto l2
                elseif a == d then goto l2
                else if a == e then goto l3
                     else goto l3
                     end
                end
                ::l1:: ::l2:: ::l3:: ::l4::
        end, 'EQ', 'JMP', 'EQ', 'JMP', 'EQ', 'JMP', 'EQ', 'JMP', 'JMP', 'RETURN')

        checkequal(
        function (a) while a < 10 do a = a + 1 end end,
        function (a) ::L2:: if not(a < 10) then goto L1 end; a = a + 1;
                        goto L2; ::L1:: end
        )

        checkequal(
        function (a) while a < 10 do a = a + 1 end end,
        function (a) while true do if not(a < 10) then break end; a = a + 1; end end
        )
    `;
    lualib.luaL_openlibs(L);
    ltests.luaopen_tests(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});
