export function capitalize<T extends string>(value: T): Capitalize<T> {
	return (value.at(0)!.toUpperCase() + value.slice(1)) as Capitalize<T>;
}

export function uncapitalize<T extends string>(value: T): Uncapitalize<T> {
	return (value.at(0)!.toLowerCase() + value.slice(1)) as Uncapitalize<T>;
}

export type ConcatString<T extends string[]> = T extends [infer F extends string, ...infer R extends string[]]
	? `${F}${ConcatString<R>}`
	: '';

export type Join<T extends string[], S extends string = ','> = T extends [
	infer F extends string,
	...infer R extends string[],
]
	? `${F}${R extends [] ? '' : `${S}${Join<R, S>}`}`
	: '';

export type Whitespace = ' ' | '\t';

export type Trim<T extends string> = T extends `${Whitespace}${infer R extends string}` ? Trim<R> : T;

const encoder = new TextEncoder();

/**
 * Encodes a UTF-8 string into a buffer
 */
export function encodeUTF8(input: string): Uint8Array {
	return encoder.encode(input);
}

const decoder = new TextDecoder();

/**
 * Decodes a UTF-8 string from a buffer
 */
export function decodeUTF8(input?: Uint8Array): string {
	if (!input) return '';

	if (input.buffer instanceof ArrayBuffer && !input.buffer.resizable) return decoder.decode(input);

	const buffer = new Uint8Array(input.byteLength);
	buffer.set(input);
	return decoder.decode(buffer);
}

export function encodeASCII(input: string): Uint8Array {
	const data = new Uint8Array(input.length);
	for (let i = 0; i < input.length; i++) {
		data[i] = input.charCodeAt(i);
	}
	return data;
}

export function decodeASCII(input: Uint8Array): string {
	let output = '';
	for (let i = 0; i < input.length; i++) {
		output += String.fromCharCode(input[i]);
	}
	return output;
}
