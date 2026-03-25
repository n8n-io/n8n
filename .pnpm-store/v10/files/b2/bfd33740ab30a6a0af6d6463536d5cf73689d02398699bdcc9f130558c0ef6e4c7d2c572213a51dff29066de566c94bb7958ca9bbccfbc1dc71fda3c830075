"use strict";

const {
    LUA_HOOKCOUNT,
    LUA_HOOKLINE,
    LUA_MASKCOUNT,
    LUA_MASKLINE,
    constant_types: {
        LUA_TBOOLEAN,
        LUA_TNIL,
        LUA_TTABLE
    },
    thread_status: {
        LUA_ERRRUN,
        LUA_YIELD
    },
    from_userstring,
    luastring_eq,
    luastring_indexOf,
    to_luastring
} = require('./defs.js');
const {
    api_check,
    lua_assert
} = require('./llimits.js');
const { LUA_IDSIZE } = require('./luaconf.js');
const lapi     = require('./lapi.js');
const ldo      = require('./ldo.js');
const lfunc    = require('./lfunc.js');
const llex     = require('./llex.js');
const lobject  = require('./lobject.js');
const lopcodes = require('./lopcodes.js');
const lstate   = require('./lstate.js');
const ltable   = require('./ltable.js');
const ltm      = require('./ltm.js');
const lvm      = require('./lvm.js');

const currentpc = function(ci) {
    lua_assert(ci.callstatus & lstate.CIST_LUA);
    return ci.l_savedpc - 1;
};

const currentline = function(ci) {
    return ci.func.value.p.lineinfo.length !== 0 ? ci.func.value.p.lineinfo[currentpc(ci)] : -1;
};

/*
** If function yielded, its 'func' can be in the 'extra' field. The
** next function restores 'func' to its correct value for debugging
** purposes. (It exchanges 'func' and 'extra'; so, when called again,
** after debugging, it also "re-restores" ** 'func' to its altered value.
*/
const swapextra = function(L) {
    if (L.status === LUA_YIELD) {
        let ci = L.ci;  /* get function that yielded */
        let temp = ci.funcOff;  /* exchange its 'func' and 'extra' values */
        ci.func = L.stack[ci.extra];
        ci.funcOff = ci.extra;
        ci.extra = temp;
    }
};

const lua_sethook = function(L, func, mask, count) {
    if (func === null || mask === 0) {  /* turn off hooks? */
        mask = 0;
        func = null;
    }
    if (L.ci.callstatus & lstate.CIST_LUA)
        L.oldpc = L.ci.l_savedpc;
    L.hook = func;
    L.basehookcount = count;
    L.hookcount = L.basehookcount;
    L.hookmask = mask;
};

const lua_gethook = function(L) {
    return L.hook;
};


const lua_gethookmask = function(L) {
    return L.hookmask;
};


const lua_gethookcount = function(L) {
    return L.basehookcount;
};

const lua_getstack = function(L, level, ar) {
    let ci;
    let status;
    if (level < 0) return 0;  /* invalid (negative) level */
    for (ci = L.ci; level > 0 && ci !== L.base_ci; ci = ci.previous)
        level--;
    if (level === 0 && ci !== L.base_ci) {  /* level found? */
        status = 1;
        ar.i_ci = ci;
    } else
        status = 0;  /* no such level */
    return status;
};

const upvalname = function(p, uv) {
    lua_assert(uv < p.upvalues.length);
    let s = p.upvalues[uv].name;
    if (s === null) return to_luastring("?", true);
    return s.getstr();
};

const findvararg = function(ci, n) {
    let nparams = ci.func.value.p.numparams;
    if (n >= ci.l_base - ci.funcOff - nparams)
        return null;  /* no such vararg */
    else {
        return {
            pos: ci.funcOff + nparams + n,
            name: to_luastring("(*vararg)", true)  /* generic name for any vararg */
        };
    }
};

