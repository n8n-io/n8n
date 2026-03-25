"use strict";

const { sprintf } = require('sprintf-js');

const {
    LUA_INTEGER_FMT,
    LUA_INTEGER_FRMLEN,
    LUA_MININTEGER,
    LUA_NUMBER_FMT,
    LUA_NUMBER_FRMLEN,
    frexp,
    lua_getlocaledecpoint
} = require('./luaconf.js');
const {
    LUA_TBOOLEAN,
    LUA_TFUNCTION,
    LUA_TNIL,
    LUA_TNUMBER,
    LUA_TSTRING,
    LUA_TTABLE,
    lua_call,
    lua_createtable,
    lua_dump,
    lua_gettable,
    lua_gettop,
    lua_isinteger,
    lua_isstring,
    lua_pop,
    lua_pushcclosure,
    lua_pushinteger,
    lua_pushlightuserdata,
    lua_pushliteral,
    lua_pushlstring,
    lua_pushnil,
    lua_pushnumber,
    lua_pushstring,
    lua_pushvalue,
    lua_remove,
    lua_setfield,
    lua_setmetatable,
    lua_settop,
    lua_toboolean,
    lua_tointeger,
    lua_tonumber,
    lua_tostring,
    lua_touserdata,
    lua_type,
    lua_upvalueindex
} = require('./lua.js');
const {
    luaL_Buffer,
    luaL_addchar,
    luaL_addlstring,
    luaL_addsize,
    luaL_addstring,
    luaL_addvalue,
    luaL_argcheck,
    luaL_argerror,
    luaL_buffinit,
    luaL_buffinitsize,
    luaL_checkinteger,
    luaL_checknumber,
    luaL_checkstack,
    luaL_checkstring,
    luaL_checktype,
    luaL_error,
    luaL_newlib,
    luaL_optinteger,
    luaL_optstring,
    luaL_prepbuffsize,
    luaL_pushresult,
    luaL_pushresultsize,
    luaL_tolstring,
    luaL_typename
} = require('./lauxlib.js');
const lualib = require('./lualib.js');
const {
    luastring_eq,
    luastring_indexOf,
    to_jsstring,
    to_luastring
} = require("./fengaricore.js");

const sL_ESC  = '%';
const L_ESC   = sL_ESC.charCodeAt(0);

/*
** maximum number of captures that a pattern can do during
** pattern-matching. This limit is arbitrary, but must fit in
** an unsigned char.
*/
const LUA_MAXCAPTURES = 32;

// (sizeof(size_t) < sizeof(int) ? MAX_SIZET : (size_t)(INT_MAX))
const MAXSIZE = 2147483647;

/* Give natural (i.e. strings end at the first \0) length of a string represented by an array of bytes */
const strlen = function(s) {
    let len = luastring_indexOf(s, 0);
    return len > -1 ? len : s.length;
};

/* translate a relative string position: negative means back from end */
const posrelat = function(pos, len) {
    if (pos >= 0) return pos;
    else if (0 - pos > len) return 0;
    else return len + pos + 1;
};

const str_sub = function(L) {
    let s = luaL_checkstring(L, 1);
    let l = s.length;
    let start = posrelat(luaL_checkinteger(L, 2), l);
    let end = posrelat(luaL_optinteger(L, 3, -1), l);
    if (start < 1) start = 1;
    if (end > l) end = l;
    if (start <= end)
        lua_pushstring(L, s.subarray(start - 1, (start - 1) + (end - start + 1)));
    else lua_pushliteral(L, "");
    return 1;
};

const str_len = function(L) {
    lua_pushinteger(L, luaL_checkstring(L, 1).length);
    return 1;
};

const str_char = function(L) {
    let n = lua_gettop(L);  /* number of arguments */
    let b = new luaL_Buffer();
    let p = luaL_buffinitsize(L, b, n);
    for (let i = 1; i <= n; i++) {
        let c = luaL_checkinteger(L, i);
        luaL_argcheck(L, c >= 0 && c <= 255, "value out of range"); // Strings are 8-bit clean
        p[i-1] = c;
    }
    luaL_pushresultsize(b, n);
    return 1;
};

const writer = function(L, b, size, B) {
    luaL_addlstring(B, b, size);
    return 0;
};

const str_dump = function(L) {
    let b = new luaL_Buffer();
    let strip = lua_toboolean(L, 2);
    luaL_checktype(L, 1, LUA_TFUNCTION);
    lua_settop(L, 1);
    luaL_buffinit(L, b);
    if (lua_dump(L, writer, b, strip) !== 0)
        return luaL_error(L, to_luastring("unable to dump given function"));
    luaL_pushresult(b);
    return 1;
};

const SIZELENMOD = LUA_NUMBER_FRMLEN.length + 1;

const L_NBFD = 1;

const num2straux = function(x) {
    /* if 'inf' or 'NaN', format it like '%g' */
    if (Object.is(x, Infinity))
        return to_luastring('inf');
    else if (Object.is(x, -Infinity))
        return to_luastring('-inf');
    else if (Number.isNaN(x))
        return to_luastring('nan');
    else if (x === 0) {  /* can be -0... */
        /* create "0" or "-0" followed by exponent */
        let zero = sprintf(LUA_NUMBER_FMT + "x0p+0", x);
        if (Object.is(x, -0))
            zero = "-" + zero;
        return to_luastring(zero);
    } else {
        let buff = "";
        let fe = frexp(x);  /* 'x' fraction and exponent */
        let m = fe[0];
        let e = fe[1];
        if (m < 0) {  /* is number negative? */
            buff += '-';  /* add signal */
            m = -m;  /* make it positive */
        }
        buff += "0x";  /* add "0x" */
        buff += (m * (1<<L_NBFD)).toString(16);
        e -= L_NBFD;  /* this digit goes before the radix point */
        buff += sprintf("p%+d", e);  /* add exponent */
        return to_luastring(buff);
    }
};

const lua_number2strx = function(L, fmt, x) {
    let buff = num2straux(x);
    if (fmt[SIZELENMOD] === 65 /* 'A'.charCodeAt(0) */) {
        for (let i = 0; i < buff.length; i++) {
            let c = buff[i];
            if (c >= 97) /* toupper */
                buff[i] = c & 0xdf;
        }
    } else if (fmt[SIZELENMOD] !== 97 /* 'a'.charCodeAt(0) */)
        luaL_error(L, to_luastring("modifiers for format '%%a'/'%%A' not implemented"));
    return buff;
};

/*
** Maximum size of each formatted item. This maximum size is produced
** by format('%.99f', -maxfloat), and is equal to 99 + 3 ('-', '.',
** and '\0') + number of decimal digits to represent maxfloat (which
** is maximum exponent + 1). (99+3+1 then rounded to 120 for "extra
** expenses", such as locale-dependent stuff)
*/
// const MAX_ITEM   = 120;// TODO: + l_mathlim(MAX_10_EXP);


