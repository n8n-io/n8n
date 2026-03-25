"use strict";

/*
 * Fengari specific string conversion functions
 */

let luastring_from;
if (typeof Uint8Array.from === "function") {
    luastring_from = Uint8Array.from.bind(Uint8Array);
} else {
    luastring_from = function(a) {
        let i = 0;
        let len = a.length;
        let r = new Uint8Array(len);
        while (len > i) r[i] = a[i++];
        return r;
    };
}

let luastring_indexOf;
if (typeof (new Uint8Array().indexOf) === "function") {
    luastring_indexOf = function(s, v, i) {
        return s.indexOf(v, i);
    };
} else {
    /* Browsers that don't support Uint8Array.indexOf seem to allow using Array.indexOf on Uint8Array objects e.g. IE11 */
    let array_indexOf = [].indexOf;
    if (array_indexOf.call(new Uint8Array(1), 0) !== 0) throw Error("missing .indexOf");
    luastring_indexOf = function(s, v, i) {
        return array_indexOf.call(s, v, i);
    };
}

let luastring_of;
if (typeof Uint8Array.of === "function") {
    luastring_of = Uint8Array.of.bind(Uint8Array);
} else {
    luastring_of = function() {
        return luastring_from(arguments);
    };
}

const is_luastring = function(s) {
    return s instanceof Uint8Array;
};

/* test two lua strings for equality */
const luastring_eq = function(a, b) {
    if (a !== b) {
        let len = a.length;
        if (len !== b.length) return false;
        /* XXX: Should this be a constant time algorithm? */
        for (let i=0; i<len; i++)
            if (a[i] !== b[i]) return false;
    }
    return true;
};

const unicode_error_message = "cannot convert invalid utf8 to javascript string";
const to_jsstring = function(value, from, to, replacement_char) {
    if (!is_luastring(value)) throw new TypeError("to_jsstring expects a Uint8Array");

    if (to === void 0) {
        to = value.length;
    } else {
        to = Math.min(value.length, to);
    }

    let str = "";
    for (let i = (from!==void 0?from:0); i < to;) {
        let u0 = value[i++];
        if (u0 < 0x80) {
            /* single byte sequence */
            str += String.fromCharCode(u0);
        } else if (u0 < 0xC2 || u0 > 0xF4) {
            if (!replacement_char) throw RangeError(unicode_error_message);
            str += "�";
        } else if (u0 <= 0xDF) {
            /* two byte sequence */
            if (i >= to) {
                if (!replacement_char) throw RangeError(unicode_error_message);
                str += "�";
                continue;
            }
            let u1 = value[i++];
            if ((u1&0xC0) !== 0x80) {
                if (!replacement_char) throw RangeError(unicode_error_message);
                str += "�";
                continue;
            }
            str += String.fromCharCode(((u0 & 0x1F) << 6) + (u1 & 0x3F));
        } else if (u0 <= 0xEF) {
            /* three byte sequence */
            if (i+1 >= to) {
                if (!replacement_char) throw RangeError(unicode_error_message);
                str += "�";
                continue;
            }
            let u1 = value[i++];
            if ((u1&0xC0) !== 0x80) {
                if (!replacement_char) throw RangeError(unicode_error_message);
                str += "�";
                continue;
            }
            let u2 = value[i++];
            if ((u2&0xC0) !== 0x80) {
                if (!replacement_char) throw RangeError(unicode_error_message);
                str += "�";
                continue;
            }
            let u = ((u0 & 0x0F) << 12) + ((u1 & 0x3F) << 6) + (u2 & 0x3F);
            if (u <= 0xFFFF) { /* BMP codepoint */
                str += String.fromCharCode(u);
            } else { /* Astral codepoint */
                u -= 0x10000;
                let s1 = (u >> 10) + 0xD800;
                let s2 = (u % 0x400) + 0xDC00;
                str += String.fromCharCode(s1, s2);
            }
        } else {
            /* four byte sequence */
            if (i+2 >= to) {
                if (!replacement_char) throw RangeError(unicode_error_message);
                str += "�";
                continue;
            }
            let u1 = value[i++];
            if ((u1&0xC0) !== 0x80) {
                if (!replacement_char) throw RangeError(unicode_error_message);
                str += "�";
                continue;
            }
            let u2 = value[i++];
            if ((u2&0xC0) !== 0x80) {
                if (!replacement_char) throw RangeError(unicode_error_message);
                str += "�";
                continue;
            }
            let u3 = value[i++];
            if ((u3&0xC0) !== 0x80) {
                if (!replacement_char) throw RangeError(unicode_error_message);
                str += "�";
                continue;
            }
            /* Has to be astral codepoint */
            let u = ((u0 & 0x07) << 18) + ((u1 & 0x3F) << 12) + ((u2 & 0x3F) << 6) + (u3 & 0x3F);
            u -= 0x10000;
            let s1 = (u >> 10) + 0xD800;
            let s2 = (u % 0x400) + 0xDC00;
            str += String.fromCharCode(s1, s2);
        }
    }
    return str;
};