const findlocal = function(L, ci, n) {
    let base, name = null;

    if (ci.callstatus & lstate.CIST_LUA) {
        if (n < 0)  /* access to vararg values? */
            return findvararg(ci, -n);
        else {
            base = ci.l_base;
            name = lfunc.luaF_getlocalname(ci.func.value.p, n, currentpc(ci));
        }
    } else
        base = ci.funcOff + 1;

    if (name === null) {  /* no 'standard' name? */
        let limit = ci === L.ci ? L.top : ci.next.funcOff;
        if (limit - base >= n && n > 0)  /* is 'n' inside 'ci' stack? */
            name = to_luastring("(*temporary)", true);  /* generic name for any valid slot */
        else
            return null;  /* no name */
    }
    return {
        pos: base + (n - 1),
        name: name
    };
};

const lua_getlocal = function(L, ar, n) {
    let name;
    swapextra(L);
    if (ar === null) {  /* information about non-active function? */
        if (!L.stack[L.top - 1].ttisLclosure())  /* not a Lua function? */
            name = null;
        else  /* consider live variables at function start (parameters) */
            name = lfunc.luaF_getlocalname(L.stack[L.top - 1].value.p, n, 0);
    } else {  /* active function; get information through 'ar' */
        let local = findlocal(L, ar.i_ci, n);
        if (local) {
            name = local.name;
            lobject.pushobj2s(L, L.stack[local.pos]);
            api_check(L, L.top <= L.ci.top, "stack overflow");
        } else {
            name = null;
        }
    }
    swapextra(L);
    return name;
};

const lua_setlocal = function(L, ar, n) {
    let name;
    swapextra(L);
    let local = findlocal(L, ar.i_ci, n);
    if (local) {
        name = local.name;
        lobject.setobjs2s(L, local.pos, L.top - 1);
        delete L.stack[--L.top];  /* pop value */
    } else {
        name = null;
    }
    swapextra(L);
    return name;
};

const funcinfo = function(ar, cl) {
    if (cl === null || cl instanceof lobject.CClosure) {
        ar.source = to_luastring("=[JS]", true);
        ar.linedefined = -1;
        ar.lastlinedefined = -1;
        ar.what = to_luastring("J", true);
    } else {
        let p = cl.p;
        ar.source = p.source ? p.source.getstr() : to_luastring("=?", true);
        ar.linedefined = p.linedefined;
        ar.lastlinedefined = p.lastlinedefined;
        ar.what = ar.linedefined === 0 ? to_luastring("main", true) : to_luastring("Lua", true);
    }

    ar.short_src = lobject.luaO_chunkid(ar.source, LUA_IDSIZE);
};

const collectvalidlines = function(L, f) {
    if (f === null || f instanceof lobject.CClosure) {
        L.stack[L.top] = new lobject.TValue(LUA_TNIL, null);
        lapi.api_incr_top(L);
    } else {
        let lineinfo = f.p.lineinfo;
        let t = ltable.luaH_new(L);
        L.stack[L.top] = new lobject.TValue(LUA_TTABLE, t);
        lapi.api_incr_top(L);
        let v = new lobject.TValue(LUA_TBOOLEAN, true);
        for (let i = 0; i < lineinfo.length; i++)
            ltable.luaH_setint(t, lineinfo[i], v);
    }
};

const getfuncname = function(L, ci) {
    let r = {
        name: null,
        funcname: null
    };
    if (ci === null)
        return null;
    else if (ci.callstatus & lstate.CIST_FIN) {  /* is this a finalizer? */
        r.name = to_luastring("__gc", true);
        r.funcname = to_luastring("metamethod", true);  /* report it as such */
        return r;
    }
    /* calling function is a known Lua function? */
    else if (!(ci.callstatus & lstate.CIST_TAIL) && ci.previous.callstatus & lstate.CIST_LUA)
        return funcnamefromcode(L, ci.previous);
    else return null;  /* no way to find a name */
};