/* valid flags in a format specification */
const FLAGS = to_luastring("-+ #0");

/*
** maximum size of each format specification (such as "%-099.99d")
*/
// const MAX_FORMAT = 32;

const isalpha = e => (97 <= e && e <= 122) || (65 <= e && e <= 90);
const isdigit = e => 48 <= e && e <= 57;
const iscntrl = e => (0x00 <= e && e <= 0x1f) || e === 0x7f;
const isgraph = e => 33 <= e && e <= 126;
const islower = e => 97 <= e && e <= 122;
const isupper = e => 65 <= e && e <= 90;
const isalnum = e => (97 <= e && e <= 122) || (65 <= e && e <= 90) || (48 <= e && e <= 57);
const ispunct = e => isgraph(e) && !isalnum(e);
const isspace = e => e === 32 || (e >= 9 && e <= 13);
const isxdigit = e => (48 <= e && e <= 57) || (65 <= e && e <= 70) || (97 <= e && e <= 102);

const addquoted = function(b, s, len) {
    luaL_addchar(b, 34 /* '"'.charCodeAt(0) */);
    let i = 0;
    while (len--) {
        if (s[i] === 34 /* '"'.charCodeAt(0) */ ||
            s[i] === 92 /* '\\'.charCodeAt(0) */ ||
            s[i] === 10 /* '\n'.charCodeAt(0) */) {
            luaL_addchar(b, 92 /* '\\'.charCodeAt(0) */);
            luaL_addchar(b, s[i]);
        } else if (iscntrl(s[i])) {
            let buff = ''+s[i];
            if (isdigit(s[i+1]))
                buff = '0'.repeat(3-buff.length) + buff; /* pad to 3 '0's */
            luaL_addstring(b, to_luastring("\\" + buff));
        } else
            luaL_addchar(b, s[i]);
        i++;
    }
    luaL_addchar(b, 34 /* '"'.charCodeAt(0) */);
};

/*
** Ensures the 'buff' string uses a dot as the radix character.
*/
const checkdp = function(buff) {
    if (luastring_indexOf(buff, 46 /* ('.').charCodeAt(0) */) < 0) {  /* no dot? */
        let point = lua_getlocaledecpoint();  /* try locale point */
        let ppoint = luastring_indexOf(buff, point);
        if (ppoint) buff[ppoint] = 46 /* ('.').charCodeAt(0) */;  /* change it to a dot */
    }
};

const addliteral = function(L, b, arg) {
    switch(lua_type(L, arg)) {
        case LUA_TSTRING: {
            let s = lua_tostring(L, arg);
            addquoted(b, s, s.length);
            break;
        }
        case LUA_TNUMBER: {
            let buff;
            if (!lua_isinteger(L, arg)) {  /* float? */
                let n = lua_tonumber(L, arg);  /* write as hexa ('%a') */
                buff = lua_number2strx(L, to_luastring(`%${LUA_INTEGER_FRMLEN}a`), n);
                checkdp(buff);  /* ensure it uses a dot */
            } else {  /* integers */
                let n = lua_tointeger(L, arg);
                let format = (n === LUA_MININTEGER)  /* corner case? */
                    ? "0x%" + LUA_INTEGER_FRMLEN + "x"  /* use hexa */
                    : LUA_INTEGER_FMT;  /* else use default format */
                buff = to_luastring(sprintf(format, n));
            }
            luaL_addstring(b, buff);
            break;
        }
        case LUA_TNIL: case LUA_TBOOLEAN: {
            luaL_tolstring(L, arg);
            luaL_addvalue(b);
            break;
        }
        default: {
            luaL_argerror(L, arg, to_luastring("value has no literal form"));
        }
    }
};

const scanformat = function(L, strfrmt, i, form) {
    let p = i;
    while (strfrmt[p] !== 0 && luastring_indexOf(FLAGS, strfrmt[p]) >= 0) p++;  /* skip flags */
    if (p - i >= FLAGS.length)
        luaL_error(L, to_luastring("invalid format (repeated flags)"));
    if (isdigit(strfrmt[p])) p++;  /* skip width */
    if (isdigit(strfrmt[p])) p++;  /* (2 digits at most) */
    if (strfrmt[p] === 46 /* '.'.charCodeAt(0) */) {
        p++;
        if (isdigit(strfrmt[p])) p++;  /* skip precision */
        if (isdigit(strfrmt[p])) p++;  /* (2 digits at most) */
    }
    if (isdigit(strfrmt[p]))
        luaL_error(L, to_luastring("invalid format (width or precision too long)"));
    form[0] = 37 /* "%".charCodeAt(0) */;
    for (let j = 0; j < p - i + 1; j++)
        form[j+1] = strfrmt[i+j];
    return p;
};

/*
** add length modifier into formats
*/
const addlenmod = function(form, lenmod) {
    let l = form.length;
    let lm = lenmod.length;
    let spec = form[l - 1];
    for (let i = 0; i < lm; i++)
        form[i + l - 1] = lenmod[i];
    form[l + lm - 1] = spec;
    // form[l + lm] = 0;
};

const str_format = function(L) {
    let top = lua_gettop(L);
    let arg = 1;
    let strfrmt = luaL_checkstring(L, arg);
    let i = 0;
    let b = new luaL_Buffer();
    luaL_buffinit(L, b);
    while (i < strfrmt.length) {
        if (strfrmt[i] !== L_ESC) {
            luaL_addchar(b, strfrmt[i++]);
        } else if (strfrmt[++i] === L_ESC) {
            luaL_addchar(b, strfrmt[i++]); /* %% */
        } else { /* format item */
            let form = [];  /* to store the format ('%...') */
            if (++arg > top)
                luaL_argerror(L, arg, to_luastring("no value"));
            i = scanformat(L, strfrmt, i, form);
            switch (String.fromCharCode(strfrmt[i++])) {
                case 'c': {
                    // sprintf(String.fromCharCode(...form), luaL_checkinteger(L, arg));
                    luaL_addchar(b, luaL_checkinteger(L, arg));
                    break;
                }
                case 'd': case 'i':
                case 'o': case 'u': case 'x': case 'X': {
                    let n = luaL_checkinteger(L, arg);
                    addlenmod(form, to_luastring(LUA_INTEGER_FRMLEN, true));
                    luaL_addstring(b, to_luastring(sprintf(String.fromCharCode(...form), n)));
                    break;
                }
                case 'a': case 'A': {
                    addlenmod(form, to_luastring(LUA_INTEGER_FRMLEN, true));
                    luaL_addstring(b, lua_number2strx(L, form, luaL_checknumber(L, arg)));
                    break;
                }
                case 'e': case 'E': case 'f':
                case 'g': case 'G': {
                    let n = luaL_checknumber(L, arg);
                    addlenmod(form, to_luastring(LUA_INTEGER_FRMLEN, true));
                    luaL_addstring(b, to_luastring(sprintf(String.fromCharCode(...form), n)));
                    break;
                }
                case 'q': {
                    addliteral(L, b, arg);
                    break;
                }
                case 's': {
                    let s = luaL_tolstring(L, arg);
                    if (form.length <= 2 || form[2] === 0) {  /* no modifiers? */
                        luaL_addvalue(b);  /* keep entire string */
                    } else {
                        luaL_argcheck(L, s.length === strlen(s), arg, "string contains zeros");
                        if (luastring_indexOf(form, 46 /* '.'.charCodeAt(0) */) < 0 && s.length >= 100) {
                            /* no precision and string is too long to be formatted */
                            luaL_addvalue(b);  /* keep entire string */
                        } else {  /* format the string into 'buff' */
                            // TODO: will fail if s is not valid UTF-8
                            luaL_addstring(b, to_luastring(sprintf(String.fromCharCode(...form), to_jsstring(s))));
                            lua_pop(L, 1);  /* remove result from 'luaL_tolstring' */
                        }
                    }
                    break;
                }
                default: {  /* also treat cases 'pnLlh' */
                    return luaL_error(L, to_luastring("invalid option '%%%c' to 'format'"), strfrmt[i-1]);
                }
            }
        }
    }
    luaL_pushresult(b);
    return 1;
};

