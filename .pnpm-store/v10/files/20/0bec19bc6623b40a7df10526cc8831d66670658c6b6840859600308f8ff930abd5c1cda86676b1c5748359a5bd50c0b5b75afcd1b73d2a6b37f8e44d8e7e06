"use strict";

const {
    constant_types: { LUA_TBOOLEAN, LUA_TLNGSTR },
    thread_status: { LUA_ERRSYNTAX },
    to_luastring
} = require('./defs.js');
const {
    LUA_MINBUFFER,
    MAX_INT,
    lua_assert
} = require('./llimits.js');
const ldebug   = require('./ldebug.js');
const ldo      = require('./ldo.js');
const {
    lisdigit,
    lislalnum,
    lislalpha,
    lisspace,
    lisxdigit
} = require('./ljstype.js');
const lobject  = require('./lobject.js');
const {
    luaS_bless,
    luaS_hash,
    luaS_hashlongstr,
    luaS_new
} = require('./lstring.js');
const ltable   = require('./ltable.js');
const {
    EOZ,
    luaZ_buffer,
    luaZ_buffremove,
    luaZ_resetbuffer,
    luaZ_resizebuffer
} = require('./lzio.js');

const FIRST_RESERVED = 257;

const LUA_ENV = to_luastring("_ENV", true);

/* terminal symbols denoted by reserved words */
const TK_AND      = FIRST_RESERVED;
const TK_BREAK    = FIRST_RESERVED + 1;
const TK_DO       = FIRST_RESERVED + 2;
const TK_ELSE     = FIRST_RESERVED + 3;
const TK_ELSEIF   = FIRST_RESERVED + 4;
const TK_END      = FIRST_RESERVED + 5;
const TK_FALSE    = FIRST_RESERVED + 6;
const TK_FOR      = FIRST_RESERVED + 7;
const TK_FUNCTION = FIRST_RESERVED + 8;
const TK_GOTO     = FIRST_RESERVED + 9;
const TK_IF       = FIRST_RESERVED + 10;
const TK_IN       = FIRST_RESERVED + 11;
const TK_LOCAL    = FIRST_RESERVED + 12;
const TK_NIL      = FIRST_RESERVED + 13;
const TK_NOT      = FIRST_RESERVED + 14;
const TK_OR       = FIRST_RESERVED + 15;
const TK_REPEAT   = FIRST_RESERVED + 16;
const TK_RETURN   = FIRST_RESERVED + 17;
const TK_THEN     = FIRST_RESERVED + 18;
const TK_TRUE     = FIRST_RESERVED + 19;
const TK_UNTIL    = FIRST_RESERVED + 20;
const TK_WHILE    = FIRST_RESERVED + 21;
/* other terminal symbols */
const TK_IDIV     = FIRST_RESERVED + 22;
const TK_CONCAT   = FIRST_RESERVED + 23;
const TK_DOTS     = FIRST_RESERVED + 24;
const TK_EQ       = FIRST_RESERVED + 25;
const TK_GE       = FIRST_RESERVED + 26;
const TK_LE       = FIRST_RESERVED + 27;
const TK_NE       = FIRST_RESERVED + 28;
const TK_SHL      = FIRST_RESERVED + 29;
const TK_SHR      = FIRST_RESERVED + 30;
const TK_DBCOLON  = FIRST_RESERVED + 31;
const TK_EOS      = FIRST_RESERVED + 32;
const TK_FLT      = FIRST_RESERVED + 33;
const TK_INT      = FIRST_RESERVED + 34;
const TK_NAME     = FIRST_RESERVED + 35;
const TK_STRING   = FIRST_RESERVED + 36;

