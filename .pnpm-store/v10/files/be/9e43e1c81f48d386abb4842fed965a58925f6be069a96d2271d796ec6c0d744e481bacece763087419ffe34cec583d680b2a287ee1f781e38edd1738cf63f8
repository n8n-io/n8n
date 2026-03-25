"use strict";

const {
    LUA_HOOKCALL,
    LUA_HOOKRET,
    LUA_HOOKTAILCALL,
    LUA_MASKCALL,
    LUA_MASKLINE,
    LUA_MASKRET,
    LUA_MINSTACK,
    LUA_MULTRET,
    LUA_SIGNATURE,
    constant_types: {
        LUA_TCCL,
        LUA_TLCF,
        LUA_TLCL,
        LUA_TNIL
    },
    thread_status: {
        LUA_ERRMEM,
        LUA_ERRERR,
        LUA_ERRRUN,
        LUA_ERRSYNTAX,
        LUA_OK,
        LUA_YIELD
    },
    lua_Debug,
    luastring_indexOf,
    to_luastring
} = require('./defs.js');
const lapi     = require('./lapi.js');
const ldebug   = require('./ldebug.js');
const lfunc    = require('./lfunc.js');
const {
    api_check,
    lua_assert,
    LUAI_MAXCCALLS
} = require('./llimits.js');
const lobject  = require('./lobject.js');
const lopcodes = require('./lopcodes.js');
const lparser  = require('./lparser.js');
const lstate   = require('./lstate.js');
const { luaS_newliteral } = require('./lstring.js');
const ltm      = require('./ltm.js');
const { LUAI_MAXSTACK } = require('./luaconf.js');
const lundump  = require('./lundump.js');
const lvm      = require('./lvm.js');
const { MBuffer } = require('./lzio.js');

const adjust_top = function(L, newtop) {
    if (L.top < newtop) {
        while (L.top < newtop)
            L.stack[L.top++] = new lobject.TValue(LUA_TNIL, null);
    } else {
        while (L.top > newtop)
            delete L.stack[--L.top];
    }
};

const seterrorobj = function(L, errcode, oldtop) {
    let current_top = L.top;

    /* extend stack so that L.stack[oldtop] is sure to exist */
    while (L.top < oldtop + 1)
        L.stack[L.top++] = new lobject.TValue(LUA_TNIL, null);

    switch (errcode) {
        case LUA_ERRMEM: {
            lobject.setsvalue2s(L, oldtop, luaS_newliteral(L, "not enough memory"));
            break;
        }
        case LUA_ERRERR: {
            lobject.setsvalue2s(L, oldtop, luaS_newliteral(L, "error in error handling"));
            break;
        }
        default: {
            lobject.setobjs2s(L, oldtop, current_top - 1);
        }
    }

    while (L.top > oldtop + 1)
        delete L.stack[--L.top];
};

const ERRORSTACKSIZE = LUAI_MAXSTACK + 200;

const luaD_reallocstack = function(L, newsize) {
    lua_assert(newsize <= LUAI_MAXSTACK || newsize == ERRORSTACKSIZE);
    lua_assert(L.stack_last == L.stack.length - lstate.EXTRA_STACK);
    L.stack.length = newsize;
    L.stack_last = newsize - lstate.EXTRA_STACK;
};

const luaD_growstack = function(L, n) {
    let size = L.stack.length;
    if (size > LUAI_MAXSTACK)
        luaD_throw(L, LUA_ERRERR);
    else {
        let needed = L.top + n + lstate.EXTRA_STACK;
        let newsize = 2 * size;
        if (newsize > LUAI_MAXSTACK) newsize = LUAI_MAXSTACK;
        if (newsize < needed) newsize = needed;
        if (newsize > LUAI_MAXSTACK) {  /* stack overflow? */
            luaD_reallocstack(L, ERRORSTACKSIZE);
            ldebug.luaG_runerror(L, to_luastring("stack overflow", true));
        }
        else
            luaD_reallocstack(L, newsize);
    }
};

