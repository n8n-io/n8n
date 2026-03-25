"use strict";

const lua = require('../../src/lua.js');
const lauxlib = require('../../src/lauxlib.js');
const lualib = require('../../src/lualib.js');
const {to_luastring} = require("../../src/fengaricore.js");

const prefix = `
    -- avoid problems with 'strict' module (which may generate other error messages)
    local mt = getmetatable(_G) or {}
    local oldmm = mt.__index
    mt.__index = nil

    local function checkerr (msg, f, ...)
      local st, err = pcall(f, ...)
      assert(not st and string.find(err, msg))
    end


    local function doit (s)
      local f, msg = load(s)
      if f == nil then return msg end
      local cond, msg = pcall(f)
      return (not cond) and msg
    end


    local function checkmessage (prog, msg)
      local m = doit(prog)
      assert(string.find(m, msg, 1, true))
    end

    local function checksyntax (prog, extra, token, line)
      local msg = doit(prog)
      if not string.find(token, "^<%a") and not string.find(token, "^char%(")
        then token = "'"..token.."'" end
      token = string.gsub(token, "(%p)", "%%%1")
      local pt = string.format([[^%%[string ".*"%%]:%d: .- near %s$]],
                               line, token)
      assert(string.find(msg, pt))
      assert(string.find(msg, msg, 1, true))
    end
`;

