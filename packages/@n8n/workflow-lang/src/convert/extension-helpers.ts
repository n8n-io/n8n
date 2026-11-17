/**
 * Helpers for n8n's expression extensions (`packages/workflow/src/extensions`): each helper
 * is the extension for every type of the receiver, as `extend` of v1 finds it. `extend` looks
 * at the type in this order: an array, text that is an ISO date (the Date extensions), text,
 * a number, a DateTime, another object, a boolean. A type without the extension has the
 * error of v1, which stops the node (an `ExpressionExtensionError` is not a null value).
 */

interface HelperSource {
	uses: string[];
	source: string;
}

/**
 * The currency signs that `toNumber` of v1 takes out of text (`CURRENCY_REGEXP`), in the
 * order of the alternatives of its regular expression: the first one that matches wins.
 */
const CURRENCY_SIGNS = [
	'Lek',
	'؋',
	'$',
	'ƒ',
	'₼',
	'Br',
	'BZ$',
	'$b',
	'KM',
	'P',
	'лв',
	'R$',
	'៛',
	'¥',
	'₡',
	'kn',
	'₱',
	'Kč',
	'kr',
	'RD$',
	'£',
	'€',
	'¢',
	'Q',
	'L',
	'Ft',
	'₹',
	'Rp',
	'﷼',
	'₪',
	'J$',
	'₩',
	'₭',
	'ден',
	'RM',
	'₨',
	'₮',
	'MT',
	'C$',
	'₦',
	'B/.',
	'Gs',
	'S/.',
	'zł',
	'lei',
	'₽',
	'Дин.',
	'S',
	'R',
	'CHF',
	'NT$',
	'฿',
	'TT$',
	'₺',
	'₴',
	'$U',
	'Bs',
	'₫',
	'Z$',
];

/** The name of the helper of each extension that has one, and the number of its arguments. */
export const EXTENSION_HELPERS: Record<string, { helper: string; args: number }> = {
	isEmpty: { helper: 'extIsEmpty', args: 0 },
	isNotEmpty: { helper: 'extIsNotEmpty', args: 0 },
	toJsonString: { helper: 'extToJsonString', args: 0 },
	first: { helper: 'extFirst', args: 0 },
	last: { helper: 'extLast', args: 0 },
	toNumber: { helper: 'extToNumber', args: 0 },
	parseJson: { helper: 'extParseJson', args: 0 },
	length: { helper: 'extLength', args: 0 },
	hasField: { helper: 'extHasField', args: 1 },
	toBoolean: { helper: 'extToBoolean', args: 0 },
};

/** The names of the helpers of `EXTENSION_HELPERS`. */
export const EXTENSION_HELPER_NAMES = new Set(
	Object.values(EXTENSION_HELPERS).map((e) => e.helper),
);