const luaD_checkstack = function(L, n) {
    if (L.stack_last - L.top <= n)
        luaD_growstack(L, n);
};

const stackinuse = function(L) {
    let lim = L.top;
    for (let ci = L.ci; ci !== null; ci = ci.previous) {
        if (lim < ci.top) lim = ci.top;
    }
    lua_assert(lim <= L.stack_last);
    return lim + 1; /* part of stack in use */
};

const luaD_shrinkstack = function(L) {
    let inuse = stackinuse(L);
    let goodsize = inuse + Math.floor(inuse / 8) + 2*lstate.EXTRA_STACK;
    if (goodsize > LUAI_MAXSTACK)
        goodsize = LUAI_MAXSTACK;  /* respect stack limit */
    if (L.stack.length > LUAI_MAXSTACK)  /* had been handling stack overflow? */
        lstate.luaE_freeCI(L);  /* free all CIs (list grew because of an error) */
    /* if thread is currently not handling a stack overflow and its
     good size is smaller than current size, shrink its stack */
    if (inuse <= (LUAI_MAXSTACK - lstate.EXTRA_STACK) && goodsize < L.stack.length)
        luaD_reallocstack(L, goodsize);
};

const luaD_inctop = function(L) {
    luaD_checkstack(L, 1);
    L.stack[L.top++] = new lobject.TValue(LUA_TNIL, null);
};

/*
** Prepares a function call: checks the stack, creates a new CallInfo
** entry, fills in the relevant information, calls hook if needed.
** If function is a JS function, does the call, too. (Otherwise, leave
** the execution ('luaV_execute') to the caller, to allow stackless
** calls.) Returns true iff function has been executed (JS function).
*/
const luaD_precall = function(L, off, nresults) {
    let func = L.stack[off];

    switch(func.type) {
        case LUA_TCCL:
        case LUA_TLCF: {
            let f = func.type === LUA_TCCL ? func.value.f : func.value;

            luaD_checkstack(L, LUA_MINSTACK);
            let ci = lstate.luaE_extendCI(L);
            ci.funcOff = off;
            ci.nresults = nresults;
            ci.func = func;
            ci.top = L.top + LUA_MINSTACK;
            lua_assert(ci.top <= L.stack_last);
            ci.callstatus = 0;
            if (L.hookmask & LUA_MASKCALL)
                luaD_hook(L, LUA_HOOKCALL, -1);
            let n = f(L); /* do the actual call */
            if (typeof n !== "number" || n < 0 || (n|0) !== n)
                throw Error("invalid return value from JS function (expected integer)");
            lapi.api_checknelems(L, n);

            luaD_poscall(L, ci, L.top - n, n);

            return true;
        }
        case LUA_TLCL: {
            let base;
            let p = func.value.p;
            let n = L.top - off - 1;
            let fsize = p.maxstacksize;
            luaD_checkstack(L, fsize);
            if (p.is_vararg) {
                base = adjust_varargs(L, p, n);
            } else {
                for (; n < p.numparams; n++)
                    L.stack[L.top++] = new lobject.TValue(LUA_TNIL, null); // complete missing arguments
                base = off + 1;
            }

            let ci = lstate.luaE_extendCI(L);
            ci.funcOff = off;
            ci.nresults = nresults;
            ci.func = func;
            ci.l_base = base;
            ci.top = base + fsize;
            adjust_top(L, ci.top);
            ci.l_code = p.code;
            ci.l_savedpc = 0;
            ci.callstatus = lstate.CIST_LUA;
            if (L.hookmask & LUA_MASKCALL)
                callhook(L, ci);
            return false;
        }
        default:
            luaD_checkstack(L, 1);
            tryfuncTM(L, off, func);
            return luaD_precall(L, off, nresults);
    }
};

const luaD_poscall = function(L, ci, firstResult, nres) {
    let wanted = ci.nresults;

    if (L.hookmask & (LUA_MASKRET | LUA_MASKLINE)) {
        if (L.hookmask & LUA_MASKRET)
            luaD_hook(L, LUA_HOOKRET, -1);
        L.oldpc = ci.previous.l_savedpc;  /* 'oldpc' for caller function */
    }

    let res = ci.funcOff;
    L.ci = ci.previous;
    L.ci.next = null;
    return moveresults(L, firstResult, res, nres, wanted);
};