const RESERVED = {
    "TK_AND":      TK_AND,
    "TK_BREAK":    TK_BREAK,
    "TK_DO":       TK_DO,
    "TK_ELSE":     TK_ELSE,
    "TK_ELSEIF":   TK_ELSEIF,
    "TK_END":      TK_END,
    "TK_FALSE":    TK_FALSE,
    "TK_FOR":      TK_FOR,
    "TK_FUNCTION": TK_FUNCTION,
    "TK_GOTO":     TK_GOTO,
    "TK_IF":       TK_IF,
    "TK_IN":       TK_IN,
    "TK_LOCAL":    TK_LOCAL,
    "TK_NIL":      TK_NIL,
    "TK_NOT":      TK_NOT,
    "TK_OR":       TK_OR,
    "TK_REPEAT":   TK_REPEAT,
    "TK_RETURN":   TK_RETURN,
    "TK_THEN":     TK_THEN,
    "TK_TRUE":     TK_TRUE,
    "TK_UNTIL":    TK_UNTIL,
    "TK_WHILE":    TK_WHILE,
    "TK_IDIV":     TK_IDIV,
    "TK_CONCAT":   TK_CONCAT,
    "TK_DOTS":     TK_DOTS,
    "TK_EQ":       TK_EQ,
    "TK_GE":       TK_GE,
    "TK_LE":       TK_LE,
    "TK_NE":       TK_NE,
    "TK_SHL":      TK_SHL,
    "TK_SHR":      TK_SHR,
    "TK_DBCOLON":  TK_DBCOLON,
    "TK_EOS":      TK_EOS,
    "TK_FLT":      TK_FLT,
    "TK_INT":      TK_INT,
    "TK_NAME":     TK_NAME,
    "TK_STRING":   TK_STRING
};

const luaX_tokens = [
    "and", "break", "do", "else", "elseif",
    "end", "false", "for", "function", "goto", "if",
    "in", "local", "nil", "not", "or", "repeat",
    "return", "then", "true", "until", "while",
    "//", "..", "...", "==", ">=", "<=", "~=",
    "<<", ">>", "::", "<eof>",
    "<number>", "<integer>", "<name>", "<string>"
].map((e, i)=>to_luastring(e));

class SemInfo {
    constructor() {
        this.r = NaN;
        this.i = NaN;
        this.ts = null;
    }
}

class Token {
    constructor() {
        this.token = NaN;
        this.seminfo = new SemInfo();
    }
}

/* state of the lexer plus state of the parser when shared by all
   functions */
class LexState {
    constructor() {
        this.current = NaN;  /* current character (charint) */
        this.linenumber = NaN;  /* input line counter */
        this.lastline = NaN;  /* line of last token 'consumed' */
        this.t = new Token();  /* current token */
        this.lookahead = new Token();  /* look ahead token */
        this.fs = null;  /* current function (parser) */
        this.L = null;
        this.z = null; /* input stream */
        this.buff = null;  /* buffer for tokens */
        this.h = null;  /* to reuse strings */
        this.dyd = null;  /* dynamic structures used by the parser */
        this.source = null;  /* current source name */
        this.envn = null;  /* environment variable name */
    }
}

const save = function(ls, c) {
    let b = ls.buff;
    if (b.n + 1 > b.buffer.length) {
        if (b.buffer.length >= MAX_INT/2)
            lexerror(ls, to_luastring("lexical element too long", true), 0);
        let newsize = b.buffer.length*2;
        luaZ_resizebuffer(ls.L, b, newsize);
    }
    b.buffer[b.n++] = c < 0 ? 255 + c + 1 : c;
};

const luaX_token2str = function(ls, token) {
    if (token < FIRST_RESERVED) {  /* single-byte symbols? */
        return lobject.luaO_pushfstring(ls.L, to_luastring("'%c'", true), token);
    } else {
        let s = luaX_tokens[token - FIRST_RESERVED];
        if (token < TK_EOS)  /* fixed format (symbols and reserved words)? */
            return lobject.luaO_pushfstring(ls.L, to_luastring("'%s'", true), s);
        else  /* names, strings, and numerals */
            return s;
    }
};

const currIsNewline = function(ls) {
    return ls.current === 10 /* ('\n').charCodeAt(0) */ || ls.current === 13 /* ('\r').charCodeAt(0) */;
};

const next = function(ls) {
    ls.current = ls.z.zgetc();
};

const save_and_next = function(ls) {
    save(ls, ls.current);
    next(ls);
};