/* value used for padding */
const LUAL_PACKPADBYTE = 0x00;

/* maximum size for the binary representation of an integer */
const MAXINTSIZE = 16;

const SZINT = 4; // Size of lua_Integer

/* number of bits in a character */
const NB = 8;

/* mask for one character (NB 1's) */
const MC = ((1 << NB) - 1);

const MAXALIGN = 8;

/*
** information to pack/unpack stuff
*/
class Header {
    constructor(L) {
        this.L = L;
        this.islittle = true;
        this.maxalign = 1;
    }
}

/*
** options for pack/unpack
*/
const Kint       = 0; /* signed integers */
const Kuint      = 1; /* unsigned integers */
const Kfloat     = 2; /* floating-point numbers */
const Kchar      = 3; /* fixed-length strings */
const Kstring    = 4; /* strings with prefixed length */
const Kzstr      = 5; /* zero-terminated strings */
const Kpadding   = 6; /* padding */
const Kpaddalign = 7; /* padding for alignment */
const Knop       = 8; /* no-op (configuration or spaces) */

const digit = isdigit;

const getnum = function(fmt, df) {
    if (fmt.off >= fmt.s.length || !digit(fmt.s[fmt.off]))  /* no number? */
        return df;  /* return default value */
    else {
        let a = 0;
        do {
            a = a * 10 + (fmt.s[fmt.off++] - 48 /* '0'.charCodeAt(0) */);
        } while (fmt.off < fmt.s.length && digit(fmt.s[fmt.off]) && a <= (MAXSIZE - 9)/10);
        return a;
    }
};

/*
** Read an integer numeral and raises an error if it is larger
** than the maximum size for integers.
*/
const getnumlimit = function(h, fmt, df) {
    let sz = getnum(fmt, df);
    if (sz > MAXINTSIZE || sz <= 0)
        luaL_error(h.L, to_luastring("integral size (%d) out of limits [1,%d]"), sz, MAXINTSIZE);
    return sz;
};

/*
** Read and classify next option. 'size' is filled with option's size.
*/
const getoption = function(h, fmt) {
    let r = {
        opt: fmt.s[fmt.off++],
        size: 0  /* default */
    };
    switch (r.opt) {
        case 98  /*'b'*/: r.size = 1; r.opt = Kint;   return r; // sizeof(char): 1
        case 66  /*'B'*/: r.size = 1; r.opt = Kuint;  return r;
        case 104 /*'h'*/: r.size = 2; r.opt = Kint;   return r; // sizeof(short): 2
        case 72  /*'H'*/: r.size = 2; r.opt = Kuint;  return r;
        case 108 /*'l'*/: r.size = 4; r.opt = Kint;   return r; // sizeof(long): 4
        case 76  /*'L'*/: r.size = 4; r.opt = Kuint;  return r;
        case 106 /*'j'*/: r.size = 4; r.opt = Kint;   return r; // sizeof(lua_Integer): 4
        case 74  /*'J'*/: r.size = 4; r.opt = Kuint;  return r;
        case 84  /*'T'*/: r.size = 4; r.opt = Kuint;  return r; // sizeof(size_t): 4
        case 102 /*'f'*/: r.size = 4; r.opt = Kfloat; return r; // sizeof(float): 4
        case 100 /*'d'*/: r.size = 8; r.opt = Kfloat; return r; // sizeof(double): 8
        case 110 /*'n'*/: r.size = 8; r.opt = Kfloat; return r; // sizeof(lua_Number): 8
        case 105 /*'i'*/: r.size = getnumlimit(h, fmt, 4); r.opt = Kint;    return r; // sizeof(int): 4
        case 73  /*'I'*/: r.size = getnumlimit(h, fmt, 4); r.opt = Kuint;   return r;
        case 115 /*'s'*/: r.size = getnumlimit(h, fmt, 4); r.opt = Kstring; return r;
        case 99  /*'c'*/: {
            r.size = getnum(fmt, -1);
            if (r.size === -1)
                luaL_error(h.L, to_luastring("missing size for format option 'c'"));
            r.opt = Kchar;
            return r;
        }
        case 122 /*'z'*/:             r.opt = Kzstr;      return r;
        case 120 /*'x'*/: r.size = 1; r.opt = Kpadding;   return r;
        case 88  /*'X'*/:             r.opt = Kpaddalign; return r;
        case 32  /*' '*/: break;
        case 60  /*'<'*/: h.islittle = true; break;
        case 62  /*'>'*/: h.islittle = false; break;
        case 61  /*'='*/: h.islittle = true; break;
        case 33  /*'!'*/: h.maxalign = getnumlimit(h, fmt, MAXALIGN); break;
        default: luaL_error(h.L, to_luastring("invalid format option '%c'"), r.opt);
    }
    r.opt = Knop;
    return r;
};

/*
** Read, classify, and fill other details about the next option.
** 'psize' is filled with option's size, 'notoalign' with its
** alignment requirements.
** Local variable 'size' gets the size to be aligned. (Kpadal option
** always gets its full alignment, other options are limited by
** the maximum alignment ('maxalign'). Kchar option needs no alignment
** despite its size.
*/
const getdetails = function(h, totalsize, fmt) {
    let r = {
        opt: NaN,
        size: NaN,
        ntoalign: NaN
    };

    let opt = getoption(h, fmt);
    r.size = opt.size;
    r.opt = opt.opt;
    let align = r.size;  /* usually, alignment follows size */
    if (r.opt === Kpaddalign) {  /* 'X' gets alignment from following option */
        if (fmt.off >= fmt.s.length || fmt.s[fmt.off] === 0)
            luaL_argerror(h.L, 1, to_luastring("invalid next option for option 'X'"));
        else {
            let o = getoption(h, fmt);
            align = o.size;
            o = o.opt;
            if (o === Kchar || align === 0)
                luaL_argerror(h.L, 1, to_luastring("invalid next option for option 'X'"));
        }
    }
    if (align <= 1 || r.opt === Kchar)  /* need no alignment? */
        r.ntoalign = 0;
    else {
        if (align > h.maxalign)  /* enforce maximum alignment */
            align = h.maxalign;
        if ((align & (align -1)) !== 0)  /* is 'align' not a power of 2? */
            luaL_argerror(h.L, 1, to_luastring("format asks for alignment not power of 2"));
        r.ntoalign = (align - (totalsize & (align - 1))) & (align - 1);
    }
    return r;
};