const moveresults = function(L, firstResult, res, nres, wanted) {
    switch (wanted) {
        case 0:
            break;
        case 1: {
            if (nres === 0)
                L.stack[res].setnilvalue();
            else {
                lobject.setobjs2s(L, res, firstResult); /* move it to proper place */
            }
            break;
        }
        case LUA_MULTRET: {
            for (let i = 0; i < nres; i++)
                lobject.setobjs2s(L, res + i, firstResult + i);
            for (let i=L.top; i>=(res + nres); i--)
                delete L.stack[i];
            L.top = res + nres;
            return false;
        }
        default: {
            let i;
            if (wanted <= nres) {
                for (i = 0; i < wanted; i++)
                    lobject.setobjs2s(L, res + i, firstResult + i);
            } else {
                for (i = 0; i < nres; i++)
                    lobject.setobjs2s(L, res + i, firstResult + i);
                for (; i < wanted; i++) {
                    if (res+i >= L.top)
                        L.stack[res + i] = new lobject.TValue(LUA_TNIL, null);
                    else
                        L.stack[res + i].setnilvalue();
                }
            }
            break;
        }
    }
    let newtop = res + wanted; /* top points after the last result */
    for (let i=L.top; i>=newtop; i--)
        delete L.stack[i];
    L.top = newtop;
    return true;
};

/*
** Call a hook for the given event. Make sure there is a hook to be
** called. (Both 'L->hook' and 'L->hookmask', which triggers this
** function, can be changed asynchronously by signals.)
*/
const luaD_hook = function(L, event, line) {
    let hook = L.hook;
    if (hook && L.allowhook) {  /* make sure there is a hook */
        let ci = L.ci;
        let top = L.top;
        let ci_top = ci.top;
        let ar = new lua_Debug();
        ar.event = event;
        ar.currentline = line;
        ar.i_ci = ci;
        luaD_checkstack(L, LUA_MINSTACK);  /* ensure minimum stack size */
        ci.top = L.top + LUA_MINSTACK;
        lua_assert(ci.top <= L.stack_last);
        L.allowhook = 0;  /* cannot call hooks inside a hook */
        ci.callstatus |= lstate.CIST_HOOKED;
        hook(L, ar);
        lua_assert(!L.allowhook);
        L.allowhook = 1;
        ci.top = ci_top;
        adjust_top(L, top);
        ci.callstatus &= ~lstate.CIST_HOOKED;
    }
};

const callhook = function(L, ci) {
    let hook = LUA_HOOKCALL;
    ci.l_savedpc++;  /* hooks assume 'pc' is already incremented */
    if ((ci.previous.callstatus & lstate.CIST_LUA) &&
      ci.previous.l_code[ci.previous.l_savedpc - 1].opcode == lopcodes.OpCodesI.OP_TAILCALL) {
        ci.callstatus |= lstate.CIST_TAIL;
        hook = LUA_HOOKTAILCALL;
    }
    luaD_hook(L, hook, -1);
    ci.l_savedpc--;  /* correct 'pc' */
};

const adjust_varargs = function(L, p, actual) {
    let nfixargs = p.numparams;
    /* move fixed parameters to final position */
    let fixed = L.top - actual; /* first fixed argument */
    let base = L.top; /* final position of first argument */

    let i;
    for (i = 0; i < nfixargs && i < actual; i++) {
        lobject.pushobj2s(L, L.stack[fixed + i]);
        L.stack[fixed + i].setnilvalue();
    }

    for (; i < nfixargs; i++)
        L.stack[L.top++] = new lobject.TValue(LUA_TNIL, null);

    return base;
};