/* bytes allowed unescaped in a uri */
const uri_allowed = (";,/?:@&=+$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789,-_.!~*'()#").split('').reduce(function(uri_allowed, c) {
    uri_allowed[c.charCodeAt(0)] = true;
    return uri_allowed;
}, {});

/* utility function to convert a lua string to a js string with uri escaping */
const to_uristring = function(a) {
    if (!is_luastring(a)) throw new TypeError("to_uristring expects a Uint8Array");
    let s = "";
    for (let i=0; i<a.length; i++) {
        let v = a[i];
        if (uri_allowed[v]) {
            s += String.fromCharCode(v);
        } else {
            s += "%" + (v<0x10?"0":"") + v.toString(16);
        }
    }
    return s;
};

const to_luastring_cache = {};

const to_luastring = function(str, cache) {
    if (typeof str !== "string") throw new TypeError("to_luastring expects a javascript string");

    if (cache) {
        let cached = to_luastring_cache[str];
        if (is_luastring(cached)) return cached;
    }

    let len = str.length;
    let outU8Array = Array(len); /* array is at *least* going to be length of string */
    let outIdx = 0;
    for (let i = 0; i < len; ++i) {
        let u = str.charCodeAt(i);
        if (u <= 0x7F) {
            outU8Array[outIdx++] = u;
        } else if (u <= 0x7FF) {
            outU8Array[outIdx++] = 0xC0 | (u >> 6);
            outU8Array[outIdx++] = 0x80 | (u & 63);
        } else {
            /* This part is to work around possible lack of String.codePointAt */
            if (u >= 0xD800 && u <= 0xDBFF && (i+1) < len) {
                /* is first half of surrogate pair */
                let v = str.charCodeAt(i+1);
                if (v >= 0xDC00 && v <= 0xDFFF) {
                    /* is valid low surrogate */
                    i++;
                    u = (u - 0xD800) * 0x400 + v + 0x2400;
                }
            }
            if (u <= 0xFFFF) {
                outU8Array[outIdx++] = 0xE0 | (u >> 12);
                outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
                outU8Array[outIdx++] = 0x80 | (u & 63);
            } else {
                outU8Array[outIdx++] = 0xF0 | (u >> 18);
                outU8Array[outIdx++] = 0x80 | ((u >> 12) & 63);
                outU8Array[outIdx++] = 0x80 | ((u >> 6) & 63);
                outU8Array[outIdx++] = 0x80 | (u & 63);
            }
        }
    }
    outU8Array = luastring_from(outU8Array);

    if (cache) to_luastring_cache[str] = outU8Array;

    return outU8Array;
};

const from_userstring = function(str) {
    if (!is_luastring(str)) {
        if (typeof str === "string") {
            str = to_luastring(str);
        } else {
            throw new TypeError("expects an array of bytes or javascript string");
        }
    }
    return str;
};

module.exports.luastring_from    = luastring_from;
module.exports.luastring_indexOf = luastring_indexOf;
module.exports.luastring_of      = luastring_of;
module.exports.is_luastring      = is_luastring;
module.exports.luastring_eq      = luastring_eq;
module.exports.to_jsstring       = to_jsstring;
module.exports.to_uristring      = to_uristring;
module.exports.to_luastring      = to_luastring;
module.exports.from_userstring   = from_userstring;