/*
** Pack integer 'n' with 'size' bytes and 'islittle' endianness.
** The final 'if' handles the case when 'size' is larger than
** the size of a Lua integer, correcting the extra sign-extension
** bytes if necessary (by default they would be zeros).
*/
const packint = function(b, n, islittle, size, neg) {
    let buff = luaL_prepbuffsize(b, size);
    buff[islittle ? 0 : size - 1] = n & MC;  /* first byte */
    for (let i = 1; i < size; i++) {
        n >>= NB;
        buff[islittle ? i : size - 1 - i] = n & MC;
    }
    if (neg && size > SZINT) {  /* negative number need sign extension? */
        for (let i = SZINT; i < size; i++)  /* correct extra bytes */
            buff[islittle ? i : size - 1 - i] = MC;
    }
    luaL_addsize(b, size);  /* add result to buffer */
};

const str_pack = function(L) {
    let b = new luaL_Buffer();
    let h = new Header(L);
    let fmt = {
        s: luaL_checkstring(L, 1),  /* format string */
        off: 0
    };
    let arg = 1;  /* current argument to pack */
    let totalsize = 0;  /* accumulate total size of result */
    lua_pushnil(L);  /* mark to separate arguments from string buffer */
    luaL_buffinit(L, b);
    while (fmt.off < fmt.s.length) {
        let details = getdetails(h, totalsize, fmt);
        let opt = details.opt;
        let size = details.size;
        let ntoalign = details.ntoalign;
        totalsize += ntoalign + size;
        while (ntoalign-- > 0)
            luaL_addchar(b, LUAL_PACKPADBYTE);  /* fill alignment */
        arg++;
        switch (opt) {
            case Kint: {  /* signed integers */
                let n = luaL_checkinteger(L, arg);
                if (size < SZINT) {  /* need overflow check? */
                    let lim = 1 << (size * 8) - 1;
                    luaL_argcheck(L, -lim <= n && n < lim, arg, "integer overflow");
                }
                packint(b, n, h.islittle, size, n < 0);
                break;
            }
            case Kuint: {  /* unsigned integers */
                let n = luaL_checkinteger(L, arg);
                if (size < SZINT)
                    luaL_argcheck(L, (n>>>0) < (1 << (size * NB)), arg, "unsigned overflow");
                packint(b, n>>>0, h.islittle, size, false);
                break;
            }
            case Kfloat: {  /* floating-point options */
                let buff = luaL_prepbuffsize(b, size);
                let n = luaL_checknumber(L, arg);  /* get argument */
                let dv = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
                if (size === 4) dv.setFloat32(0, n, h.islittle);
                else dv.setFloat64(0, n, h.islittle);
                luaL_addsize(b, size);
                break;
            }
            case Kchar: {  /* fixed-size string */
                let s = luaL_checkstring(L, arg);
                let len = s.length;
                luaL_argcheck(L, len <= size, arg, "string longer than given size");
                luaL_addlstring(b, s, len);  /* add string */
                while (len++ < size)  /* pad extra space */
                    luaL_addchar(b, LUAL_PACKPADBYTE);
                break;
            }
            case Kstring: {  /* strings with length count */
                let s = luaL_checkstring(L, arg);
                let len = s.length;
                luaL_argcheck(L,
                    size >= 4 /* sizeof(size_t) */ || len < (1 << (size * NB)),
                    arg, "string length does not fit in given size");
                packint(b, len, h.islittle, size, 0);  /* pack length */
                luaL_addlstring(b, s, len);
                totalsize += len;
                break;
            }
            case Kzstr: {  /* zero-terminated string */
                let s = luaL_checkstring(L, arg);
                let len = s.length;
                luaL_argcheck(L, luastring_indexOf(s, 0) < 0, arg, "strings contains zeros");
                luaL_addlstring(b, s, len);
                luaL_addchar(b, 0);  /* add zero at the end */
                totalsize += len + 1;
                break;
            }
            case Kpadding: luaL_addchar(b, LUAL_PACKPADBYTE); /* fall through */
            case Kpaddalign: case Knop:
                arg--;  /* undo increment */
                break;
        }
    }
    luaL_pushresult(b);
    return 1;
};

const str_reverse = function(L) {
    let s = luaL_checkstring(L, 1);
    let l = s.length;
    let r = new Uint8Array(l);
    for (let i=0; i<l; i++)
        r[i] = s[l-1-i];
    lua_pushstring(L, r);
    return 1;
};

const str_lower = function(L) {
    let s = luaL_checkstring(L, 1);
    let l = s.length;
    let r = new Uint8Array(l);
    for (let i=0; i<l; i++) {
        let c = s[i];
        if (isupper(c))
            c = c | 0x20;
        r[i] = c;
    }
    lua_pushstring(L, r);
    return 1;
};

const str_upper = function(L) {
    let s = luaL_checkstring(L, 1);
    let l = s.length;
    let r = new Uint8Array(l);
    for (let i=0; i<l; i++) {
        let c = s[i];
        if (islower(c))
            c = c & 0xdf;
        r[i] = c;
    }
    lua_pushstring(L, r);
    return 1;
};

const str_rep = function(L) {
    let s = luaL_checkstring(L, 1);
    let l = s.length;
    let n = luaL_checkinteger(L, 2);
    let sep = luaL_optstring(L, 3, "");
    let lsep = sep.length;
    if (n <= 0) lua_pushliteral(L, "");
    else if (l + lsep < l || l + lsep > MAXSIZE / n)  /* may overflow? */
        return luaL_error(L, to_luastring("resulting string too large"));
    else {
        let totallen = n * l + (n - 1) * lsep;
        let b = new luaL_Buffer();
        let p = luaL_buffinitsize(L, b, totallen);
        let pi = 0;
        while (n-- > 1) {  /* first n-1 copies (followed by separator) */
            p.set(s, pi);
            pi += l;
            if (lsep > 0) {  /* empty 'memcpy' is not that cheap */
                p.set(sep, pi);
                pi += lsep;
            }
        }
        p.set(s, pi);  /* last copy (not followed by separator) */
        luaL_pushresultsize(b, totallen);
    }
    return 1;
};

