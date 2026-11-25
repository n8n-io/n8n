import { $d as init_runtime_core_esm_bundler, Bd as createBlock, Cf as useTemplateRef, Df as withCtx, Gd as createTextVNode, Hd as createElementBlock, Jd as defineComponent, Kd as createVNode, Md as withKeys, Nf as init_reactivity_esm_bundler, Pd as Fragment, Rd as computed, Sd as Transition, Sp as toDisplayString, Td as init_runtime_dom_esm_bundler, Tf as watch, Vd as createCommentVNode, Vf as ref, Xf as unref, Zd as h, _p as normalizeClass, df as onUpdated, ff as openBlock, if as nextTick, ip as init_shared_esm_bundler, lf as onMounted, mf as renderList, of as onBeforeUnmount, yp as normalizeStyle, zd as createBaseVNode } from "./vendor-Hx42-oQF.js";
import { GA as DialogDescription_default, Jg as useUIStore, KA as Dialog_default, SN as _plugin_vue_export_helper_default, UA as DialogFooter_default, Vr as useClipboard, WA as DialogBody_default, Z as MFA_SETUP_MODAL_KEY, _C as useUsersStore, _N as N8nText_default, cN as Input_default, dC as useToast, fC as VIEWS, fN as N8nTooltip_default, gM as N8nInputLabel_default, jN as useI18n, m as router, tN as N8nLoading_default, xN as N8nIcon_default, yC as useSettingsStore, yN as N8nButton_default } from "./app-D5flEmb-.js";
//#region ../../../node_modules/.pnpm/qrcode.vue@3.3.4_vue@3.5.26_typescript@6.0.2_/node_modules/qrcode.vue/dist/qrcode.vue.esm.js
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler();
/*!
* qrcode.vue v3.3.4
* A Vue.js component to generate QRCode.
* © 2017-2023 @scopewu(https://github.com/scopewu)
* MIT License.
*/
/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
var __assign = function() {
	__assign = Object.assign || function __assign(t) {
		for (var s, i = 1, n = arguments.length; i < n; i++) {
			s = arguments[i];
			for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
		}
		return t;
	};
	return __assign.apply(this, arguments);
};
var mode$1 = {
	MODE_NUMBER: 1,
	MODE_ALPHA_NUM: 2,
	MODE_8BIT_BYTE: 4,
	MODE_KANJI: 8
};
var mode = mode$1;
function QR8bitByte(data) {
	this.mode = mode.MODE_8BIT_BYTE;
	this.data = data;
}
QR8bitByte.prototype = {
	getLength: function(buffer) {
		return this.data.length;
	},
	write: function(buffer) {
		for (var i = 0; i < this.data.length; i++) buffer.put(this.data.charCodeAt(i), 8);
	}
};
var _8BitByte = QR8bitByte;
var ErrorCorrectLevel = {
	L: 1,
	M: 0,
	Q: 3,
	H: 2
};
var ECL = ErrorCorrectLevel;
function QRRSBlock(totalCount, dataCount) {
	this.totalCount = totalCount;
	this.dataCount = dataCount;
}
QRRSBlock.RS_BLOCK_TABLE = [
	[
		1,
		26,
		19
	],
	[
		1,
		26,
		16
	],
	[
		1,
		26,
		13
	],
	[
		1,
		26,
		9
	],
	[
		1,
		44,
		34
	],
	[
		1,
		44,
		28
	],
	[
		1,
		44,
		22
	],
	[
		1,
		44,
		16
	],
	[
		1,
		70,
		55
	],
	[
		1,
		70,
		44
	],
	[
		2,
		35,
		17
	],
	[
		2,
		35,
		13
	],
	[
		1,
		100,
		80
	],
	[
		2,
		50,
		32
	],
	[
		2,
		50,
		24
	],
	[
		4,
		25,
		9
	],
	[
		1,
		134,
		108
	],
	[
		2,
		67,
		43
	],
	[
		2,
		33,
		15,
		2,
		34,
		16
	],
	[
		2,
		33,
		11,
		2,
		34,
		12
	],
	[
		2,
		86,
		68
	],
	[
		4,
		43,
		27
	],
	[
		4,
		43,
		19
	],
	[
		4,
		43,
		15
	],
	[
		2,
		98,
		78
	],
	[
		4,
		49,
		31
	],
	[
		2,
		32,
		14,
		4,
		33,
		15
	],
	[
		4,
		39,
		13,
		1,
		40,
		14
	],
	[
		2,
		121,
		97
	],
	[
		2,
		60,
		38,
		2,
		61,
		39
	],
	[
		4,
		40,
		18,
		2,
		41,
		19
	],
	[
		4,
		40,
		14,
		2,
		41,
		15
	],
	[
		2,
		146,
		116
	],
	[
		3,
		58,
		36,
		2,
		59,
		37
	],
	[
		4,
		36,
		16,
		4,
		37,
		17
	],
	[
		4,
		36,
		12,
		4,
		37,
		13
	],
	[
		2,
		86,
		68,
		2,
		87,
		69
	],
	[
		4,
		69,
		43,
		1,
		70,
		44
	],
	[
		6,
		43,
		19,
		2,
		44,
		20
	],
	[
		6,
		43,
		15,
		2,
		44,
		16
	],
	[
		4,
		101,
		81
	],
	[
		1,
		80,
		50,
		4,
		81,
		51
	],
	[
		4,
		50,
		22,
		4,
		51,
		23
	],
	[
		3,
		36,
		12,
		8,
		37,
		13
	],
	[
		2,
		116,
		92,
		2,
		117,
		93
	],
	[
		6,
		58,
		36,
		2,
		59,
		37
	],
	[
		4,
		46,
		20,
		6,
		47,
		21
	],
	[
		7,
		42,
		14,
		4,
		43,
		15
	],
	[
		4,
		133,
		107
	],
	[
		8,
		59,
		37,
		1,
		60,
		38
	],
	[
		8,
		44,
		20,
		4,
		45,
		21
	],
	[
		12,
		33,
		11,
		4,
		34,
		12
	],
	[
		3,
		145,
		115,
		1,
		146,
		116
	],
	[
		4,
		64,
		40,
		5,
		65,
		41
	],
	[
		11,
		36,
		16,
		5,
		37,
		17
	],
	[
		11,
		36,
		12,
		5,
		37,
		13
	],
	[
		5,
		109,
		87,
		1,
		110,
		88
	],
	[
		5,
		65,
		41,
		5,
		66,
		42
	],
	[
		5,
		54,
		24,
		7,
		55,
		25
	],
	[
		11,
		36,
		12
	],
	[
		5,
		122,
		98,
		1,
		123,
		99
	],
	[
		7,
		73,
		45,
		3,
		74,
		46
	],
	[
		15,
		43,
		19,
		2,
		44,
		20
	],
	[
		3,
		45,
		15,
		13,
		46,
		16
	],
	[
		1,
		135,
		107,
		5,
		136,
		108
	],
	[
		10,
		74,
		46,
		1,
		75,
		47
	],
	[
		1,
		50,
		22,
		15,
		51,
		23
	],
	[
		2,
		42,
		14,
		17,
		43,
		15
	],
	[
		5,
		150,
		120,
		1,
		151,
		121
	],
	[
		9,
		69,
		43,
		4,
		70,
		44
	],
	[
		17,
		50,
		22,
		1,
		51,
		23
	],
	[
		2,
		42,
		14,
		19,
		43,
		15
	],
	[
		3,
		141,
		113,
		4,
		142,
		114
	],
	[
		3,
		70,
		44,
		11,
		71,
		45
	],
	[
		17,
		47,
		21,
		4,
		48,
		22
	],
	[
		9,
		39,
		13,
		16,
		40,
		14
	],
	[
		3,
		135,
		107,
		5,
		136,
		108
	],
	[
		3,
		67,
		41,
		13,
		68,
		42
	],
	[
		15,
		54,
		24,
		5,
		55,
		25
	],
	[
		15,
		43,
		15,
		10,
		44,
		16
	],
	[
		4,
		144,
		116,
		4,
		145,
		117
	],
	[
		17,
		68,
		42
	],
	[
		17,
		50,
		22,
		6,
		51,
		23
	],
	[
		19,
		46,
		16,
		6,
		47,
		17
	],
	[
		2,
		139,
		111,
		7,
		140,
		112
	],
	[
		17,
		74,
		46
	],
	[
		7,
		54,
		24,
		16,
		55,
		25
	],
	[
		34,
		37,
		13
	],
	[
		4,
		151,
		121,
		5,
		152,
		122
	],
	[
		4,
		75,
		47,
		14,
		76,
		48
	],
	[
		11,
		54,
		24,
		14,
		55,
		25
	],
	[
		16,
		45,
		15,
		14,
		46,
		16
	],
	[
		6,
		147,
		117,
		4,
		148,
		118
	],
	[
		6,
		73,
		45,
		14,
		74,
		46
	],
	[
		11,
		54,
		24,
		16,
		55,
		25
	],
	[
		30,
		46,
		16,
		2,
		47,
		17
	],
	[
		8,
		132,
		106,
		4,
		133,
		107
	],
	[
		8,
		75,
		47,
		13,
		76,
		48
	],
	[
		7,
		54,
		24,
		22,
		55,
		25
	],
	[
		22,
		45,
		15,
		13,
		46,
		16
	],
	[
		10,
		142,
		114,
		2,
		143,
		115
	],
	[
		19,
		74,
		46,
		4,
		75,
		47
	],
	[
		28,
		50,
		22,
		6,
		51,
		23
	],
	[
		33,
		46,
		16,
		4,
		47,
		17
	],
	[
		8,
		152,
		122,
		4,
		153,
		123
	],
	[
		22,
		73,
		45,
		3,
		74,
		46
	],
	[
		8,
		53,
		23,
		26,
		54,
		24
	],
	[
		12,
		45,
		15,
		28,
		46,
		16
	],
	[
		3,
		147,
		117,
		10,
		148,
		118
	],
	[
		3,
		73,
		45,
		23,
		74,
		46
	],
	[
		4,
		54,
		24,
		31,
		55,
		25
	],
	[
		11,
		45,
		15,
		31,
		46,
		16
	],
	[
		7,
		146,
		116,
		7,
		147,
		117
	],
	[
		21,
		73,
		45,
		7,
		74,
		46
	],
	[
		1,
		53,
		23,
		37,
		54,
		24
	],
	[
		19,
		45,
		15,
		26,
		46,
		16
	],
	[
		5,
		145,
		115,
		10,
		146,
		116
	],
	[
		19,
		75,
		47,
		10,
		76,
		48
	],
	[
		15,
		54,
		24,
		25,
		55,
		25
	],
	[
		23,
		45,
		15,
		25,
		46,
		16
	],
	[
		13,
		145,
		115,
		3,
		146,
		116
	],
	[
		2,
		74,
		46,
		29,
		75,
		47
	],
	[
		42,
		54,
		24,
		1,
		55,
		25
	],
	[
		23,
		45,
		15,
		28,
		46,
		16
	],
	[
		17,
		145,
		115
	],
	[
		10,
		74,
		46,
		23,
		75,
		47
	],
	[
		10,
		54,
		24,
		35,
		55,
		25
	],
	[
		19,
		45,
		15,
		35,
		46,
		16
	],
	[
		17,
		145,
		115,
		1,
		146,
		116
	],
	[
		14,
		74,
		46,
		21,
		75,
		47
	],
	[
		29,
		54,
		24,
		19,
		55,
		25
	],
	[
		11,
		45,
		15,
		46,
		46,
		16
	],
	[
		13,
		145,
		115,
		6,
		146,
		116
	],
	[
		14,
		74,
		46,
		23,
		75,
		47
	],
	[
		44,
		54,
		24,
		7,
		55,
		25
	],
	[
		59,
		46,
		16,
		1,
		47,
		17
	],
	[
		12,
		151,
		121,
		7,
		152,
		122
	],
	[
		12,
		75,
		47,
		26,
		76,
		48
	],
	[
		39,
		54,
		24,
		14,
		55,
		25
	],
	[
		22,
		45,
		15,
		41,
		46,
		16
	],
	[
		6,
		151,
		121,
		14,
		152,
		122
	],
	[
		6,
		75,
		47,
		34,
		76,
		48
	],
	[
		46,
		54,
		24,
		10,
		55,
		25
	],
	[
		2,
		45,
		15,
		64,
		46,
		16
	],
	[
		17,
		152,
		122,
		4,
		153,
		123
	],
	[
		29,
		74,
		46,
		14,
		75,
		47
	],
	[
		49,
		54,
		24,
		10,
		55,
		25
	],
	[
		24,
		45,
		15,
		46,
		46,
		16
	],
	[
		4,
		152,
		122,
		18,
		153,
		123
	],
	[
		13,
		74,
		46,
		32,
		75,
		47
	],
	[
		48,
		54,
		24,
		14,
		55,
		25
	],
	[
		42,
		45,
		15,
		32,
		46,
		16
	],
	[
		20,
		147,
		117,
		4,
		148,
		118
	],
	[
		40,
		75,
		47,
		7,
		76,
		48
	],
	[
		43,
		54,
		24,
		22,
		55,
		25
	],
	[
		10,
		45,
		15,
		67,
		46,
		16
	],
	[
		19,
		148,
		118,
		6,
		149,
		119
	],
	[
		18,
		75,
		47,
		31,
		76,
		48
	],
	[
		34,
		54,
		24,
		34,
		55,
		25
	],
	[
		20,
		45,
		15,
		61,
		46,
		16
	]
];
QRRSBlock.getRSBlocks = function(typeNumber, errorCorrectLevel) {
	var rsBlock = QRRSBlock.getRsBlockTable(typeNumber, errorCorrectLevel);
	if (rsBlock == void 0) throw new Error("bad rs block @ typeNumber:" + typeNumber + "/errorCorrectLevel:" + errorCorrectLevel);
	var length = rsBlock.length / 3;
	var list = new Array();
	for (var i = 0; i < length; i++) {
		var count = rsBlock[i * 3 + 0];
		var totalCount = rsBlock[i * 3 + 1];
		var dataCount = rsBlock[i * 3 + 2];
		for (var j = 0; j < count; j++) list.push(new QRRSBlock(totalCount, dataCount));
	}
	return list;
};
QRRSBlock.getRsBlockTable = function(typeNumber, errorCorrectLevel) {
	switch (errorCorrectLevel) {
		case ECL.L: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 0];
		case ECL.M: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 1];
		case ECL.Q: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 2];
		case ECL.H: return QRRSBlock.RS_BLOCK_TABLE[(typeNumber - 1) * 4 + 3];
		default: return;
	}
};
var RSBlock$1 = QRRSBlock;
function QRBitBuffer() {
	this.buffer = new Array();
	this.length = 0;
}
QRBitBuffer.prototype = {
	get: function(index) {
		var bufIndex = Math.floor(index / 8);
		return (this.buffer[bufIndex] >>> 7 - index % 8 & 1) == 1;
	},
	put: function(num, length) {
		for (var i = 0; i < length; i++) this.putBit((num >>> length - i - 1 & 1) == 1);
	},
	getLengthInBits: function() {
		return this.length;
	},
	putBit: function(bit) {
		var bufIndex = Math.floor(this.length / 8);
		if (this.buffer.length <= bufIndex) this.buffer.push(0);
		if (bit) this.buffer[bufIndex] |= 128 >>> this.length % 8;
		this.length++;
	}
};
var BitBuffer$1 = QRBitBuffer;
var QRMath = {
	glog: function(n) {
		if (n < 1) throw new Error("glog(" + n + ")");
		return QRMath.LOG_TABLE[n];
	},
	gexp: function(n) {
		while (n < 0) n += 255;
		while (n >= 256) n -= 255;
		return QRMath.EXP_TABLE[n];
	},
	EXP_TABLE: new Array(256),
	LOG_TABLE: new Array(256)
};
for (var i = 0; i < 8; i++) QRMath.EXP_TABLE[i] = 1 << i;
for (var i = 8; i < 256; i++) QRMath.EXP_TABLE[i] = QRMath.EXP_TABLE[i - 4] ^ QRMath.EXP_TABLE[i - 5] ^ QRMath.EXP_TABLE[i - 6] ^ QRMath.EXP_TABLE[i - 8];
for (var i = 0; i < 255; i++) QRMath.LOG_TABLE[QRMath.EXP_TABLE[i]] = i;
var math$2 = QRMath;
var math$1 = math$2;
function QRPolynomial(num, shift) {
	if (num.length == void 0) throw new Error(num.length + "/" + shift);
	var offset = 0;
	while (offset < num.length && num[offset] == 0) offset++;
	this.num = new Array(num.length - offset + shift);
	for (var i = 0; i < num.length - offset; i++) this.num[i] = num[i + offset];
}
QRPolynomial.prototype = {
	get: function(index) {
		return this.num[index];
	},
	getLength: function() {
		return this.num.length;
	},
	multiply: function(e) {
		var num = new Array(this.getLength() + e.getLength() - 1);
		for (var i = 0; i < this.getLength(); i++) for (var j = 0; j < e.getLength(); j++) num[i + j] ^= math$1.gexp(math$1.glog(this.get(i)) + math$1.glog(e.get(j)));
		return new QRPolynomial(num, 0);
	},
	mod: function(e) {
		if (this.getLength() - e.getLength() < 0) return this;
		var ratio = math$1.glog(this.get(0)) - math$1.glog(e.get(0));
		var num = new Array(this.getLength());
		for (var i = 0; i < this.getLength(); i++) num[i] = this.get(i);
		for (var i = 0; i < e.getLength(); i++) num[i] ^= math$1.gexp(math$1.glog(e.get(i)) + ratio);
		return new QRPolynomial(num, 0).mod(e);
	}
};
var Polynomial$2 = QRPolynomial;
var Mode = mode$1;
var Polynomial$1 = Polynomial$2;
var math = math$2;
var QRMaskPattern = {
	PATTERN000: 0,
	PATTERN001: 1,
	PATTERN010: 2,
	PATTERN011: 3,
	PATTERN100: 4,
	PATTERN101: 5,
	PATTERN110: 6,
	PATTERN111: 7
};
var QRUtil = {
	PATTERN_POSITION_TABLE: [
		[],
		[6, 18],
		[6, 22],
		[6, 26],
		[6, 30],
		[6, 34],
		[
			6,
			22,
			38
		],
		[
			6,
			24,
			42
		],
		[
			6,
			26,
			46
		],
		[
			6,
			28,
			50
		],
		[
			6,
			30,
			54
		],
		[
			6,
			32,
			58
		],
		[
			6,
			34,
			62
		],
		[
			6,
			26,
			46,
			66
		],
		[
			6,
			26,
			48,
			70
		],
		[
			6,
			26,
			50,
			74
		],
		[
			6,
			30,
			54,
			78
		],
		[
			6,
			30,
			56,
			82
		],
		[
			6,
			30,
			58,
			86
		],
		[
			6,
			34,
			62,
			90
		],
		[
			6,
			28,
			50,
			72,
			94
		],
		[
			6,
			26,
			50,
			74,
			98
		],
		[
			6,
			30,
			54,
			78,
			102
		],
		[
			6,
			28,
			54,
			80,
			106
		],
		[
			6,
			32,
			58,
			84,
			110
		],
		[
			6,
			30,
			58,
			86,
			114
		],
		[
			6,
			34,
			62,
			90,
			118
		],
		[
			6,
			26,
			50,
			74,
			98,
			122
		],
		[
			6,
			30,
			54,
			78,
			102,
			126
		],
		[
			6,
			26,
			52,
			78,
			104,
			130
		],
		[
			6,
			30,
			56,
			82,
			108,
			134
		],
		[
			6,
			34,
			60,
			86,
			112,
			138
		],
		[
			6,
			30,
			58,
			86,
			114,
			142
		],
		[
			6,
			34,
			62,
			90,
			118,
			146
		],
		[
			6,
			30,
			54,
			78,
			102,
			126,
			150
		],
		[
			6,
			24,
			50,
			76,
			102,
			128,
			154
		],
		[
			6,
			28,
			54,
			80,
			106,
			132,
			158
		],
		[
			6,
			32,
			58,
			84,
			110,
			136,
			162
		],
		[
			6,
			26,
			54,
			82,
			110,
			138,
			166
		],
		[
			6,
			30,
			58,
			86,
			114,
			142,
			170
		]
	],
	G15: 1335,
	G18: 7973,
	G15_MASK: 21522,
	getBCHTypeInfo: function(data) {
		var d = data << 10;
		while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15) >= 0) d ^= QRUtil.G15 << QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G15);
		return (data << 10 | d) ^ QRUtil.G15_MASK;
	},
	getBCHTypeNumber: function(data) {
		var d = data << 12;
		while (QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18) >= 0) d ^= QRUtil.G18 << QRUtil.getBCHDigit(d) - QRUtil.getBCHDigit(QRUtil.G18);
		return data << 12 | d;
	},
	getBCHDigit: function(data) {
		var digit = 0;
		while (data != 0) {
			digit++;
			data >>>= 1;
		}
		return digit;
	},
	getPatternPosition: function(typeNumber) {
		return QRUtil.PATTERN_POSITION_TABLE[typeNumber - 1];
	},
	getMask: function(maskPattern, i, j) {
		switch (maskPattern) {
			case QRMaskPattern.PATTERN000: return (i + j) % 2 == 0;
			case QRMaskPattern.PATTERN001: return i % 2 == 0;
			case QRMaskPattern.PATTERN010: return j % 3 == 0;
			case QRMaskPattern.PATTERN011: return (i + j) % 3 == 0;
			case QRMaskPattern.PATTERN100: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 == 0;
			case QRMaskPattern.PATTERN101: return i * j % 2 + i * j % 3 == 0;
			case QRMaskPattern.PATTERN110: return (i * j % 2 + i * j % 3) % 2 == 0;
			case QRMaskPattern.PATTERN111: return (i * j % 3 + (i + j) % 2) % 2 == 0;
			default: throw new Error("bad maskPattern:" + maskPattern);
		}
	},
	getErrorCorrectPolynomial: function(errorCorrectLength) {
		var a = new Polynomial$1([1], 0);
		for (var i = 0; i < errorCorrectLength; i++) a = a.multiply(new Polynomial$1([1, math.gexp(i)], 0));
		return a;
	},
	getLengthInBits: function(mode, type) {
		if (1 <= type && type < 10) switch (mode) {
			case Mode.MODE_NUMBER: return 10;
			case Mode.MODE_ALPHA_NUM: return 9;
			case Mode.MODE_8BIT_BYTE: return 8;
			case Mode.MODE_KANJI: return 8;
			default: throw new Error("mode:" + mode);
		}
		else if (type < 27) switch (mode) {
			case Mode.MODE_NUMBER: return 12;
			case Mode.MODE_ALPHA_NUM: return 11;
			case Mode.MODE_8BIT_BYTE: return 16;
			case Mode.MODE_KANJI: return 10;
			default: throw new Error("mode:" + mode);
		}
		else if (type < 41) switch (mode) {
			case Mode.MODE_NUMBER: return 14;
			case Mode.MODE_ALPHA_NUM: return 13;
			case Mode.MODE_8BIT_BYTE: return 16;
			case Mode.MODE_KANJI: return 12;
			default: throw new Error("mode:" + mode);
		}
		else throw new Error("type:" + type);
	},
	getLostPoint: function(qrCode) {
		var moduleCount = qrCode.getModuleCount();
		var lostPoint = 0;
		for (var row = 0; row < moduleCount; row++) for (var col = 0; col < moduleCount; col++) {
			var sameCount = 0;
			var dark = qrCode.isDark(row, col);
			for (var r = -1; r <= 1; r++) {
				if (row + r < 0 || moduleCount <= row + r) continue;
				for (var c = -1; c <= 1; c++) {
					if (col + c < 0 || moduleCount <= col + c) continue;
					if (r == 0 && c == 0) continue;
					if (dark == qrCode.isDark(row + r, col + c)) sameCount++;
				}
			}
			if (sameCount > 5) lostPoint += 3 + sameCount - 5;
		}
		for (var row = 0; row < moduleCount - 1; row++) for (var col = 0; col < moduleCount - 1; col++) {
			var count = 0;
			if (qrCode.isDark(row, col)) count++;
			if (qrCode.isDark(row + 1, col)) count++;
			if (qrCode.isDark(row, col + 1)) count++;
			if (qrCode.isDark(row + 1, col + 1)) count++;
			if (count == 0 || count == 4) lostPoint += 3;
		}
		for (var row = 0; row < moduleCount; row++) for (var col = 0; col < moduleCount - 6; col++) if (qrCode.isDark(row, col) && !qrCode.isDark(row, col + 1) && qrCode.isDark(row, col + 2) && qrCode.isDark(row, col + 3) && qrCode.isDark(row, col + 4) && !qrCode.isDark(row, col + 5) && qrCode.isDark(row, col + 6)) lostPoint += 40;
		for (var col = 0; col < moduleCount; col++) for (var row = 0; row < moduleCount - 6; row++) if (qrCode.isDark(row, col) && !qrCode.isDark(row + 1, col) && qrCode.isDark(row + 2, col) && qrCode.isDark(row + 3, col) && qrCode.isDark(row + 4, col) && !qrCode.isDark(row + 5, col) && qrCode.isDark(row + 6, col)) lostPoint += 40;
		var darkCount = 0;
		for (var col = 0; col < moduleCount; col++) for (var row = 0; row < moduleCount; row++) if (qrCode.isDark(row, col)) darkCount++;
		var ratio = Math.abs(100 * darkCount / moduleCount / moduleCount - 50) / 5;
		lostPoint += ratio * 10;
		return lostPoint;
	}
};
var util$1 = QRUtil;
var BitByte = _8BitByte;
var RSBlock = RSBlock$1;
var BitBuffer = BitBuffer$1;
var util = util$1;
var Polynomial = Polynomial$2;
function QRCode$1(typeNumber, errorCorrectLevel) {
	this.typeNumber = typeNumber;
	this.errorCorrectLevel = errorCorrectLevel;
	this.modules = null;
	this.moduleCount = 0;
	this.dataCache = null;
	this.dataList = [];
}
var proto = QRCode$1.prototype;
proto.addData = function(data) {
	var newData = new BitByte(data);
	this.dataList.push(newData);
	this.dataCache = null;
};
proto.isDark = function(row, col) {
	if (row < 0 || this.moduleCount <= row || col < 0 || this.moduleCount <= col) throw new Error(row + "," + col);
	return this.modules[row][col];
};
proto.getModuleCount = function() {
	return this.moduleCount;
};
proto.make = function() {
	if (this.typeNumber < 1) {
		var typeNumber = 1;
		for (typeNumber = 1; typeNumber < 40; typeNumber++) {
			var rsBlocks = RSBlock.getRSBlocks(typeNumber, this.errorCorrectLevel);
			var buffer = new BitBuffer();
			var totalDataCount = 0;
			for (var i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
			for (var i = 0; i < this.dataList.length; i++) {
				var data = this.dataList[i];
				buffer.put(data.mode, 4);
				buffer.put(data.getLength(), util.getLengthInBits(data.mode, typeNumber));
				data.write(buffer);
			}
			if (buffer.getLengthInBits() <= totalDataCount * 8) break;
		}
		this.typeNumber = typeNumber;
	}
	this.makeImpl(false, this.getBestMaskPattern());
};
proto.makeImpl = function(test, maskPattern) {
	this.moduleCount = this.typeNumber * 4 + 17;
	this.modules = new Array(this.moduleCount);
	for (var row = 0; row < this.moduleCount; row++) {
		this.modules[row] = new Array(this.moduleCount);
		for (var col = 0; col < this.moduleCount; col++) this.modules[row][col] = null;
	}
	this.setupPositionProbePattern(0, 0);
	this.setupPositionProbePattern(this.moduleCount - 7, 0);
	this.setupPositionProbePattern(0, this.moduleCount - 7);
	this.setupPositionAdjustPattern();
	this.setupTimingPattern();
	this.setupTypeInfo(test, maskPattern);
	if (this.typeNumber >= 7) this.setupTypeNumber(test);
	if (this.dataCache == null) this.dataCache = QRCode$1.createData(this.typeNumber, this.errorCorrectLevel, this.dataList);
	this.mapData(this.dataCache, maskPattern);
};
proto.setupPositionProbePattern = function(row, col) {
	for (var r = -1; r <= 7; r++) {
		if (row + r <= -1 || this.moduleCount <= row + r) continue;
		for (var c = -1; c <= 7; c++) {
			if (col + c <= -1 || this.moduleCount <= col + c) continue;
			if (0 <= r && r <= 6 && (c == 0 || c == 6) || 0 <= c && c <= 6 && (r == 0 || r == 6) || 2 <= r && r <= 4 && 2 <= c && c <= 4) this.modules[row + r][col + c] = true;
			else this.modules[row + r][col + c] = false;
		}
	}
};
proto.getBestMaskPattern = function() {
	var minLostPoint = 0;
	var pattern = 0;
	for (var i = 0; i < 8; i++) {
		this.makeImpl(true, i);
		var lostPoint = util.getLostPoint(this);
		if (i == 0 || minLostPoint > lostPoint) {
			minLostPoint = lostPoint;
			pattern = i;
		}
	}
	return pattern;
};
proto.createMovieClip = function(target_mc, instance_name, depth) {
	var qr_mc = target_mc.createEmptyMovieClip(instance_name, depth);
	var cs = 1;
	this.make();
	for (var row = 0; row < this.modules.length; row++) {
		var y = row * cs;
		for (var col = 0; col < this.modules[row].length; col++) {
			var x = col * cs;
			if (this.modules[row][col]) {
				qr_mc.beginFill(0, 100);
				qr_mc.moveTo(x, y);
				qr_mc.lineTo(x + cs, y);
				qr_mc.lineTo(x + cs, y + cs);
				qr_mc.lineTo(x, y + cs);
				qr_mc.endFill();
			}
		}
	}
	return qr_mc;
};
proto.setupTimingPattern = function() {
	for (var r = 8; r < this.moduleCount - 8; r++) {
		if (this.modules[r][6] != null) continue;
		this.modules[r][6] = r % 2 == 0;
	}
	for (var c = 8; c < this.moduleCount - 8; c++) {
		if (this.modules[6][c] != null) continue;
		this.modules[6][c] = c % 2 == 0;
	}
};
proto.setupPositionAdjustPattern = function() {
	var pos = util.getPatternPosition(this.typeNumber);
	for (var i = 0; i < pos.length; i++) for (var j = 0; j < pos.length; j++) {
		var row = pos[i];
		var col = pos[j];
		if (this.modules[row][col] != null) continue;
		for (var r = -2; r <= 2; r++) for (var c = -2; c <= 2; c++) if (r == -2 || r == 2 || c == -2 || c == 2 || r == 0 && c == 0) this.modules[row + r][col + c] = true;
		else this.modules[row + r][col + c] = false;
	}
};
proto.setupTypeNumber = function(test) {
	var bits = util.getBCHTypeNumber(this.typeNumber);
	for (var i = 0; i < 18; i++) {
		var mod = !test && (bits >> i & 1) == 1;
		this.modules[Math.floor(i / 3)][i % 3 + this.moduleCount - 8 - 3] = mod;
	}
	for (var i = 0; i < 18; i++) {
		var mod = !test && (bits >> i & 1) == 1;
		this.modules[i % 3 + this.moduleCount - 8 - 3][Math.floor(i / 3)] = mod;
	}
};
proto.setupTypeInfo = function(test, maskPattern) {
	var data = this.errorCorrectLevel << 3 | maskPattern;
	var bits = util.getBCHTypeInfo(data);
	for (var i = 0; i < 15; i++) {
		var mod = !test && (bits >> i & 1) == 1;
		if (i < 6) this.modules[i][8] = mod;
		else if (i < 8) this.modules[i + 1][8] = mod;
		else this.modules[this.moduleCount - 15 + i][8] = mod;
	}
	for (var i = 0; i < 15; i++) {
		var mod = !test && (bits >> i & 1) == 1;
		if (i < 8) this.modules[8][this.moduleCount - i - 1] = mod;
		else if (i < 9) this.modules[8][15 - i - 1 + 1] = mod;
		else this.modules[8][15 - i - 1] = mod;
	}
	this.modules[this.moduleCount - 8][8] = !test;
};
proto.mapData = function(data, maskPattern) {
	var inc = -1;
	var row = this.moduleCount - 1;
	var bitIndex = 7;
	var byteIndex = 0;
	for (var col = this.moduleCount - 1; col > 0; col -= 2) {
		if (col == 6) col--;
		while (true) {
			for (var c = 0; c < 2; c++) if (this.modules[row][col - c] == null) {
				var dark = false;
				if (byteIndex < data.length) dark = (data[byteIndex] >>> bitIndex & 1) == 1;
				if (util.getMask(maskPattern, row, col - c)) dark = !dark;
				this.modules[row][col - c] = dark;
				bitIndex--;
				if (bitIndex == -1) {
					byteIndex++;
					bitIndex = 7;
				}
			}
			row += inc;
			if (row < 0 || this.moduleCount <= row) {
				row -= inc;
				inc = -inc;
				break;
			}
		}
	}
};
QRCode$1.PAD0 = 236;
QRCode$1.PAD1 = 17;
QRCode$1.createData = function(typeNumber, errorCorrectLevel, dataList) {
	var rsBlocks = RSBlock.getRSBlocks(typeNumber, errorCorrectLevel);
	var buffer = new BitBuffer();
	for (var i = 0; i < dataList.length; i++) {
		var data = dataList[i];
		buffer.put(data.mode, 4);
		buffer.put(data.getLength(), util.getLengthInBits(data.mode, typeNumber));
		data.write(buffer);
	}
	var totalDataCount = 0;
	for (var i = 0; i < rsBlocks.length; i++) totalDataCount += rsBlocks[i].dataCount;
	if (buffer.getLengthInBits() > totalDataCount * 8) throw new Error("code length overflow. (" + buffer.getLengthInBits() + ">" + totalDataCount * 8 + ")");
	if (buffer.getLengthInBits() + 4 <= totalDataCount * 8) buffer.put(0, 4);
	while (buffer.getLengthInBits() % 8 != 0) buffer.putBit(false);
	while (true) {
		if (buffer.getLengthInBits() >= totalDataCount * 8) break;
		buffer.put(QRCode$1.PAD0, 8);
		if (buffer.getLengthInBits() >= totalDataCount * 8) break;
		buffer.put(QRCode$1.PAD1, 8);
	}
	return QRCode$1.createBytes(buffer, rsBlocks);
};
QRCode$1.createBytes = function(buffer, rsBlocks) {
	var offset = 0;
	var maxDcCount = 0;
	var maxEcCount = 0;
	var dcdata = new Array(rsBlocks.length);
	var ecdata = new Array(rsBlocks.length);
	for (var r = 0; r < rsBlocks.length; r++) {
		var dcCount = rsBlocks[r].dataCount;
		var ecCount = rsBlocks[r].totalCount - dcCount;
		maxDcCount = Math.max(maxDcCount, dcCount);
		maxEcCount = Math.max(maxEcCount, ecCount);
		dcdata[r] = new Array(dcCount);
		for (var i = 0; i < dcdata[r].length; i++) dcdata[r][i] = 255 & buffer.buffer[i + offset];
		offset += dcCount;
		var rsPoly = util.getErrorCorrectPolynomial(ecCount);
		var modPoly = new Polynomial(dcdata[r], rsPoly.getLength() - 1).mod(rsPoly);
		ecdata[r] = new Array(rsPoly.getLength() - 1);
		for (var i = 0; i < ecdata[r].length; i++) {
			var modIndex = i + modPoly.getLength() - ecdata[r].length;
			ecdata[r][i] = modIndex >= 0 ? modPoly.get(modIndex) : 0;
		}
	}
	var totalCodeCount = 0;
	for (var i = 0; i < rsBlocks.length; i++) totalCodeCount += rsBlocks[i].totalCount;
	var data = new Array(totalCodeCount);
	var index = 0;
	for (var i = 0; i < maxDcCount; i++) for (var r = 0; r < rsBlocks.length; r++) if (i < dcdata[r].length) data[index++] = dcdata[r][i];
	for (var i = 0; i < maxEcCount; i++) for (var r = 0; r < rsBlocks.length; r++) if (i < ecdata[r].length) data[index++] = ecdata[r][i];
	return data;
};
var QRCode_1 = QRCode$1;
var defaultErrorCorrectLevel = "H";
var SUPPORTS_PATH2D = (function() {
	try {
		new Path2D().addPath(new Path2D());
	} catch (e) {
		return false;
	}
	return true;
})();
function QRCode(data, level) {
	var errorCorrectLevel = ErrorCorrectLevel[level];
	var qrcode = new QRCode_1(-1, errorCorrectLevel);
	qrcode.addData(toUTF8String(data));
	qrcode.make();
	return qrcode;
}
function validErrorCorrectLevel(level) {
	return level in ErrorCorrectLevel;
}
/**
* Encode UTF16 to UTF8.
* See: http://jonisalonen.com/2012/from-utf-16-to-utf-8-in-javascript/
* @param str {string}
* @returns {string}
*/
function toUTF8String(str) {
	var utf8Str = "";
	for (var i = 0; i < str.length; i++) {
		var charCode = str.charCodeAt(i);
		if (charCode < 128) utf8Str += String.fromCharCode(charCode);
		else if (charCode < 2048) {
			utf8Str += String.fromCharCode(192 | charCode >> 6);
			utf8Str += String.fromCharCode(128 | charCode & 63);
		} else if (charCode < 55296 || charCode >= 57344) {
			utf8Str += String.fromCharCode(224 | charCode >> 12);
			utf8Str += String.fromCharCode(128 | charCode >> 6 & 63);
			utf8Str += String.fromCharCode(128 | charCode & 63);
		} else {
			i++;
			charCode = 65536 + ((charCode & 1023) << 10 | str.charCodeAt(i) & 1023);
			utf8Str += String.fromCharCode(240 | charCode >> 18);
			utf8Str += String.fromCharCode(128 | charCode >> 12 & 63);
			utf8Str += String.fromCharCode(128 | charCode >> 6 & 63);
			utf8Str += String.fromCharCode(128 | charCode & 63);
		}
	}
	return utf8Str;
}
function generatePath(modules, margin) {
	if (margin === void 0) margin = 0;
	var ops = [];
	modules.forEach(function(row, y) {
		var start = null;
		row.forEach(function(cell, x) {
			if (!cell && start !== null) {
				ops.push("M".concat(start + margin, " ").concat(y + margin, "h").concat(x - start, "v1H").concat(start + margin, "z"));
				start = null;
				return;
			}
			if (x === row.length - 1) {
				if (!cell) return;
				if (start === null) ops.push("M".concat(x + margin, ",").concat(y + margin, " h1v1H").concat(x + margin, "z"));
				else ops.push("M".concat(start + margin, ",").concat(y + margin, " h").concat(x + 1 - start, "v1H").concat(start + margin, "z"));
				return;
			}
			if (cell && start === null) start = x;
		});
	});
	return ops.join("");
}
var QRCodeProps = {
	value: {
		type: String,
		required: true,
		"default": ""
	},
	size: {
		type: Number,
		"default": 100
	},
	level: {
		type: String,
		"default": defaultErrorCorrectLevel,
		validator: function(l) {
			return validErrorCorrectLevel(l);
		}
	},
	background: {
		type: String,
		"default": "#fff"
	},
	foreground: {
		type: String,
		"default": "#000"
	},
	margin: {
		type: Number,
		required: false,
		"default": 0
	}
};
var QRCodeVueProps = __assign(__assign({}, QRCodeProps), { renderAs: {
	type: String,
	required: false,
	"default": "canvas",
	validator: function(as) {
		return ["canvas", "svg"].indexOf(as) > -1;
	}
} });
var QRCodeSvg = defineComponent({
	name: "QRCodeSvg",
	props: QRCodeProps,
	setup: function(props) {
		var numCells = ref(0);
		var fgPath = ref("");
		var generate = function() {
			var value = props.value, level = props.level, margin = props.margin;
			var cells = QRCode(value, level).modules;
			numCells.value = cells.length + margin * 2;
			fgPath.value = generatePath(cells, margin);
		};
		generate();
		onUpdated(generate);
		return function() {
			return h("svg", {
				width: props.size,
				height: props.size,
				"shape-rendering": "crispEdges",
				xmlns: "http://www.w3.org/2000/svg",
				viewBox: "0 0 ".concat(numCells.value, " ").concat(numCells.value)
			}, [h("path", {
				fill: props.background,
				d: "M0,0 h".concat(numCells.value, "v").concat(numCells.value, "H0z")
			}), h("path", {
				fill: props.foreground,
				d: fgPath.value
			})]);
		};
	}
});
var QRCodeCanvas = defineComponent({
	name: "QRCodeCanvas",
	props: QRCodeProps,
	setup: function(props) {
		var canvasEl = ref(null);
		var generate = function() {
			var value = props.value, level = props.level, size = props.size, margin = props.margin, background = props.background, foreground = props.foreground;
			var cells = QRCode(value, level).modules;
			var numCells = cells.length + margin * 2;
			var canvas = canvasEl.value;
			if (!canvas) return;
			var ctx = canvas.getContext("2d");
			if (!ctx) return;
			var devicePixelRatio = window.devicePixelRatio || 1;
			var scale = size / numCells * devicePixelRatio;
			canvas.height = canvas.width = size * devicePixelRatio;
			ctx.scale(scale, scale);
			ctx.fillStyle = background;
			ctx.fillRect(0, 0, numCells, numCells);
			ctx.fillStyle = foreground;
			if (SUPPORTS_PATH2D) ctx.fill(new Path2D(generatePath(cells, margin)));
			else cells.forEach(function(row, rdx) {
				row.forEach(function(cell, cdx) {
					if (cell) ctx.fillRect(cdx + margin, rdx + margin, 1, 1);
				});
			});
		};
		onMounted(generate);
		onUpdated(generate);
		return function() {
			return h("canvas", {
				ref: canvasEl,
				style: {
					width: "".concat(props.size, "px"),
					height: "".concat(props.size, "px")
				}
			});
		};
	}
});
var QrcodeVue = defineComponent({
	name: "Qrcode",
	render: function() {
		var _a = this.$props, renderAs = _a.renderAs, value = _a.value, _size = _a.size, _margin = _a.margin, _level = _a.level, background = _a.background, foreground = _a.foreground;
		var size = _size >>> 0;
		var margin = _margin >>> 0;
		var level = validErrorCorrectLevel(_level) ? _level : defaultErrorCorrectLevel;
		return h(renderAs === "svg" ? QRCodeSvg : QRCodeCanvas, {
			value,
			size,
			margin,
			level,
			background,
			foreground
		});
	},
	props: QRCodeVueProps
});
//#endregion
//#region src/features/core/auth/components/MfaSetupModal.vue?vue&type=script&setup=true&lang.ts
init_runtime_core_esm_bundler(), init_reactivity_esm_bundler(), init_shared_esm_bundler(), init_runtime_dom_esm_bundler();
var _hoisted_1 = { key: "setup" };
var QR_CODE_SIZE = 160;
var SECRET_GROUP_SIZE = 4;
var COPY_FEEDBACK_DURATION_MS = 2e3;
var MfaSetupModal_default = /*#__PURE__*/ _plugin_vue_export_helper_default(/* @__PURE__ */ defineComponent({
	inheritAttrs: false,
	__name: "MfaSetupModal",
	setup(__props) {
		const secret = ref("");
		const qrCode = ref("");
		const showRecoveryCodes = ref(false);
		const recoveryCodes = ref([]);
		const recoveryCodesSaved = ref(false);
		const authenticatorCode = ref("");
		const codeError = ref("");
		const verifyingCode = ref(false);
		const enablingMfa = ref(false);
		const copiedTarget = ref();
		const loadingQrCode = ref(true);
		const codeInput = ref(null);
		const downloadButton = ref(null);
		const steps = useTemplateRef("steps");
		const recoveryStep = useTemplateRef("recoveryStep");
		const stepsHeight = ref();
		const clipboard = useClipboard();
		const uiStore = useUIStore();
		const userStore = useUsersStore();
		const settingsStore = useSettingsStore();
		const i18n = useI18n();
		const toast = useToast();
		const secretGroups = computed(() => secret.value.match(new RegExp(`.{1,${SECRET_GROUP_SIZE}}`, "g")) ?? []);
		const isCodeComplete = computed(() => new RegExp(`^\\d{6}$`).test(authenticatorCode.value));
		const secretCopyLabel = computed(() => copiedTarget.value === "secret" ? i18n.baseText("mfa.setup.step1.toast.copyToClipboard.title") : i18n.baseText("mfa.setup.step1.secret.copy"));
		const closeDialog = () => {
			uiStore.closeModal(MFA_SETUP_MODAL_KEY);
		};
		const onOpenChange = (open) => {
			if (!open) closeDialog();
		};
		const onOpenAutoFocus = (event) => {
			event.preventDefault();
			codeInput.value?.focus();
		};
		let copiedToast;
		let copyFeedbackTimer;
		const copyToClipboard = async (target, value, title) => {
			await clipboard.copy(value);
			copiedTarget.value = target;
			clearTimeout(copyFeedbackTimer);
			copyFeedbackTimer = setTimeout(() => {
				copiedTarget.value = void 0;
			}, COPY_FEEDBACK_DURATION_MS);
			copiedToast?.close();
			copiedToast = toast.showMessage({
				title,
				type: "success",
				showClose: false
			});
		};
		const copySecret = async () => {
			await copyToClipboard("secret", secret.value, i18n.baseText("mfa.setup.step1.toast.copyToClipboard.title"));
		};
		const onSecretClick = async () => {
			if (window.getSelection()?.toString()) return;
			await copySecret();
		};
		/**
		* The two steps differ in height. The wrapper is pinned to its current height, then to the next
		* step's height, so the dialog glides between them while the steps blur-swap (the same technique
		* as N8nCodeBlock). The pin is released once the next step has entered.
		*/
		const showRecoveryCodesStep = async () => {
			const wrapper = steps.value;
			if (wrapper) {
				stepsHeight.value = `${wrapper.getBoundingClientRect().height}px`;
				await nextTick();
				wrapper.offsetHeight;
			}
			showRecoveryCodes.value = true;
			await nextTick();
			if (recoveryStep.value) stepsHeight.value = `${recoveryStep.value.getBoundingClientRect().height}px`;
			downloadButton.value?.$el.focus();
		};
		const onStepEntered = () => {
			stepsHeight.value = void 0;
		};
		const onContinueClick = async () => {
			if (!isCodeComplete.value || verifyingCode.value) return;
			verifyingCode.value = true;
			try {
				await userStore.verifyMfaCode({ mfaCode: authenticatorCode.value });
				await showRecoveryCodesStep();
			} catch {
				codeError.value = i18n.baseText("mfa.setup.invalidCode");
			} finally {
				verifyingCode.value = false;
			}
		};
		const onDownloadClick = () => {
			const filename = "n8n-recovery-codes.txt";
			const temporalElement = document.createElement("a");
			temporalElement.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(recoveryCodes.value.join("\n")));
			temporalElement.setAttribute("download", filename);
			temporalElement.style.display = "none";
			document.body.appendChild(temporalElement);
			temporalElement.click();
			document.body.removeChild(temporalElement);
			recoveryCodesSaved.value = true;
		};
		const onCopyRecoveryCodesClick = async () => {
			await copyToClipboard("recoveryCodes", recoveryCodes.value.join("\n"), i18n.baseText("mfa.setup.step2.toast.copyToClipboard.title"));
			recoveryCodesSaved.value = true;
		};
		const onSetupClick = async () => {
			if (!recoveryCodesSaved.value || enablingMfa.value) return;
			enablingMfa.value = true;
			try {
				await userStore.enableMfa({ mfaCode: authenticatorCode.value });
				closeDialog();
				toast.showMessage({
					type: "success",
					title: i18n.baseText("mfa.setup.step2.toast.setupFinished.message")
				});
				if (settingsStore.isMFAEnforced) {
					await userStore.logout();
					await router.push({ name: VIEWS.SIGNIN });
				}
			} catch (e) {
				if (e.errorCode === 997) {
					toast.showMessage({
						type: "error",
						title: i18n.baseText("mfa.setup.step2.toast.tokenExpired.error.message")
					});
					return;
				}
				toast.showMessage({
					type: "error",
					title: i18n.baseText("mfa.setup.step2.toast.setupFinished.error.message")
				});
			} finally {
				enablingMfa.value = false;
			}
		};
		const getMfaQR = async () => {
			try {
				const response = await userStore.fetchMfaQR();
				qrCode.value = response.qrCode;
				secret.value = response.secret;
				recoveryCodes.value = response.recoveryCodes;
			} catch (error) {
				toast.showError(error, i18n.baseText("settings.api.view.error"));
			} finally {
				loadingQrCode.value = false;
			}
		};
		watch(authenticatorCode, () => {
			codeError.value = "";
		});
		onMounted(async () => {
			await getMfaQR();
		});
		onBeforeUnmount(() => clearTimeout(copyFeedbackTimer));
		return (_ctx, _cache) => {
			return openBlock(), createBlock(unref(Dialog_default), {
				open: true,
				header: !showRecoveryCodes.value ? unref(i18n).baseText("mfa.setup.step1.title") : unref(i18n).baseText("mfa.setup.step2.title"),
				size: "medium",
				"container-class": _ctx.$style.dialog,
				"onUpdate:open": onOpenChange,
				onOpenAutoFocus
			}, {
				default: withCtx(() => [createBaseVNode("div", {
					ref_key: "steps",
					ref: steps,
					class: normalizeClass([_ctx.$style.steps, { [_ctx.$style.stepsResizing]: stepsHeight.value }]),
					style: normalizeStyle({ height: stepsHeight.value }),
					"data-test-id": "mfaSetup-modal"
				}, [createVNode(Transition, {
					"enter-active-class": _ctx.$style.stepEnterActive,
					"leave-active-class": _ctx.$style.stepLeaveActive,
					onAfterEnter: onStepEntered
				}, {
					default: withCtx(() => [!showRecoveryCodes.value ? (openBlock(), createElementBlock("div", _hoisted_1, [createVNode(unref(DialogBody_default), null, {
						default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.setup) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.scan) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.scanHeader) }, [createVNode(unref(N8nText_default), {
							tag: "h3",
							size: "medium",
							bold: ""
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("mfa.setup.step1.instruction1.title")), 1)]),
							_: 1
						}), createVNode(unref(N8nText_default), {
							tag: "p",
							size: "small",
							color: "text-light"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("mfa.setup.step1.instruction1.description")), 1)]),
							_: 1
						})], 2), createBaseVNode("div", { class: normalizeClass([_ctx.$style.inset, _ctx.$style.qrCode]) }, [createBaseVNode("div", { class: normalizeClass(_ctx.$style.qrFrame) }, [createVNode(Transition, {
							"enter-active-class": _ctx.$style.swapEnterActive,
							"leave-active-class": _ctx.$style.qrLoadingLeaveActive
						}, {
							default: withCtx(() => [loadingQrCode.value ? (openBlock(), createBlock(unref(N8nLoading_default), {
								key: 0,
								variant: "rect",
								class: normalizeClass(_ctx.$style.qrLoading),
								style: normalizeStyle({
									width: `${QR_CODE_SIZE}px`,
									height: `${QR_CODE_SIZE}px`
								})
							}, null, 8, ["class", "style"])) : (openBlock(), createBlock(QrcodeVue, {
								key: 1,
								value: qrCode.value,
								size: QR_CODE_SIZE,
								level: "H",
								"render-as": "svg"
							}, null, 8, ["value"]))]),
							_: 1
						}, 8, ["enter-active-class", "leave-active-class"])], 2), createBaseVNode("div", { class: normalizeClass(_ctx.$style.secret) }, [createVNode(Transition, { "enter-active-class": _ctx.$style.swapEnterActive }, {
							default: withCtx(() => [secret.value ? (openBlock(), createElementBlock("div", {
								key: 0,
								class: normalizeClass(_ctx.$style.secretContent)
							}, [createBaseVNode("span", {
								class: normalizeClass(_ctx.$style.secretKey),
								"data-test-id": "mfa-secret",
								onClick: onSecretClick
							}, [(openBlock(true), createElementBlock(Fragment, null, renderList(secretGroups.value, (group, index) => {
								return openBlock(), createElementBlock("span", { key: index }, toDisplayString(group), 1);
							}), 128))], 2), createVNode(unref(N8nTooltip_default), { content: secretCopyLabel.value }, {
								default: withCtx(() => [createVNode(unref(N8nButton_default), {
									variant: "ghost",
									size: "small",
									"icon-only": "",
									"aria-label": secretCopyLabel.value,
									"data-test-id": "mfa-secret-button",
									onClick: copySecret
								}, {
									icon: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.iconSwap) }, [createVNode(Transition, {
										"enter-active-class": _ctx.$style.swapEnterActive,
										"leave-active-class": _ctx.$style.swapLeaveActive
									}, {
										default: withCtx(() => [copiedTarget.value === "secret" ? (openBlock(), createBlock(unref(N8nIcon_default), {
											key: "check",
											icon: "check",
											size: "small"
										})) : (openBlock(), createBlock(unref(N8nIcon_default), {
											key: "copy",
											icon: "copy",
											size: "small"
										}))]),
										_: 1
									}, 8, ["enter-active-class", "leave-active-class"])], 2)]),
									_: 1
								}, 8, ["aria-label"])]),
								_: 1
							}, 8, ["content"])], 2)) : createCommentVNode("", true)]),
							_: 1
						}, 8, ["enter-active-class"])], 2)], 2)], 2), createBaseVNode("div", { class: normalizeClass([_ctx.$style.code, { [_ctx.$style.codeInvalid]: codeError.value }]) }, [createVNode(unref(N8nInputLabel_default), {
							"input-name": "mfa-setup-code",
							label: unref(i18n).baseText("mfa.setup.step1.instruction2.title")
						}, {
							default: withCtx(() => [createVNode(unref(Input_default), {
								id: "mfa-setup-code",
								ref_key: "codeInput",
								ref: codeInput,
								modelValue: authenticatorCode.value,
								"onUpdate:modelValue": _cache[0] || (_cache[0] = ($event) => authenticatorCode.value = $event),
								size: "medium",
								maxlength: unref(6),
								autocomplete: "one-time-code",
								placeholder: unref(i18n).baseText("mfa.setup.step1.input.placeholder"),
								"aria-invalid": Boolean(codeError.value),
								"aria-describedby": codeError.value ? "mfa-setup-code-error" : void 0,
								"data-test-id": "mfa-token-input",
								onKeydown: withKeys(onContinueClick, ["enter"])
							}, null, 8, [
								"modelValue",
								"maxlength",
								"placeholder",
								"aria-invalid",
								"aria-describedby"
							])]),
							_: 1
						}, 8, ["label"]), codeError.value ? (openBlock(), createBlock(unref(N8nText_default), {
							key: 0,
							id: "mfa-setup-code-error",
							size: "small",
							color: "danger",
							role: "alert"
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(codeError.value), 1)]),
							_: 1
						})) : createCommentVNode("", true)], 2)], 2)]),
						_: 1
					}), createVNode(unref(DialogFooter_default), null, {
						default: withCtx(() => [createVNode(unref(N8nButton_default), {
							disabled: !isCodeComplete.value,
							loading: verifyingCode.value,
							"data-test-id": "mfa-continue-button",
							onClick: onContinueClick
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("mfa.setup.step1.button.continue")), 1)]),
							_: 1
						}, 8, ["disabled", "loading"])]),
						_: 1
					})])) : (openBlock(), createElementBlock("div", {
						key: "recovery",
						ref_key: "recoveryStep",
						ref: recoveryStep,
						class: normalizeClass(_ctx.$style.recovery)
					}, [createVNode(unref(DialogBody_default), null, {
						default: withCtx(() => [createVNode(unref(DialogDescription_default), null, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("mfa.setup.step2.description")), 1)]),
							_: 1
						}), createBaseVNode("ul", {
							class: normalizeClass([_ctx.$style.inset, _ctx.$style.recoveryCodes]),
							"data-test-id": "mfa-recovery-codes"
						}, [(openBlock(true), createElementBlock(Fragment, null, renderList(recoveryCodes.value, (recoveryCode) => {
							return openBlock(), createElementBlock("li", { key: recoveryCode }, toDisplayString(recoveryCode), 1);
						}), 128))], 2)]),
						_: 1
					}), createVNode(unref(DialogFooter_default), null, {
						default: withCtx(() => [createBaseVNode("div", { class: normalizeClass(_ctx.$style.saveActions) }, [createVNode(unref(N8nButton_default), {
							variant: "outline",
							"data-test-id": "mfa-recovery-codes-copy-button",
							onClick: onCopyRecoveryCodesClick
						}, {
							icon: withCtx(() => [createBaseVNode("span", { class: normalizeClass(_ctx.$style.iconSwap) }, [createVNode(Transition, {
								"enter-active-class": _ctx.$style.swapEnterActive,
								"leave-active-class": _ctx.$style.swapLeaveActive
							}, {
								default: withCtx(() => [copiedTarget.value === "recoveryCodes" ? (openBlock(), createBlock(unref(N8nIcon_default), {
									key: "check",
									icon: "check"
								})) : (openBlock(), createBlock(unref(N8nIcon_default), {
									key: "copy",
									icon: "copy"
								}))]),
								_: 1
							}, 8, ["enter-active-class", "leave-active-class"])], 2)]),
							default: withCtx(() => [createTextVNode(" " + toDisplayString(unref(i18n).baseText("mfa.setup.step2.button.copy")), 1)]),
							_: 1
						}), createVNode(unref(N8nButton_default), {
							ref_key: "downloadButton",
							ref: downloadButton,
							variant: "outline",
							"data-test-id": "mfa-recovery-codes-button",
							onClick: onDownloadClick
						}, {
							icon: withCtx(() => [createVNode(unref(N8nIcon_default), { icon: "arrow-circle-down" })]),
							default: withCtx(() => [createTextVNode(" " + toDisplayString(unref(i18n).baseText("mfa.setup.step2.button.download")), 1)]),
							_: 1
						}, 512)], 2), createVNode(unref(N8nButton_default), {
							disabled: !recoveryCodesSaved.value,
							loading: enablingMfa.value,
							"data-test-id": "mfa-save-button",
							onClick: onSetupClick
						}, {
							default: withCtx(() => [createTextVNode(toDisplayString(unref(i18n).baseText("mfa.setup.step2.button.enable")), 1)]),
							_: 1
						}, 8, ["disabled", "loading"])]),
						_: 1
					})], 2))]),
					_: 1
				}, 8, ["enter-active-class", "leave-active-class"])], 6)]),
				_: 1
			}, 8, ["header", "container-class"]);
		};
	}
}), [["__cssModules", { "$style": {
	dialog: "_dialog_1rcun_453",
	steps: "_steps_1rcun_458",
	stepsResizing: "_stepsResizing_1rcun_463",
	stepEnterActive: "_stepEnterActive_1rcun_475",
	blurSwapIn: "_blurSwapIn_1rcun_1",
	stepLeaveActive: "_stepLeaveActive_1rcun_485",
	blurSwapOut: "_blurSwapOut_1rcun_1",
	setup: "_setup_1rcun_496",
	scan: "_scan_1rcun_503",
	scanHeader: "_scanHeader_1rcun_509",
	inset: "_inset_1rcun_518",
	qrCode: "_qrCode_1rcun_528",
	qrFrame: "_qrFrame_1rcun_537",
	qrLoading: "_qrLoading_1rcun_548",
	qrLoadingLeaveActive: "_qrLoadingLeaveActive_1rcun_554",
	secret: "_secret_1rcun_565",
	secretContent: "_secretContent_1rcun_573",
	secretKey: "_secretKey_1rcun_584",
	code: "_code_1rcun_596",
	codeInvalid: "_codeInvalid_1rcun_607",
	recovery: "_recovery_1rcun_614",
	recoveryCodes: "_recoveryCodes_1rcun_618",
	saveActions: "_saveActions_1rcun_631",
	iconSwap: "_iconSwap_1rcun_637",
	swapEnterActive: "_swapEnterActive_1rcun_645",
	swapLeaveActive: "_swapLeaveActive_1rcun_654",
	shimmer: "_shimmer_1rcun_1",
	spin: "_spin_1rcun_1",
	"skeleton-pulse": "_skeleton-pulse_1rcun_1",
	opacityPulse: "_opacityPulse_1rcun_1",
	popoverIn: "_popoverIn_1rcun_1",
	fadeIn: "_fadeIn_1rcun_1",
	collapsibleSlideDown: "_collapsibleSlideDown_1rcun_1",
	collapsibleSlideUp: "_collapsibleSlideUp_1rcun_1",
	collapsibleSlideDownBlurred: "_collapsibleSlideDownBlurred_1rcun_1",
	collapsibleSlideUpBlurred: "_collapsibleSlideUpBlurred_1rcun_1",
	pulse: "_pulse_1rcun_1",
	pulseGlow: "_pulseGlow_1rcun_1",
	pulseGlowDelayed: "_pulseGlowDelayed_1rcun_1",
	fade: "_fade_1rcun_1",
	fadeInUp: "_fadeInUp_1rcun_1",
	fadeInDown: "_fadeInDown_1rcun_1",
	fadeInLeft: "_fadeInLeft_1rcun_1",
	fadeInRight: "_fadeInRight_1rcun_1",
	fadeOut: "_fadeOut_1rcun_1",
	fadeOutDown: "_fadeOutDown_1rcun_1",
	fadeOutUp: "_fadeOutUp_1rcun_1",
	fadeOutLeft: "_fadeOutLeft_1rcun_1",
	fadeOutRight: "_fadeOutRight_1rcun_1",
	ping: "_ping_1rcun_1",
	blinkBackground: "_blinkBackground_1rcun_1",
	typingBlink: "_typingBlink_1rcun_1"
} }]]);
//#endregion
export { MfaSetupModal_default as default };