/*
** creates a new string and anchors it in scanner's table so that
** it will not be collected until the end of the compilation
** (by that time it should be anchored somewhere)
*/
const TVtrue = new lobject.TValue(LUA_TBOOLEAN, true);
const luaX_newstring = function(ls, str) {
    let L = ls.L;
    let ts = luaS_new(L, str);
    /* HACK: Workaround lack of ltable 'keyfromval' */
    let tpair = ls.h.strong.get(luaS_hashlongstr(ts));
    if (!tpair) { /* not in use yet? */
        let key = new lobject.TValue(LUA_TLNGSTR, ts);
        ltable.luaH_setfrom(L, ls.h, key, TVtrue);
    } else { /* string already present */
        ts = tpair.key.tsvalue(); /* re-use value previously stored */
    }
    return ts;
};

/*
** increment line number and skips newline sequence (any of
** \n, \r, \n\r, or \r\n)
*/
const inclinenumber = function(ls) {
    let old = ls.current;
    lua_assert(currIsNewline(ls));
    next(ls);  /* skip '\n' or '\r' */
    if (currIsNewline(ls) && ls.current !== old)
        next(ls);  /* skip '\n\r' or '\r\n' */
    if (++ls.linenumber >= MAX_INT)
        lexerror(ls, to_luastring("chunk has too many lines", true), 0);
};

const luaX_setinput = function(L, ls, z, source, firstchar) {
    ls.t = {
        token: 0,
        seminfo: new SemInfo()
    };
    ls.L = L;
    ls.current = firstchar;
    ls.lookahead = {
        token: TK_EOS,
        seminfo: new SemInfo()
    };
    ls.z = z;
    ls.fs = null;
    ls.linenumber = 1;
    ls.lastline = 1;
    ls.source = source;
    ls.envn = luaS_bless(L, LUA_ENV);
    luaZ_resizebuffer(L, ls.buff, LUA_MINBUFFER);  /* initialize buffer */
};

const check_next1 = function(ls, c) {
    if (ls.current === c) {
        next(ls);
        return true;
    }

    return false;
};

/*
** Check whether current char is in set 'set' (with two chars) and
** saves it
*/
const check_next2 = function(ls, set) {
    if (ls.current === set[0].charCodeAt(0) || ls.current === set[1].charCodeAt(0)) {
        save_and_next(ls);
        return true;
    }

    return false;
};

const read_numeral = function(ls, seminfo) {
    let expo = "Ee";
    let first = ls.current;
    lua_assert(lisdigit(ls.current));
    save_and_next(ls);
    if (first === 48 /* ('0').charCodeAt(0) */ && check_next2(ls, "xX"))  /* hexadecimal? */
        expo = "Pp";

    for (;;) {
        if (check_next2(ls, expo))  /* exponent part? */
            check_next2(ls, "-+");  /* optional exponent sign */
        if (lisxdigit(ls.current))
            save_and_next(ls);
        else if (ls.current === 46 /* ('.').charCodeAt(0) */)
            save_and_next(ls);
        else break;
    }

    // save(ls, 0);

    let obj = new lobject.TValue();
    if (lobject.luaO_str2num(luaZ_buffer(ls.buff), obj) === 0)  /* format error? */
        lexerror(ls, to_luastring("malformed number", true), TK_FLT);
    if (obj.ttisinteger()) {
        seminfo.i = obj.value;
        return TK_INT;
    } else {
        lua_assert(obj.ttisfloat());
        seminfo.r = obj.value;
        return TK_FLT;
    }
};

const txtToken = function(ls, token) {
    switch (token) {
        case TK_NAME: case TK_STRING:
        case TK_FLT: case TK_INT:
            // save(ls, 0);
            return lobject.luaO_pushfstring(ls.L, to_luastring("'%s'", true), luaZ_buffer(ls.buff));
        default:
            return luaX_token2str(ls, token);
    }
};

