"use strict";

const { lua_assert } = require("./llimits.js");

class MBuffer {
    constructor() {
        this.buffer = null;
        this.n = 0;
    }
}

const luaZ_buffer = function(buff) {
    return buff.buffer.subarray(0, buff.n);
};

const luaZ_buffremove = function(buff, i) {
    buff.n -= i;
};

const luaZ_resetbuffer = function(buff) {
    buff.n = 0;
};

const luaZ_resizebuffer = function(L, buff, size) {
    let newbuff = new Uint8Array(size);
    if (buff.buffer)
        newbuff.set(buff.buffer);
    buff.buffer = newbuff;
};

class ZIO {
    constructor(L, reader, data) {
        this.L = L;           /* Lua state (for reader) */
        lua_assert(typeof reader == "function", "ZIO requires a reader");
        this.reader = reader; /* reader function */
        this.data = data;     /* additional data */
        this.n = 0;           /* bytes still unread */
        this.buffer = null;
        this.off = 0;         /* current position in buffer */
    }

    zgetc () {
        return ((this.n--) > 0) ? this.buffer[this.off++] : luaZ_fill(this);
    }
}

const EOZ = -1;

const luaZ_fill = function(z) {
    let buff = z.reader(z.L, z.data);
    if (buff === null)
        return EOZ;
    lua_assert(buff instanceof Uint8Array, "Should only load binary of array of bytes");
    let size = buff.length;
    if (size === 0)
        return EOZ;
    z.buffer = buff;
    z.off = 0;
    z.n = size - 1;
    return z.buffer[z.off++];
};

/* b should be an array-like that will be set to bytes
 * b_offset is the offset at which to start filling */
const luaZ_read = function(z, b, b_offset, n) {
    while (n) {
        if (z.n === 0) { /* no bytes in buffer? */
            if (luaZ_fill(z) === EOZ)
                return n; /* no more input; return number of missing bytes */
            else {
                z.n++;  /* luaZ_fill consumed first byte; put it back */
                z.off--;
            }
        }
        let m = (n <= z.n) ? n : z.n; /* min. between n and z->n */
        for (let i=0; i<m; i++) {
            b[b_offset++] = z.buffer[z.off++];
        }
        z.n -= m;
        if (z.n === 0) // remove reference to input so it can get freed
            z.buffer = null;
        n -= m;
    }

    return 0;
};

module.exports.EOZ               = EOZ;
module.exports.luaZ_buffer       = luaZ_buffer;
module.exports.luaZ_buffremove   = luaZ_buffremove;
module.exports.luaZ_fill         = luaZ_fill;
module.exports.luaZ_read         = luaZ_read;
module.exports.luaZ_resetbuffer  = luaZ_resetbuffer;
module.exports.luaZ_resizebuffer = luaZ_resizebuffer;
module.exports.MBuffer           = MBuffer;
module.exports.ZIO               = ZIO;