const auxgetinfo = function(L, what, ar, f, ci) {
    let status = 1;
    for (; what.length > 0; what = what.subarray(1)) {
        switch (what[0]) {
            case 83 /* ('S').charCodeAt(0) */: {
                funcinfo(ar, f);
                break;
            }
            case 108 /* ('l').charCodeAt(0) */: {
                ar.currentline = ci && ci.callstatus & lstate.CIST_LUA ? currentline(ci) : -1;
                break;
            }
            case 117 /* ('u').charCodeAt(0) */: {
                ar.nups = f === null ? 0 : f.nupvalues;
                if (f === null || f instanceof lobject.CClosure) {
                    ar.isvararg = true;
                    ar.nparams = 0;
                } else {
                    ar.isvararg = f.p.is_vararg;
                    ar.nparams = f.p.numparams;
                }
                break;
            }
            case 116 /* ('t').charCodeAt(0) */: {
                ar.istailcall = ci ? ci.callstatus & lstate.CIST_TAIL : 0;
                break;
            }
            case 110 /* ('n').charCodeAt(0) */: {
                let r = getfuncname(L, ci);
                if (r === null) {
                    ar.namewhat = to_luastring("", true);
                    ar.name = null;
                } else {
                    ar.namewhat = r.funcname;
                    ar.name = r.name;
                }
                break;
            }
            case 76 /* ('L').charCodeAt(0) */:
            case 102 /* ('f').charCodeAt(0) */:  /* handled by lua_getinfo */
                break;
            default: status = 0;  /* invalid option */
        }
    }

    return status;
};

const lua_getinfo = function(L, what, ar) {
    what = from_userstring(what);
    let status, cl, ci, func;
    swapextra(L);
    if (what[0] === 62 /* ('>').charCodeAt(0) */) {
        ci = null;
        func = L.stack[L.top - 1];
        api_check(L, func.ttisfunction(), "function expected");
        what = what.subarray(1);  /* skip the '>' */
        L.top--;  /* pop function */
    } else {
        ci = ar.i_ci;
        func = ci.func;
        lua_assert(ci.func.ttisfunction());
    }

    cl = func.ttisclosure() ? func.value : null;
    status = auxgetinfo(L, what, ar, cl, ci);
    if (luastring_indexOf(what, 102 /* ('f').charCodeAt(0) */) >= 0) {
        lobject.pushobj2s(L, func);
        api_check(L, L.top <= L.ci.top, "stack overflow");
    }

    swapextra(L);
    if (luastring_indexOf(what, 76 /* ('L').charCodeAt(0) */) >= 0)
        collectvalidlines(L, cl);

    return status;
};

const kname = function(p, pc, c) {
    let r = {
        name: null,
        funcname: null
    };

    if (lopcodes.ISK(c)) {  /* is 'c' a constant? */
        let kvalue = p.k[lopcodes.INDEXK(c)];
        if (kvalue.ttisstring()) {  /* literal constant? */
            r.name = kvalue.svalue();  /* it is its own name */
            return r;
        }
        /* else no reasonable name found */
    } else {  /* 'c' is a register */
        let what = getobjname(p, pc, c); /* search for 'c' */
        if (what && what.funcname[0] === 99 /* ('c').charCodeAt(0) */) {  /* found a constant name? */
            return what;  /* 'name' already filled */
        }
        /* else no reasonable name found */
    }
    r.name = to_luastring("?", true);
    return r;  /* no reasonable name found */
};

const filterpc = function(pc, jmptarget) {
    if (pc < jmptarget)  /* is code conditional (inside a jump)? */
        return -1;  /* cannot know who sets that register */
    else return pc;  /* current position sets that register */
};

/*
** try to find last instruction before 'lastpc' that modified register 'reg'
*/
const findsetreg = function(p, lastpc, reg) {
    let setreg = -1;  /* keep last instruction that changed 'reg' */
    let jmptarget = 0;  /* any code before this address is conditional */
    let OCi = lopcodes.OpCodesI;
    for (let pc = 0; pc < lastpc; pc++) {
        let i = p.code[pc];
        let a = i.A;
        switch (i.opcode) {
            case OCi.OP_LOADNIL: {
                let b = i.B;
                if (a <= reg && reg <= a + b)  /* set registers from 'a' to 'a+b' */
                    setreg = filterpc(pc, jmptarget);
                break;
            }
            case OCi.OP_TFORCALL: {
                if (reg >= a + 2)  /* affect all regs above its base */
                    setreg = filterpc(pc, jmptarget);
                break;
            }
            case OCi.OP_CALL:
            case OCi.OP_TAILCALL: {
                if (reg >= a)  /* affect all registers above base */
                    setreg = filterpc(pc, jmptarget);
                break;
            }
            case OCi.OP_JMP: {
                let b = i.sBx;
                let dest = pc + 1 + b;
                /* jump is forward and do not skip 'lastpc'? */
                if (pc < dest && dest <= lastpc) {
                    if (dest > jmptarget)
                        jmptarget = dest;  /* update 'jmptarget' */
                }
                break;
            }
            default:
                if (lopcodes.testAMode(i.opcode) && reg === a)
                    setreg = filterpc(pc, jmptarget);
                break;
        }
    }

    return setreg;
};