const tryfuncTM = function(L, off, func) {
    let tm = ltm.luaT_gettmbyobj(L, func, ltm.TMS.TM_CALL);
    if (!tm.ttisfunction(tm))
        ldebug.luaG_typeerror(L, func, to_luastring("call", true));
    /* Open a hole inside the stack at 'func' */
    lobject.pushobj2s(L, L.stack[L.top-1]); /* push top of stack again */
    for (let p = L.top-2; p > off; p--)
        lobject.setobjs2s(L, p, p-1); /* move other items up one */
    lobject.setobj2s(L, off, tm); /* tag method is the new function to be called */
};

/*
** Check appropriate error for stack overflow ("regular" overflow or
** overflow while handling stack overflow). If 'nCalls' is larger than
** LUAI_MAXCCALLS (which means it is handling a "regular" overflow) but
** smaller than 9/8 of LUAI_MAXCCALLS, does not report an error (to
** allow overflow handling to work)
*/
const stackerror = function(L) {
    if (L.nCcalls === LUAI_MAXCCALLS)
        ldebug.luaG_runerror(L, to_luastring("JS stack overflow", true));
    else if (L.nCcalls >= LUAI_MAXCCALLS + (LUAI_MAXCCALLS >> 3))
        luaD_throw(L, LUA_ERRERR);  /* error while handing stack error */
};

/*
** Call a function (JS or Lua). The function to be called is at func.
** The arguments are on the stack, right after the function.
** When returns, all the results are on the stack, starting at the original
** function position.
*/
const luaD_call = function(L, off, nResults) {
    if (++L.nCcalls >= LUAI_MAXCCALLS)
        stackerror(L);
    if (!luaD_precall(L, off, nResults))
        lvm.luaV_execute(L);
    L.nCcalls--;
};

const luaD_throw = function(L, errcode) {
    if (L.errorJmp) {  /* thread has an error handler? */
        L.errorJmp.status = errcode;  /* set status */
        throw L.errorJmp;
    } else {  /* thread has no error handler */
        let g = L.l_G;
        L.status = errcode;  /* mark it as dead */
        if (g.mainthread.errorJmp) {  /* main thread has a handler? */
            g.mainthread.stack[g.mainthread.top++] = L.stack[L.top - 1];  /* copy error obj. */
            luaD_throw(g.mainthread, errcode);  /* re-throw in main thread */
        } else {  /* no handler at all; abort */
            let panic = g.panic;
            if (panic) {  /* panic function? */
                seterrorobj(L, errcode, L.top);  /* assume EXTRA_STACK */
                if (L.ci.top < L.top)
                    L.ci.top = L.top;  /* pushing msg. can break this invariant */
                panic(L);  /* call panic function (last chance to jump out) */
            }
            throw new Error(`Aborted ${errcode}`);
        }
    }
};

const luaD_rawrunprotected = function(L, f, ud) {
    let oldnCcalls = L.nCcalls;
    let lj = {
        status: LUA_OK,
        previous: L.errorJmp /* chain new error handler */
    };
    L.errorJmp = lj;

    try {
        f(L, ud);
    } catch (e) {
        if (lj.status === LUA_OK) {
            /* error was not thrown via luaD_throw, i.e. it is a JS error */
            /* run user error handler (if it exists) */
            let atnativeerror = L.l_G.atnativeerror;
            if (atnativeerror) {
                try {
                    lj.status = LUA_OK;

                    lapi.lua_pushcfunction(L, atnativeerror);
                    lapi.lua_pushlightuserdata(L, e);
                    luaD_callnoyield(L, L.top - 2, 1);

                    /* Now run the message handler (if it exists) */
                    /* copy of luaG_errormsg without the throw */
                    if (L.errfunc !== 0) {  /* is there an error handling function? */
                        let errfunc = L.errfunc;
                        lobject.pushobj2s(L, L.stack[L.top - 1]); /* move argument */
                        lobject.setobjs2s(L, L.top - 2, errfunc); /* push function */
                        luaD_callnoyield(L, L.top - 2, 1);
                    }

                    lj.status = LUA_ERRRUN;
                } catch(e2) {
                    if (lj.status === LUA_OK) {
                        /* also failed */
                        lj.status = -1;
                    }
                }
            } else {
                lj.status = -1;
            }
        }
    }

    L.errorJmp = lj.previous;
    L.nCcalls = oldnCcalls;

    return lj.status;

};

