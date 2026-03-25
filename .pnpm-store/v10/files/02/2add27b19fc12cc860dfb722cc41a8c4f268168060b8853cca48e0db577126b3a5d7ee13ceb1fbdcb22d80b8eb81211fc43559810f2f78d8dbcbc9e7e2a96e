"use strict";

const {
    LUA_SIGNATURE,
    constant_types: {
        LUA_TBOOLEAN,
        LUA_TLNGSTR,
        LUA_TNIL,
        LUA_TNUMFLT,
        LUA_TNUMINT,
        LUA_TSHRSTR
    },
    thread_status: { LUA_ERRSYNTAX },
    is_luastring,
    luastring_eq,
    to_luastring
} = require('./defs.js');
const ldo      = require('./ldo.js');
const lfunc    = require('./lfunc.js');
const lobject  = require('./lobject.js');
const {
    MAXARG_sBx,
    POS_A,
    POS_Ax,
    POS_B,
    POS_Bx,
    POS_C,
    POS_OP,
    SIZE_A,
    SIZE_Ax,
    SIZE_B,
    SIZE_Bx,
    SIZE_C,
    SIZE_OP
} = require('./lopcodes.js');
const { lua_assert } = require("./llimits.js");
const { luaS_bless } = require('./lstring.js');
const {
    luaZ_read,
    ZIO
} = require('./lzio.js');

let LUAC_DATA = [0x19, 0x93, 13, 10, 0x1a, 10];

class BytecodeParser {

    constructor(L, Z, name) {
        this.intSize = 4;
        this.size_tSize = 4;
        this.instructionSize = 4;
        this.integerSize = 4;
        this.numberSize = 8;

        lua_assert(Z instanceof ZIO, "BytecodeParser only operates on a ZIO");
        lua_assert(is_luastring(name));

        if (name[0] === 64 /* ('@').charCodeAt(0) */ || name[0] === 61 /* ('=').charCodeAt(0) */)
            this.name = name.subarray(1);
        else if (name[0] == LUA_SIGNATURE[0])
            this.name = to_luastring("binary string", true);
        else
            this.name = name;

        this.L = L;
        this.Z = Z;

        // Used to do buffer to number conversions
        this.arraybuffer = new ArrayBuffer(
            Math.max(this.intSize, this.size_tSize, this.instructionSize, this.integerSize, this.numberSize)
        );
        this.dv = new DataView(this.arraybuffer);
        this.u8 = new Uint8Array(this.arraybuffer);
    }

    read(size) {
        let u8 = new Uint8Array(size);
        if(luaZ_read(this.Z, u8, 0, size) !== 0)
            this.error("truncated");
        return u8;
    }

    LoadByte() {
        if (luaZ_read(this.Z, this.u8, 0, 1) !== 0)
            this.error("truncated");
        return this.u8[0];
    }

    LoadInt() {
        if (luaZ_read(this.Z, this.u8, 0, this.intSize) !== 0)
            this.error("truncated");
        return this.dv.getInt32(0, true);
    }

    LoadNumber() {
        if (luaZ_read(this.Z, this.u8, 0, this.numberSize) !== 0)
            this.error("truncated");
        return this.dv.getFloat64(0, true);
    }

    LoadInteger() {
        if (luaZ_read(this.Z, this.u8, 0, this.integerSize) !== 0)
            this.error("truncated");
        return this.dv.getInt32(0, true);
    }

    LoadSize_t() {
        return this.LoadInteger();
    }

    LoadString() {
        let size = this.LoadByte();
        if (size === 0xFF)
            size = this.LoadSize_t();
        if (size === 0)
            return null;
        return luaS_bless(this.L, this.read(size-1));
    }

    /* creates a mask with 'n' 1 bits at position 'p' */
    static MASK1(n, p) {
        return ((~((~0)<<(n)))<<(p));
    }

    LoadCode(f) {
        let n = this.LoadInt();
        let p = BytecodeParser;

        for (let i = 0; i < n; i++) {
            if (luaZ_read(this.Z, this.u8, 0, this.instructionSize) !== 0)
                this.error("truncated");
            let ins = this.dv.getUint32(0, true);
            f.code[i] = {
                code:   ins,
                opcode: (ins >> POS_OP) & p.MASK1(SIZE_OP, 0),
                A:      (ins >> POS_A)  & p.MASK1(SIZE_A,  0),
                B:      (ins >> POS_B)  & p.MASK1(SIZE_B,  0),
                C:      (ins >> POS_C)  & p.MASK1(SIZE_C,  0),
                Bx:     (ins >> POS_Bx) & p.MASK1(SIZE_Bx, 0),
                Ax:     (ins >> POS_Ax) & p.MASK1(SIZE_Ax, 0),
                sBx:    ((ins >> POS_Bx) & p.MASK1(SIZE_Bx, 0)) - MAXARG_sBx
            };
        }
    }

