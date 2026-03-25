"use strict";

const { LUA_MAXINTEGER } = require('./luaconf.js');
const {
    LUA_OPEQ,
    LUA_OPLT,
    LUA_TFUNCTION,
    LUA_TNIL,
    LUA_TTABLE,
    lua_call,
    lua_checkstack,
    lua_compare,
    lua_createtable,
    lua_geti,
    lua_getmetatable,
    lua_gettop,
    lua_insert,
    lua_isnil,
    lua_isnoneornil,
    lua_isstring,
    lua_pop,
    lua_pushinteger,
    lua_pushnil,
    lua_pushstring,
    lua_pushvalue,
    lua_rawget,
    lua_setfield,
    lua_seti,
    lua_settop,
    lua_toboolean,
    lua_type
} = require('./lua.js');
const {
    luaL_Buffer,
    luaL_addlstring,
    luaL_addvalue,
    luaL_argcheck,
    luaL_buffinit,
    luaL_checkinteger,
    luaL_checktype,
    luaL_error,
    luaL_len,
    luaL_newlib,
    luaL_opt,
    luaL_optinteger,
    luaL_optlstring,
    luaL_pushresult,
    luaL_typename
} = require('./lauxlib.js');
const lualib = require('./lualib.js');
const { to_luastring } = require("./fengaricore.js");

/*
** Operations that an object must define to mimic a table
** (some functions only need some of them)
*/
const TAB_R  = 1;               /* read */
const TAB_W  = 2;               /* write */
const TAB_L  = 4;               /* length */
const TAB_RW = (TAB_R | TAB_W); /* read/write */

const checkfield = function(L, key, n) {
    lua_pushstring(L, key);
    return lua_rawget(L, -n) !== LUA_TNIL;
};

/*
** Check that 'arg' either is a table or can behave like one (that is,
** has a metatable with the required metamethods)
*/
const checktab = function(L, arg, what) {
    if (lua_type(L, arg) !== LUA_TTABLE) {  /* is it not a table? */
        let n = 1;
        if (lua_getmetatable(L, arg) &&  /* must have metatable */
            (!(what & TAB_R) || checkfield(L, to_luastring("__index", true), ++n)) &&
            (!(what & TAB_W) || checkfield(L, to_luastring("__newindex", true), ++n)) &&
            (!(what & TAB_L) || checkfield(L, to_luastring("__len", true), ++n))) {
            lua_pop(L, n);  /* pop metatable and tested metamethods */
        }
        else
            luaL_checktype(L, arg, LUA_TTABLE);  /* force an error */
    }
};

const aux_getn = function(L, n, w) {
    checktab(L, n, w | TAB_L);
    return luaL_len(L, n);
};

const addfield = function(L, b, i) {
    lua_geti(L, 1, i);
    if (!lua_isstring(L, -1))
        luaL_error(L, to_luastring("invalid value (%s) at index %d in table for 'concat'"),
            luaL_typename(L, -1), i);

    luaL_addvalue(b);
};

const tinsert = function(L) {
    let e = aux_getn(L, 1, TAB_RW) + 1;  /* first empty element */
    let pos;
    switch (lua_gettop(L)) {
        case 2:
            pos = e;
            break;
        case 3: {
            pos = luaL_checkinteger(L, 2);  /* 2nd argument is the position */
            luaL_argcheck(L, 1 <= pos && pos <= e, 2, "position out of bounds");
            for (let i = e; i > pos; i--) {  /* move up elements */
                lua_geti(L, 1, i - 1);
                lua_seti(L, 1, i);  /* t[i] = t[i - 1] */
            }
            break;
        }
        default: {
            return luaL_error(L, "wrong number of arguments to 'insert'");
        }
    }

    lua_seti(L, 1, pos);  /* t[pos] = v */
    return 0;
};

const tremove = function(L) {
    let size = aux_getn(L, 1, TAB_RW);
    let pos = luaL_optinteger(L, 2, size);
    if (pos !== size)  /* validate 'pos' if given */
        luaL_argcheck(L, 1 <= pos && pos <= size + 1, 1, "position out of bounds");
    lua_geti(L, 1, pos);  /* result = t[pos] */
    for (; pos < size; pos++) {
        lua_geti(L, 1, pos + 1);
        lua_seti(L, 1, pos);  /* t[pos] = t[pos + 1] */
    }
    lua_pushnil(L);
    lua_seti(L, 1, pos);  /* t[pos] = nil */
    return 1;
};