const str_byte = function(L) {
    let s = luaL_checkstring(L, 1);
    let l = s.length;
    let posi = posrelat(luaL_optinteger(L, 2, 1), l);
    let pose = posrelat(luaL_optinteger(L, 3, posi), l);

    if (posi < 1) posi = 1;
    if (pose > l) pose = l;
    if (posi > pose) return 0;  /* empty interval; return no values */
    if (pose - posi >= Number.MAX_SAFE_INTEGER)  /* arithmetic overflow? */
        return luaL_error(L, "string slice too long");

    let n = (pose - posi) + 1;
    luaL_checkstack(L, n, "string slice too long");
    for (let i = 0; i < n; i++)
        lua_pushinteger(L, s[posi + i - 1]);
    return n;
};

const str_packsize = function(L) {
    let h = new Header(L);
    let fmt = {
        s: luaL_checkstring(L, 1),
        off: 0
    };
    let totalsize = 0;  /* accumulate total size of result */
    while (fmt.off < fmt.s.length) {
        let details = getdetails(h, totalsize, fmt);
        let opt = details.opt;
        let size = details.size;
        let ntoalign = details.ntoalign;
        size += ntoalign;  /* total space used by option */
        luaL_argcheck(L, totalsize <= MAXSIZE - size, 1, "format result too large");
        totalsize += size;
        switch (opt) {
            case Kstring:  /* strings with length count */
            case Kzstr:    /* zero-terminated string */
                luaL_argerror(L, 1, "variable-length format");
                /* call never return, but to avoid warnings: *//* fall through */
            default:  break;
        }
    }
    lua_pushinteger(L, totalsize);
    return 1;
};

/*
** Unpack an integer with 'size' bytes and 'islittle' endianness.
** If size is smaller than the size of a Lua integer and integer
** is signed, must do sign extension (propagating the sign to the
** higher bits); if size is larger than the size of a Lua integer,
** it must check the unread bytes to see whether they do not cause an
** overflow.
*/
const unpackint = function(L, str, islittle, size, issigned) {
    let res = 0;
    let limit = size <= SZINT ? size : SZINT;
    for (let i = limit - 1; i >= 0; i--) {
        res <<= NB;
        res |= str[islittle ? i : size - 1 - i];
    }
    if (size < SZINT) {  /* real size smaller than lua_Integer? */
        if (issigned) {  /* needs sign extension? */
            let mask = 1 << (size * NB - 1);
            res = ((res ^ mask) - mask);  /* do sign extension */
        }
    } else if (size > SZINT) {  /* must check unread bytes */
        let mask = !issigned || res >= 0 ? 0 : MC;
        for (let i = limit; i < size; i++) {
            if (str[islittle ? i : size - 1 - i] !== mask)
                luaL_error(L, to_luastring("%d-byte integer does not fit into Lua Integer"), size);
        }
    }
    return res;
};

const unpacknum = function(L, b, islittle, size) {
    lualib.lua_assert(b.length >= size);

    let dv = new DataView(new ArrayBuffer(size));
    for (let i = 0; i < size; i++)
        dv.setUint8(i, b[i], islittle);

    if (size == 4) return dv.getFloat32(0, islittle);
    else return dv.getFloat64(0, islittle);
};

const str_unpack = function(L) {
    let h = new Header(L);
    let fmt = {
        s: luaL_checkstring(L, 1),
        off: 0
    };
    let data = luaL_checkstring(L, 2);
    let ld = data.length;
    let pos = posrelat(luaL_optinteger(L, 3, 1), ld) - 1;
    let n = 0;  /* number of results */
    luaL_argcheck(L, pos <= ld && pos >= 0, 3, "initial position out of string");
    while (fmt.off < fmt.s.length) {
        let details = getdetails(h, pos, fmt);
        let opt = details.opt;
        let size = details.size;
        let ntoalign = details.ntoalign;
        if (/*ntoalign + size > ~pos ||*/ pos + ntoalign + size > ld)
            luaL_argerror(L, 2, to_luastring("data string too short"));
        pos += ntoalign;  /* skip alignment */
        /* stack space for item + next position */
        luaL_checkstack(L, 2, "too many results");
        n++;
        switch (opt) {
            case Kint:
            case Kuint: {
                let res = unpackint(L, data.subarray(pos), h.islittle, size, opt === Kint);
                lua_pushinteger(L, res);
                break;
            }
            case Kfloat: {
                let res = unpacknum(L, data.subarray(pos), h.islittle, size);
                lua_pushnumber(L, res);
                break;
            }
            case Kchar: {
                lua_pushstring(L, data.subarray(pos, pos + size));
                break;
            }
            case Kstring: {
                let len = unpackint(L, data.subarray(pos), h.islittle, size, 0);
                luaL_argcheck(L, pos + len + size <= ld, 2, "data string too short");
                lua_pushstring(L, data.subarray(pos + size, pos + size + len));
                pos += len;  /* skip string */
                break;
            }
            case Kzstr: {
                let e = luastring_indexOf(data, 0, pos);
                if (e === -1) e = data.length - pos;
                lua_pushstring(L, data.subarray(pos, e));
                pos = e + 1;  /* skip string plus final '\0' */
                break;
            }
            case Kpaddalign: case Kpadding: case Knop:
                n--;  /* undo increment */
                break;
        }
        pos += size;
    }
    lua_pushinteger(L, pos + 1);  /* next position */
    return n + 1;
};

const CAP_UNFINISHED = -1;
const CAP_POSITION   = -2;
const MAXCCALLS      = 200;
const SPECIALS       = to_luastring("^$*+?.([%-");

class MatchState {
    constructor(L) {
        this.src = null;  /* unmodified source string */
        this.src_init = null;  /* init of source string */
        this.src_end = null;  /* end ('\0') of source string */
        this.p = null;  /* unmodified pattern string */
        this.p_end = null;  /* end ('\0') of pattern */
        this.L = L;
        this.matchdepth = NaN;  /* control for recursive depth */
        this.level = NaN;  /* total number of captures (finished or unfinished) */
        this.capture = [];
    }
}

const check_capture = function(ms, l) {
    l = l - 49 /* '1'.charCodeAt(0) */;
    if (l < 0 || l >= ms.level || ms.capture[l].len === CAP_UNFINISHED)
        return luaL_error(ms.L, to_luastring("invalid capture index %%%d"), l + 1);
    return l;
};

const capture_to_close = function(ms) {
    let level = ms.level;
    for (level--; level >= 0; level--)
        if (ms.capture[level].len === CAP_UNFINISHED) return level;
    return luaL_error(ms.L, to_luastring("invalid pattern capture"));
};

