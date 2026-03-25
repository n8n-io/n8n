"use strict";

const {
    LUA_DIRSEP,
    LUA_EXEC_DIR,
    LUA_JSPATH_DEFAULT,
    LUA_PATH_DEFAULT,
    LUA_PATH_MARK,
    LUA_PATH_SEP
} = require('./luaconf.js');
const {
    LUA_OK,
    LUA_REGISTRYINDEX,
    LUA_TNIL,
    LUA_TTABLE,
    lua_callk,
    lua_createtable,
    lua_getfield,
    lua_insert,
    lua_isfunction,
    lua_isnil,
    lua_isstring,
    lua_newtable,
    lua_pop,
    lua_pushboolean,
    lua_pushcclosure,
    lua_pushcfunction,
    lua_pushfstring,
    lua_pushglobaltable,
    lua_pushlightuserdata,
    lua_pushliteral,
    lua_pushlstring,
    lua_pushnil,
    lua_pushstring,
    lua_pushvalue,
    lua_rawgeti,
    lua_rawgetp,
    lua_rawseti,
    lua_rawsetp,
    lua_remove,
    lua_setfield,
    lua_setmetatable,
    lua_settop,
    lua_toboolean,
    lua_tostring,
    lua_touserdata,
    lua_upvalueindex
} = require('./lua.js');
const {
    LUA_LOADED_TABLE,
    LUA_PRELOAD_TABLE,
    luaL_Buffer,
    luaL_addvalue,
    luaL_buffinit,
    luaL_checkstring,
    luaL_error,
    luaL_getsubtable,
    luaL_gsub,
    luaL_len,
    luaL_loadfile,
    luaL_newlib,
    luaL_optstring,
    luaL_pushresult,
    luaL_setfuncs
} = require('./lauxlib.js');
const lualib = require('./lualib.js');
const {
    luastring_indexOf,
    to_jsstring,
    to_luastring,
    to_uristring
} = require("./fengaricore.js");
const fengari  = require('./fengari.js');

const global_env = (function() {
    if (typeof process !== "undefined") {
        /* node */
        return global;
    } else if (typeof window !== "undefined") {
        /* browser window */
        return window;
    } else if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
        /* web worker */
        return self;
    } else {
        /* unknown global env */
        return (0, eval)('this'); /* use non-strict mode to get global env */
    }
})();

const JSLIBS = to_luastring("__JSLIBS__");
const LUA_PATH_VAR = "LUA_PATH";
const LUA_JSPATH_VAR = "LUA_JSPATH";

const LUA_IGMARK = "-";

/*
** LUA_CSUBSEP is the character that replaces dots in submodule names
** when searching for a JS loader.
** LUA_LSUBSEP is the character that replaces dots in submodule names
** when searching for a Lua loader.
*/
const LUA_CSUBSEP = LUA_DIRSEP;
const LUA_LSUBSEP = LUA_DIRSEP;

/* prefix for open functions in JS libraries */
const LUA_POF = to_luastring("luaopen_");

/* separator for open functions in JS libraries */
const LUA_OFSEP = to_luastring("_");
const LIB_FAIL = "open";

const AUXMARK = to_luastring("\x01");