/* mark for precompiled code ('<esc>Lua') */
const LUA_SIGNATURE = to_luastring("\x1bLua");

const LUA_VERSION_MAJOR   = "5";
const LUA_VERSION_MINOR   = "3";
const LUA_VERSION_NUM     = 503;
const LUA_VERSION_RELEASE = "4";

const LUA_VERSION         = "Lua " + LUA_VERSION_MAJOR + "." + LUA_VERSION_MINOR;
const LUA_RELEASE         = LUA_VERSION + "." + LUA_VERSION_RELEASE;
const LUA_COPYRIGHT       = LUA_RELEASE + "  Copyright (C) 1994-2017 Lua.org, PUC-Rio";
const LUA_AUTHORS         = "R. Ierusalimschy, L. H. de Figueiredo, W. Celes";

module.exports.LUA_SIGNATURE       = LUA_SIGNATURE;
module.exports.LUA_VERSION_MAJOR   = LUA_VERSION_MAJOR;
module.exports.LUA_VERSION_MINOR   = LUA_VERSION_MINOR;
module.exports.LUA_VERSION_NUM     = LUA_VERSION_NUM;
module.exports.LUA_VERSION_RELEASE = LUA_VERSION_RELEASE;
module.exports.LUA_VERSION         = LUA_VERSION;
module.exports.LUA_RELEASE         = LUA_RELEASE;
module.exports.LUA_COPYRIGHT       = LUA_COPYRIGHT;
module.exports.LUA_AUTHORS         = LUA_AUTHORS;


const thread_status = {
    LUA_OK:        0,
    LUA_YIELD:     1,
    LUA_ERRRUN:    2,
    LUA_ERRSYNTAX: 3,
    LUA_ERRMEM:    4,
    LUA_ERRGCMM:   5,
    LUA_ERRERR:    6
};

const constant_types = {
    LUA_TNONE:          -1,
    LUA_TNIL:           0,
    LUA_TBOOLEAN:       1,
    LUA_TLIGHTUSERDATA: 2,
    LUA_TNUMBER:        3,
    LUA_TSTRING:        4,
    LUA_TTABLE:         5,
    LUA_TFUNCTION:      6,
    LUA_TUSERDATA:      7,
    LUA_TTHREAD:        8,
    LUA_NUMTAGS:        9
};

constant_types.LUA_TSHRSTR = constant_types.LUA_TSTRING | (0 << 4);  /* short strings */
constant_types.LUA_TLNGSTR = constant_types.LUA_TSTRING | (1 << 4);  /* long strings */

constant_types.LUA_TNUMFLT = constant_types.LUA_TNUMBER | (0 << 4);  /* float numbers */
constant_types.LUA_TNUMINT = constant_types.LUA_TNUMBER | (1 << 4);  /* integer numbers */

constant_types.LUA_TLCL = constant_types.LUA_TFUNCTION | (0 << 4);  /* Lua closure */
constant_types.LUA_TLCF = constant_types.LUA_TFUNCTION | (1 << 4);  /* light C function */
constant_types.LUA_TCCL = constant_types.LUA_TFUNCTION | (2 << 4);  /* C closure */

/*
** Comparison and arithmetic functions
*/

const LUA_OPADD  = 0;   /* ORDER TM, ORDER OP */
const LUA_OPSUB  = 1;
const LUA_OPMUL  = 2;
const LUA_OPMOD  = 3;
const LUA_OPPOW  = 4;
const LUA_OPDIV  = 5;
const LUA_OPIDIV = 6;
const LUA_OPBAND = 7;
const LUA_OPBOR  = 8;
const LUA_OPBXOR = 9;
const LUA_OPSHL  = 10;
const LUA_OPSHR  = 11;
const LUA_OPUNM  = 12;
const LUA_OPBNOT = 13;

const LUA_OPEQ = 0;
const LUA_OPLT = 1;
const LUA_OPLE = 2;

const LUA_MINSTACK = 20;

const { LUAI_MAXSTACK } = require('./luaconf.js');
const LUA_REGISTRYINDEX = -LUAI_MAXSTACK - 1000;

const lua_upvalueindex = function(i) {
    return LUA_REGISTRYINDEX - i;
};

