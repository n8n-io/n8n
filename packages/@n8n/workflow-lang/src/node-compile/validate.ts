export interface FieldCheck {
	type: string;
	label: string;
	options?: unknown[];
}

export interface ParameterValidation {
	type: string;
	label: string;
	own?: FieldCheck;
	members?: Record<string, FieldCheck>;
	groups?: Record<string, Record<string, FieldCheck>>;
	mapper?: { adds: boolean; conversions: boolean; strings: boolean };
}

export type ValidationPlan = { refuse: string } | { helper: string; args: unknown[] } | undefined;

export const VALIDATION_HELPERS: Record<string, string> = {
	__validText: `function __validText(value: any): string {
	if (typeof value === 'string') return value;
	if (value === null) return 'null';
	if (value === undefined) return 'undefined';
	if (Array.isArray(value)) {
		let out: string = '';
		for (let k = 0; k < value.length; k++) {
			if (k > 0) out += ',';
			if (value[k] !== null && value[k] !== undefined) out += __validText(value[k]);
		}
		return out;
	}
	if (typeof value === 'object') return '[object Object]';
	return String(value);
}`,
	__validGiven: `function __validGiven(value: any): string {
	if (value === null) return "'null'";
	if (Array.isArray(value)) return 'array';
	if (typeof value === 'object') return 'object';
	return "'" + __validText(value) + "'";
}`,
	__validNumber: `function __validNumber(value: any): number {
	if (Array.isArray(value)) {
		if (value.length === 0) return 0;
		if (value.length > 1) return Number('x');
		const only: any = value[0];
		if (only === null || only === undefined) return 0;
		if (typeof only === 'boolean' || (typeof only === 'object' && !Array.isArray(only))) return Number('x');
		return __validNumber(only);
	}
	if (value !== null && typeof value === 'object') return Number('x');
	return Number(value);
}`,
	__validDigits: `function __validDigits(text: string, from: number, count: number): boolean {
	if (from + count > text.length) return false;
	for (let k = 0; k < count; k++) {
		const code: number = text.charCodeAt(from + k);
		if (code < 48 || code > 57) return false;
	}
	return true;
}`,
	__validTime: `function __validTime(text: string): boolean {
	if (!__validDigits(text, 0, 2) || text.charAt(2) !== ':' || !__validDigits(text, 3, 2)) return false;
	let at: number = 5;
	if (text.charAt(at) === ':' && __validDigits(text, at + 1, 2)) at += 3;
	if ((text.charAt(at) === '-' || text.charAt(at) === '+') && __validDigits(text, at + 1, 4)) at += 5;
	if (text.charAt(at) === '-' || text.charAt(at) === '+') {
		if (!__validDigits(text, at + 1, 1)) return false;
		at += __validDigits(text, at + 1, 2) ? 3 : 2;
		if (text.charAt(at) === ':' && __validDigits(text, at + 1, 2)) at += 3;
	}
	return at === text.length;
}`,
	__validJwt: `function __validJwt(text: string): boolean {
	let part: number = 0;
	let length: number = 0;
	for (let k = 0; k < text.length; k++) {
		const code: number = text.charCodeAt(k);
		const word: boolean = (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code === 45 || code === 95;
		if (part < 2) {
			if (code === 46) {
				if (length === 0) return false;
				part += 1;
				length = 0;
			} else if (word) length += 1;
			else return false;
		} else if (!word && code !== 46 && code !== 43 && code !== 47 && code !== 61) return false;
	}
	return part === 2;
}`,
	__validCast: `function __validCast(name: string, value: any, type: string, strict: boolean, strings: boolean, options: any): any {
	if (value === null || value === undefined) return undefined;
	const kind: string = type.toLowerCase();
	if (kind === 'string') {
		if (!strings || typeof value === 'string') return value;
		if (strict) throw new Error("'" + name + "' expects a " + type + ' but we got ' + __validGiven(value));
		return typeof value === 'object' ? JSON.stringify(value) : String(value);
	}
	if (kind === 'number') {
		const parsed: number = strict && typeof value !== 'number' ? Number('x') : __validNumber(value);
		if (isNaN(parsed)) throw new Error("'" + name + "' expects a " + type + ' but we got ' + __validGiven(value));
		return parsed;
	}
	if (kind === 'boolean') {
		if (typeof value === 'boolean') return value;
		if (!strict) {
			const lower: string = typeof value === 'string' ? value.toLowerCase() : '';
			if (lower === 'true') return true;
			if (lower === 'false') return false;
			if (typeof value !== 'string' || value.trim() !== '') {
				const parsed: number = __validNumber(value);
				if (parsed === 0) return false;
				if (parsed === 1) return true;
			}
		}
		throw new Error("'" + name + "' expects a " + type + ' but we got ' + __validGiven(value));
	}
	if (kind === 'time') {
		const text: string = __validText(value);
		if (!__validTime(text)) throw new Error("'" + name + "' expects time (hh:mm:(:ss)) but we got " + __validGiven(value) + '.');
		return text;
	}
	if (kind === 'array') {
		if (Array.isArray(value)) return value;
		let parsed: any = undefined;
		if (!strict) {
			const text: string = __validText(value);
			try {
				parsed = JSON.parse(text);
			} catch (first) {
				try {
					parsed = JSON.parse(text.split("'").join('"'));
				} catch (second) {
					parsed = undefined;
				}
			}
		}
		if (!Array.isArray(parsed)) throw new Error("'" + name + "' expects a " + type + ' but we got ' + __validGiven(value));
		return parsed;
	}
	if (kind === 'options') {
		const list: any = options === null || options === undefined ? [] : options;
		let listed: string = '';
		for (let k = 0; k < list.length; k++) {
			if (list[k] === value) return value;
			listed += (k > 0 ? ', ' : '') + __validText(list[k]);
		}
		throw new Error("'" + name + "' expects one of the following values: [" + listed + '] but we got ' + __validGiven(value));
	}
	if (kind === 'jwt') {
		const text: string = __validText(value);
		if (!value || !__validJwt(text)) throw new Error('Value is not a valid JWT token');
		return text;
	}
	return value;
}`,
	__validFailure: `function __validFailure(message: string, description: any): any {
	const failure: any = new Error(message);
	failure.name = 'ExpressionError';
	failure.description = description;
	return failure;
}`,
	__validCheck: `function __validCheck(checks: any, key: string): any {
	for (const check of checks) {
		if (check[0] === key) return check;
	}
	return undefined;
}`,
	__validParameter: `function __validParameter(value: any, name: string, type: string, label: string, index: any): any {
	try {
		return __validCast(name, value, type, false, false, undefined);
	} catch (failure: any) {
		throw __validFailure("Invalid input for '" + label + "' [item " + index + ']', failure.message);
	}
}`,
	__validMapped: `function __validMapped(value: any, checks: any, strict: boolean, strings: boolean, index: any): any {
	if (value === null || typeof value !== 'object') return value;
	for (const key of Object.keys(value)) {
		const check: any = __validCheck(checks, key);
		if (check === undefined) continue;
		const given: any = value[key];
		if (check[2] && (given === null || given === undefined)) throw __validFailure("Invalid input for '" + key + "' [item " + index + ']', 'The value "' + key + '" is required but not set');
		if (check[1] === '') continue;
		try {
			value[key] = __validCast(key, given, check[1], strict, strings, check[3]);
		} catch (failure: any) {
			throw __validFailure("Invalid input for '" + key + "' [item " + index + ']', failure.message);
		}
	}
	return value;
}`,
	__validMembers: `function __validMembers(value: any, checks: any, label: string, index: any): any {
	const list: any = Array.isArray(value) ? value : [value];
	for (const one of list) {
		if (one === null || one === undefined) throw new Error('Cannot convert undefined or null to object');
		if (typeof one !== 'object') continue;
		for (const key of Object.keys(one)) {
			const check: any = __validCheck(checks, key);
			if (check === undefined) continue;
			try {
				one[key] = __validCast(key, one[key], check[1], false, false, check[3]);
			} catch (failure: any) {
				throw __validFailure("Invalid input for field '" + check[2] + "' inside '" + label + "' in [item " + index + ']', failure.message);
			}
		}
	}
	return value;
}`,
};