test("[test-suite] errors: test error message with no extra info", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        assert(doit("error('hi', 0)") == 'hi')
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: test error message with no info", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        assert(doit("error()") == nil)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: test common errors/errors that crashed in the past", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        assert(doit("table.unpack({}, 1, n=2^30)"))
        assert(doit("a=math.sin()"))
        assert(not doit("tostring(1)") and doit("tostring()"))
        assert(doit"tonumber()")
        assert(doit"repeat until 1; a")
        assert(doit"return;;")
        assert(doit"assert(false)")
        assert(doit"assert(nil)")
        assert(doit("function a (... , ...) end"))
        assert(doit("function a (, ...) end"))
        assert(doit("local t={}; t = t[#t] + 1"))

        checksyntax([[
          local a = {4

        ]], "'}' expected (to close '{' at line 1)", "<eof>", 3)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: tests for better error messages", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        checkmessage("a = {} + 1", "arithmetic")
        checkmessage("a = {} | 1", "bitwise operation")
        checkmessage("a = {} < 1", "attempt to compare")
        checkmessage("a = {} <= 1", "attempt to compare")

        checkmessage("a=1; bbbb=2; a=math.sin(3)+bbbb(3)", "global 'bbbb'")
        checkmessage("a={}; do local a=1 end a:bbbb(3)", "method 'bbbb'")
        checkmessage("local a={}; a.bbbb(3)", "field 'bbbb'")
        assert(not string.find(doit"a={13}; local bbbb=1; a[bbbb](3)", "'bbbb'"))
        checkmessage("a={13}; local bbbb=1; a[bbbb](3)", "number")
        checkmessage("a=(1)..{}", "a table value")

        checkmessage("a = #print", "length of a function value")
        checkmessage("a = #3", "length of a number value")

        aaa = nil
        checkmessage("aaa.bbb:ddd(9)", "global 'aaa'")
        checkmessage("local aaa={bbb=1}; aaa.bbb:ddd(9)", "field 'bbb'")
        checkmessage("local aaa={bbb={}}; aaa.bbb:ddd(9)", "method 'ddd'")
        checkmessage("local a,b,c; (function () a = b+1 end)()", "upvalue 'b'")
        assert(not doit"local aaa={bbb={ddd=next}}; aaa.bbb:ddd(nil)")
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: upvalues being indexed do not go to the stack", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        checkmessage("local a,b,cc; (function () a = cc[1] end)()", "upvalue 'cc'")
        checkmessage("local a,b,cc; (function () a.x = 1 end)()", "upvalue 'a'")

        checkmessage("local _ENV = {x={}}; a = a + 1", "global 'a'")

        checkmessage("b=1; local aaa='a'; x=aaa+b", "local 'aaa'")
        checkmessage("aaa={}; x=3/aaa", "global 'aaa'")
        checkmessage("aaa='2'; b=nil;x=aaa*b", "global 'b'")
        checkmessage("aaa={}; x=-aaa", "global 'aaa'")
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: short circuit", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        checkmessage("a=1; local a,bbbb=2,3; a = math.sin(1) and bbbb(3)",
               "local 'bbbb'")
        checkmessage("a=1; local a,bbbb=2,3; a = bbbb(1) or a(3)", "local 'bbbb'")
        checkmessage("local a,b,c,f = 1,1,1; f((a and b) or c)", "local 'f'")
        checkmessage("local a,b,c = 1,1,1; ((a and b) or c)()", "call a number value")
        assert(not string.find(doit"aaa={}; x=(aaa or aaa)+(aaa and aaa)", "'aaa'"))
        assert(not string.find(doit"aaa={}; (aaa or aaa)()", "'aaa'"))

        checkmessage("print(print < 10)", "function with number")
        checkmessage("print(print < print)", "two function values")
        checkmessage("print('10' < 10)", "string with number")
        checkmessage("print(10 < '23')", "number with string")
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: float->integer conversions", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        checkmessage("local a = 2.0^100; x = a << 2", "local a")
        checkmessage("local a = 1 >> 2.0^100", "has no integer representation")
        checkmessage("local a = '10' << 2.0^100", "has no integer representation")
        checkmessage("local a = 2.0^100 & 1", "has no integer representation")
        checkmessage("local a = 2.0^100 & '1'", "has no integer representation")
        checkmessage("local a = 2.0 | 1e40", "has no integer representation")
        checkmessage("local a = 2e100 ~ 1", "has no integer representation")
        checkmessage("string.sub('a', 2.0^100)", "has no integer representation")
        checkmessage("string.rep('a', 3.3)", "has no integer representation")
        checkmessage("return 6e40 & 7", "has no integer representation")
        checkmessage("return 34 << 7e30", "has no integer representation")
        checkmessage("return ~-3e40", "has no integer representation")
        checkmessage("return ~-3.009", "has no integer representation")
        checkmessage("return 3.009 & 1", "has no integer representation")
        checkmessage("return 34 >> {}", "table value")
        checkmessage("a = 24 // 0", "divide by zero")
        checkmessage("a = 1 % 0", "'n%0'")
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: passing light userdata instead of full userdata", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        _G.D = debug
        checkmessage([[
          -- create light udata
          local x = D.upvalueid(function () return debug end, 1)
          D.setuservalue(x, {})
        ]], "light userdata")
        _G.D = nil
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: named objects (field '__name')", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do
          checkmessage("math.sin(io.input())", "(number expected, got FILE*)")
          _G.XX = setmetatable({}, {__name = "My Type"})
          assert(string.find(tostring(XX), "^My Type"))
          checkmessage("io.input(XX)", "(FILE* expected, got My Type)")
          checkmessage("return XX + 1", "on a My Type value")
          checkmessage("return ~io.stdin", "on a FILE* value")
          checkmessage("return XX < XX", "two My Type values")
          checkmessage("return {} < XX", "table with My Type")
          checkmessage("return XX < io.stdin", "My Type with FILE*")
          _G.XX = nil
        end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: global functions", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        checkmessage("(io.write or print){}", "io.write")
        checkmessage("(collectgarbage or print){}", "collectgarbage")
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: errors in functions without debug info", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do
          local f = function (a) return a + 1 end
          f = assert(load(string.dump(f, true)))
          assert(f(3) == 4)
          checkerr("^%?:%-1:", f, {})

          -- code with a move to a local var ('OP_MOV A B' with A<B)
          f = function () local a; a = {}; return a + 2 end
          -- no debug info (so that 'a' is unknown)
          f = assert(load(string.dump(f, true)))
          -- symbolic execution should not get lost
          checkerr("^%?:%-1:.*table value", f)
        end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: tests for field accesses after RK limit", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local t = {}
        for i = 1, 1000 do
          t[i] = "a = x" .. i
        end
        local s = table.concat(t, "; ")
        t = nil
        checkmessage(s.."; a = bbb + 1", "global 'bbb'")
        checkmessage("local _ENV=_ENV;"..s.."; a = bbb + 1", "global 'bbb'")
        checkmessage(s.."; local t = {}; a = t.bbb + 1", "field 'bbb'")
        checkmessage(s.."; local t = {}; t:bbb()", "method 'bbb'")
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: global", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        checkmessage([[aaa=9
        repeat until 3==3
        local x=math.sin(math.cos(3))
        if math.sin(1) == x then return math.sin(1) end   -- tail call
        local a,b = 1, {
          {x='a'..'b'..'c', y='b', z=x},
          {1,2,3,4,5} or 3+3<=3+3,
          3+1>3+1,
          {d = x and aaa[x or y]}}
        ]], "global 'aaa'")
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: field", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        checkmessage([[
        local x,y = {},1
        if math.sin(1) == 0 then return 3 end    -- return
        x.a()]], "field 'a'")
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: global insert", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        checkmessage([[
        prefix = nil
        insert = nil
        while 1 do
          local a
          if nil then break end
          insert(prefix, a)
        end]], "global 'insert'")
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: sin", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        checkmessage([[  -- tail call
          return math.sin("a")
        ]], "'sin'")
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: concatenate", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        checkmessage([[x = print .. "a"]], "concatenate")
        checkmessage([[x = "a" .. false]], "concatenate")
        checkmessage([[x = {} .. 2]], "concatenate")
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: unknown global", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        checkmessage([[
        local Var
        local function main()
          NoSuchName (function() Var=0 end)
        end
        main()
        ]], "global 'NoSuchName'")
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: __index", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        a = {}; setmetatable(a, {__index = string})
        checkmessage("a:sub()", "bad self")
        checkmessage("string.sub('a', {})", "#2")
        checkmessage("('a'):sub{}", "#1")

        checkmessage("table.sort({1,2,3}, table.sort)", "'table.sort'")
        checkmessage("string.gsub('s', 's', setmetatable)", "'setmetatable'")
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: tests for errors in coroutines", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local function f (n)
          local c = coroutine.create(f)
          local a,b = coroutine.resume(c)
          return b
        end
        assert(string.find(f(), "JS stack overflow"))

        checkmessage("coroutine.yield()", "outside a coroutine")

        f = coroutine.wrap(function () table.sort({1,2,3}, coroutine.yield) end)
        checkerr("yield across", f)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: testing size of 'source' info", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        idsize = 60 - 1
        local function checksize (source)
          -- syntax error
          local _, msg = load("x", source)
          msg = string.match(msg, "^([^:]*):")   -- get source (1st part before ':')
          assert(msg:len() <= idsize)
        end

        for i = 60 - 10, 60 + 10 do   -- check border cases around 60
          checksize("@" .. string.rep("x", i))   -- file names
          checksize(string.rep("x", i - 10))     -- string sources
          checksize("=" .. string.rep("x", i))   -- exact sources
        end

    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: testing line error", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local function lineerror (s, l)
          local err,msg = pcall(load(s))
          local line = string.match(msg, ":(%d+):")
          assert((line and line+0) == l)
        end

        lineerror("local a\\n for i=1,'a' do \\n print(i) \\n end", 2)
        lineerror("\\n local a \\n for k,v in 3 \\n do \\n print(k) \\n end", 3)
        lineerror("\\n\\n for k,v in \\n 3 \\n do \\n print(k) \\n end", 4)
        lineerror("function a.x.y ()\\na=a+1\\nend", 1)

        lineerror("a = \\na\\n+\\n{}", 3)
        lineerror("a = \\n3\\n+\\n(\\n4\\n/\\nprint)", 6)
        lineerror("a = \\nprint\\n+\\n(\\n4\\n/\\n7)", 3)

        lineerror("a\\n=\\n-\\n\\nprint\\n;", 3)

        lineerror([[
        a
        (
        23)
        ]], 1)

        lineerror([[
        local a = {x = 13}
        a
        .
        x
        (
        23
        )
        ]], 2)

        lineerror([[
        local a = {x = 13}
        a
        .
        x
        (
        23 + a
        )
        ]], 6)

        local p = [[
          function g() f() end
          function f(x) error('a', X) end
        g()
        ]]
        X=3;lineerror((p), 3)
        X=0;lineerror((p), nil)
        X=1;lineerror((p), 2)
        X=2;lineerror((p), 1)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: several tests that exhaust the Lua stack", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        C = 0
        local l = debug.getinfo(1, "l").currentline; function y () C=C+1; y() end

        local function checkstackmessage (m)
        return (string.find(m, "^.-:%d+: stack overflow"))
        end
        -- repeated stack overflows (to check stack recovery)
        assert(checkstackmessage(doit('y()')))
        assert(checkstackmessage(doit('y()')))
        assert(checkstackmessage(doit('y()')))
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: error lines in stack overflow", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        C = 0
        local l = debug.getinfo(1, "l").currentline; function y () C=C+1; y() end
        local l1
        local function g(x)
          l1 = debug.getinfo(x, "l").currentline; y()
        end
        local _, stackmsg = xpcall(g, debug.traceback, 1)
        local stack = {}
        for line in string.gmatch(stackmsg, "[^\\n]*") do
          local curr = string.match(line, ":(%d+):")
          if curr then table.insert(stack, tonumber(curr)) end
        end
        local i=1
        while stack[i] ~= l1 do
          assert(stack[i] == l)
          i = i+1
        end
        assert(i > 15)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: error in error handling", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local res, msg = xpcall(error, error)
        assert(not res and type(msg) == 'string')

        local function f (x)
          if x==0 then error('a\\n')
          else
            local aux = function () return f(x-1) end
            local a,b = xpcall(aux, aux)
            return a,b
          end
        end
        f(3)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: too many results", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local function loop (x,y,z) return 1 + loop(x, y, z) end

        local res, msg = xpcall(loop, function (m)
          assert(string.find(m, "stack overflow"))
          checkerr("error handling", loop)
          assert(math.sin(0) == 0)
          return 15
        end)
        assert(msg == 15)

        local f = function ()
          for i = 999900, 1000000, 1 do table.unpack({}, 1, i) end
        end
        checkerr("too many results", f)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: non string messages", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        do
          -- non string messages
          local t = {}
          local res, msg = pcall(function () error(t) end)
          assert(not res and msg == t)

          res, msg = pcall(function () error(nil) end)
          assert(not res and msg == nil)

          local function f() error{msg='x'} end
          res, msg = xpcall(f, function (r) return {msg=r.msg..'y'} end)
          assert(msg.msg == 'xy')

          -- 'assert' with extra arguments
          res, msg = pcall(assert, false, "X", t)
          assert(not res and msg == "X")

          -- 'assert' with no message
          res, msg = pcall(function () assert(false) end)
          local line = string.match(msg, "%w+%.lua:(%d+): assertion failed!$")
          assert(tonumber(line) == debug.getinfo(1, "l").currentline - 2)

          -- 'assert' with non-string messages
          res, msg = pcall(assert, false, t)
          assert(not res and msg == t)

          res, msg = pcall(assert, nil, nil)
          assert(not res and msg == nil)

          -- 'assert' without arguments
          res, msg = pcall(assert)
          assert(not res and string.find(msg, "value expected"))
        end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadbuffer(L, to_luastring(prefix + luaCode), null, to_luastring("@errors.lua")) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: xpcall with arguments", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        a, b, c = xpcall(string.find, error, "alo", "al")
        assert(a and b == 1 and c == 2)
        a, b, c = xpcall(string.find, function (x) return {} end, true, "al")
        assert(not a and type(b) == "table" and c == nil)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: testing tokens in error messages", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        checksyntax("syntax error", "", "error", 1)
        checksyntax("1.000", "", "1.000", 1)
        checksyntax("[[a]]", "", "[[a]]", 1)
        checksyntax("'aa'", "", "'aa'", 1)
        checksyntax("while << do end", "", "<<", 1)
        checksyntax("for >> do end", "", ">>", 1)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: test invalid non-printable char in a chunk", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        checksyntax("a\\1a = 1", "", "<\\\\1>", 1)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: test 255 as first char in a chunk", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        checksyntax("\\255a = 1", "", "<\\\\255>", 1)

        doit('I = load("a=9+"); a=3')
        assert(a==3 and I == nil)
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: lots of errors", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        lim = 1000
        if _soft then lim = 100 end
        for i=1,lim do
          doit('a = ')
          doit('a = 4+nil')
        end
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: testing syntax limits", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local maxClevel = 200    -- LUAI_MAXCCALLS (in llimits.h)

        local function testrep (init, rep, close, repc)
          local s = init .. string.rep(rep, maxClevel - 10) .. close ..
                       string.rep(repc, maxClevel - 10)
          assert(load(s))   -- 190 levels is OK
          s = init .. string.rep(rep, maxClevel + 1)
          checkmessage(s, "too many JS levels")
        end

        testrep("local a; a", ",a", "= 1", ",1")    -- multiple assignment
        testrep("local a; a=", "{", "0", "}")
        testrep("local a; a=", "(", "2", ")")
        testrep("local a; ", "a(", "2", ")")
        testrep("", "do ", "", " end")
        testrep("", "while a do ", "", " end")
        testrep("local a; ", "if a then else ", "", " end")
        testrep("", "function foo () ", "", " end")
        testrep("local a; a=", "a..", "a", "")
        testrep("local a; a=", "a^", "a", "")

        checkmessage("a = f(x" .. string.rep(",x", 260) .. ")", "too many registers")
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: upvalues limit", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        local lim = 127
        local  s = "local function fooA ()\\n  local "
        for j = 1,lim do
          s = s.."a"..j..", "
        end
        s = s.."b,c\\n"
        s = s.."local function fooB ()\\n  local "
        for j = 1,lim do
          s = s.."b"..j..", "
        end
        s = s.."b\\n"
        s = s.."function fooC () return b+c"
        local c = 1+2
        for j = 1,lim do
          s = s.."+a"..j.."+b"..j
          c = c + 2
        end
        s = s.."\\nend  end end"
        local a,b = load(s)
        assert(c > 255 and string.find(b, "too many upvalues") and
               string.find(b, "line 5"))
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});


test("[test-suite] errors: local variables limit", () => {
    let L = lauxlib.luaL_newstate();
    if (!L) throw Error("failed to create lua state");

    let luaCode = `
        s = "\\nfunction foo ()\\n  local "
        for j = 1,300 do
          s = s.."a"..j..", "
        end
        s = s.."b\\n"
        local a,b = load(s)
        assert(string.find(b, "line 2") and string.find(b, "too many local variables"))
    `;
    lualib.luaL_openlibs(L);
    if (lauxlib.luaL_loadstring(L, to_luastring(prefix + luaCode)) === lua.LUA_ERRSYNTAX)
        throw new SyntaxError(lua.lua_tojsstring(L, -1));
    lua.lua_call(L, 0, 0);
});
