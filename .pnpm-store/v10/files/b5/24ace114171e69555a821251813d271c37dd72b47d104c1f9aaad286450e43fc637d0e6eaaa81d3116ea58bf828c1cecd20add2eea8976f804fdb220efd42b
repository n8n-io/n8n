"use strict";

const {
    LUA_OK,
    LUA_TFUNCTION,
    LUA_TSTRING,
    LUA_YIELD,
    lua_Debug,
    lua_checkstack,
    lua_concat,
    lua_error,
    lua_getstack,
    lua_gettop,
    lua_insert,
    lua_isyieldable,
    lua_newthread,
    lua_pop,
    lua_pushboolean,
    lua_pushcclosure,
    lua_pushliteral,
    lua_pushthread,
    lua_pushvalue,
    lua_resume,
    lua_status,
    lua_tothread,
    lua_type,
    lua_upvalueindex,
    lua_xmove,
    lua_yield
} = require('./lua.js');
const {
    luaL_argcheck,
    luaL_checktype,
    luaL_newlib,
    luaL_where
} = require('./lauxlib.js');

const getco = function(L) {
    let co = lua_tothread(L, 1);
    luaL_argcheck(L, co, 1, "thread expected");
    return co;
};

const auxresume = function(L, co, narg) {
    if (!lua_checkstack(co, narg)) {
        lua_pushliteral(L, "too many arguments to resume");
        return -1;  /* error flag */
    }

    if (lua_status(co) === LUA_OK && lua_gettop(co) === 0) {
        lua_pushliteral(L, "cannot resume dead coroutine");
        return -1;  /* error flag */
    }

    lua_xmove(L, co, narg);
    let status = lua_resume(co, L, narg);
    if (status === LUA_OK || status === LUA_YIELD) {
        let nres = lua_gettop(co);
        if (!lua_checkstack(L, nres + 1)) {
            lua_pop(co, nres);  /* remove results anyway */
            lua_pushliteral(L, "too many results to resume");
            return -1;  /* error flag */
        }

        lua_xmove(co,  L, nres);  /* move yielded values */
        return nres;
    } else {
        lua_xmove(co, L, 1);  /* move error message */
        return -1;  /* error flag */
    }
};

const luaB_coresume = function(L) {
    let co = getco(L);
    let r = auxresume(L, co, lua_gettop(L) - 1);
    if (r < 0) {
        lua_pushboolean(L, 0);
        lua_insert(L, -2);
        return 2;  /* return false + error message */
    } else {
        lua_pushboolean(L, 1);
        lua_insert(L, -(r + 1));
        return r + 1;  /* return true + 'resume' returns */
    }
};

const luaB_auxwrap = function(L) {
    let co = lua_tothread(L, lua_upvalueindex(1));
    let r = auxresume(L, co, lua_gettop(L));
    if (r < 0) {
        if (lua_type(L, -1) === LUA_TSTRING) {  /* error object is a string? */
            luaL_where(L, 1);  /* add extra info */
            lua_insert(L, -2);
            lua_concat(L, 2);
        }

        return lua_error(L);  /* propagate error */
    }

    return r;
};

const luaB_cocreate = function(L) {
    luaL_checktype(L, 1, LUA_TFUNCTION);
    let NL = lua_newthread(L);
    lua_pushvalue(L, 1);  /* move function to top */
    lua_xmove(L, NL, 1);  /* move function from L to NL */
    return 1;
};

const luaB_cowrap = function(L) {
    luaB_cocreate(L);
    lua_pushcclosure(L, luaB_auxwrap, 1);
    return 1;
};

const luaB_yield = function(L) {
    return lua_yield(L, lua_gettop(L));
};

const luaB_costatus = function(L) {
    let co = getco(L);
    if (L === co) lua_pushliteral(L, "running");
    else {
        switch (lua_status(co)) {
            case LUA_YIELD:
                lua_pushliteral(L, "suspended");
                break;
            case LUA_OK: {
                let ar = new lua_Debug();
                if (lua_getstack(co, 0, ar) > 0)  /* does it have frames? */
                    lua_pushliteral(L, "normal");  /* it is running */
                else if (lua_gettop(co) === 0)
                    lua_pushliteral(L, "dead");
                else
                    lua_pushliteral(L, "suspended");  /* initial state */
                break;
            }
            default:  /* some error occurred */
                lua_pushliteral(L, "dead");
                break;
        }
    }

    return 1;
};

const luaB_yieldable = function(L) {
    lua_pushboolean(L, lua_isyieldable(L));
    return 1;
};

const luaB_corunning = function(L) {
    lua_pushboolean(L, lua_pushthread(L));
    return 2;
};

const co_funcs = {
    "create":      luaB_cocreate,
    "isyieldable": luaB_yieldable,
    "resume":      luaB_coresume,
    "running":     luaB_corunning,
    "status":      luaB_costatus,
    "wrap":        luaB_cowrap,
    "yield":       luaB_yield
};

const luaopen_coroutine = function(L) {
    luaL_newlib(L, co_funcs);
    return 1;
};

module.exports.luaopen_coroutine = luaopen_coroutine;