const lexerror = function(ls, msg, token) {
    msg = ldebug.luaG_addinfo(ls.L, msg, ls.source, ls.linenumber);
    if (token)
        lobject.luaO_pushfstring(ls.L, to_luastring("%s near %s"), msg, txtToken(ls, token));
    ldo.luaD_throw(ls.L, LUA_ERRSYNTAX);
};

const luaX_syntaxerror = function(ls, msg) {
    lexerror(ls, msg, ls.t.token);
};

/*
** skip a sequence '[=*[' or ']=*]'; if sequence is well formed, return
** its number of '='s; otherwise, return a negative number (-1 iff there
** are no '='s after initial bracket)
*/
const skip_sep = function(ls) {
    let count = 0;
    let s = ls.current;
    lua_assert(s === 91 /* ('[').charCodeAt(0) */ || s === 93 /* (']').charCodeAt(0) */);
    save_and_next(ls);
    while (ls.current === 61 /* ('=').charCodeAt(0) */) {
        save_and_next(ls);
        count++;
    }
    return ls.current === s ? count : (-count) - 1;
};

const read_long_string = function(ls, seminfo, sep) {
    let line = ls.linenumber;  /* initial line (for error message) */
    save_and_next(ls);  /* skip 2nd '[' */

    if (currIsNewline(ls))  /* string starts with a newline? */
        inclinenumber(ls);  /* skip it */

    let skip = false;
    for (; !skip ;) {
        switch (ls.current) {
            case EOZ: {  /* error */
                let what = seminfo ? "string" : "comment";
                let msg = `unfinished long ${what} (starting at line ${line})`;
                lexerror(ls, to_luastring(msg), TK_EOS);
                break;
            }
            case 93 /* (']').charCodeAt(0) */: {
                if (skip_sep(ls) === sep) {
                    save_and_next(ls);  /* skip 2nd ']' */
                    skip = true;
                }
                break;
            }
            case 10 /* ('\n').charCodeAt(0) */:
            case 13 /* ('\r').charCodeAt(0) */: {
                save(ls, 10 /* ('\n').charCodeAt(0) */);
                inclinenumber(ls);
                if (!seminfo) luaZ_resetbuffer(ls.buff);
                break;
            }
            default: {
                if (seminfo) save_and_next(ls);
                else next(ls);
            }
        }
    }

    if (seminfo)
        seminfo.ts = luaX_newstring(ls, ls.buff.buffer.subarray(2 + sep, ls.buff.n - (2 + sep)));
};

const esccheck = function(ls, c, msg) {
    if (!c) {
        if (ls.current !== EOZ)
            save_and_next(ls);  /* add current to buffer for error message */
        lexerror(ls, msg, TK_STRING);
    }
};

const gethexa = function(ls) {
    save_and_next(ls);
    esccheck(ls, lisxdigit(ls.current), to_luastring("hexadecimal digit expected", true));
    return lobject.luaO_hexavalue(ls.current);
};

const readhexaesc = function(ls) {
    let r = gethexa(ls);
    r = (r << 4) + gethexa(ls);
    luaZ_buffremove(ls.buff, 2);  /* remove saved chars from buffer */
    return r;
};

const readutf8desc = function(ls) {
    let i = 4;  /* chars to be removed: '\', 'u', '{', and first digit */
    save_and_next(ls);  /* skip 'u' */
    esccheck(ls, ls.current === 123 /* ('{').charCodeAt(0) */, to_luastring("missing '{'", true));
    let r = gethexa(ls);  /* must have at least one digit */

    save_and_next(ls);
    while (lisxdigit(ls.current)) {
        i++;
        r = (r << 4) + lobject.luaO_hexavalue(ls.current);
        esccheck(ls, r <= 0x10FFFF, to_luastring("UTF-8 value too large", true));
        save_and_next(ls);
    }
    esccheck(ls, ls.current === 125 /* ('}').charCodeAt(0) */, to_luastring("missing '}'", true));
    next(ls);  /* skip '}' */
    luaZ_buffremove(ls.buff, i);  /* remove saved chars from buffer */
    return r;
};

