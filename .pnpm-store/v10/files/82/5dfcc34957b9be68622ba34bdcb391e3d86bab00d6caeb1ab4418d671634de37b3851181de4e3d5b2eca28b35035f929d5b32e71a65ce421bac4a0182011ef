"use strict";
//#region src/utils/js-sha256/hash.ts
/**
* [js-sha256]{@link https://github.com/emn178/js-sha256}
*
* @version 0.11.1
* @author Chen, Yi-Cyuan [emn178@gmail.com]
* @copyright Chen, Yi-Cyuan 2014-2025
* @license MIT
*/
var HEX_CHARS = "0123456789abcdef".split("");
var EXTRA = [
	-2147483648,
	8388608,
	32768,
	128
];
var SHIFT = [
	24,
	16,
	8,
	0
];
var K = [
	1116352408,
	1899447441,
	3049323471,
	3921009573,
	961987163,
	1508970993,
	2453635748,
	2870763221,
	3624381080,
	310598401,
	607225278,
	1426881987,
	1925078388,
	2162078206,
	2614888103,
	3248222580,
	3835390401,
	4022224774,
	264347078,
	604807628,
	770255983,
	1249150122,
	1555081692,
	1996064986,
	2554220882,
	2821834349,
	2952996808,
	3210313671,
	3336571891,
	3584528711,
	113926993,
	338241895,
	666307205,
	773529912,
	1294757372,
	1396182291,
	1695183700,
	1986661051,
	2177026350,
	2456956037,
	2730485921,
	2820302411,
	3259730800,
	3345764771,
	3516065817,
	3600352804,
	4094571909,
	275423344,
	430227734,
	506948616,
	659060556,
	883997877,
	958139571,
	1322822218,
	1537002063,
	1747873779,
	1955562222,
	2024104815,
	2227730452,
	2361852424,
	2428436474,
	2756734187,
	3204031479,
	3329325298
];
var blocks = [];
function Sha256(is224, sharedMemory) {
	if (sharedMemory) {
		blocks[0] = blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
		this.blocks = blocks;
	} else this.blocks = [
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0
	];
	if (is224) {
		this.h0 = 3238371032;
		this.h1 = 914150663;
		this.h2 = 812702999;
		this.h3 = 4144912697;
		this.h4 = 4290775857;
		this.h5 = 1750603025;
		this.h6 = 1694076839;
		this.h7 = 3204075428;
	} else {
		this.h0 = 1779033703;
		this.h1 = 3144134277;
		this.h2 = 1013904242;
		this.h3 = 2773480762;
		this.h4 = 1359893119;
		this.h5 = 2600822924;
		this.h6 = 528734635;
		this.h7 = 1541459225;
	}
	this.block = this.start = this.bytes = this.hBytes = 0;
	this.finalized = this.hashed = false;
	this.first = true;
	this.is224 = is224;
}
Sha256.prototype.update = function(message) {
	if (this.finalized) return;
	var notString, type = typeof message;
	if (type !== "string") {
		if (type === "object") {
			if (message === null) throw new Error(ERROR);
			else if (ARRAY_BUFFER && message.constructor === ArrayBuffer) message = new Uint8Array(message);
			else if (!Array.isArray(message)) {
				if (!ARRAY_BUFFER || !ArrayBuffer.isView(message)) throw new Error(ERROR);
			}
		} else throw new Error(ERROR);
		notString = true;
	}
	var code, index = 0, i, length = message.length, blocks = this.blocks;
	while (index < length) {
		if (this.hashed) {
			this.hashed = false;
			blocks[0] = this.block;
			this.block = blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
		}
		if (notString) for (i = this.start; index < length && i < 64; ++index) blocks[i >>> 2] |= message[index] << SHIFT[i++ & 3];
		else for (i = this.start; index < length && i < 64; ++index) {
			code = message.charCodeAt(index);
			if (code < 128) blocks[i >>> 2] |= code << SHIFT[i++ & 3];
			else if (code < 2048) {
				blocks[i >>> 2] |= (192 | code >>> 6) << SHIFT[i++ & 3];
				blocks[i >>> 2] |= (128 | code & 63) << SHIFT[i++ & 3];
			} else if (code < 55296 || code >= 57344) {
				blocks[i >>> 2] |= (224 | code >>> 12) << SHIFT[i++ & 3];
				blocks[i >>> 2] |= (128 | code >>> 6 & 63) << SHIFT[i++ & 3];
				blocks[i >>> 2] |= (128 | code & 63) << SHIFT[i++ & 3];
			} else {
				code = 65536 + ((code & 1023) << 10 | message.charCodeAt(++index) & 1023);
				blocks[i >>> 2] |= (240 | code >>> 18) << SHIFT[i++ & 3];
				blocks[i >>> 2] |= (128 | code >>> 12 & 63) << SHIFT[i++ & 3];
				blocks[i >>> 2] |= (128 | code >>> 6 & 63) << SHIFT[i++ & 3];
				blocks[i >>> 2] |= (128 | code & 63) << SHIFT[i++ & 3];
			}
		}
		this.lastByteIndex = i;
		this.bytes += i - this.start;
		if (i >= 64) {
			this.block = blocks[16];
			this.start = i - 64;
			this.hash();
			this.hashed = true;
		} else this.start = i;
	}
	if (this.bytes > 4294967295) {
		this.hBytes += this.bytes / 4294967296 << 0;
		this.bytes = this.bytes % 4294967296;
	}
	return this;
};
Sha256.prototype.finalize = function() {
	if (this.finalized) return;
	this.finalized = true;
	var blocks = this.blocks, i = this.lastByteIndex;
	blocks[16] = this.block;
	blocks[i >>> 2] |= EXTRA[i & 3];
	this.block = blocks[16];
	if (i >= 56) {
		if (!this.hashed) this.hash();
		blocks[0] = this.block;
		blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
	}
	blocks[14] = this.hBytes << 3 | this.bytes >>> 29;
	blocks[15] = this.bytes << 3;
	this.hash();
};
Sha256.prototype.hash = function() {
	var a = this.h0, b = this.h1, c = this.h2, d = this.h3, e = this.h4, f = this.h5, g = this.h6, h = this.h7, blocks = this.blocks, j, s0, s1, maj, t1, t2, ch, ab, da, cd, bc;
	for (j = 16; j < 64; ++j) {
		t1 = blocks[j - 15];
		s0 = (t1 >>> 7 | t1 << 25) ^ (t1 >>> 18 | t1 << 14) ^ t1 >>> 3;
		t1 = blocks[j - 2];
		s1 = (t1 >>> 17 | t1 << 15) ^ (t1 >>> 19 | t1 << 13) ^ t1 >>> 10;
		blocks[j] = blocks[j - 16] + s0 + blocks[j - 7] + s1 << 0;
	}
	bc = b & c;
	for (j = 0; j < 64; j += 4) {
		if (this.first) {
			if (this.is224) {
				ab = 300032;
				t1 = blocks[0] - 1413257819;
				h = t1 - 150054599 << 0;
				d = t1 + 24177077 << 0;
			} else {
				ab = 704751109;
				t1 = blocks[0] - 210244248;
				h = t1 - 1521486534 << 0;
				d = t1 + 143694565 << 0;
			}
			this.first = false;
		} else {
			s0 = (a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10);
			s1 = (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7);
			ab = a & b;
			maj = ab ^ a & c ^ bc;
			ch = e & f ^ ~e & g;
			t1 = h + s1 + ch + K[j] + blocks[j];
			t2 = s0 + maj;
			h = d + t1 << 0;
			d = t1 + t2 << 0;
		}
		s0 = (d >>> 2 | d << 30) ^ (d >>> 13 | d << 19) ^ (d >>> 22 | d << 10);
		s1 = (h >>> 6 | h << 26) ^ (h >>> 11 | h << 21) ^ (h >>> 25 | h << 7);
		da = d & a;
		maj = da ^ d & b ^ ab;
		ch = g & h ^ ~g & e;
		t1 = f + s1 + ch + K[j + 1] + blocks[j + 1];
		t2 = s0 + maj;
		g = c + t1 << 0;
		c = t1 + t2 << 0;
		s0 = (c >>> 2 | c << 30) ^ (c >>> 13 | c << 19) ^ (c >>> 22 | c << 10);
		s1 = (g >>> 6 | g << 26) ^ (g >>> 11 | g << 21) ^ (g >>> 25 | g << 7);
		cd = c & d;
		maj = cd ^ c & a ^ da;
		ch = f & g ^ ~f & h;
		t1 = e + s1 + ch + K[j + 2] + blocks[j + 2];
		t2 = s0 + maj;
		f = b + t1 << 0;
		b = t1 + t2 << 0;
		s0 = (b >>> 2 | b << 30) ^ (b >>> 13 | b << 19) ^ (b >>> 22 | b << 10);
		s1 = (f >>> 6 | f << 26) ^ (f >>> 11 | f << 21) ^ (f >>> 25 | f << 7);
		bc = b & c;
		maj = bc ^ b & d ^ cd;
		ch = f & g ^ ~f & h;
		t1 = e + s1 + ch + K[j + 3] + blocks[j + 3];
		t2 = s0 + maj;
		e = a + t1 << 0;
		a = t1 + t2 << 0;
		this.chromeBugWorkAround = true;
	}
	this.h0 = this.h0 + a << 0;
	this.h1 = this.h1 + b << 0;
	this.h2 = this.h2 + c << 0;
	this.h3 = this.h3 + d << 0;
	this.h4 = this.h4 + e << 0;
	this.h5 = this.h5 + f << 0;
	this.h6 = this.h6 + g << 0;
	this.h7 = this.h7 + h << 0;
};
Sha256.prototype.hex = function() {
	this.finalize();
	var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4, h5 = this.h5, h6 = this.h6, h7 = this.h7;
	var hex = HEX_CHARS[h0 >>> 28 & 15] + HEX_CHARS[h0 >>> 24 & 15] + HEX_CHARS[h0 >>> 20 & 15] + HEX_CHARS[h0 >>> 16 & 15] + HEX_CHARS[h0 >>> 12 & 15] + HEX_CHARS[h0 >>> 8 & 15] + HEX_CHARS[h0 >>> 4 & 15] + HEX_CHARS[h0 & 15] + HEX_CHARS[h1 >>> 28 & 15] + HEX_CHARS[h1 >>> 24 & 15] + HEX_CHARS[h1 >>> 20 & 15] + HEX_CHARS[h1 >>> 16 & 15] + HEX_CHARS[h1 >>> 12 & 15] + HEX_CHARS[h1 >>> 8 & 15] + HEX_CHARS[h1 >>> 4 & 15] + HEX_CHARS[h1 & 15] + HEX_CHARS[h2 >>> 28 & 15] + HEX_CHARS[h2 >>> 24 & 15] + HEX_CHARS[h2 >>> 20 & 15] + HEX_CHARS[h2 >>> 16 & 15] + HEX_CHARS[h2 >>> 12 & 15] + HEX_CHARS[h2 >>> 8 & 15] + HEX_CHARS[h2 >>> 4 & 15] + HEX_CHARS[h2 & 15] + HEX_CHARS[h3 >>> 28 & 15] + HEX_CHARS[h3 >>> 24 & 15] + HEX_CHARS[h3 >>> 20 & 15] + HEX_CHARS[h3 >>> 16 & 15] + HEX_CHARS[h3 >>> 12 & 15] + HEX_CHARS[h3 >>> 8 & 15] + HEX_CHARS[h3 >>> 4 & 15] + HEX_CHARS[h3 & 15] + HEX_CHARS[h4 >>> 28 & 15] + HEX_CHARS[h4 >>> 24 & 15] + HEX_CHARS[h4 >>> 20 & 15] + HEX_CHARS[h4 >>> 16 & 15] + HEX_CHARS[h4 >>> 12 & 15] + HEX_CHARS[h4 >>> 8 & 15] + HEX_CHARS[h4 >>> 4 & 15] + HEX_CHARS[h4 & 15] + HEX_CHARS[h5 >>> 28 & 15] + HEX_CHARS[h5 >>> 24 & 15] + HEX_CHARS[h5 >>> 20 & 15] + HEX_CHARS[h5 >>> 16 & 15] + HEX_CHARS[h5 >>> 12 & 15] + HEX_CHARS[h5 >>> 8 & 15] + HEX_CHARS[h5 >>> 4 & 15] + HEX_CHARS[h5 & 15] + HEX_CHARS[h6 >>> 28 & 15] + HEX_CHARS[h6 >>> 24 & 15] + HEX_CHARS[h6 >>> 20 & 15] + HEX_CHARS[h6 >>> 16 & 15] + HEX_CHARS[h6 >>> 12 & 15] + HEX_CHARS[h6 >>> 8 & 15] + HEX_CHARS[h6 >>> 4 & 15] + HEX_CHARS[h6 & 15];
	if (!this.is224) hex += HEX_CHARS[h7 >>> 28 & 15] + HEX_CHARS[h7 >>> 24 & 15] + HEX_CHARS[h7 >>> 20 & 15] + HEX_CHARS[h7 >>> 16 & 15] + HEX_CHARS[h7 >>> 12 & 15] + HEX_CHARS[h7 >>> 8 & 15] + HEX_CHARS[h7 >>> 4 & 15] + HEX_CHARS[h7 & 15];
	return hex;
};
Sha256.prototype.toString = Sha256.prototype.hex;
Sha256.prototype.digest = function() {
	this.finalize();
	var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4, h5 = this.h5, h6 = this.h6, h7 = this.h7;
	var arr = [
		h0 >>> 24 & 255,
		h0 >>> 16 & 255,
		h0 >>> 8 & 255,
		h0 & 255,
		h1 >>> 24 & 255,
		h1 >>> 16 & 255,
		h1 >>> 8 & 255,
		h1 & 255,
		h2 >>> 24 & 255,
		h2 >>> 16 & 255,
		h2 >>> 8 & 255,
		h2 & 255,
		h3 >>> 24 & 255,
		h3 >>> 16 & 255,
		h3 >>> 8 & 255,
		h3 & 255,
		h4 >>> 24 & 255,
		h4 >>> 16 & 255,
		h4 >>> 8 & 255,
		h4 & 255,
		h5 >>> 24 & 255,
		h5 >>> 16 & 255,
		h5 >>> 8 & 255,
		h5 & 255,
		h6 >>> 24 & 255,
		h6 >>> 16 & 255,
		h6 >>> 8 & 255,
		h6 & 255
	];
	if (!this.is224) arr.push(h7 >>> 24 & 255, h7 >>> 16 & 255, h7 >>> 8 & 255, h7 & 255);
	return arr;
};
Sha256.prototype.array = Sha256.prototype.digest;
Sha256.prototype.arrayBuffer = function() {
	this.finalize();
	var buffer = /* @__PURE__ */ new ArrayBuffer(this.is224 ? 28 : 32);
	var dataView = new DataView(buffer);
	dataView.setUint32(0, this.h0);
	dataView.setUint32(4, this.h1);
	dataView.setUint32(8, this.h2);
	dataView.setUint32(12, this.h3);
	dataView.setUint32(16, this.h4);
	dataView.setUint32(20, this.h5);
	dataView.setUint32(24, this.h6);
	if (!this.is224) dataView.setUint32(28, this.h7);
	return buffer;
};
const sha256 = (...strings) => {
	return new Sha256(false, true).update(strings.join("")).hex();
};
//#endregion
exports.sha256 = sha256;

//# sourceMappingURL=hash.cjs.map