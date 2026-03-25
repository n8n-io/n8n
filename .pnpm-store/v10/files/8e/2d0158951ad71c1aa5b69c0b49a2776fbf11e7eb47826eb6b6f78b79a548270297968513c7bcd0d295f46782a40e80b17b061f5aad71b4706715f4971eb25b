[![Build Status](https://travis-ci.org/fengari-lua/fengari.svg?branch=master)](https://travis-ci.org/fengari-lua/fengari)
[![npm](https://img.shields.io/npm/v/fengari.svg)](https://npmjs.com/package/fengari)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![#fengari on Freenode](https://img.shields.io/Freenode/%23fengari.png)](https://webchat.freenode.net/?channels=fengari)
[![Code Quality: Javascript](https://img.shields.io/lgtm/grade/javascript/g/fengari-lua/fengari.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/fengari-lua/fengari/context:javascript)
[![Total Alerts](https://img.shields.io/lgtm/alerts/g/fengari-lua/fengari.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/fengari-lua/fengari/alerts)

<p align="center">
    <img src="https://github.com/fengari-lua/fengari/raw/master/logo.png" alt="Fengari" width="304" height="304">
</p>


# Fengari

🐺 φεγγάρι - The Lua VM written in JS ES6 for Node and the browser

This repository contains the core fengari code (which is a port of the Lua C library) which includes parser, virtual machine and base libraries.
However it is rare to use this repository directly.

- To use fengari in a web browser as easily as you might use JavaScript, see [fengari-web](https://github.com/fengari-lua/fengari-web)
- [fengari-interop](https://github.com/fengari-lua/fengari-interop) is a lua library that makes interoperating with JavaScript objects simple, it is already included in fengari-web.
- For a clone of the `lua` command line tool, but running under node.js, see [fengari-node-cli](https://github.com/fengari-lua/fengari-node-cli)

### The JS API

Once you've loaded fengari, you can use the JS API:

```js
const luaconf  = fengari.luaconf;
const lua      = fengari.lua;
const lauxlib  = fengari.lauxlib;
const lualib   = fengari.lualib;

const L = lauxlib.luaL_newstate();

lualib.luaL_openlibs(L);

lua.lua_pushliteral(L, "hello world!");
```

The JS API is exactly the same as the C API so `fengari.lua` exposes the same constants and functions as `lua.h`, `fengari.lauxlib` the same as `lauxlib.h` and `fengari.lualib` the same as `lualib.h`. If you're unfamiliar with the C API, you can take a look at [the manual](http://www.lua.org/manual/5.3/manual.html#4).


## Semantics

Fengari implements Lua 5.3 semantics and will hopefully follow future Lua releases. If you find any noticeable difference between Fengari and Lua's behaviours, please [report it](https://github.com/fengari-lua/fengari/issues).

### Strings

Lua strings are 8-bits clean and can embed `\0`. Which means that invalid UTF-8/16 strings are valid Lua strings. Lua functions like `string.dump` even use strings as a way of storing binary data.

To address that issue, Fengari uses [`Uint8Array`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array) objects containing the raw bytes to implement lua strings. To push a JS string on the stack you can use `lua_pushliteral` which will convert it to an array of bytes before pushing it. To get a Lua string on the stack as a JS string you can use `lua_tojsstring` which will attempt to convert it to a UTF-16 JS string. The latter won't give you what you expect if the Lua string is not a valid UTF-16 sequence. You can also convert strings with `luastring_of`, `to_luastring`, `to_jsstring` and `to_uristring`.


### Integers

The JS number type is always a double, and hence cannot accurately represent integers with more than 53 bits. As such, we've taken the route of a rarely used define (`LUA_INT_TYPE=LUA_INT_LONG`) in the PUC-Rio sources, where floats are doubles, but integers are 32 bits.


### `require` and `package.loadlib`

In the browser `require` and `package.loadlib` try to find a file by making synchronous XHR requests.

`require` has been extended to allow searchers to yield.


### _Missing_ features

- `lua_gc`/`collectgarbage`: Fengari relies on the JS garbage collector and does not implement its own.
- The following functions are only available in Node:
    - The entire `io` lib
    - `os.remove`
    - `os.rename`
    - `os.tmpname`
    - `os.execute`
- `debug.debug()` doesn't work from web workers due to lack of a method to get synchronous user input
- [Weak tables](http://www.lua.org/manual/5.3/manual.html#2.5.2)
- `__gc` metamethods


### _Differences_

- `package.jspath` instead of `package.cpath`
- `LUA_JSPATH_DEFAULT` instead of `LUA_CPATH_DEFAULT` (and contains .js extensions rather than .so or .dll extensions)
- `lua_tointegerx` and `lua_tonumberx` do not have out-parameters indicating conversion success. Instead, ``false`` is returned when conversion fails.
- `luaL_execresult` takes an extra argument: an error object. The error object should have a fields `status`, `signal` and `errno`.
- `luaL_fileresult` takes an extra argument: an error object. The error object should have a field `errno`.


### Configuring

Some luaconf options can be chosen at library load time. Fengari looks for `process.env.FENGARICONF` and if it exists, parses it as a JSON string.


## Extensions

### `dv = lua_todataview(L, idx)`

Equivalent to `lua_tolstring` but returns a [`DataView`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView) instead of a string.


### `lua_pushjsfunction(L, func)`

Alias for `lua_pushcfunction`.


### `lua_pushjsclosure(L, func, n)`

Alias for `lua_pushcclosure`.


### `lua_atnativeerror(L, func)`

Sets a function to be called if a native JavaScript error is thrown across a lua pcall.
The function will be run as if it were a message handler (see https://www.lua.org/manual/5.3/manual.html#2.3).
The current message handler will be run after the native error handler returns.


### `b = lua_isproxy(p, L)`

Returns a boolean `b` indicating whether `p` is a proxy (See `lua_toproxy`).
If `L` is non-null, only returns `true` if `p` belongs to the same global state.


### `p = lua_toproxy(L, idx)`

Returns a JavaScript object `p` that holds a reference to the lua value at the stack index `idx`.
This object can be called with a lua_State to push the value onto that state's stack.

This example would be an inefficient way to write `lua_pushvalue(L, 1)`:

```js
var p = lua_toproxy(L, 1);
p(L);
````


### `fengari` library

A library containing metadata about the fengari release.

  - `AUTHORS`
  - `COPYRIGHT`
  - `RELEASE`
  - `VERSION`
  - `VERSION_MAJOR`
  - `VERSION_MINOR`
  - `VERSION_NUM`
  - `VERSION_RELEASE`

This library is automatically loaded by `luaL_openlibs` into the global `"fengari"`.


## NYI

- `io.input()`: partially implemented
- `io.lines()`
- `io.open()`
- `io.output()`: partially implemented
- `io.popen()`
- `io.read()`
- `io.tmpfile()`
- `file:lines()`
- `file:read()`
- `file:setvbuf()`
- `file:__gc()`


## References

- [Source code for Lua 5.3](lua.org/source/5.3/)
- [Lua 5.2 Bytecode and Virtual Machine](http://files.catwell.info/misc/mirror/lua-5.2-bytecode-vm-dirk-laurie/lua52vm.html)
- [Lua 5.3 Bytecode Reference](http://the-ravi-programming-language.readthedocs.io/en/latest/lua_bytecode_reference.html)
- [A No-Frills Introduction to Lua 5.1 VM Instructions](http://luaforge.net/docman/83/98/ANoFrillsIntroToLua51VMInstructions.pdf)