const classend = function(ms, p) {
    switch(ms.p[p++]) {
        case L_ESC: {
            if (p === ms.p_end)
                luaL_error(ms.L, to_luastring("malformed pattern (ends with '%%')"));
            return p + 1;
        }
        case 91 /* '['.charCodeAt(0) */: {
            if (ms.p[p] === 94 /* '^'.charCodeAt(0) */) p++;
            do {  /* look for a ']' */
                if (p === ms.p_end)
                    luaL_error(ms.L, to_luastring("malformed pattern (missing ']')"));
                if (ms.p[p++] === L_ESC && p < ms.p_end)
                    p++;  /* skip escapes (e.g. '%]') */
            } while (ms.p[p] !== 93 /* ']'.charCodeAt(0) */);
            return p + 1;
        }
        default: {
            return p;
        }
    }
};

const match_class = function(c, cl) {
    switch (cl) {
        case 97  /* 'a'.charCodeAt(0) */: return  isalpha(c);
        case 65  /* 'A'.charCodeAt(0) */: return !isalpha(c);
        case 99  /* 'c'.charCodeAt(0) */: return  iscntrl(c);
        case 67  /* 'C'.charCodeAt(0) */: return !iscntrl(c);
        case 100 /* 'd'.charCodeAt(0) */: return  isdigit(c);
        case 68  /* 'D'.charCodeAt(0) */: return !isdigit(c);
        case 103 /* 'g'.charCodeAt(0) */: return  isgraph(c);
        case 71  /* 'G'.charCodeAt(0) */: return !isgraph(c);
        case 108 /* 'l'.charCodeAt(0) */: return  islower(c);
        case 76  /* 'L'.charCodeAt(0) */: return !islower(c);
        case 112 /* 'p'.charCodeAt(0) */: return  ispunct(c);
        case 80  /* 'P'.charCodeAt(0) */: return !ispunct(c);
        case 115 /* 's'.charCodeAt(0) */: return  isspace(c);
        case 83  /* 'S'.charCodeAt(0) */: return !isspace(c);
        case 117 /* 'u'.charCodeAt(0) */: return  isupper(c);
        case 85  /* 'U'.charCodeAt(0) */: return !isupper(c);
        case 119 /* 'w'.charCodeAt(0) */: return  isalnum(c);
        case 87  /* 'W'.charCodeAt(0) */: return !isalnum(c);
        case 120 /* 'x'.charCodeAt(0) */: return  isxdigit(c);
        case 88  /* 'X'.charCodeAt(0) */: return !isxdigit(c);
        case 122 /* 'z'.charCodeAt(0) */: return (c === 0);  /* deprecated option */
        case 90  /* 'z'.charCodeAt(0) */: return (c !== 0);  /* deprecated option */
        default: return (cl === c);
    }
};

const matchbracketclass = function(ms, c, p, ec) {
    let sig = true;
    if (ms.p[p + 1] === 94 /* '^'.charCodeAt(0) */) {
        sig = false;
        p++;  /* skip the '^' */
    }
    while (++p < ec) {
        if (ms.p[p] === L_ESC) {
            p++;
            if (match_class(c, ms.p[p]))
                return sig;
        } else if (ms.p[p + 1] === 45 /* '-'.charCodeAt(0) */ && p + 2 < ec) {
            p += 2;
            if (ms.p[p - 2] <= c && c <= ms.p[p])
                return sig;
        } else if (ms.p[p] === c) return sig;
    }
    return !sig;
};

const singlematch = function(ms, s, p, ep) {
    if (s >= ms.src_end)
        return false;
    else {
        let c = ms.src[s];
        switch (ms.p[p]) {
            case 46 /* '.'.charCodeAt(0) */: return true;  /* matches any char */
            case L_ESC: return match_class(c, ms.p[p + 1]);
            case 91 /* '['.charCodeAt(0) */: return matchbracketclass(ms, c, p, ep - 1);
            default: return ms.p[p] === c;
        }
    }
};

const matchbalance = function(ms, s, p) {
    if (p >= ms.p_end - 1)
        luaL_error(ms.L, to_luastring("malformed pattern (missing arguments to '%%b'"));
    if (ms.src[s] !== ms.p[p])
        return null;
    else {
        let b = ms.p[p];
        let e = ms.p[p + 1];
        let cont = 1;
        while (++s < ms.src_end) {
            if (ms.src[s] === e) {
                if (--cont === 0) return s + 1;
            }
            else if (ms.src[s] === b) cont++;
        }
    }
    return null;  /* string ends out of balance */
};

const max_expand = function(ms, s, p, ep) {
    let i = 0;  /* counts maximum expand for item */
    while (singlematch(ms, s + i, p, ep))
        i++;
    /* keeps trying to match with the maximum repetitions */
    while (i >= 0) {
        let res = match(ms, s + i, ep + 1);
        if (res) return res;
        i--;  /* else didn't match; reduce 1 repetition to try again */
    }
    return null;
};

const min_expand = function(ms, s, p, ep) {
    for (;;) {
        let res = match(ms, s, ep + 1);
        if (res !== null)
            return res;
        else if (singlematch(ms, s, p, ep))
            s++;  /* try with one more repetition */
        else return null;
    }
};

const start_capture = function(ms, s, p, what) {
    let level = ms.level;
    if (level >= LUA_MAXCAPTURES) luaL_error(ms.L, to_luastring("too many captures"));
    ms.capture[level] = ms.capture[level] ? ms.capture[level] : {};
    ms.capture[level].init = s;
    ms.capture[level].len = what;
    ms.level = level + 1;
    let res;
    if ((res = match(ms, s, p)) === null)  /* match failed? */
        ms.level--;  /* undo capture */
    return res;
};

const end_capture = function(ms, s, p) {
    let l = capture_to_close(ms);
    ms.capture[l].len = s - ms.capture[l].init;  /* close capture */
    let res;
    if ((res = match(ms, s, p)) === null)  /* match failed? */
        ms.capture[l].len = CAP_UNFINISHED;  /* undo capture */
    return res;
};

/* Compare the elements of arrays 'a' and 'b' to see if they contain the same elements */
const array_cmp = function(a, ai, b, bi, len) {
    return luastring_eq(a.subarray(ai, ai+len), b.subarray(bi, bi+len));
};

const match_capture = function(ms, s, l) {
    l = check_capture(ms, l);
    let len = ms.capture[l].len;
    if ((ms.src_end-s) >= len && array_cmp(ms.src, ms.capture[l].init, ms.src, s, len))
        return s+len;
    else return null;
};