/*
** Copy elements (1[f], ..., 1[e]) into (tt[t], tt[t+1], ...). Whenever
** possible, copy in increasing order, which is better for rehashing.
** "possible" means destination after original range, or smaller
** than origin, or copying to another table.
*/
const tmove = function(L) {
    let f = luaL_checkinteger(L, 2);
    let e = luaL_checkinteger(L, 3);
    let t = luaL_checkinteger(L, 4);
    let tt = !lua_isnoneornil(L, 5) ? 5 : 1;  /* destination table */
    checktab(L, 1, TAB_R);
    checktab(L, tt, TAB_W);
    if (e >= f) {  /* otherwise, nothing to move */
        luaL_argcheck(L, f > 0 || e < LUA_MAXINTEGER + f, 3, "too many elements to move");
        let n = e - f + 1;  /* number of elements to move */
        luaL_argcheck(L, t <= LUA_MAXINTEGER - n + 1, 4, "destination wrap around");

        if (t > e || t <= f || (tt !== 1 && lua_compare(L, 1, tt, LUA_OPEQ) !== 1)) {
            for (let i = 0; i < n; i++) {
                lua_geti(L, 1, f + i);
                lua_seti(L, tt, t + i);
            }
        } else {
            for (let i = n - 1; i >= 0; i--) {
                lua_geti(L, 1, f + i);
                lua_seti(L, tt, t + i);
            }
        }
    }

    lua_pushvalue(L, tt);  /* return destination table */
    return 1;
};

const tconcat = function(L) {
    let last = aux_getn(L, 1, TAB_R);
    let sep = luaL_optlstring(L, 2, "");
    let lsep = sep.length;
    let i = luaL_optinteger(L, 3, 1);
    last = luaL_optinteger(L, 4, last);

    let b = new luaL_Buffer();
    luaL_buffinit(L, b);

    for (; i < last; i++) {
        addfield(L, b, i);
        luaL_addlstring(b, sep, lsep);
    }

    if (i === last)
        addfield(L, b, i);

    luaL_pushresult(b);

    return 1;
};

const pack = function(L) {
    let n = lua_gettop(L);  /* number of elements to pack */
    lua_createtable(L, n, 1);  /* create result table */
    lua_insert(L, 1);  /* put it at index 1 */
    for (let i = n; i >= 1; i--)  /* assign elements */
        lua_seti(L, 1, i);
    lua_pushinteger(L, n);
    lua_setfield(L, 1, to_luastring("n"));  /* t.n = number of elements */
    return 1;  /* return table */
};

const unpack = function(L) {
    let i = luaL_optinteger(L, 2, 1);
    let e = luaL_opt(L, luaL_checkinteger, 3, luaL_len(L, 1));
    if (i > e) return 0;  /* empty range */
    let n = e - i;  /* number of elements minus 1 (avoid overflows) */
    if (n >= Number.MAX_SAFE_INTEGER || !lua_checkstack(L, ++n))
        return luaL_error(L, to_luastring("too many results to unpack"));
    for (; i < e; i++)  /* push arg[i..e - 1] (to avoid overflows) */
        lua_geti(L, 1, i);
    lua_geti(L, 1, e);  /* push last element */
    return n;
};

const l_randomizePivot = function() {
    return Math.floor(Math.random()*0x100000000);
};

const RANLIMIT = 100;

const set2 = function(L, i, j) {
    lua_seti(L, 1, i);
    lua_seti(L, 1, j);
};

const sort_comp = function(L, a, b) {
    if (lua_isnil(L, 2))  /* no function? */
        return lua_compare(L, a, b, LUA_OPLT);  /* a < b */
    else {  /* function */
        lua_pushvalue(L, 2);    /* push function */
        lua_pushvalue(L, a-1);  /* -1 to compensate function */
        lua_pushvalue(L, b-2);  /* -2 to compensate function and 'a' */
        lua_call(L, 2, 1);      /* call function */
        let res = lua_toboolean(L, -1);  /* get result */
        lua_pop(L, 1);          /* pop result */
        return res;
    }
};

