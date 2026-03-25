"use strict";

const { constant_types: { LUA_TNIL } } = require('./defs.js');
const lobject = require('./lobject.js');

class Proto {
    constructor(L) {
        this.id = L.l_G.id_counter++;
        this.k = [];              // constants used by the function
        this.p = [];              // functions defined inside the function
        this.code = [];           // opcodes
        this.cache = null;        // last-created closure with this prototype
        this.lineinfo = [];       // map from opcodes to source lines (debug information)
        this.upvalues = [];       // upvalue information
        this.numparams = 0;       // number of fixed parameters
        this.is_vararg = false;
        this.maxstacksize = 0;    // number of registers needed by this function
        this.locvars = [];        // information about local variables (debug information)
        this.linedefined = 0;     // debug information
        this.lastlinedefined = 0; // debug information
        this.source = null;       // used for debug information
    }
}

const luaF_newLclosure = function(L, n) {
    return new lobject.LClosure(L, n);
};


const luaF_findupval = function(L, level) {
    return L.stack[level];
};

const luaF_close = function(L, level) {
    /* Create new TValues on stack;
     * any closures will keep referencing old TValues */
    for (let i=level; i<L.top; i++) {
        let old = L.stack[i];
        L.stack[i] = new lobject.TValue(old.type, old.value);
    }
};

/*
** fill a closure with new upvalues
*/
const luaF_initupvals = function(L, cl) {
    for (let i = 0; i < cl.nupvalues; i++)
        cl.upvals[i] = new lobject.TValue(LUA_TNIL, null);
};

/*
** Look for n-th local variable at line 'line' in function 'func'.
** Returns null if not found.
*/
const luaF_getlocalname = function(f, local_number, pc) {
    for (let i = 0; i < f.locvars.length && f.locvars[i].startpc <= pc; i++) {
        if (pc < f.locvars[i].endpc) {  /* is variable active? */
            local_number--;
            if (local_number === 0)
                return f.locvars[i].varname.getstr();
        }
    }
    return null;  /* not found */
};

module.exports.MAXUPVAL          = 255;
module.exports.Proto             = Proto;
module.exports.luaF_findupval    = luaF_findupval;
module.exports.luaF_close        = luaF_close;
module.exports.luaF_getlocalname = luaF_getlocalname;
module.exports.luaF_initupvals   = luaF_initupvals;
module.exports.luaF_newLclosure  = luaF_newLclosure;