const match = function(ms, s, p) {
    let gotodefault = false;
    let gotoinit = true;

    if (ms.matchdepth-- === 0)
        luaL_error(ms.L, to_luastring("pattern too complex"));

    while (gotoinit || gotodefault) {
        gotoinit = false;
        if (p !== ms.p_end) {  /* end of pattern? */
            switch (gotodefault ? void 0 : ms.p[p]) {
                case 40 /* '('.charCodeAt(0) */: {  /* start capture */
                    if (ms.p[p + 1] === 41 /* ')'.charCodeAt(0) */)  /* position capture? */
                        s = start_capture(ms, s, p + 2, CAP_POSITION);
                    else
                        s = start_capture(ms, s, p + 1, CAP_UNFINISHED);
                    break;
                }
                case 41 /* ')'.charCodeAt(0) */: {  /* end capture */
                    s = end_capture(ms, s, p + 1);
                    break;
                }
                case 36 /* '$'.charCodeAt(0) */: {
                    if (p + 1 !== ms.p_end) {  /* is the '$' the last char in pattern? */
                        gotodefault = true;  /* no; go to default */
                        break;
                    }
                    s = (ms.src.length - s) === 0 ? s : null;  /* check end of string */
                    break;
                }
                case L_ESC: {  /* escaped sequences not in the format class[*+?-]? */
                    switch (ms.p[p + 1]) {
                        case 98 /* 'b'.charCodeAt(0) */: {  /* balanced string? */
                            s = matchbalance(ms, s, p + 2);
                            if (s !== null) {
                                p += 4;
                                gotoinit = true;
                            }
                            break;
                        }
                        case 102 /* 'f'.charCodeAt(0) */: {  /* frontier? */
                            p += 2;
                            if (ms.p[p] !== 91 /* '['.charCodeAt(0) */)
                                luaL_error(ms.L, to_luastring("missing '[' after '%%f' in pattern"));
                            let ep = classend(ms, p);  /* points to what is next */
                            let previous = s === ms.src_init ? 0 : ms.src[s-1];
                            if (!matchbracketclass(ms, previous, p, ep - 1) && matchbracketclass(ms, (s===ms.src_end)?0:ms.src[s], p, ep - 1)) {
                                p = ep; gotoinit = true; break;
                            }
                            s = null;  /* match failed */
                            break;
                        }
                        case 48: case 49: case 50: case 51: case 52:
                        case 53: case 54: case 55: case 56: case 57: {  /* capture results (%0-%9)? */
                            s = match_capture(ms, s, ms.p[p + 1]);
                            if (s !== null) {
                                p += 2; gotoinit = true;
                            }
                            break;
                        }
                        default: gotodefault = true;
                    }
                    break;
                }
                default: {  /* pattern class plus optional suffix */
                    gotodefault = false;
                    let ep = classend(ms, p);  /* points to optional suffix */
                    /* does not match at least once? */
                    if (!singlematch(ms, s, p, ep)) {
                        if (ms.p[ep] === 42 /* '*'.charCodeAt(0) */ ||
                            ms.p[ep] === 63 /* '?'.charCodeAt(0) */ ||
                            ms.p[ep] === 45 /* '-'.charCodeAt(0) */
                        ) {  /* accept empty? */
                            p = ep + 1; gotoinit = true; break;
                        } else  /* '+' or no suffix */
                            s = null;  /* fail */
                    } else {  /* matched once */
                        switch (ms.p[ep]) {  /* handle optional suffix */
                            case 63 /* '?'.charCodeAt(0) */: {  /* optional */
                                let res;
                                if ((res = match(ms, s + 1, ep + 1)) !== null)
                                    s = res;
                                else {
                                    p = ep + 1; gotoinit = true;
                                }
                                break;
                            }
                            case 43 /* '+'.charCodeAt(0) */:  /* 1 or more repetitions */
                                s++;  /* 1 match already done */
                                /* fall through */
                            case 42 /* '*'.charCodeAt(0) */:  /* 0 or more repetitions */
                                s = max_expand(ms, s, p, ep);
                                break;
                            case 45 /* '-'.charCodeAt(0) */:  /* 0 or more repetitions (minimum) */
                                s = min_expand(ms, s, p, ep);
                                break;
                            default:  /* no suffix */
                                s++; p = ep; gotoinit = true;
                        }
                    }
                    break;
                }
            }
        }
    }
    ms.matchdepth++;
    return s;
};

const push_onecapture = function(ms, i, s, e) {
    if (i >= ms.level) {
        if (i === 0)
            lua_pushlstring(ms.L, ms.src.subarray(s, e), e - s);  /* add whole match */
        else
            luaL_error(ms.L, to_luastring("invalid capture index %%%d"), i + 1);
    } else {
        let l = ms.capture[i].len;
        if (l === CAP_UNFINISHED) luaL_error(ms.L, to_luastring("unfinished capture"));
        if (l === CAP_POSITION)
            lua_pushinteger(ms.L, ms.capture[i].init - ms.src_init + 1);
        else
            lua_pushlstring(ms.L, ms.src.subarray(ms.capture[i].init), l);
    }
};

const push_captures = function(ms, s, e) {
    let nlevels = ms.level === 0 && ms.src.subarray(s) ? 1 : ms.level;
    luaL_checkstack(ms.L, nlevels, "too many captures");
    for (let i = 0; i < nlevels; i++)
        push_onecapture(ms, i, s, e);
    return nlevels;  /* number of strings pushed */
};

const nospecials = function(p, l) {
    for (let i=0; i<l; i++) {
        if (luastring_indexOf(SPECIALS, p[i]) !== -1)
            return false;
    }
    return true;
};

const prepstate = function(ms, L, s, ls, p, lp) {
    ms.L = L;
    ms.matchdepth = MAXCCALLS;
    ms.src = s;
    ms.src_init = 0;
    ms.src_end = ls;
    ms.p = p;
    ms.p_end = lp;
};

const reprepstate = function(ms) {
    ms.level = 0;
    lualib.lua_assert(ms.matchdepth === MAXCCALLS);
};

const find_subarray = function(arr, subarr, from_index) {
    var i = from_index >>> 0,
        sl = subarr.length;

    if (sl === 0)
        return i;

    for (; (i = arr.indexOf(subarr[0], i)) !== -1; i++) {
        if (luastring_eq(arr.subarray(i, i+sl), subarr))
            return i;
    }

    return -1;
};

const str_find_aux = function(L, find) {
    let s = luaL_checkstring(L, 1);
    let p = luaL_checkstring(L, 2);
    let ls = s.length;
    let lp = p.length;
    let init = posrelat(luaL_optinteger(L, 3, 1), ls);
    if (init < 1) init = 1;
    else if (init > ls + 1) {  /* start after string's end? */
        lua_pushnil(L);  /* cannot find anything */
        return 1;
    }
    /* explicit request or no special characters? */
    if (find && (lua_toboolean(L, 4) || nospecials(p, lp))) {
        /* do a plain search */
        let f = find_subarray(s.subarray(init - 1), p, 0);
        if (f > -1) {
            lua_pushinteger(L, init + f);
            lua_pushinteger(L, init + f + lp - 1);
            return 2;
        }
    } else {
        let ms = new MatchState(L);
        let s1 = init - 1;
        let anchor = p[0] === 94 /* '^'.charCodeAt(0) */;
        if (anchor) {
            p = p.subarray(1); lp--;  /* skip anchor character */
        }
        prepstate(ms, L, s, ls, p, lp);
        do {
            let res;
            reprepstate(ms);
            if ((res = match(ms, s1, 0)) !== null) {
                if (find) {
                    lua_pushinteger(L, s1 + 1);  /* start */
                    lua_pushinteger(L, res);   /* end */
                    return push_captures(ms, null, 0) + 2;
                } else
                    return push_captures(ms, s1, res);
            }
        } while (s1++ < ms.src_end && !anchor);
    }
    lua_pushnil(L);  /* not found */
    return 1;
};