/*
** Completes the execution of an interrupted C function, calling its
** continuation function.
*/
const finishCcall = function(L, status) {
    let ci = L.ci;

    /* must have a continuation and must be able to call it */
    lua_assert(ci.c_k !== null && L.nny === 0);
    /* error status can only happen in a protected call */
    lua_assert(ci.callstatus & lstate.CIST_YPCALL || status === LUA_YIELD);

    if (ci.callstatus & lstate.CIST_YPCALL) {  /* was inside a pcall? */
        ci.callstatus &= ~lstate.CIST_YPCALL;  /* continuation is also inside it */
        L.errfunc = ci.c_old_errfunc;  /* with the same error function */
    }

    /* finish 'lua_callk'/'lua_pcall'; CIST_YPCALL and 'errfunc' already
       handled */
    if (ci.nresults === LUA_MULTRET && L.ci.top < L.top) L.ci.top = L.top;
    let c_k = ci.c_k; /* don't want to call as method */
    let n = c_k(L, status, ci.c_ctx);  /* call continuation function */
    lapi.api_checknelems(L, n);
    luaD_poscall(L, ci, L.top - n, n);  /* finish 'luaD_precall' */
};

/*
** Executes "full continuation" (everything in the stack) of a
** previously interrupted coroutine until the stack is empty (or another
** interruption long-jumps out of the loop). If the coroutine is
** recovering from an error, 'ud' points to the error status, which must
** be passed to the first continuation function (otherwise the default
** status is LUA_YIELD).
*/
const unroll = function(L, ud) {
    if (ud !== null)  /* error status? */
        finishCcall(L, ud);  /* finish 'lua_pcallk' callee */

    while (L.ci !== L.base_ci) {  /* something in the stack */
        if (!(L.ci.callstatus & lstate.CIST_LUA))  /* C function? */
            finishCcall(L, LUA_YIELD);  /* complete its execution */
        else {  /* Lua function */
            lvm.luaV_finishOp(L);  /* finish interrupted instruction */
            lvm.luaV_execute(L);  /* execute down to higher C 'boundary' */
        }
    }
};

/*
** Try to find a suspended protected call (a "recover point") for the
** given thread.
*/
const findpcall = function(L) {
    for (let ci = L.ci; ci !== null; ci = ci.previous) {  /* search for a pcall */
        if (ci.callstatus & lstate.CIST_YPCALL)
            return ci;
    }

    return null;  /* no pending pcall */
};

/*
** Recovers from an error in a coroutine. Finds a recover point (if
** there is one) and completes the execution of the interrupted
** 'luaD_pcall'. If there is no recover point, returns zero.
*/
const recover = function(L, status) {
    let ci = findpcall(L);
    if (ci === null) return 0;  /* no recovery point */
    /* "finish" luaD_pcall */
    let oldtop = ci.extra;
    lfunc.luaF_close(L, oldtop);
    seterrorobj(L, status, oldtop);
    L.ci = ci;
    L.allowhook = ci.callstatus & lstate.CIST_OAH;  /* restore original 'allowhook' */
    L.nny = 0;  /* should be zero to be yieldable */
    luaD_shrinkstack(L);
    L.errfunc = ci.c_old_errfunc;
    return 1;  /* continue running the coroutine */
};

/*
** Signal an error in the call to 'lua_resume', not in the execution
** of the coroutine itself. (Such errors should not be handled by any
** coroutine error handler and should not kill the coroutine.)
*/
const resume_error = function(L, msg, narg) {
    let ts = luaS_newliteral(L, msg);
    if (narg === 0) {
        lobject.pushsvalue2s(L, ts);
        api_check(L, L.top <= L.ci.top, "stack overflow");
    } else {
        /* remove args from the stack */
        for (let i=1; i<narg; i++)
            delete L.stack[--L.top];
        lobject.setsvalue2s(L, L.top-1, ts);  /* push error message */
    }
    return LUA_ERRRUN;
};