const getobjname = function(p, lastpc, reg) {
    let r = {
        name: lfunc.luaF_getlocalname(p, reg + 1, lastpc),
        funcname: null
    };

    if (r.name) {  /* is a local? */
        r.funcname = to_luastring("local", true);
        return r;
    }

    /* else try symbolic execution */
    let pc = findsetreg(p, lastpc, reg);
    let OCi = lopcodes.OpCodesI;
    if (pc !== -1) {  /* could find instruction? */
        let i = p.code[pc];
        switch (i.opcode) {
            case OCi.OP_MOVE: {
                let b = i.B;  /* move from 'b' to 'a' */
                if (b < i.A)
                    return getobjname(p, pc, b);  /* get name for 'b' */
                break;
            }
            case OCi.OP_GETTABUP:
            case OCi.OP_GETTABLE: {
                let k = i.C;  /* key index */
                let t = i.B;  /* table index */
                let vn = i.opcode === OCi.OP_GETTABLE ? lfunc.luaF_getlocalname(p, t + 1, pc) : upvalname(p, t);
                r.name = kname(p, pc, k).name;
                r.funcname = (vn && luastring_eq(vn, llex.LUA_ENV)) ? to_luastring("global", true) : to_luastring("field", true);
                return r;
            }
            case OCi.OP_GETUPVAL: {
                r.name = upvalname(p, i.B);
                r.funcname = to_luastring("upvalue", true);
                return r;
            }
            case OCi.OP_LOADK:
            case OCi.OP_LOADKX: {
                let b = i.opcode === OCi.OP_LOADK ? i.Bx : p.code[pc + 1].Ax;
                if (p.k[b].ttisstring()) {
                    r.name = p.k[b].svalue();
                    r.funcname = to_luastring("constant", true);
                    return r;
                }
                break;
            }
            case OCi.OP_SELF: {
                let k = i.C;
                r.name = kname(p, pc, k).name;
                r.funcname = to_luastring("method", true);
                return r;
            }
            default: break;
        }
    }

    return null;
};

/*
** Try to find a name for a function based on the code that called it.
** (Only works when function was called by a Lua function.)
** Returns what the name is (e.g., "for iterator", "method",
** "metamethod") and sets '*name' to point to the name.
*/
const funcnamefromcode = function(L, ci) {
    let r = {
        name: null,
        funcname: null
    };

    let tm = 0;  /* (initial value avoids warnings) */
    let p = ci.func.value.p;  /* calling function */
    let pc = currentpc(ci);  /* calling instruction index */
    let i = p.code[pc];  /* calling instruction */
    let OCi = lopcodes.OpCodesI;

    if (ci.callstatus & lstate.CIST_HOOKED) {
        r.name = to_luastring("?", true);
        r.funcname = to_luastring("hook", true);
        return r;
    }

    switch (i.opcode) {
        case OCi.OP_CALL:
        case OCi.OP_TAILCALL:
            return getobjname(p, pc, i.A);  /* get function name */
        case OCi.OP_TFORCALL:
            r.name = to_luastring("for iterator", true);
            r.funcname = to_luastring("for iterator", true);
            return r;
        /* other instructions can do calls through metamethods */
        case OCi.OP_SELF:
        case OCi.OP_GETTABUP:
        case OCi.OP_GETTABLE:
            tm = ltm.TMS.TM_INDEX;
            break;
        case OCi.OP_SETTABUP:
        case OCi.OP_SETTABLE:
            tm = ltm.TMS.TM_NEWINDEX;
            break;
        case OCi.OP_ADD:    tm = ltm.TMS.TM_ADD;    break;
        case OCi.OP_SUB:    tm = ltm.TMS.TM_SUB;    break;
        case OCi.OP_MUL:    tm = ltm.TMS.TM_MUL;    break;
        case OCi.OP_MOD:    tm = ltm.TMS.TM_MOD;    break;
        case OCi.OP_POW:    tm = ltm.TMS.TM_POW;    break;
        case OCi.OP_DIV:    tm = ltm.TMS.TM_DIV;    break;
        case OCi.OP_IDIV:   tm = ltm.TMS.TM_IDIV;   break;
        case OCi.OP_BAND:   tm = ltm.TMS.TM_BAND;   break;
        case OCi.OP_BOR:    tm = ltm.TMS.TM_BOR;    break;
        case OCi.OP_BXOR:   tm = ltm.TMS.TM_BXOR;   break;
        case OCi.OP_SHL:    tm = ltm.TMS.TM_SHL;    break;
        case OCi.OP_SHR:    tm = ltm.TMS.TM_SHR;    break;
        case OCi.OP_UNM:    tm = ltm.TMS.TM_UNM;    break;
        case OCi.OP_BNOT:   tm = ltm.TMS.TM_BNOT;   break;
        case OCi.OP_LEN:    tm = ltm.TMS.TM_LEN;    break;
        case OCi.OP_CONCAT: tm = ltm.TMS.TM_CONCAT; break;
        case OCi.OP_EQ:     tm = ltm.TMS.TM_EQ;     break;
        case OCi.OP_LT:     tm = ltm.TMS.TM_LT;     break;
        case OCi.OP_LE:     tm = ltm.TMS.TM_LE;     break;
        default:
            return null;  /* cannot find a reasonable name */
    }

    r.name = L.l_G.tmname[tm].getstr();
    r.funcname = to_luastring("metamethod", true);
    return r;
};

