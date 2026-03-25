"use strict";

const lua = require('../../src/lua.js');
const lauxlib = require('../../src/lauxlib.js');
const lualib = require('../../src/lualib.js');
const {to_luastring} = require("../../src/fengaricore.js");

const checkload = `
    local function checkload (s, msg)
      assert(string.find(select(2, load(s)), msg))
    end
`;

test('[test-suite] constructs: testing semicolons', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do ;;; end
        ; do ; a = 3; assert(a == 3) end;
        ;
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(checkload + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test('[test-suite] constructs: invalid operations should not raise errors when not executed', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        if false then a = 3 // 0; a = 0 % 0 end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(checkload + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test('[test-suite] constructs: testing priorities', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        assert(2^3^2 == 2^(3^2));
        assert(2^3*4 == (2^3)*4);
        assert(2.0^-2 == 1/4 and -2^- -2 == - - -4);
        assert(not nil and 2 and not(2>3 or 3<2));
        assert(-3-1-5 == 0+0-9);
        assert(-2^2 == -4 and (-2)^2 == 4 and 2*2-3-1 == 0);
        assert(-3%5 == 2 and -3+5 == 2)
        assert(2*1+3/3 == 3 and 1+2 .. 3*1 == "33");
        assert(not(2+1 > 3*1) and "a".."b" > "a");

        assert("7" .. 3 << 1 == 146)
        assert(10 >> 1 .. "9" == 0)
        assert(10 | 1 .. "9" == 27)

        assert(0xF0 | 0xCC ~ 0xAA & 0xFD == 0xF4)
        assert(0xFD & 0xAA ~ 0xCC | 0xF0 == 0xF4)
        assert(0xF0 & 0x0F + 1 == 0x10)

        assert(3^4//2^3//5 == 2)

        assert(-3+4*5//2^3^2//9+4%10/3 == (-3)+(((4*5)//(2^(3^2)))//9)+((4%10)/3))

        assert(not ((true or false) and nil))
        assert(      true or false  and nil)

        -- old bug
        assert((((1 or false) and true) or false) == true)
        assert((((nil and true) or false) and true) == false)

        local a,b = 1,nil;
        assert(-(1 or 2) == -1 and (1 and 2)+(-1.25 or -4) == 0.75);
        x = ((b or a)+1 == 2 and (10 or a)+1 == 11); assert(x);
        x = (((2<3) or 1) == true and (2<3 and 4) == 4); assert(x);

        x,y=1,2;
        assert((x>y) and x or y == 2);
        x,y=2,1;
        assert((x>y) and x or y == 2);

        assert(1234567890 == tonumber('1234567890') and 1234567890+1 == 1234567891)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(checkload + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test('[test-suite] constructs: silly loops', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        repeat until 1; repeat until true;
        while false do end; while nil do end;

        do  -- test old bug (first name could not be an 'upvalue')
         local a; function f(x) x={a=1}; x={x=1}; x={G=1} end
        end

        function f (i)
          if type(i) ~= 'number' then return i,'jojo'; end;
          if i > 0 then return i, f(i-1); end;
        end

        x = {f(3), f(5), f(10);};
        assert(x[1] == 3 and x[2] == 5 and x[3] == 10 and x[4] == 9 and x[12] == 1);
        assert(x[nil] == nil)
        x = {f'alo', f'xixi', nil};
        assert(x[1] == 'alo' and x[2] == 'xixi' and x[3] == nil);
        x = {f'alo'..'xixi'};
        assert(x[1] == 'aloxixi')
        x = {f{}}
        assert(x[2] == 'jojo' and type(x[1]) == 'table')


        local f = function (i)
          if i < 10 then return 'a';
          elseif i < 20 then return 'b';
          elseif i < 30 then return 'c';
          end;
        end

        assert(f(3) == 'a' and f(12) == 'b' and f(26) == 'c' and f(100) == nil)

        for i=1,1000 do break; end;
        n=100;
        i=3;
        t = {};
        a=nil
        while not a do
          a=0; for i=1,n do for i=i,1,-1 do a=a+1; t[i]=1; end; end;
        end
        assert(a == n*(n+1)/2 and i==3);
        assert(t[1] and t[n] and not t[0] and not t[n+1])

        function f(b)
          local x = 1;
          repeat
            local a;
            if b==1 then local b=1; x=10; break
            elseif b==2 then x=20; break;
            elseif b==3 then x=30;
            else local a,b,c,d=math.sin(1); x=x+1;
            end
          until x>=12;
          return x;
        end;

        assert(f(1) == 10 and f(2) == 20 and f(3) == 30 and f(4)==12)


        local f = function (i)
          if i < 10 then return 'a'
          elseif i < 20 then return 'b'
          elseif i < 30 then return 'c'
          else return 8
          end
        end

        assert(f(3) == 'a' and f(12) == 'b' and f(26) == 'c' and f(100) == 8)

        local a, b = nil, 23
        x = {f(100)*2+3 or a, a or b+2}
        assert(x[1] == 19 and x[2] == 25)
        x = {f=2+3 or a, a = b+2}
        assert(x.f == 5 and x.a == 25)

        a={y=1}
        x = {a.y}
        assert(x[1] == 1)

        function f(i)
          while 1 do
            if i>0 then i=i-1;
            else return; end;
          end;
        end;

        function g(i)
          while 1 do
            if i>0 then i=i-1
            else return end
          end
        end

        f(10); g(10);

        do
          function f () return 1,2,3; end
          local a, b, c = f();
          assert(a==1 and b==2 and c==3)
          a, b, c = (f());
          assert(a==1 and b==nil and c==nil)
        end

        local a,b = 3 and f();
        assert(a==1 and b==nil)

        function g() f(); return; end;
        assert(g() == nil)
        function g() return nil or f() end
        a,b = g()
        assert(a==1 and b==nil)

        f = [[
        return function ( a , b , c , d , e )
          local x = a >= b or c or ( d and e ) or nil
          return x
        end , { a = 1 , b = 2 >= 1 , } or { 1 };
        ]]
        f = string.gsub(f, "%s+", "\\n");   -- force a SETLINE between opcodes
        f,a = load(f)();
        assert(a.a == 1 and a.b)

        function g (a,b,c,d,e)
          if not (a>=b or c or d and e or nil) then return 0; else return 1; end;
        end

        function h (a,b,c,d,e)
          while (a>=b or c or (d and e) or nil) do return 1; end;
          return 0;
        end;

        assert(f(2,1) == true and g(2,1) == 1 and h(2,1) == 1)
        assert(f(1,2,'a') == 'a' and g(1,2,'a') == 1 and h(1,2,'a') == 1)
        assert(f(1,2,'a')
        ~=          -- force SETLINE before nil
        nil, "")
        assert(f(1,2,'a') == 'a' and g(1,2,'a') == 1 and h(1,2,'a') == 1)
        assert(f(1,2,nil,1,'x') == 'x' and g(1,2,nil,1,'x') == 1 and
                                           h(1,2,nil,1,'x') == 1)
        assert(f(1,2,nil,nil,'x') == nil and g(1,2,nil,nil,'x') == 0 and
                                             h(1,2,nil,nil,'x') == 0)
        assert(f(1,2,nil,1,nil) == nil and g(1,2,nil,1,nil) == 0 and
                                           h(1,2,nil,1,nil) == 0)

        assert(1 and 2<3 == true and 2<3 and 'a'<'b' == true)
        x = 2<3 and not 3; assert(x==false)
        x = 2<1 or (2>1 and 'a'); assert(x=='a')


        do
          local a; if nil then a=1; else a=2; end;    -- this nil comes as PUSHNIL 2
          assert(a==2)
        end

        function F(a)
          assert(debug.getinfo(1, "n").name == 'F')
          return a,2,3
        end

        a,b = F(1)~=nil; assert(a == true and b == nil);
        a,b = F(nil)==nil; assert(a == true and b == nil)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(checkload + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});

test.skip('[test-suite] constructs: huge loops, upvalue', () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        -- sometimes will be 0, sometimes will not...
        _ENV.GLOB1 = math.floor(os.time()) % 2

        -- basic expressions with their respective values
        local basiccases = {
          {"nil", nil},
          {"false", false},
          {"true", true},
          {"10", 10},
          {"(0==_ENV.GLOB1)", 0 == _ENV.GLOB1},
        }

        print('testing short-circuit optimizations (' .. _ENV.GLOB1 .. ')')


        -- operators with their respective values
        local binops = {
          {" and ", function (a,b) if not a then return a else return b end end},
          {" or ", function (a,b) if a then return a else return b end end},
        }

        local cases = {}

        -- creates all combinations of '(cases[i] op cases[n-i])' plus
        -- 'not(cases[i] op cases[n-i])' (syntax + value)
        local function createcases (n)
          local res = {}
          for i = 1, n - 1 do
            for _, v1 in ipairs(cases[i]) do
              for _, v2 in ipairs(cases[n - i]) do
                for _, op in ipairs(binops) do
                    local t = {
                      "(" .. v1[1] .. op[1] .. v2[1] .. ")",
                      op[2](v1[2], v2[2])
                    }
                    res[#res + 1] = t
                    res[#res + 1] = {"not" .. t[1], not t[2]}
                end
              end
            end
          end
          return res
        end

        -- do not do too many combinations for soft tests
        local level = _soft and 3 or 4

        cases[1] = basiccases
        for i = 2, level do cases[i] = createcases(i) end

        local prog = [[if %s then IX = true end; return %s]]

        local i = 0
        for n = 1, level do
          for _, v in pairs(cases[n]) do
            local s = v[1]
            local p = load(string.format(prog, s, s), "")
            IX = false
            assert(p() == v[2] and IX == not not v[2])
            i = i + 1
            -- if i % 60000 == 0 then print('+') end
          end
        end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(checkload + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] constructs: testing some syntax errors (chosen through 'gcov')", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        _soft = true

        checkload("for x do", "expected")
        checkload("x:call", "expected")

        if not _soft then
          -- control structure too long
          local s = string.rep("a = a + 1\\n", 2^18)
          s = "while true do " .. s .. "end"
          checkload(s, "too long")
        end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(checkload + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});