/*
** Do the work for 'lua_resume' in protected mode. Most of the work
** depends on the status of the coroutine: initial state, suspended
** inside a hook, or regularly suspended (optionally with a continuation
** function), plus erroneous cases: non-suspended coroutine or dead
** coroutine.
*/
const resume = function(L, n) {
    let firstArg = L.top - n;  /* first argument */
    let ci = L.ci;
    if (L.status === LUA_OK) {  /* starting a coroutine? */
        if (!luaD_precall(L, firstArg - 1, LUA_MULTRET))  /* Lua function? */
            lvm.luaV_execute(L);  /* call it */
    } else {  /* resuming from previous yield */
        lua_assert(L.status === LUA_YIELD);
        L.status = LUA_OK;  /* mark that it is running (again) */
        ci.funcOff = ci.extra;
        ci.func = L.stack[ci.funcOff];

        if (ci.callstatus & lstate.CIST_LUA)  /* yielded inside a hook? */
            lvm.luaV_execute(L);  /* just continue running Lua code */
        else {  /* 'common' yield */
            if (ci.c_k !== null) {  /* does it have a continuation function? */
                n = ci.c_k(L, LUA_YIELD, ci.c_ctx); /* call continuation */
                lapi.api_checknelems(L, n);
                firstArg = L.top - n;  /* yield results come from continuation */
            }

            luaD_poscall(L, ci, firstArg, n);  /* finish 'luaD_precall' */
        }

        unroll(L, null);  /* run continuation */
    }
};

const lua_resume = function(L, from, nargs) {
    let oldnny = L.nny;  /* save "number of non-yieldable" calls */

    if (L.status === LUA_OK) {  /* may be starting a coroutine */
        if (L.ci !== L.base_ci)  /* not in base level? */
            return resume_error(L, "cannot resume non-suspended coroutine", nargs);
    } else if (L.status !== LUA_YIELD)
        return resume_error(L, "cannot resume dead coroutine", nargs);

    L.nCcalls = from ? from.nCcalls + 1 : 1;
    if (L.nCcalls >= LUAI_MAXCCALLS)
        return resume_error(L, "JS stack overflow", nargs);

    L.nny = 0;  /* allow yields */

    lapi.api_checknelems(L, L.status === LUA_OK ? nargs + 1: nargs);

    let status = luaD_rawrunprotected(L, resume, nargs);
    if (status === -1)  /* error calling 'lua_resume'? */
        status = LUA_ERRRUN;
    else {  /* continue running after recoverable errors */
        while (status > LUA_YIELD && recover(L, status)) {
            /* unroll continuation */
            status = luaD_rawrunprotected(L, unroll, status);
        }

        if (status > LUA_YIELD) {  /* unrecoverable error? */
            L.status = status;  /* mark thread as 'dead' */
            seterrorobj(L, status, L.top);  /* push error message */
            L.ci.top = L.top;
        } else
            lua_assert(status === L.status);  /* normal end or yield */
    }

    L.nny = oldnny;  /* restore 'nny' */
    L.nCcalls--;
    lua_assert(L.nCcalls === (from ? from.nCcalls : 0));
    return status;
};

const lua_isyieldable = function(L) {
    return L.nny === 0;
};

const lua_yieldk = function(L, nresults, ctx, k) {
    let ci = L.ci;
    lapi.api_checknelems(L, nresults);

    if (L.nny > 0) {
        if (L !== L.l_G.mainthread)
            ldebug.luaG_runerror(L, to_luastring("attempt to yield across a JS-call boundary", true));
        else
            ldebug.luaG_runerror(L, to_luastring("attempt to yield from outside a coroutine", true));
    }

    L.status = LUA_YIELD;
    ci.extra = ci.funcOff;  /* save current 'func' */
    if (ci.callstatus & lstate.CIST_LUA)  /* inside a hook? */
        api_check(L, k === null, "hooks cannot continue after yielding");
    else {
        ci.c_k = k;
        if (k !== null)  /* is there a continuation? */
            ci.c_ctx = ctx;  /* save context */
        ci.funcOff = L.top - nresults - 1;  /* protect stack below results */
        ci.func = L.stack[ci.funcOff];
        luaD_throw(L, LUA_YIELD);
    }

    lua_assert(ci.callstatus & lstate.CIST_HOOKED);  /* must be inside a hook */
    return 0;  /* return to 'luaD_hook' */
};