const utf8esc = function(ls) {
    let buff = new Uint8Array(lobject.UTF8BUFFSZ);
    let n = lobject.luaO_utf8esc(buff, readutf8desc(ls));
    for (; n > 0; n--)  /* add 'buff' to string */
        save(ls, buff[lobject.UTF8BUFFSZ - n]);
};

const readdecesc = function(ls) {
    let r = 0;  /* result accumulator */
    let i;
    for (i = 0; i < 3 && lisdigit(ls.current); i++) {  /* read up to 3 digits */
        r = 10 * r + ls.current - 48 /* ('0').charCodeAt(0) */;
        save_and_next(ls);
    }
    esccheck(ls, r <= 255, to_luastring("decimal escape too large", true));
    luaZ_buffremove(ls.buff, i);  /* remove read digits from buffer */
    return r;
};

const read_string = function(ls, del, seminfo) {
    save_and_next(ls);  /* keep delimiter (for error messages) */

    while (ls.current !== del) {
        switch (ls.current) {
            case EOZ:
                lexerror(ls, to_luastring("unfinished string", true), TK_EOS);
                break;
            case 10 /* ('\n').charCodeAt(0) */:
            case 13 /* ('\r').charCodeAt(0) */:
                lexerror(ls, to_luastring("unfinished string", true), TK_STRING);
                break;
            case 92 /* ('\\').charCodeAt(0) */: {  /* escape sequences */
                save_and_next(ls);  /* keep '\\' for error messages */
                let will;
                let c;
                switch(ls.current) {
                    case 97 /* ('a').charCodeAt(0) */: c = 7 /* \a isn't valid JS */; will = 'read_save'; break;
                    case 98 /* ('b').charCodeAt(0) */: c = 8 /* ('\b').charCodeAt(0) */; will = 'read_save'; break;
                    case 102 /* ('f').charCodeAt(0) */: c = 12 /* ('\f').charCodeAt(0) */; will = 'read_save'; break;
                    case 110 /* ('n').charCodeAt(0) */: c = 10 /* ('\n').charCodeAt(0) */; will = 'read_save'; break;
                    case 114 /* ('r').charCodeAt(0) */: c = 13 /* ('\r').charCodeAt(0) */; will = 'read_save'; break;
                    case 116 /* ('t').charCodeAt(0) */: c = 9 /* ('\t').charCodeAt(0) */; will = 'read_save'; break;
                    case 118 /* ('v').charCodeAt(0) */: c = 11 /* ('\v').charCodeAt(0) */; will = 'read_save'; break;
                    case 120 /* ('x').charCodeAt(0) */: c = readhexaesc(ls); will = 'read_save'; break;
                    case 117 /* ('u').charCodeAt(0) */: utf8esc(ls); will = 'no_save'; break;
                    case 10 /* ('\n').charCodeAt(0) */:
                    case 13 /* ('\r').charCodeAt(0) */:
                        inclinenumber(ls); c = 10 /* ('\n').charCodeAt(0) */; will = 'only_save'; break;
                    case 92 /* ('\\').charCodeAt(0) */:
                    case 34 /* ('"').charCodeAt(0) */:
                    case 39 /* ('\'').charCodeAt(0) */:
                        c = ls.current; will = 'read_save'; break;
                    case EOZ: will = 'no_save'; break;  /* will raise an error next loop */
                    case 122 /* ('z').charCodeAt(0) */: {  /* zap following span of spaces */
                        luaZ_buffremove(ls.buff, 1);  /* remove '\\' */
                        next(ls);  /* skip the 'z' */
                        while (lisspace(ls.current)) {
                            if (currIsNewline(ls)) inclinenumber(ls);
                            else next(ls);
                        }
                        will = 'no_save'; break;
                    }
                    default: {
                        esccheck(ls, lisdigit(ls.current), to_luastring("invalid escape sequence", true));
                        c = readdecesc(ls);  /* digital escape '\ddd' */
                        will = 'only_save'; break;
                    }
                }

                if (will === 'read_save')
                    next(ls);

                if (will === 'read_save' || will === 'only_save') {
                    luaZ_buffremove(ls.buff, 1);  /* remove '\\' */
                    save(ls, c);
                }

                break;
            }
            default:
                save_and_next(ls);
        }
    }
    save_and_next(ls);  /* skip delimiter */

    seminfo.ts = luaX_newstring(ls, ls.buff.buffer.subarray(1, ls.buff.n-1));
};

