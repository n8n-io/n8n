/** Instruction set of the module format (spec section 3.5). */
export const Op = {
	NOP: 0,
	LOADK: 1,
	LOADS: 2,
	LOADI: 3,
	LOADUNDEF: 4,
	LOADNULL: 5,
	LOADBOOL: 6,
	MOV: 7,
	ADD: 8,
	SUB: 9,
	MUL: 10,
	DIV: 11,
	MOD: 12,
	POW: 13,
	BAND: 14,
	BOR: 15,
	BXOR: 16,
	SHL: 17,
	SHR: 18,
	USHR: 19,
	NEG: 20,
	TONUM: 21,
	BNOT: 22,
	NOT: 23,
	TYPEOF: 24,
	TOSTR: 25,
	SEQ: 26,
	SNE: 27,
	LT: 28,
	LE: 29,
	GT: 30,
	GE: 31,
	ISNULLISH: 32,
	JMP: 33,
	JT: 34,
	JF: 35,
	JNULLISH: 36,
	NEWOBJ: 40,
	NEWARR: 41,
	GETPROP: 42,
	SETPROP: 43,
	GETELEM: 44,
	SETELEM: 45,
	DELPROP: 46,
	HASPROP: 47,
	PUSH: 48,
	SPREADARR: 49,
	SPREADOBJ: 50,
	CLOSURE: 55,
	GETCAP: 56,
	NEWCELL: 57,
	GETCELL: 58,
	SETCELL: 59,
	CALL: 60,
	CALLM: 61,
	CALLN: 62,
	RET: 63,
	THROW: 64,
	NEWERR: 65,
	SUSPEND: 70,
	FORK: 71,
	JOIN: 72,
	NOW: 73,
	RANDOM: 74,
	TRACE: 75,
	EXEC: 76,
	VARS: 77,
} as const;

export type OpName = keyof typeof Op;

export const OP_NAMES: Record<number, OpName> = Object.fromEntries(
	Object.entries(Op).map(([name, code]) => [code, name]),
) as Record<number, OpName>;

export const JUMP_OPS: ReadonlySet<number> = new Set([Op.JMP, Op.JT, Op.JF, Op.JNULLISH]);

/** Effect kinds (spec section 1.2). */
export const EffectKind = {
	node: 0,
	http: 1,
	code: 2,
	wait: 3,
	approval: 4,
	respond: 5,
	service: 6,
} as const;

export type EffectKindName = keyof typeof EffectKind;

export const EFFECT_KIND_NAMES: EffectKindName[] = [
	'node',
	'http',
	'code',
	'wait',
	'approval',
	'respond',
	'service',
];

/** Library functions that CALLN can name (spec section 4.3). */
export const LIBRARY_FUNCTIONS: ReadonlySet<string> = new Set([
	'Math.floor',
	'Math.ceil',
	'Math.round',
	'Math.trunc',
	'Math.abs',
	'Math.min',
	'Math.max',
	'Math.pow',
	'Math.sqrt',
	'Math.sign',
	'Math.log',
	'Math.exp',
	'JSON.stringify',
	'JSON.parse',
	'Object.keys',
	'Object.values',
	'Object.entries',
	'Object.assign',
	'Array.isArray',
	'Number',
	'String',
	'Boolean',
	'parseInt',
	'parseFloat',
	'isNaN',
	'Number.isInteger',
	'Number.isFinite',
	'RegExp.exec',
	// Text codecs (spec section 4.3): UTF-8 base64 is btoa(unescape(encodeURIComponent(s))).
	'btoa',
	'atob',
	'encodeURI',
	'encodeURIComponent',
	'decodeURIComponent',
	'escape',
	'unescape',
	// XML for library nodes (spec section 4.3): xml2js and rss-parser helpers.
	'XML.parse',
	'XML.snippet',
	'XML.content',
	// ASCII checks for library nodes (spec section 4.3), in place of charCodeAt loops.
	'Ascii.is',
	'Ascii.isPrintable',
	// btoa(unescape(encodeURIComponent(text))) in one pass (spec section 4.3).
	'Base64.encodeUtf8',
]);

export const STRING_METHODS: ReadonlySet<string> = new Set([
	'toUpperCase',
	'toLowerCase',
	'trim',
	'trimStart',
	'trimEnd',
	'startsWith',
	'endsWith',
	'includes',
	'indexOf',
	'slice',
	'substring',
	'split',
	'replace',
	'replaceAll',
	'padStart',
	'padEnd',
	'repeat',
	'charAt',
	'charCodeAt',
	'concat',
	'at',
	'normalize',
	'localeCompare',
]);

export const ARRAY_METHODS: ReadonlySet<string> = new Set([
	'push',
	'pop',
	'shift',
	'unshift',
	'slice',
	'concat',
	'join',
	'includes',
	'indexOf',
	'reverse',
	'sort',
	'at',
	'flat',
]);

export const NUMBER_METHODS: ReadonlySet<string> = new Set(['toFixed', 'toString']);

/** Higher-order array methods that the prelude implements (spec section 4.1). */
export const PRELUDE_METHODS: ReadonlySet<string> = new Set([
	'map',
	'filter',
	'forEach',
	'reduce',
	'some',
	'every',
	'find',
	'findIndex',
	'flatMap',
]);

/** Constants that the compiler folds. They need no run-time support. */
export const CONSTANTS: ReadonlyMap<string, number> = new Map([
	['Math.PI', Math.PI],
	['Math.E', Math.E],
	['Number.MAX_SAFE_INTEGER', Number.MAX_SAFE_INTEGER],
	['Number.MIN_SAFE_INTEGER', Number.MIN_SAFE_INTEGER],
	['Number.EPSILON', Number.EPSILON],
	['NaN', Number.NaN],
	['Infinity', Number.POSITIVE_INFINITY],
]);

export const MAGIC = 0x4d57384e;
export const FORMAT_VERSION = 1;
export const HEADER_SIZE = 48;
export const NO_INDEX = 0xffffffff;

export const Section = {
	STRINGS: 1,
	NUMBERS: 2,
	FUNCTIONS: 3,
	CODE: 4,
	TRIES: 5,
	STEPS: 6,
	SUSPENDS: 7,
	PATHS: 8,
	META: 9,
} as const;