/*
** load JS library in file 'path'. If 'seeglb', load with all names in
** the library global.
** Returns the library; in case of error, returns NULL plus an
** error string in the stack.
*/
let lsys_load;
if (typeof process === "undefined") {
    lsys_load = function(L, path, seeglb) {
        path = to_uristring(path);
        let xhr = new XMLHttpRequest();
        xhr.open("GET", path, false);
        xhr.send();

        if (xhr.status < 200 || xhr.status >= 300) {
            lua_pushstring(L, to_luastring(`${xhr.status}: ${xhr.statusText}`));
            return null;
        }

        let code = xhr.response;
        /* Add sourceURL comment to get path in debugger+tracebacks */
        if (!/\/\/[#@] sourceURL=/.test(code))
            code += " //# sourceURL=" + path;
        let func;
        try {
            func = Function("fengari", code);
        } catch (e) {
            lua_pushstring(L, to_luastring(`${e.name}: ${e.message}`));
            return null;
        }
        let res = func(fengari);
        if (typeof res === "function" || (typeof res === "object" && res !== null)) {
            return res;
        } else if (res === void 0) { /* assume library added symbols to global environment */
            return global_env;
        } else {
            lua_pushstring(L, to_luastring(`library returned unexpected type (${typeof res})`));
            return null;
        }
    };
} else {
    const pathlib = require('path');
    lsys_load = function(L, path, seeglb) {
        path = to_jsstring(path);
        /* relative paths should be relative to cwd, not this js file */
        path = pathlib.resolve(process.cwd(), path);
        try {
            return require(path);
        } catch (e) {
            lua_pushstring(L, to_luastring(e.message));
            return null;
        }
    };
}

/*
** Try to find a function named 'sym' in library 'lib'.
** Returns the function; in case of error, returns NULL plus an
** error string in the stack.
*/
const lsys_sym = function(L, lib, sym) {
    let f = lib[to_jsstring(sym)];

    if (f && typeof f === 'function')
        return f;
    else {
        lua_pushfstring(L, to_luastring("undefined symbol: %s"), sym);
        return null;
    }
};

/*
** return registry.LUA_NOENV as a boolean
*/
const noenv = function(L) {
    lua_getfield(L, LUA_REGISTRYINDEX, to_luastring("LUA_NOENV"));
    let b = lua_toboolean(L, -1);
    lua_pop(L, 1);  /* remove value */
    return b;
};

let readable;
if (typeof process !== "undefined") { // Only with Node
    const fs = require('fs');

    readable = function(filename) {
        try {
            let fd = fs.openSync(filename, 'r');
            fs.closeSync(fd);
        } catch (e) {
            return false;
        }
        return true;
    };
} else {
    readable = function(path) {
        path = to_uristring(path);
        let xhr = new XMLHttpRequest();
        /* Following GET request done by searcher_Web will be cached */
        xhr.open("GET", path, false);
        xhr.send();

        return xhr.status >= 200 && xhr.status <= 299;
    };
}


/* error codes for 'lookforfunc' */
const ERRLIB  = 1;
const ERRFUNC = 2;

/*
** Look for a C function named 'sym' in a dynamically loaded library
** 'path'.
** First, check whether the library is already loaded; if not, try
** to load it.
** Then, if 'sym' is '*', return true (as library has been loaded).
** Otherwise, look for symbol 'sym' in the library and push a
** C function with that symbol.
** Return 0 and 'true' or a function in the stack; in case of
** errors, return an error code and an error message in the stack.
*/
const lookforfunc = function(L, path, sym) {
    let reg = checkjslib(L, path);  /* check loaded JS libraries */
    if (reg === null) {  /* must load library? */
        reg = lsys_load(L, path, sym[0] === '*'.charCodeAt(0));  /* a global symbols if 'sym'=='*' */
        if (reg === null) return ERRLIB;  /* unable to load library */
        addtojslib(L, path, reg);
    }
    if (sym[0] === '*'.charCodeAt(0)) {  /* loading only library (no function)? */
        lua_pushboolean(L, 1);  /* return 'true' */
        return 0;  /* no errors */
    }
    else {
        let f = lsys_sym(L, reg, sym);
        if (f === null)
            return ERRFUNC;  /* unable to find function */
        lua_pushcfunction(L, f);  /* else create new function */
        return 0;  /* no errors */
    }
};

const ll_loadlib = function(L) {
    let path = luaL_checkstring(L, 1);
    let init = luaL_checkstring(L, 2);
    let stat = lookforfunc(L, path, init);
    if (stat === 0)  /* no errors? */
        return 1;  /* return the loaded function */
    else {  /* error; error message is on stack top */
        lua_pushnil(L);
        lua_insert(L, -2);
        lua_pushliteral(L, (stat === ERRLIB) ? LIB_FAIL : "init");
        return 3;  /* return nil, error message, and where */
    }
};

const env = (function() {
    if (typeof process !== "undefined") {
        /* node */
        return process.env;
    } else {
        return global_env;
    }
})();

/*
** Set a path
*/
const setpath = function(L, fieldname, envname, dft) {
    let nver = `${envname}${lualib.LUA_VERSUFFIX}`;
    lua_pushstring(L, to_luastring(nver));
    let path = env[nver];  /* use versioned name */
    if (path === undefined)  /* no environment variable? */
        path = env[envname];  /* try unversioned name */
    if (path === undefined || noenv(L))  /* no environment variable? */
        lua_pushstring(L, dft);  /* use default */
    else {
        /* replace ";;" by ";AUXMARK;" and then AUXMARK by default path */
        path = luaL_gsub(
            L,
            to_luastring(path),
            to_luastring(LUA_PATH_SEP + LUA_PATH_SEP, true),
            to_luastring(LUA_PATH_SEP + to_jsstring(AUXMARK) + LUA_PATH_SEP, true)
        );
        luaL_gsub(L, path, AUXMARK, dft);
        lua_remove(L, -2); /* remove result from 1st 'gsub' */
    }
    lua_setfield(L, -3, fieldname);  /* package[fieldname] = path value */
    lua_pop(L, 1);  /* pop versioned variable name */
};

/*
** return registry.JSLIBS[path]
*/
const checkjslib = function(L, path) {
    lua_rawgetp(L, LUA_REGISTRYINDEX, JSLIBS);
    lua_getfield(L, -1, path);
    let plib = lua_touserdata(L, -1);  /* plib = JSLIBS[path] */
    lua_pop(L, 2);  /* pop JSLIBS table and 'plib' */
    return plib;
};

/*
** registry.JSLIBS[path] = plib        -- for queries
** registry.JSLIBS[#JSLIBS + 1] = plib  -- also keep a list of all libraries
*/
const addtojslib = function(L, path, plib) {
    lua_rawgetp(L, LUA_REGISTRYINDEX, JSLIBS);
    lua_pushlightuserdata(L, plib);
    lua_pushvalue(L, -1);
    lua_setfield(L, -3, path);  /* JSLIBS[path] = plib */
    lua_rawseti(L, -2, luaL_len(L, -2) + 1);  /* JSLIBS[#JSLIBS + 1] = plib */
    lua_pop(L, 1);  /* pop JSLIBS table */
};

const pushnexttemplate = function(L, path) {
    while (path[0] === LUA_PATH_SEP.charCodeAt(0)) path = path.subarray(1);  /* skip separators */
    if (path.length === 0) return null;  /* no more templates */
    let l = luastring_indexOf(path, LUA_PATH_SEP.charCodeAt(0));  /* find next separator */
    if (l < 0) l = path.length;
    lua_pushlstring(L, path, l);  /* template */
    return path.subarray(l);
};

const searchpath = function(L, name, path, sep, dirsep) {
    let msg = new luaL_Buffer();  /* to build error message */
    luaL_buffinit(L, msg);
    if (sep[0] !== 0)  /* non-empty separator? */
        name = luaL_gsub(L, name, sep, dirsep);  /* replace it by 'dirsep' */
    while ((path = pushnexttemplate(L, path)) !== null) {
        let filename = luaL_gsub(L, lua_tostring(L, -1), to_luastring(LUA_PATH_MARK, true), name);
        lua_remove(L, -2);  /* remove path template */
        if (readable(filename))  /* does file exist and is readable? */
            return filename;  /* return that file name */
        lua_pushfstring(L, to_luastring("\n\tno file '%s'"), filename);
        lua_remove(L, -2);  /* remove file name */
        luaL_addvalue(msg);
    }
    luaL_pushresult(msg);  /* create error message */
    return null;  /* not found */
};

const ll_searchpath = function(L) {
    let f = searchpath(
        L,
        luaL_checkstring(L, 1),
        luaL_checkstring(L, 2),
        luaL_optstring(L, 3, "."),
        luaL_optstring(L, 4, LUA_DIRSEP)
    );
    if (f !== null) return 1;
    else {  /* error message is on top of the stack */
        lua_pushnil(L);
        lua_insert(L, -2);
        return 2;  /* return nil + error message */
    }
};

const findfile = function(L, name, pname, dirsep) {
    lua_getfield(L, lua_upvalueindex(1), pname);
    let path = lua_tostring(L, -1);
    if (path === null)
        luaL_error(L, to_luastring("'package.%s' must be a string"), pname);
    return searchpath(L, name, path, to_luastring("."), dirsep);
};

const checkload = function(L, stat, filename) {
    if (stat) {  /* module loaded successfully? */
        lua_pushstring(L, filename);  /* will be 2nd argument to module */
        return 2;  /* return open function and file name */
    } else
        return luaL_error(L, to_luastring("error loading module '%s' from file '%s':\n\t%s"),
            lua_tostring(L, 1), filename, lua_tostring(L, -1));
};

const searcher_Lua = function(L) {
    let name = luaL_checkstring(L, 1);
    let filename = findfile(L, name, to_luastring("path", true), to_luastring(LUA_LSUBSEP, true));
    if (filename === null) return 1;  /* module not found in this path */
    return checkload(L, luaL_loadfile(L, filename) === LUA_OK, filename);
};

/*
** Try to find a load function for module 'modname' at file 'filename'.
** First, change '.' to '_' in 'modname'; then, if 'modname' has
** the form X-Y (that is, it has an "ignore mark"), build a function
** name "luaopen_X" and look for it. (For compatibility, if that
** fails, it also tries "luaopen_Y".) If there is no ignore mark,
** look for a function named "luaopen_modname".
*/
const loadfunc = function(L, filename, modname) {
    let openfunc;
    modname = luaL_gsub(L, modname, to_luastring("."), LUA_OFSEP);
    let mark = luastring_indexOf(modname, LUA_IGMARK.charCodeAt(0));
    if (mark >= 0) {
        openfunc = lua_pushlstring(L, modname, mark);
        openfunc = lua_pushfstring(L, to_luastring("%s%s"), LUA_POF, openfunc);
        let stat = lookforfunc(L, filename, openfunc);
        if (stat !== ERRFUNC) return stat;
        modname = mark + 1;  /* else go ahead and try old-style name */
    }
    openfunc = lua_pushfstring(L, to_luastring("%s%s"), LUA_POF, modname);
    return lookforfunc(L, filename, openfunc);
};

const searcher_C = function(L) {
    let name = luaL_checkstring(L, 1);
    let filename = findfile(L, name, to_luastring("jspath", true), to_luastring(LUA_CSUBSEP, true));
    if (filename === null) return 1;  /* module not found in this path */
    return checkload(L, (loadfunc(L, filename, name) === 0), filename);
};

const searcher_Croot = function(L) {
    let name = luaL_checkstring(L, 1);
    let p = luastring_indexOf(name, '.'.charCodeAt(0));
    let stat;
    if (p < 0) return 0;  /* is root */
    lua_pushlstring(L, name, p);
    let filename = findfile(L, lua_tostring(L, -1), to_luastring("jspath", true), to_luastring(LUA_CSUBSEP, true));
    if (filename === null) return 1;  /* root not found */
    if ((stat = loadfunc(L, filename, name)) !== 0) {
        if (stat != ERRFUNC)
            return checkload(L, 0, filename);  /* real error */
        else {  /* open function not found */
            lua_pushstring(L, to_luastring("\n\tno module '%s' in file '%s'"), name, filename);
            return 1;
        }
    }
    lua_pushstring(L, filename);  /* will be 2nd argument to module */
    return 2;
};

const searcher_preload = function(L) {
    let name = luaL_checkstring(L, 1);
    lua_getfield(L, LUA_REGISTRYINDEX, LUA_PRELOAD_TABLE);
    if (lua_getfield(L, -1, name) === LUA_TNIL)  /* not found? */
        lua_pushfstring(L, to_luastring("\n\tno field package.preload['%s']"), name);
    return 1;
};

const findloader = function(L, name, ctx, k) {
    let msg = new luaL_Buffer();  /* to build error message */
    luaL_buffinit(L, msg);
    /* push 'package.searchers' to index 3 in the stack */
    if (lua_getfield(L, lua_upvalueindex(1), to_luastring("searchers", true)) !== LUA_TTABLE)
        luaL_error(L, to_luastring("'package.searchers' must be a table"));
    let ctx2 = {name: name, i: 1, msg: msg, ctx: ctx, k: k};
    return findloader_cont(L, LUA_OK, ctx2);
};

const findloader_cont = function(L, status, ctx) {
    /*  iterate over available searchers to find a loader */
    for (; ; ctx.i++) {
        if (status === LUA_OK) {
            if (lua_rawgeti(L, 3, ctx.i) === LUA_TNIL) {  /* no more searchers? */
                lua_pop(L, 1);  /* remove nil */
                luaL_pushresult(ctx.msg);  /* create error message */
                luaL_error(L, to_luastring("module '%s' not found:%s"), ctx.name, lua_tostring(L, -1));
            }
            lua_pushstring(L, ctx.name);
            lua_callk(L, 1, 2, ctx, findloader_cont);  /* call it */
        } else {
            status = LUA_OK;
        }
        if (lua_isfunction(L, -2))  /* did it find a loader? */
            break;  /* module loader found */
        else if (lua_isstring(L, -2)) {  /* searcher returned error message? */
            lua_pop(L, 1);  /* remove extra return */
            luaL_addvalue(ctx.msg);  /* concatenate error message */
        }
        else
            lua_pop(L, 2);  /* remove both returns */
    }
    return ctx.k(L, LUA_OK, ctx.ctx);
};

const ll_require = function(L) {
    let name = luaL_checkstring(L, 1);
    lua_settop(L, 1);  /* LOADED table will be at index 2 */
    lua_getfield(L, LUA_REGISTRYINDEX, LUA_LOADED_TABLE);
    lua_getfield(L, 2, name);  /* LOADED[name] */
    if (lua_toboolean(L, -1))  /* is it there? */
        return 1;  /* package is already loaded */
    /* else must load package */
    lua_pop(L, 1);  /* remove 'getfield' result */
    let ctx = name;
    return findloader(L, name, ctx, ll_require_cont);
};

const ll_require_cont = function(L, status, ctx) {
    let name = ctx;
    lua_pushstring(L, name);  /* pass name as argument to module loader */
    lua_insert(L, -2);  /* name is 1st argument (before search data) */
    lua_callk(L, 2, 1, ctx, ll_require_cont2);
    return ll_require_cont2(L, LUA_OK, ctx);  /* run loader to load module */
};

const ll_require_cont2 = function(L, status, ctx) {
    let name = ctx;
    if (!lua_isnil(L, -1))  /* non-nil return? */
        lua_setfield(L, 2, name);  /* LOADED[name] = returned value */
    if (lua_getfield(L, 2, name) == LUA_TNIL) {   /* module set no value? */
        lua_pushboolean(L, 1);  /* use true as result */
        lua_pushvalue(L, -1);  /* extra copy to be returned */
        lua_setfield(L, 2, name);  /* LOADED[name] = true */
    }
    return 1;
};

const pk_funcs = {
    "loadlib": ll_loadlib,
    "searchpath": ll_searchpath
};

const ll_funcs = {
    "require": ll_require
};

const createsearcherstable = function(L) {
    let searchers = [searcher_preload, searcher_Lua, searcher_C, searcher_Croot, null];
    /* create 'searchers' table */
    lua_createtable(L);
    /* fill it with predefined searchers */
    for (let i = 0; searchers[i]; i++) {
        lua_pushvalue(L, -2);  /* set 'package' as upvalue for all searchers */
        lua_pushcclosure(L, searchers[i], 1);
        lua_rawseti(L, -2, i+1);
    }
    lua_setfield(L, -2, to_luastring("searchers", true));  /* put it in field 'searchers' */
};

/*
** create table JSLIBS to keep track of loaded JS libraries,
** setting a finalizer to close all libraries when closing state.
*/
const createjslibstable = function(L) {
    lua_newtable(L);  /* create JSLIBS table */
    lua_createtable(L, 0, 1);  /* create metatable for JSLIBS */
    lua_setmetatable(L, -2);
    lua_rawsetp(L, LUA_REGISTRYINDEX, JSLIBS);  /* set JSLIBS table in registry */
};

const luaopen_package = function(L) {
    createjslibstable(L);
    luaL_newlib(L, pk_funcs);  /* create 'package' table */
    createsearcherstable(L);
    /* set paths */
    setpath(L, to_luastring("path", true), LUA_PATH_VAR, LUA_PATH_DEFAULT);
    setpath(L, to_luastring("jspath", true), LUA_JSPATH_VAR, LUA_JSPATH_DEFAULT);
    /* store config information */
    lua_pushliteral(L, LUA_DIRSEP + "\n" + LUA_PATH_SEP + "\n" + LUA_PATH_MARK + "\n" +
                        LUA_EXEC_DIR + "\n" + LUA_IGMARK + "\n");
    lua_setfield(L, -2, to_luastring("config", true));
    /* set field 'loaded' */
    luaL_getsubtable(L, LUA_REGISTRYINDEX, LUA_LOADED_TABLE);
    lua_setfield(L, -2, to_luastring("loaded", true));
    /* set field 'preload' */
    luaL_getsubtable(L, LUA_REGISTRYINDEX, LUA_PRELOAD_TABLE);
    lua_setfield(L, -2, to_luastring("preload", true));
    lua_pushglobaltable(L);
    lua_pushvalue(L, -2);  /* set 'package' as upvalue for next lib */
    luaL_setfuncs(L, ll_funcs, 1);  /* open lib into global table */
    lua_pop(L, 1);  /* pop global table */
    return 1;  /* return 'package' table */
};

module.exports.luaopen_package = luaopen_package;