/* predefined values in the registry */
const LUA_RIDX_MAINTHREAD = 1;
const LUA_RIDX_GLOBALS    = 2;
const LUA_RIDX_LAST       = LUA_RIDX_GLOBALS;

class lua_Debug {
    constructor() {
        this.event = NaN;
        this.name = null;           /* (n) */
        this.namewhat = null;       /* (n) 'global', 'local', 'field', 'method' */
        this.what = null;           /* (S) 'Lua', 'C', 'main', 'tail' */
        this.source = null;         /* (S) */
        this.currentline = NaN;     /* (l) */
        this.linedefined = NaN;     /* (S) */
        this.lastlinedefined = NaN; /* (S) */
        this.nups = NaN;            /* (u) number of upvalues */
        this.nparams = NaN;         /* (u) number of parameters */
        this.isvararg = NaN;        /* (u) */
        this.istailcall = NaN;      /* (t) */
        this.short_src = null;      /* (S) */
        /* private part */
        this.i_ci = null;           /* active function */
    }
}

/*
** Event codes
*/
const LUA_HOOKCALL     = 0;
const LUA_HOOKRET      = 1;
const LUA_HOOKLINE     = 2;
const LUA_HOOKCOUNT    = 3;
const LUA_HOOKTAILCALL = 4;


/*
** Event masks
*/
const LUA_MASKCALL  = (1 << LUA_HOOKCALL);
const LUA_MASKRET   = (1 << LUA_HOOKRET);
const LUA_MASKLINE  = (1 << LUA_HOOKLINE);
const LUA_MASKCOUNT = (1 << LUA_HOOKCOUNT);

module.exports.LUA_HOOKCALL            = LUA_HOOKCALL;
module.exports.LUA_HOOKCOUNT           = LUA_HOOKCOUNT;
module.exports.LUA_HOOKLINE            = LUA_HOOKLINE;
module.exports.LUA_HOOKRET             = LUA_HOOKRET;
module.exports.LUA_HOOKTAILCALL        = LUA_HOOKTAILCALL;
module.exports.LUA_MASKCALL            = LUA_MASKCALL;
module.exports.LUA_MASKCOUNT           = LUA_MASKCOUNT;
module.exports.LUA_MASKLINE            = LUA_MASKLINE;
module.exports.LUA_MASKRET             = LUA_MASKRET;
module.exports.LUA_MINSTACK            = LUA_MINSTACK;
module.exports.LUA_MULTRET             = -1;
module.exports.LUA_OPADD               = LUA_OPADD;
module.exports.LUA_OPBAND              = LUA_OPBAND;
module.exports.LUA_OPBNOT              = LUA_OPBNOT;
module.exports.LUA_OPBOR               = LUA_OPBOR;
module.exports.LUA_OPBXOR              = LUA_OPBXOR;
module.exports.LUA_OPDIV               = LUA_OPDIV;
module.exports.LUA_OPEQ                = LUA_OPEQ;
module.exports.LUA_OPIDIV              = LUA_OPIDIV;
module.exports.LUA_OPLE                = LUA_OPLE;
module.exports.LUA_OPLT                = LUA_OPLT;
module.exports.LUA_OPMOD               = LUA_OPMOD;
module.exports.LUA_OPMUL               = LUA_OPMUL;
module.exports.LUA_OPPOW               = LUA_OPPOW;
module.exports.LUA_OPSHL               = LUA_OPSHL;
module.exports.LUA_OPSHR               = LUA_OPSHR;
module.exports.LUA_OPSUB               = LUA_OPSUB;
module.exports.LUA_OPUNM               = LUA_OPUNM;
module.exports.LUA_REGISTRYINDEX       = LUA_REGISTRYINDEX;
module.exports.LUA_RIDX_GLOBALS        = LUA_RIDX_GLOBALS;
module.exports.LUA_RIDX_LAST           = LUA_RIDX_LAST;
module.exports.LUA_RIDX_MAINTHREAD     = LUA_RIDX_MAINTHREAD;
module.exports.constant_types          = constant_types;
module.exports.lua_Debug               = lua_Debug;
module.exports.lua_upvalueindex        = lua_upvalueindex;
module.exports.thread_status           = thread_status;
