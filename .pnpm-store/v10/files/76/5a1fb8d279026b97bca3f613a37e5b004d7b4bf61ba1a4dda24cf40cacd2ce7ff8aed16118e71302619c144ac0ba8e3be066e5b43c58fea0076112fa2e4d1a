"use strict";

const {
    LUA_SIGNATURE,
    LUA_VERSION_MAJOR,
    LUA_VERSION_MINOR,
    constant_types: {
        LUA_TBOOLEAN,
        LUA_TLNGSTR,
        LUA_TNIL,
        LUA_TNUMFLT,
        LUA_TNUMINT,
        LUA_TSHRSTR
    },
    luastring_of
} = require('./defs.js');

const LUAC_DATA    = luastring_of(25, 147, 13, 10, 26, 10);
const LUAC_INT     = 0x5678;
const LUAC_NUM     = 370.5;
const LUAC_VERSION = Number(LUA_VERSION_MAJOR) * 16 + Number(LUA_VERSION_MINOR);
const LUAC_FORMAT  = 0;   /* this is the official format */

class DumpState {
    constructor() {
        this.L = null;
        this.write = null;
        this.data = null;
        this.strip = NaN;
        this.status = NaN;
    }
}

const DumpBlock = function(b, size, D) {
    if (D.status === 0 && size > 0)
        D.status = D.writer(D.L, b, size, D.data);
};

const DumpByte = function(y, D) {
    DumpBlock(luastring_of(y), 1, D);
};

const DumpInt = function(x, D) {
    let ab = new ArrayBuffer(4);
    let dv = new DataView(ab);
    dv.setInt32(0, x, true);
    let t = new Uint8Array(ab);
    DumpBlock(t, 4, D);
};

const DumpInteger = function(x, D) {
    let ab = new ArrayBuffer(4);
    let dv = new DataView(ab);
    dv.setInt32(0, x, true);
    let t = new Uint8Array(ab);
    DumpBlock(t, 4, D);
};

const DumpNumber = function(x, D) {
    let ab = new ArrayBuffer(8);
    let dv = new DataView(ab);
    dv.setFloat64(0, x, true);
    let t = new Uint8Array(ab);
    DumpBlock(t, 8, D);
};

const DumpString = function(s, D) {
    if (s === null)
        DumpByte(0, D);
    else {
        let size = s.tsslen() + 1;
        let str = s.getstr();
        if (size < 0xFF)
            DumpByte(size, D);
        else {
            DumpByte(0xFF, D);
            DumpInteger(size, D);
        }
        DumpBlock(str, size - 1, D);  /* no need to save '\0' */
    }
};

const DumpCode = function(f, D) {
    let s = f.code.map(e => e.code);
    DumpInt(s.length, D);

    for (let i = 0; i < s.length; i++)
        DumpInt(s[i], D);
};

const DumpConstants = function(f, D) {
    let n = f.k.length;
    DumpInt(n, D);
    for (let i = 0; i < n; i++) {
        let o = f.k[i];
        DumpByte(o.ttype(), D);
        switch (o.ttype()) {
            case LUA_TNIL:
                break;
            case LUA_TBOOLEAN:
                DumpByte(o.value ? 1 : 0, D);
                break;
            case LUA_TNUMFLT:
                DumpNumber(o.value, D);
                break;
            case LUA_TNUMINT:
                DumpInteger(o.value, D);
                break;
            case LUA_TSHRSTR:
            case LUA_TLNGSTR:
                DumpString(o.tsvalue(), D);
                break;
        }
    }
};

const DumpProtos = function(f, D) {
    let n = f.p.length;
    DumpInt(n, D);
    for (let i = 0; i < n; i++)
        DumpFunction(f.p[i], f.source, D);
};

const DumpUpvalues = function(f, D) {
    let n = f.upvalues.length;
    DumpInt(n, D);
    for (let i = 0; i < n; i++) {
        DumpByte(f.upvalues[i].instack ? 1 : 0, D);
        DumpByte(f.upvalues[i].idx, D);
    }
};

const DumpDebug = function(f, D) {
    let n = D.strip ? 0 : f.lineinfo.length;
    DumpInt(n, D);
    for (let i = 0; i < n; i++)
        DumpInt(f.lineinfo[i], D);
    n = D.strip ? 0 : f.locvars.length;
    DumpInt(n, D);
    for (let i = 0; i < n; i++) {
        DumpString(f.locvars[i].varname, D);
        DumpInt(f.locvars[i].startpc, D);
        DumpInt(f.locvars[i].endpc, D);
    }
    n = D.strip ? 0 : f.upvalues.length;
    DumpInt(n, D);
    for (let i = 0; i < n; i++)
        DumpString(f.upvalues[i].name, D);
};

const DumpFunction = function(f, psource, D) {
    if (D.strip || f.source === psource)
        DumpString(null, D);  /* no debug info or same source as its parent */
    else
        DumpString(f.source, D);
    DumpInt(f.linedefined, D);
    DumpInt(f.lastlinedefined, D);
    DumpByte(f.numparams, D);
    DumpByte(f.is_vararg?1:0, D);
    DumpByte(f.maxstacksize, D);
    DumpCode(f, D);
    DumpConstants(f, D);
    DumpUpvalues(f, D);
    DumpProtos(f, D);
    DumpDebug(f, D);
};

const DumpHeader = function(D) {
    DumpBlock(LUA_SIGNATURE, LUA_SIGNATURE.length, D);
    DumpByte(LUAC_VERSION, D);
    DumpByte(LUAC_FORMAT, D);
    DumpBlock(LUAC_DATA, LUAC_DATA.length, D);
    DumpByte(4, D); // intSize
    DumpByte(4, D); // size_tSize
    DumpByte(4, D); // instructionSize
    DumpByte(4, D); // integerSize
    DumpByte(8, D); // numberSize
    DumpInteger(LUAC_INT, D);
    DumpNumber(LUAC_NUM, D);
};

/*
** dump Lua function as precompiled chunk
*/
const luaU_dump = function(L, f, w, data, strip) {
    let D = new DumpState();
    D.L = L;
    D.writer = w;
    D.data = data;
    D.strip = strip;
    D.status = 0;
    DumpHeader(D);
    DumpByte(f.upvalues.length, D);
    DumpFunction(f, null, D);
    return D.status;
};

module.exports.luaU_dump = luaU_dump;