const partition = function(L, lo, up) {
    let i = lo;  /* will be incremented before first use */
    let j = up - 1;  /* will be decremented before first use */
    /* loop invariant: a[lo .. i] <= P <= a[j .. up] */
    for (;;) {
        /* next loop: repeat ++i while a[i] < P */
        while (lua_geti(L, 1, ++i), sort_comp(L, -1, -2)) {
            if (i == up - 1)  /* a[i] < P  but a[up - 1] == P  ?? */
                luaL_error(L, to_luastring("invalid order function for sorting"));
            lua_pop(L, 1);  /* remove a[i] */
        }
        /* after the loop, a[i] >= P and a[lo .. i - 1] < P */
        /* next loop: repeat --j while P < a[j] */
        while (lua_geti(L, 1, --j), sort_comp(L, -3, -1)) {
            if (j < i)  /* j < i  but  a[j] > P ?? */
                luaL_error(L, to_luastring("invalid order function for sorting"));
            lua_pop(L, 1);  /* remove a[j] */
        }
        /* after the loop, a[j] <= P and a[j + 1 .. up] >= P */
        if (j < i) {  /* no elements out of place? */
            /* a[lo .. i - 1] <= P <= a[j + 1 .. i .. up] */
            lua_pop(L, 1);  /* pop a[j] */
            /* swap pivot (a[up - 1]) with a[i] to satisfy pos-condition */
            set2(L, up - 1, i);
            return i;
        }
        /* otherwise, swap a[i] - a[j] to restore invariant and repeat */
        set2(L, i, j);
    }
};

const choosePivot = function(lo, up, rnd) {
    let r4 = Math.floor((up - lo) / 4);  /* range/4 */
    let p = rnd % (r4 * 2) + (lo + r4);
    lualib.lua_assert(lo + r4 <= p && p <= up - r4);
    return p;
};

const auxsort = function(L, lo, up, rnd) {
    while (lo < up) {  /* loop for tail recursion */
        /* sort elements 'lo', 'p', and 'up' */
        lua_geti(L, 1, lo);
        lua_geti(L, 1, up);
        if (sort_comp(L, -1, -2))  /* a[up] < a[lo]? */
            set2(L, lo, up);  /* swap a[lo] - a[up] */
        else
            lua_pop(L, 2);  /* remove both values */
        if (up - lo == 1)  /* only 2 elements? */
            return;  /* already sorted */
        let p;  /* Pivot index */
        if (up - lo < RANLIMIT || rnd === 0)  /* small interval or no randomize? */
            p = Math.floor((lo + up)/2);  /* middle element is a good pivot */
        else  /* for larger intervals, it is worth a random pivot */
            p = choosePivot(lo, up, rnd);
        lua_geti(L, 1, p);
        lua_geti(L, 1, lo);
        if (sort_comp(L, -2, -1))  /* a[p] < a[lo]? */
            set2(L, p, lo);  /* swap a[p] - a[lo] */
        else {
            lua_pop(L, 1);  /* remove a[lo] */
            lua_geti(L, 1, up);
            if (sort_comp(L, -1, -2))  /* a[up] < a[p]? */
                set2(L, p, up);  /* swap a[up] - a[p] */
            else
                lua_pop(L, 2);
        }
        if (up - lo == 2)  /* only 3 elements? */
            return;  /* already sorted */
        lua_geti(L, 1, p);  /* get middle element (Pivot) */
        lua_pushvalue(L, -1);  /* push Pivot */
        lua_geti(L, 1, up - 1);  /* push a[up - 1] */
        set2(L, p, up - 1);  /* swap Pivot (a[p]) with a[up - 1] */
        p = partition(L, lo, up);
        let n;
        /* a[lo .. p - 1] <= a[p] == P <= a[p + 1 .. up] */
        if (p - lo < up - p) {  /* lower interval is smaller? */
            auxsort(L, lo, p - 1, rnd);  /* call recursively for lower interval */
            n = p - lo;  /* size of smaller interval */
            lo = p + 1;  /* tail call for [p + 1 .. up] (upper interval) */
        } else {
            auxsort(L, p + 1, up, rnd);  /* call recursively for upper interval */
            n = up - p;  /* size of smaller interval */
            up = p - 1;  /* tail call for [lo .. p - 1]  (lower interval) */
        }
        if ((up - lo) / 128 > n) /* partition too imbalanced? */
            rnd = l_randomizePivot();  /* try a new randomization */
    }  /* tail call auxsort(L, lo, up, rnd) */
};

const sort = function(L) {
    let n = aux_getn(L, 1, TAB_RW);
    if (n > 1) {  /* non-trivial interval? */
        luaL_argcheck(L, n < LUA_MAXINTEGER, 1, "array too big");
        if (!lua_isnoneornil(L, 2))  /* is there a 2nd argument? */
            luaL_checktype(L, 2, LUA_TFUNCTION);  /* must be a function */
        lua_settop(L, 2);  /* make sure there are two arguments */
        auxsort(L, 1, n, 0);
    }
    return 0;
};

const tab_funcs = {
    "concat": tconcat,
    "insert": tinsert,
    "move":   tmove,
    "pack":   pack,
    "remove": tremove,
    "sort":   sort,
    "unpack": unpack
};

const luaopen_table = function(L) {
    luaL_newlib(L, tab_funcs);
    return 1;
};

module.exports.luaopen_table = luaopen_table;