const lua_yield = function(L, n) {
    lua_yieldk(L, n, 0, null);
};

const luaD_pcall = function(L, func, u, old_top, ef) {
    let old_ci = L.ci;
    let old_allowhooks = L.allowhook;
    let old_nny = L.nny;
    let old_errfunc = L.errfunc;
    L.errfunc = ef;

    let status = luaD_rawrunprotected(L, func, u);

    if (status !== LUA_OK) {
        lfunc.luaF_close(L, old_top);
        seterrorobj(L, status, old_top);
        L.ci = old_ci;
        L.allowhook = old_allowhooks;
        L.nny = old_nny;
        luaD_shrinkstack(L);
    }

    L.errfunc = old_errfunc;

    return status;
};

/*
** Similar to 'luaD_call', but does not allow yields during the call
*/
const luaD_callnoyield = function(L, off, nResults) {
    L.nny++;
    luaD_call(L, off, nResults);
    L.nny--;
};

/*
** Execute a protected parser.
*/
class SParser {
    constructor(z, name, mode) {  /* data to 'f_parser' */
        this.z = z;
        this.buff = new MBuffer();  /* dynamic structure used by the scanner */
        this.dyd = new lparser.Dyndata();  /* dynamic structures used by the parser */
        this.mode = mode;
        this.name = name;
    }
}

const checkmode = function(L, mode, x) {
    if (mode && luastring_indexOf(mode, x[0]) === -1) {
        lobject.luaO_pushfstring(L,
            to_luastring("attempt to load a %s chunk (mode is '%s')"), x, mode);
        luaD_throw(L, LUA_ERRSYNTAX);
    }
};

const f_parser = function(L, p) {
    let cl;
    let c = p.z.zgetc();  /* read first character */
    if (c === LUA_SIGNATURE[0]) {
        checkmode(L, p.mode, to_luastring("binary", true));
        cl = lundump.luaU_undump(L, p.z, p.name);
    } else {
        checkmode(L, p.mode, to_luastring("text", true));
        cl = lparser.luaY_parser(L, p.z, p.buff, p.dyd, p.name, c);
    }

    lua_assert(cl.nupvalues === cl.p.upvalues.length);
    lfunc.luaF_initupvals(L, cl);
};

const luaD_protectedparser = function(L, z, name, mode) {
    let p = new SParser(z, name, mode);
    L.nny++;  /* cannot yield during parsing */
    let status = luaD_pcall(L, f_parser, p, L.top, L.errfunc);
    L.nny--;
    return status;
};

module.exports.adjust_top           = adjust_top;
module.exports.luaD_call            = luaD_call;
module.exports.luaD_callnoyield     = luaD_callnoyield;
module.exports.luaD_checkstack      = luaD_checkstack;
module.exports.luaD_growstack       = luaD_growstack;
module.exports.luaD_hook            = luaD_hook;
module.exports.luaD_inctop          = luaD_inctop;
module.exports.luaD_pcall           = luaD_pcall;
module.exports.luaD_poscall         = luaD_poscall;
module.exports.luaD_precall         = luaD_precall;
module.exports.luaD_protectedparser = luaD_protectedparser;
module.exports.luaD_rawrunprotected = luaD_rawrunprotected;
module.exports.luaD_reallocstack    = luaD_reallocstack;
module.exports.luaD_throw           = luaD_throw;
module.exports.lua_isyieldable      = lua_isyieldable;
module.exports.lua_resume           = lua_resume;
module.exports.lua_yield            = lua_yield;
module.exports.lua_yieldk           = lua_yieldk;
