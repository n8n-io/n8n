import { getPrototypeOf } from '../runtime/intrinsics';
import { unboxPrimitive } from '../runtime/transfer';

const MAX_PROTOTYPE_DEPTH = 64;

export interface BoxedFieldKeys {
	keys: string[];
	hiddenKeys: string[];
	protoKeys: string[];
	protoHiddenKeys: string[];
}

function builtinPrototypeOf(primitive: string | number | boolean | bigint): object | undefined {
	switch (typeof primitive) {
		case 'string':
			return String.prototype;
		case 'number':
			return Number.prototype;
		case 'boolean':
			return Boolean.prototype;
		case 'bigint':
			return typeof BigInt === 'function' ? BigInt.prototype : undefined;
	}
}

function isBuiltinWrapperProto(
	proto: object,
	primitive: string | number | boolean | bigint,
	builtinProto: object | undefined,
): boolean {
	if (proto === Object.prototype || proto === builtinProto) return true;
	const parent = getPrototypeOf(proto);
	if (parent === null) {
		return Object.hasOwn(proto, 'hasOwnProperty');
	}
	if (unboxPrimitive(proto) !== undefined) return true;
	return (
		typeof primitive === 'bigint' &&
		Object.hasOwn(proto, 'valueOf') &&
		getPrototypeOf(parent) === null
	);
}

/**
 * List the own fields and custom inherited fields of a boxed primitive without
 * invoking any getter. Skips a String's character indices and `length`, methods
 * on subclass prototypes, and keys already defined on the built-in prototype.
 */
export function boxedFieldsOf(
	value: object,
	primitive: string | number | boolean | bigint,
): BoxedFieldKeys {
	const isString = typeof primitive === 'string';
	const indexCount = isString ? primitive.length : 0;
	const names = Object.getOwnPropertyNames(value);
	const keys: string[] = [];
	const hiddenKeys: string[] = [];

	if (names.length > (isString ? indexCount + 1 : 0)) {
		for (let i = indexCount; i < names.length; i++) {
			const key = names[i];
			if (isString && key === 'length') continue;
			if (Object.getOwnPropertyDescriptor(value, key)?.enumerable === true) {
				keys.push(key);
			} else {
				hiddenKeys.push(key);
			}
		}
	}

	const protoKeys: string[] = [];
	const protoHiddenKeys: string[] = [];
	const builtinProto = builtinPrototypeOf(primitive);

	let proto: object | null;
	try {
		proto = getPrototypeOf(value);
	} catch {
		return { keys, hiddenKeys, protoKeys, protoHiddenKeys };
	}

	if (proto === null || proto === builtinProto) {
		return { keys, hiddenKeys, protoKeys, protoHiddenKeys };
	}

	const seen = new Set(names);
	for (let depth = 0; depth < MAX_PROTOTYPE_DEPTH && proto !== null; depth++) {
		try {
			if (isBuiltinWrapperProto(proto, primitive, builtinProto)) break;
			for (const key of Object.getOwnPropertyNames(proto)) {
				if (seen.has(key)) continue;
				seen.add(key);
				if (key === 'constructor' || key === '__proto__') continue;
				if (builtinProto !== undefined && key in builtinProto) continue;
				const descriptor = Object.getOwnPropertyDescriptor(proto, key);
				if (!descriptor) continue;
				if ('value' in descriptor && typeof descriptor.value === 'function') continue;
				if (descriptor.enumerable === true) {
					protoKeys.push(key);
				} else {
					protoHiddenKeys.push(key);
				}
			}
			proto = getPrototypeOf(proto);
		} catch {
			break;
		}
	}

	return { keys, hiddenKeys, protoKeys, protoHiddenKeys };
}

export function hasBoxedFields(fields: BoxedFieldKeys): boolean {
	return (
		fields.keys.length > 0 ||
		fields.hiddenKeys.length > 0 ||
		fields.protoKeys.length > 0 ||
		fields.protoHiddenKeys.length > 0
	);
}