const isinstack = function(L, ci, o) {
    for (let i = ci.l_base; i < ci.top; i++) {
        if (L.stack[i] === o)
            return i;
    }

    return false;
};

/*
** Checks whether value 'o' came from an upvalue. (That can only happen
** with instructions OP_GETTABUP/OP_SETTABUP, which operate directly on
** upvalues.)
*/
const getupvalname = function(L, ci, o) {
    let c = ci.func.value;
    for (let i = 0; i < c.nupvalues; i++) {
        if (c.upvals[i] === o) {
            return {
                name: upvalname(c.p, i),
                funcname: to_luastring('upvalue', true)
            };
        }
    }

    return null;
};

const varinfo = function(L, o) {
    let ci = L.ci;
    let kind = null;
    if (ci.callstatus & lstate.CIST_LUA) {
        kind = getupvalname(L, ci, o);  /* check whether 'o' is an upvalue */
        let stkid = isinstack(L, ci, o);
        if (!kind && stkid)  /* no? try a register */
            kind = getobjname(ci.func.value.p, currentpc(ci), stkid - ci.l_base);
    }

    return kind ? lobject.luaO_pushfstring(L, to_luastring(" (%s '%s')", true), kind.funcname, kind.name) : to_luastring("", true);
};

const luaG_typeerror = function(L, o, op) {
    let t = ltm.luaT_objtypename(L, o);
    luaG_runerror(L, to_luastring("attempt to %s a %s value%s", true), op, t, varinfo(L, o));
};

const luaG_concaterror = function(L, p1, p2) {
    if (p1.ttisstring() || lvm.cvt2str(p1)) p1 = p2;
    luaG_typeerror(L, p1, to_luastring('concatenate', true));
};

/*
** Error when both values are convertible to numbers, but not to integers
*/
const luaG_opinterror = function(L, p1, p2, msg) {
    if (lvm.tonumber(p1) === false)
        p2 = p1;
    luaG_typeerror(L, p2, msg);
};

const luaG_ordererror = function(L, p1, p2) {
    let t1 = ltm.luaT_objtypename(L, p1);
    let t2 = ltm.luaT_objtypename(L, p2);
    if (luastring_eq(t1, t2))
        luaG_runerror(L, to_luastring("attempt to compare two %s values", true), t1);
    else
        luaG_runerror(L, to_luastring("attempt to compare %s with %s", true), t1, t2);
};

/* add src:line information to 'msg' */
const luaG_addinfo = function(L, msg, src, line) {
    let buff;
    if (src)
        buff = lobject.luaO_chunkid(src.getstr(), LUA_IDSIZE);
    else
        buff = to_luastring("?", true);

    return lobject.luaO_pushfstring(L, to_luastring("%s:%d: %s", true), buff, line, msg);
};