export const EXTENSION_HELPER_SOURCES: Record<string, HelperSource> = {
	extKind: {
		uses: [],
		source: `/**
 * The type of a receiver of an expression extension, in the order of \`extend\` of v1. Text
 * that \`toISOString\` of a date gives is a date there.
 */
function extKind(v: Json): string {
	if (Array.isArray(v)) return 'array';
	if (typeof v === 'string') {
		const size = v.length;
		if (size >= 24 && v.charCodeAt(size - 1) === 90 && v.charCodeAt(size - 14) === 84) {
			const time = Date.parse(v);
			if (!isNaN(time) && new Date(time).toISOString() === v) return 'date';
		}
		return 'string';
	}
	if (typeof v === 'number') return 'number';
	if (v !== null && typeof v === 'object') return v.$lux === true ? 'date' : 'object';
	if (typeof v === 'boolean') return 'boolean';
	return 'none';
}`,
	},
	extFail: {
		uses: [],
		source: `/** The error of v1 for an extension that the type of the receiver does not have. */
function extFail(name: string, v: Json, types: string): Json {
	if (v === undefined || v === null) {
		throw {
			name: 'ExpressionExtensionError',
			message: name + " can't be used on " + String(v) + ' value',
			description: 'To ignore this error, add a ? to the variable before this function, e.g. my_var?.' + name,
		};
	}
	throw { name: 'ExpressionExtensionError', message: name + '() is only callable on ' + types, description: '' };
}`,
	},
	extIsEmpty: {
		uses: ['extKind'],
		source: `/** \`value.isEmpty()\` of n8n's expression extensions. */
function extIsEmpty(v: Json): boolean {
	const kind = extKind(v);
	if (kind === 'array') return v.length === 0;
	if (kind === 'date') return false;
	if (kind === 'string') return v === '';
	if (kind === 'object') {
		// A Set, a Map and a regular expression have no keys of their own in JavaScript.
		if (v.$coll !== undefined || v.$regexp === true) return true;
		return Object.keys(v).length === 0;
	}
	return !v;
}`,
	},
	extIsNotEmpty: {
		uses: ['extIsEmpty'],
		source: `/** \`value.isNotEmpty()\` of n8n's expression extensions. */
function extIsNotEmpty(v: Json): boolean {
	return !extIsEmpty(v);
}`,
	},
	extToJsonString: {
		uses: ['extKind', 'extFail'],
		source: `/** \`value.toJsonString()\` of n8n's expression extensions: an array, an object and text have it. */
function extToJsonString(v: Json): Json {
	const kind = extKind(v);
	if (kind === 'object' && (v.$coll !== undefined || v.$regexp === true)) return '{}';
	if (kind === 'array' || kind === 'string' || kind === 'object') return JSON.stringify(v);
	return extFail('toJsonString', v, 'types "Array", "Object", and "String"');
}`,
	},
	extFirst: {
		uses: ['extFail'],
		source: `/** \`array.first()\` of n8n's expression extensions. */
function extFirst(v: Json): Json {
	if (Array.isArray(v)) return v[0];
	return extFail('first', v, 'type "Array"');
}`,
	},
	extLast: {
		uses: ['extFail'],
		source: `/** \`array.last()\` of n8n's expression extensions. */
function extLast(v: Json): Json {
	if (Array.isArray(v)) return v[v.length - 1];
	return extFail('last', v, 'type "Array"');
}`,
	},
	extStripCurrency: {
		uses: [],
		source: `/** Text without the currency signs that v1 takes out before it reads a number. */
function extStripCurrency(text: string): string {
	const signs: string[] = ${JSON.stringify(CURRENCY_SIGNS)};
	let out = '';
	let k = 0;
	while (k < text.length) {
		let skip = 0;
		for (const sign of signs) {
			if (text.startsWith(sign, k)) {
				skip = sign.length;
				break;
			}
		}
		if (skip > 0) k += skip;
		else {
			out += text.charAt(k);
			k++;
		}
	}
	return out;
}`,
	},
	extToNumber: {
		uses: ['extKind', 'extFail', 'extStripCurrency'],
		source: `/** \`value.toNumber()\` of n8n's expression extensions: text and a boolean have it. */
function extToNumber(v: Json): Json {
	const kind = extKind(v);
	if (kind === 'string') {
		// Text that is a number already has no currency sign.
		const plain = Number(v);
		const n = isNaN(plain) || v.includes('$') ? Number(extStripCurrency(v)) : plain;
		if (isNaN(n)) throw { name: 'ExpressionExtensionError', message: 'cannot convert to number', description: '' };
		return n;
	}
	if (kind === 'boolean') return v ? 1 : 0;
	return extFail('toNumber', v, 'types "String", and "Boolean"');
}`,
	},
	extParseJson: {
		uses: ['extKind', 'extFail'],
		source: `/** \`text.parseJson()\` of n8n's expression extensions. */
function extParseJson(v: Json): Json {
	if (extKind(v) !== 'string') return extFail('parseJson', v, 'type "String"');
	try {
		return JSON.parse(v);
	} catch (error) {
		throw {
			name: 'ExpressionExtensionError',
			message: v.includes("'") ? "Parsing failed. Check you're using double quotes" : 'Parsing failed',
			description: '',
		};
	}
}`,
	},
	extLength: {
		uses: ['extKind', 'extFail'],
		source: `/** \`text.length()\` of n8n's expression extensions. */
function extLength(v: Json): Json {
	if (extKind(v) === 'string') return v.length;
	return extFail('length', v, 'type "String"');
}`,
	},
	extHasField: {
		uses: ['extKind', 'extFail'],
		source: `/** \`object.hasField(name)\` of n8n's expression extensions: \`name in object\`. */
function extHasField(v: Json, name: Json): Json {
	if (extKind(v) !== 'object') return extFail('hasField', v, 'type "Object"');
	const key = String(name);
	if (Object.keys(v).includes(key)) return true;
	// The names that every object has from its prototype.
	return [
		'constructor',
		'hasOwnProperty',
		'isPrototypeOf',
		'propertyIsEnumerable',
		'toLocaleString',
		'toString',
		'valueOf',
		'__defineGetter__',
		'__defineSetter__',
		'__lookupGetter__',
		'__lookupSetter__',
		'__proto__',
	].includes(key);
}`,
	},
	extToBoolean: {
		uses: ['extKind', 'extFail'],
		source: `/** \`value.toBoolean()\` of n8n's expression extensions. */
function extToBoolean(v: Json): Json {
	const kind = extKind(v);
	if (kind === 'string') {
		const text: string = v.toLowerCase();
		return text.length > 0 && text !== 'false' && text !== 'no' && text !== '0';
	}
	if (kind === 'number') return v !== 0;
	if (kind === 'boolean') return v;
	if (kind === 'none') return extFail('toBoolean', v, '');
	return undefined;
}`,
	},
};