const str_find = function(L) {
    return str_find_aux(L, 1);
};

const str_match = function(L) {
    return str_find_aux(L, 0);
};

/* state for 'gmatch' */
class GMatchState {
    constructor() {
        this.src = NaN;  /* current position */
        this.p = NaN;  /* pattern */
        this.lastmatch = NaN;  /* end of last match */
        this.ms = new MatchState();  /* match state */
    }
}

const gmatch_aux = function(L) {
    let gm = lua_touserdata(L, lua_upvalueindex(3));
    gm.ms.L = L;
    for (let src = gm.src; src <= gm.ms.src_end; src++) {
        reprepstate(gm.ms);
        let e;
        if ((e = match(gm.ms, src, gm.p)) !== null && e !== gm.lastmatch) {
            gm.src = gm.lastmatch = e;
            return push_captures(gm.ms, src, e);
        }
    }
    return 0;  /* not found */
};

const str_gmatch = function(L) {
    let s = luaL_checkstring(L, 1);
    let p = luaL_checkstring(L, 2);
    let ls = s.length;
    let lp = p.length;
    lua_settop(L, 2);  /* keep them on closure to avoid being collected */
    let gm = new GMatchState();
    lua_pushlightuserdata(L, gm);
    prepstate(gm.ms, L, s, ls, p, lp);
    gm.src = 0;
    gm.p = 0;
    gm.lastmatch = null;
    lua_pushcclosure(L, gmatch_aux, 3);
    return 1;
};

const add_s = function(ms, b, s, e) {
    let L = ms.L;
    let news = lua_tostring(L, 3);
    let l = news.length;
    for (let i = 0; i < l; i++) {
        if (news[i] !== L_ESC)
            luaL_addchar(b, news[i]);
        else {
            i++;  /* skip ESC */
            if (!isdigit(news[i])) {
                if (news[i] !== L_ESC)
                    luaL_error(L, to_luastring("invalid use of '%c' in replacement string"), L_ESC);
                luaL_addchar(b, news[i]);
            } else if (news[i] === 48 /* '0'.charCodeAt(0) */)
                luaL_addlstring(b, ms.src.subarray(s, e), e - s);
            else {
                push_onecapture(ms, news[i] - 49 /* '1'.charCodeAt(0) */, s, e);
                luaL_tolstring(L, -1);
                lua_remove(L, -2);  /* remove original value */
                luaL_addvalue(b);  /* add capture to accumulated result */
            }
        }
    }
};

const add_value = function(ms, b, s, e, tr) {
    let L = ms.L;
    switch (tr) {
        case LUA_TFUNCTION: {
            lua_pushvalue(L, 3);
            let n = push_captures(ms, s, e);
            lua_call(L, n, 1);
            break;
        }
        case LUA_TTABLE: {
            push_onecapture(ms, 0, s, e);
            lua_gettable(L, 3);
            break;
        }
        default: {  /* LUA_TNUMBER or LUA_TSTRING */
            add_s(ms, b, s, e);
            return;
        }
    }
    if (!lua_toboolean(L, -1)) {  /* nil or false? */
        lua_pop(L, 1);
        lua_pushlstring(L, ms.src.subarray(s, e), e - s);  /* keep original text */
    } else if (!lua_isstring(L, -1))
        luaL_error(L, to_luastring("invalid replacement value (a %s)"), luaL_typename(L, -1));
    luaL_addvalue(b);  /* add result to accumulator */
};

const str_gsub = function(L) {
    let src = luaL_checkstring(L, 1);  /* subject */
    let srcl = src.length;
    let p = luaL_checkstring(L, 2);  /* pattern */
    let lp = p.length;
    let lastmatch = null;  /* end of last match */
    let tr = lua_type(L, 3);  /* replacement type */
    let max_s = luaL_optinteger(L, 4, srcl + 1);  /* max replacements */
    let anchor = p[0] === 94 /* '^'.charCodeAt(0) */;
    let n = 0;  /* replacement count */
    let ms = new MatchState(L);
    let b = new luaL_Buffer();
    luaL_argcheck(L, tr === LUA_TNUMBER || tr === LUA_TSTRING || tr === LUA_TFUNCTION || tr === LUA_TTABLE, 3,
        "string/function/table expected");
    luaL_buffinit(L, b);
    if (anchor) {
        p = p.subarray(1); lp--;  /* skip anchor character */
    }
    prepstate(ms, L, src, srcl, p, lp);
    src = 0; p = 0;
    while (n < max_s) {
        let e;
        reprepstate(ms);
        if ((e = match(ms, src, p)) !== null && e !== lastmatch) {  /* match? */
            n++;
            add_value(ms, b, src, e, tr);  /* add replacement to buffer */
            src = lastmatch = e;
        } else if (src < ms.src_end)  /* otherwise, skip one character */
            luaL_addchar(b, ms.src[src++]);
        else break;  /* end of subject */
        if (anchor) break;
    }
    luaL_addlstring(b, ms.src.subarray(src, ms.src_end), ms.src_end - src);
    luaL_pushresult(b);
    lua_pushinteger(L, n);  /* number of substitutions */
    return 2;
};

const strlib = {
    "byte":     str_byte,
    "char":     str_char,
    "dump":     str_dump,
    "find":     str_find,
    "format":   str_format,
    "gmatch":   str_gmatch,
    "gsub":     str_gsub,
    "len":      str_len,
    "lower":    str_lower,
    "match":    str_match,
    "pack":     str_pack,
    "packsize": str_packsize,
    "rep":      str_rep,
    "reverse":  str_reverse,
    "sub":      str_sub,
    "unpack":   str_unpack,
    "upper":    str_upper
};

const createmetatable = function(L) {
    lua_createtable(L, 0, 1);  /* table to be metatable for strings */
    lua_pushliteral(L, "");  /* dummy string */
    lua_pushvalue(L, -2);  /* copy table */
    lua_setmetatable(L, -2);  /* set table as metatable for strings */
    lua_pop(L, 1);  /* pop dummy string */
    lua_pushvalue(L, -2);  /* get string library */
    lua_setfield(L, -2, to_luastring("__index", true));  /* metatable.__index = string */
    lua_pop(L, 1);  /* pop metatable */
};

const luaopen_string = function(L) {
    luaL_newlib(L, strlib);
    createmetatable(L);
    return 1;
};

module.exports.luaopen_string = luaopen_string;