    LoadConstants(f) {
        let n = this.LoadInt();

        for (let i = 0; i < n; i++) {
            let t = this.LoadByte();

            switch (t) {
                case LUA_TNIL:
                    f.k.push(new lobject.TValue(LUA_TNIL, null));
                    break;
                case LUA_TBOOLEAN:
                    f.k.push(new lobject.TValue(LUA_TBOOLEAN, this.LoadByte() !== 0));
                    break;
                case LUA_TNUMFLT:
                    f.k.push(new lobject.TValue(LUA_TNUMFLT, this.LoadNumber()));
                    break;
                case LUA_TNUMINT:
                    f.k.push(new lobject.TValue(LUA_TNUMINT, this.LoadInteger()));
                    break;
                case LUA_TSHRSTR:
                case LUA_TLNGSTR:
                    f.k.push(new lobject.TValue(LUA_TLNGSTR, this.LoadString()));
                    break;
                default:
                    this.error(`unrecognized constant '${t}'`);
            }
        }
    }

    LoadProtos(f) {
        let n = this.LoadInt();

        for (let i = 0; i < n; i++) {
            f.p[i] = new lfunc.Proto(this.L);
            this.LoadFunction(f.p[i], f.source);
        }
    }

    LoadUpvalues(f) {
        let n = this.LoadInt();

        for (let i = 0; i < n; i++) {
            f.upvalues[i] = {
                name:    null,
                instack: this.LoadByte(),
                idx:     this.LoadByte()
            };
        }
    }

    LoadDebug(f) {
        let n = this.LoadInt();
        for (let i = 0; i < n; i++)
            f.lineinfo[i] = this.LoadInt();

        n = this.LoadInt();
        for (let i = 0; i < n; i++) {
            f.locvars[i] = {
                varname: this.LoadString(),
                startpc: this.LoadInt(),
                endpc:   this.LoadInt()
            };
        }

        n = this.LoadInt();
        for (let i = 0; i < n; i++) {
            f.upvalues[i].name = this.LoadString();
        }
    }

    LoadFunction(f, psource) {
        f.source = this.LoadString();
        if (f.source === null)  /* no source in dump? */
            f.source = psource;  /* reuse parent's source */
        f.linedefined = this.LoadInt();
        f.lastlinedefined = this.LoadInt();
        f.numparams = this.LoadByte();
        f.is_vararg = this.LoadByte() !== 0;
        f.maxstacksize = this.LoadByte();
        this.LoadCode(f);
        this.LoadConstants(f);
        this.LoadUpvalues(f);
        this.LoadProtos(f);
        this.LoadDebug(f);
    }

    checkliteral(s, msg) {
        let buff = this.read(s.length);
        if (!luastring_eq(buff, s))
            this.error(msg);
    }

    checkHeader() {
        this.checkliteral(LUA_SIGNATURE.subarray(1), "not a"); /* 1st char already checked */

        if (this.LoadByte() !== 0x53)
            this.error("version mismatch in");

        if (this.LoadByte() !== 0)
            this.error("format mismatch in");

        this.checkliteral(LUAC_DATA, "corrupted");

        this.intSize         = this.LoadByte();
        this.size_tSize      = this.LoadByte();
        this.instructionSize = this.LoadByte();
        this.integerSize     = this.LoadByte();
        this.numberSize      = this.LoadByte();

        this.checksize(this.intSize, 4, "int");
        this.checksize(this.size_tSize, 4, "size_t");
        this.checksize(this.instructionSize, 4, "instruction");
        this.checksize(this.integerSize, 4, "integer");
        this.checksize(this.numberSize, 8, "number");

        if (this.LoadInteger() !== 0x5678)
            this.error("endianness mismatch in");

        if (this.LoadNumber() !== 370.5)
            this.error("float format mismatch in");

    }

    error(why) {
        lobject.luaO_pushfstring(this.L, to_luastring("%s: %s precompiled chunk"), this.name, to_luastring(why));
        ldo.luaD_throw(this.L, LUA_ERRSYNTAX);
    }

    checksize(byte, size, tname) {
        if (byte !== size)
            this.error(`${tname} size mismatch in`);
    }
}

const luaU_undump = function(L, Z, name) {
    let S = new BytecodeParser(L, Z, name);
    S.checkHeader();
    let cl = lfunc.luaF_newLclosure(L, S.LoadByte());
    ldo.luaD_inctop(L);
    L.stack[L.top-1].setclLvalue(cl);
    cl.p = new lfunc.Proto(L);
    S.LoadFunction(cl.p, null);
    lua_assert(cl.nupvalues === cl.p.upvalues.length);
    /* luai_verifycode */
    return cl;
};

module.exports.luaU_undump = luaU_undump;