const token_to_index = Object.create(null); /* don't want to return true for e.g. 'hasOwnProperty' */
luaX_tokens.forEach((e, i)=>token_to_index[luaS_hash(e)] = i);

const isreserved = function(w) {
    let kidx = token_to_index[luaS_hashlongstr(w)];
    return kidx !== void 0 && kidx <= 22;
};

const llex = function(ls, seminfo) {
    luaZ_resetbuffer(ls.buff);
    for (;;) {
        lua_assert(typeof ls.current == "number"); /* fengari addition */
        switch (ls.current) {
            case 10 /* ('\n').charCodeAt(0) */:
            case 13 /* ('\r').charCodeAt(0) */: {  /* line breaks */
                inclinenumber(ls);
                break;
            }
            case 32 /* (' ').charCodeAt(0) */:
            case 12 /* ('\f').charCodeAt(0) */:
            case 9 /* ('\t').charCodeAt(0) */:
            case 11 /* ('\v').charCodeAt(0) */: {  /* spaces */
                next(ls);
                break;
            }
            case 45 /* ('-').charCodeAt(0) */: {  /* '-' or '--' (comment) */
                next(ls);
                if (ls.current !== 45 /* ('-').charCodeAt(0) */) return 45 /* ('-').charCodeAt(0) */;
                /* else is a comment */
                next(ls);
                if (ls.current === 91 /* ('[').charCodeAt(0) */) {  /* long comment? */
                    let sep = skip_sep(ls);
                    luaZ_resetbuffer(ls.buff);  /* 'skip_sep' may dirty the buffer */
                    if (sep >= 0) {
                        read_long_string(ls, null, sep);  /* skip long comment */
                        luaZ_resetbuffer(ls.buff);  /* previous call may dirty the buff. */
                        break;
                    }
                }

                /* else short comment */
                while (!currIsNewline(ls) && ls.current !== EOZ)
                    next(ls);  /* skip until end of line (or end of file) */
                break;
            }
            case 91 /* ('[').charCodeAt(0) */: {  /* long string or simply '[' */
                let sep = skip_sep(ls);
                if (sep >= 0) {
                    read_long_string(ls, seminfo, sep);
                    return TK_STRING;
                } else if (sep !== -1)  /* '[=...' missing second bracket */
                    lexerror(ls, to_luastring("invalid long string delimiter", true), TK_STRING);
                return 91 /* ('[').charCodeAt(0) */;
            }
            case 61 /* ('=').charCodeAt(0) */: {
                next(ls);
                if (check_next1(ls, 61 /* ('=').charCodeAt(0) */)) return TK_EQ;
                else return 61 /* ('=').charCodeAt(0) */;
            }
            case 60 /* ('<').charCodeAt(0) */: {
                next(ls);
                if (check_next1(ls, 61 /* ('=').charCodeAt(0) */)) return TK_LE;
                else if (check_next1(ls, 60 /* ('<').charCodeAt(0) */)) return TK_SHL;
                else return 60 /* ('<').charCodeAt(0) */;
            }
            case 62 /* ('>').charCodeAt(0) */: {
                next(ls);
                if (check_next1(ls, 61 /* ('=').charCodeAt(0) */)) return TK_GE;
                else if (check_next1(ls, 62 /* ('>').charCodeAt(0) */)) return TK_SHR;
                else return 62 /* ('>').charCodeAt(0) */;
            }
            case 47 /* ('/').charCodeAt(0) */: {
                next(ls);
                if (check_next1(ls, 47 /* ('/').charCodeAt(0) */)) return TK_IDIV;
                else return 47 /* ('/').charCodeAt(0) */;
            }
            case 126 /* ('~').charCodeAt(0) */: {
                next(ls);
                if (check_next1(ls, 61 /* ('=').charCodeAt(0) */)) return TK_NE;
                else return 126 /* ('~').charCodeAt(0) */;
            }
            case 58 /* (':').charCodeAt(0) */: {
                next(ls);
                if (check_next1(ls, 58 /* (':').charCodeAt(0) */)) return TK_DBCOLON;
                else return 58 /* (':').charCodeAt(0) */;
            }
            case 34 /* ('"').charCodeAt(0) */:
            case 39 /* ('\'').charCodeAt(0) */: {  /* short literal strings */
                read_string(ls, ls.current, seminfo);
                return TK_STRING;
            }
            case 46 /* ('.').charCodeAt(0) */: {  /* '.', '..', '...', or number */
                save_and_next(ls);
                if (check_next1(ls, 46 /* ('.').charCodeAt(0) */)) {
                    if (check_next1(ls, 46 /* ('.').charCodeAt(0) */))
                        return TK_DOTS;   /* '...' */
                    else return TK_CONCAT;   /* '..' */
                }
                else if (!lisdigit(ls.current)) return 46 /* ('.').charCodeAt(0) */;
                else return read_numeral(ls, seminfo);
            }
            case 48 /* ('0').charCodeAt(0) */: case 49 /* ('1').charCodeAt(0) */: case 50 /* ('2').charCodeAt(0) */: case 51 /* ('3').charCodeAt(0) */: case 52 /* ('4').charCodeAt(0) */:
            case 53 /* ('5').charCodeAt(0) */: case 54 /* ('6').charCodeAt(0) */: case 55 /* ('7').charCodeAt(0) */: case 56 /* ('8').charCodeAt(0) */: case 57 /* ('9').charCodeAt(0) */: {
                return read_numeral(ls, seminfo);
            }
            case EOZ: {
                return TK_EOS;
            }
            default: {
                if (lislalpha(ls.current)) {  /* identifier or reserved word? */
                    do {
                        save_and_next(ls);
                    } while (lislalnum(ls.current));
                    let ts = luaX_newstring(ls, luaZ_buffer(ls.buff));
                    seminfo.ts = ts;
                    let kidx = token_to_index[luaS_hashlongstr(ts)];
                    if (kidx !== void 0 && kidx <= 22)  /* reserved word? */
                        return kidx + FIRST_RESERVED;
                    else
                        return TK_NAME;
                } else {  /* single-char tokens (+ - / ...) */
                    let c = ls.current;
                    next(ls);
                    return c;
                }
            }
        }
    }
};