const CAST_USES = [
	'__validCast',
	'__validText',
	'__validGiven',
	'__validNumber',
	'__validDigits',
	'__validTime',
	'__validJwt',
	'__validFailure',
];

export const VALIDATION_HELPER_USES: Record<string, string[]> = {
	__validParameter: CAST_USES,
	__validMapped: [...CAST_USES, '__validCheck'],
	__validMembers: [...CAST_USES, '__validCheck'],
};

const RUN_TIME_TYPES = new Set(['string', 'number', 'boolean', 'time', 'array', 'options', 'jwt']);
const NO_RUN_TIME_TYPES = new Set([
	'datetime',
	'object',
	'url',
	'binary',
	'form-fields',
	'string-alphanumeric',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPlain(value: unknown): boolean {
	return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

type Need = 'none' | 'run' | { refuse: string };

export function fieldNeed(
	type: string,
	value: unknown,
	known: boolean,
	strings: boolean,
	options: unknown[] | undefined,
): Need {
	const kind = type.toLowerCase();
	if (kind === 'options' && !(options ?? []).every(isPlain))
		return { refuse: `a choice of the type '${type}' is not a text, a number or a boolean` };
	if (known && value === null) return 'run';
	if (kind === 'array' && Array.isArray(value)) return 'none';
	if (kind === 'object' && isRecord(value)) return 'none';
	if (known) {
		if (kind === 'string' && (!strings || typeof value === 'string')) return 'none';
		if (kind === 'number' && typeof value === 'number') return 'none';
		if (kind === 'boolean' && typeof value === 'boolean') return 'none';
		if (kind === 'options' && (options ?? []).includes(value)) return 'none';
	}
	if (NO_RUN_TIME_TYPES.has(kind))
		return { refuse: `the check of the type '${type}' has no compiled form for this value` };
	if (RUN_TIME_TYPES.has(kind)) return 'run';
	return known ? 'none' : 'run';
}

function reasonOf(name: string, cause: string): { refuse: string } {
	return {
		refuse: `v1 checks the type of the parameter '${name}' when the node reads it, and ${cause}`,
	};
}

function planOwn(
	rule: ParameterValidation,
	check: FieldCheck,
	name: string,
	value: unknown,
	dynamic: (value: unknown) => boolean,
	extract: boolean,
): ValidationPlan {
	const need = fieldNeed(check.type, value, value !== undefined && !dynamic(value), false, []);
	if (need === 'none') return undefined;
	if (typeof need === 'object') return reasonOf(name, need.refuse);
	if (extract) return reasonOf(name, 'the read extracts a part of the value before the check');
	return { helper: '__validParameter', args: [name, check.type, rule.label] };
}

function planMembers(
	rule: ParameterValidation,
	checks: Record<string, FieldCheck>,
	name: string,
	value: unknown,
	dynamic: (value: unknown) => boolean,
): ValidationPlan {
	const names = Object.keys(checks);
	if (names.length === 0) return undefined;
	if (names.some((member) => /^\d+$/.test(member)))
		return reasonOf(name, 'a member has a number as its name');
	const fixed = (entry: unknown) => isPlain(entry) && !dynamic(entry);
	if (fixed(value)) return undefined;
	const entries =
		value === undefined || typeof value === 'string'
			? undefined
			: Array.isArray(value)
				? value
				: [value];
	let unknown = entries === undefined;
	const needed = new Set<string>();
	for (const entry of entries ?? []) {
		if (!isRecord(entry)) {
			if (!fixed(entry)) unknown = true;
			continue;
		}
		for (const member of names) {
			if (!Object.hasOwn(entry, member)) continue;
			const given = entry[member];
			const need = fieldNeed(
				checks[member].type,
				given,
				!dynamic(given),
				false,
				checks[member].options,
			);
			if (typeof need === 'object') return reasonOf(name, need.refuse);
			if (need === 'run') needed.add(member);
		}
	}
	for (const member of unknown ? names : []) {
		const need = fieldNeed(checks[member].type, undefined, false, false, checks[member].options);
		if (typeof need === 'object') return reasonOf(name, need.refuse);
		needed.add(member);
	}
	if (needed.size === 0) return undefined;
	const out = names
		.filter((member) => needed.has(member))
		.map((member) => [
			member,
			checks[member].type,
			checks[member].label,
			checks[member].options ?? null,
		]);
	return { helper: '__validMembers', args: [out, rule.label] };
}

function planMapper(
	mapper: NonNullable<ParameterValidation['mapper']>,
	name: string,
	field: Record<string, unknown>,
	value: unknown,
	dynamic: (value: unknown) => boolean,
): ValidationPlan {
	const schema = field.schema;
	if (schema === undefined || schema === null) return undefined;
	if (!Array.isArray(schema) || dynamic(schema))
		return reasonOf(name, 'the schema of the resource mapper is not a list of fields');
	if (schema.length === 0) return undefined;
	if (dynamic(field.attemptToConvertTypes) || dynamic(field.convertFieldsToString))
		return reasonOf(name, 'an option of the resource mapper has an expression');
	const strict = mapper.conversions && !field.attemptToConvertTypes;
	const strings = mapper.conversions && (mapper.strings || Boolean(field.convertFieldsToString));
	const fields = isRecord(value) ? value : undefined;
	const seen = new Set<string>();
	const out: unknown[] = [];
	for (const entry of schema) {
		if (!isRecord(entry) || typeof entry.id !== 'string')
			return reasonOf(name, 'the schema of the resource mapper has a field without an id');
		if (seen.has(entry.id)) continue;
		seen.add(entry.id);
		if (fields !== undefined && !Object.hasOwn(fields, entry.id)) continue;
		const given = fields?.[entry.id];
		const known = fields !== undefined && !dynamic(given);
		const type = entry.type;
		if (type !== undefined && type !== null && typeof type !== 'string')
			return reasonOf(name, `the type of the field '${entry.id}' is not text`);
		const required =
			mapper.adds && entry.required === true && type !== 'boolean' && (!known || given === null);
		let cast = false;
		if (typeof type === 'string' && type !== '') {
			const options = Array.isArray(entry.options)
				? entry.options.map((option: unknown) => (isRecord(option) ? option.value : undefined))
				: undefined;
			const need = fieldNeed(type, given, known, strings, options);
			if (typeof need === 'object') return reasonOf(name, need.refuse);
			cast = need === 'run';
			if (cast || required) out.push([entry.id, type, required, options ?? null]);
		} else if (required) out.push([entry.id, '', true, null]);
	}
	if (out.length === 0) return undefined;
	return { helper: '__validMapped', args: [out, strict, strings] };
}

export function planValidation(
	rule: ParameterValidation,
	name: string,
	value: unknown,
	field: unknown,
	dynamic: (value: unknown) => boolean,
	extract: boolean,
): ValidationPlan {
	const path = name.split('.');
	if (path.length === 1 && rule.own !== undefined)
		return planOwn(rule, rule.own, name, value, dynamic, extract);
	if (rule.type === 'resourceMapper') {
		if (path.length !== 2 || path[1] !== 'value' || rule.mapper === undefined) return undefined;
		if (
			!isRecord(field) ||
			!('mappingMode' in field) ||
			!('schema' in field) ||
			!('value' in field)
		)
			return dynamic(field)
				? reasonOf(name, 'the resource mapper is an expression as a whole')
				: undefined;
		if (value === null) return undefined;
		if (value !== undefined && !dynamic(value) && typeof value !== 'object') return undefined;
		return planMapper(rule.mapper, name, field, value, dynamic);
	}
	if (rule.type === 'collection' && rule.members !== undefined)
		return planMembers(rule, rule.members, name, value, dynamic);
	if (rule.type === 'fixedCollection' && path.length > 1) {
		const checks = rule.groups?.[path[1]];
		return checks === undefined ? undefined : planMembers(rule, checks, name, value, dynamic);
	}
	return undefined;
}
