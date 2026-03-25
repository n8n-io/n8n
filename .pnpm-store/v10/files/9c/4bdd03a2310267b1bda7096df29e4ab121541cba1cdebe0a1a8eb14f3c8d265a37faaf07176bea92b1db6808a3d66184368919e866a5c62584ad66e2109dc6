"use strict";

const {
    LUA_MINSTACK,
    LUA_RIDX_GLOBALS,
    LUA_RIDX_MAINTHREAD,
    constant_types: {
        LUA_NUMTAGS,
        LUA_TNIL,
        LUA_TTABLE,
        LUA_TTHREAD
    },
    thread_status: {
        LUA_OK
    }
} = require('./defs.js');
const lobject              = require('./lobject.js');
const ldo                  = require('./ldo.js');
const lapi                 = require('./lapi.js');
const ltable               = require('./ltable.js');
const ltm                  = require('./ltm.js');

const EXTRA_STACK = 5;

const BASIC_STACK_SIZE = 2 * LUA_MINSTACK;

class CallInfo {

    constructor() {
        this.func = null;
        this.funcOff = NaN;
        this.top = NaN;
        this.previous = null;
        this.next = null;

        /* only for Lua functions */
        this.l_base = NaN; /* base for this function */
        this.l_code = null; /* reference to this.func.p.code */
        this.l_savedpc = NaN; /* offset into l_code */
        /* only for JS functions */
        this.c_k = null;  /* continuation in case of yields */
        this.c_old_errfunc = null;
        this.c_ctx = null;  /* context info. in case of yields */

        this.nresults = NaN;
        this.callstatus = NaN;
    }

}

class lua_State {

    constructor(g) {
        this.id = g.id_counter++;

        this.base_ci = new CallInfo(); /* CallInfo for first level (C calling Lua) */
        this.top = NaN; /* first free slot in the stack */
        this.stack_last = NaN; /* last free slot in the stack */
        this.oldpc = NaN; /* last pc traced */

        /* preinit_thread */
        this.l_G = g;
        this.stack = null;
        this.ci = null;
        this.errorJmp = null;
        this.nCcalls = 0;
        this.hook = null;
        this.hookmask = 0;
        this.basehookcount = 0;
        this.allowhook = 1;
        this.hookcount = this.basehookcount;
        this.nny = 1;
        this.status = LUA_OK;
        this.errfunc = 0;
    }

}

class global_State {

    constructor() {
        this.id_counter = 1; /* used to give objects unique ids */
        this.ids = new WeakMap();

        this.mainthread = null;
        this.l_registry = new lobject.TValue(LUA_TNIL, null);
        this.panic = null;
        this.atnativeerror = null;
        this.version = null;
        this.tmname = new Array(ltm.TMS.TM_N);
        this.mt = new Array(LUA_NUMTAGS);
    }

}

const luaE_extendCI = function(L) {
    let ci = new CallInfo();
    L.ci.next = ci;
    ci.previous = L.ci;
    ci.next = null;
    L.ci = ci;
    return ci;
};

const luaE_freeCI = function(L) {
    let ci = L.ci;
    ci.next = null;
};

const stack_init = function(L1, L) {
    L1.stack = new Array(BASIC_STACK_SIZE);
    L1.top = 0;
    L1.stack_last = BASIC_STACK_SIZE - EXTRA_STACK;
    /* initialize first ci */
    let ci = L1.base_ci;
    ci.next = ci.previous = null;
    ci.callstatus = 0;
    ci.funcOff = L1.top;
    ci.func = L1.stack[L1.top];
    L1.stack[L1.top++] = new lobject.TValue(LUA_TNIL, null);
    ci.top = L1.top + LUA_MINSTACK;
    L1.ci = ci;
};

const freestack = function(L) {
    L.ci = L.base_ci;
    luaE_freeCI(L);
    L.stack = null;
};

/*
** Create registry table and its predefined values
*/
const init_registry = function(L, g) {
    let registry = ltable.luaH_new(L);
    g.l_registry.sethvalue(registry);
    ltable.luaH_setint(registry, LUA_RIDX_MAINTHREAD, new lobject.TValue(LUA_TTHREAD, L));
    ltable.luaH_setint(registry, LUA_RIDX_GLOBALS, new lobject.TValue(LUA_TTABLE, ltable.luaH_new(L)));
};

/*
** open parts of the state that may cause memory-allocation errors.
** ('g->version' !== NULL flags that the state was completely build)
*/
const f_luaopen = function(L) {
    let g = L.l_G;
    stack_init(L, L);
    init_registry(L, g);
    ltm.luaT_init(L);
    g.version = lapi.lua_version(null);
};

const lua_newthread = function(L) {
    let g = L.l_G;
    let L1 = new lua_State(g);
    L.stack[L.top] = new lobject.TValue(LUA_TTHREAD, L1);
    lapi.api_incr_top(L);
    L1.hookmask = L.hookmask;
    L1.basehookcount = L.basehookcount;
    L1.hook = L.hook;
    L1.hookcount = L1.basehookcount;
    stack_init(L1, L);
    return L1;
};

const luaE_freethread = function(L, L1) {
    freestack(L1);
};

const lua_newstate = function() {
    let g = new global_State();
    let L = new lua_State(g);
    g.mainthread = L;

    if (ldo.luaD_rawrunprotected(L, f_luaopen, null) !== LUA_OK) {
        L = null;
    }

    return L;
};

const close_state = function(L) {
    freestack(L);
};

const lua_close = function(L) {
    L = L.l_G.mainthread;  /* only the main thread can be closed */
    close_state(L);
};

module.exports.lua_State       = lua_State;
module.exports.CallInfo        = CallInfo;
module.exports.CIST_OAH        = (1<<0);  /* original value of 'allowhook' */
module.exports.CIST_LUA        = (1<<1);  /* call is running a Lua function */
module.exports.CIST_HOOKED     = (1<<2);  /* call is running a debug hook */
module.exports.CIST_FRESH      = (1<<3);  /* call is running on a fresh invocation of luaV_execute */
module.exports.CIST_YPCALL     = (1<<4);  /* call is a yieldable protected call */
module.exports.CIST_TAIL       = (1<<5);  /* call was tail called */
module.exports.CIST_HOOKYIELD  = (1<<6);  /* last hook called yielded */
module.exports.CIST_LEQ        = (1<<7);  /* using __lt for __le */
module.exports.CIST_FIN        = (1<<8);   /* call is running a finalizer */
module.exports.EXTRA_STACK     = EXTRA_STACK;
module.exports.lua_close       = lua_close;
module.exports.lua_newstate    = lua_newstate;
module.exports.lua_newthread   = lua_newthread;
module.exports.luaE_extendCI   = luaE_extendCI;
module.exports.luaE_freeCI     = luaE_freeCI;
module.exports.luaE_freethread = luaE_freethread;