const luaX_next = function(ls) {
    ls.lastline = ls.linenumber;
    if (ls.lookahead.token !== TK_EOS) {  /* is there a look-ahead token? */
        ls.t.token = ls.lookahead.token;  /* use this one */
        ls.t.seminfo.i = ls.lookahead.seminfo.i;
        ls.t.seminfo.r = ls.lookahead.seminfo.r;
        ls.t.seminfo.ts = ls.lookahead.seminfo.ts;
        ls.lookahead.token = TK_EOS;  /* and discharge it */
    } else
        ls.t.token = llex(ls, ls.t.seminfo);  /* read next token */
};

const luaX_lookahead = function(ls) {
    lua_assert(ls.lookahead.token === TK_EOS);
    ls.lookahead.token = llex(ls, ls.lookahead.seminfo);
    return ls.lookahead.token;
};

module.exports.FIRST_RESERVED   = FIRST_RESERVED;
module.exports.LUA_ENV          = LUA_ENV;
module.exports.LexState         = LexState;
module.exports.RESERVED         = RESERVED;
module.exports.isreserved       = isreserved;
module.exports.luaX_lookahead   = luaX_lookahead;
module.exports.luaX_newstring   = luaX_newstring;
module.exports.luaX_next        = luaX_next;
module.exports.luaX_setinput    = luaX_setinput;
module.exports.luaX_syntaxerror = luaX_syntaxerror;
module.exports.luaX_token2str   = luaX_token2str;
module.exports.luaX_tokens      = luaX_tokens;