const luaG_runerror = function(L, fmt, ...argp) {
    let ci = L.ci;
    let msg = lobject.luaO_pushvfstring(L, fmt, argp);
    if (ci.callstatus & lstate.CIST_LUA)  /* if Lua function, add source:line information */
        luaG_addinfo(L, msg, ci.func.value.p.source, currentline(ci));
    luaG_errormsg(L);
};

const luaG_errormsg = function(L) {
    if (L.errfunc !== 0) {  /* is there an error handling function? */
        let errfunc = L.errfunc;
        lobject.pushobj2s(L, L.stack[L.top - 1]); /* move argument */
        lobject.setobjs2s(L, L.top - 2, errfunc); /* push function */
        ldo.luaD_callnoyield(L, L.top - 2, 1);
    }

    ldo.luaD_throw(L, LUA_ERRRUN);
};

/*
** Error when both values are convertible to numbers, but not to integers
*/
const luaG_tointerror = function(L, p1, p2) {
    let temp = lvm.tointeger(p1);
    if (temp === false)
        p2 = p1;
    luaG_runerror(L, to_luastring("number%s has no integer representation", true), varinfo(L, p2));
};

const luaG_traceexec = function(L) {
    let ci = L.ci;
    let mask = L.hookmask;
    let counthook = (--L.hookcount === 0 && (mask & LUA_MASKCOUNT));
    if (counthook)
        L.hookcount = L.basehookcount;  /* reset count */
    else if (!(mask & LUA_MASKLINE))
        return;  /* no line hook and count != 0; nothing to be done */
    if (ci.callstatus & lstate.CIST_HOOKYIELD) {  /* called hook last time? */
        ci.callstatus &= ~lstate.CIST_HOOKYIELD;  /* erase mark */
        return;  /* do not call hook again (VM yielded, so it did not move) */
    }
    if (counthook)
        ldo.luaD_hook(L, LUA_HOOKCOUNT, -1);  /* call count hook */
    if (mask & LUA_MASKLINE) {
        let p = ci.func.value.p;
        let npc = ci.l_savedpc - 1; // pcRel(ci.u.l.savedpc, p);
        let newline = p.lineinfo.length !== 0 ? p.lineinfo[npc] : -1;
        if (npc === 0 ||  /* call linehook when enter a new function, */
            ci.l_savedpc <= L.oldpc ||  /* when jump back (loop), or when */
            newline !== (p.lineinfo.length !== 0 ? p.lineinfo[L.oldpc - 1] : -1))  /* enter a new line */
            ldo.luaD_hook(L, LUA_HOOKLINE, newline);  /* call line hook */
    }
    L.oldpc = ci.l_savedpc;
    if (L.status === LUA_YIELD) {  /* did hook yield? */
        if (counthook)
            L.hookcount = 1;  /* undo decrement to zero */
        ci.l_savedpc--;  /* undo increment (resume will increment it again) */
        ci.callstatus |= lstate.CIST_HOOKYIELD;  /* mark that it yielded */
        ci.funcOff = L.top - 1;  /* protect stack below results */
        ci.func = L.stack[ci.funcOff];
        ldo.luaD_throw(L, LUA_YIELD);
    }
};

module.exports.luaG_addinfo     = luaG_addinfo;
module.exports.luaG_concaterror = luaG_concaterror;
module.exports.luaG_errormsg    = luaG_errormsg;
module.exports.luaG_opinterror  = luaG_opinterror;
module.exports.luaG_ordererror  = luaG_ordererror;
module.exports.luaG_runerror    = luaG_runerror;
module.exports.luaG_tointerror  = luaG_tointerror;
module.exports.luaG_traceexec   = luaG_traceexec;
module.exports.luaG_typeerror   = luaG_typeerror;
module.exports.lua_gethook      = lua_gethook;
module.exports.lua_gethookcount = lua_gethookcount;
module.exports.lua_gethookmask  = lua_gethookmask;
module.exports.lua_getinfo      = lua_getinfo;
module.exports.lua_getlocal     = lua_getlocal;
module.exports.lua_getstack     = lua_getstack;
module.exports.lua_sethook      = lua_sethook;
module.exports.lua_setlocal     = lua_setlocal;
