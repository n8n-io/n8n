import { ValueTransformer } from 'typeorm';

export const idStringifier = {
	from: (value: number): string | number => (typeof value === 'number' ? value.toString() : value),
	to: (value: string): number | string => (typeof value === 'string' ? Number(value) : value),
};

export const lowerCaser = {
	from: (value: string): string => value,
	to: (value: string): string => (typeof value === 'string' ? value.toLowerCase() : value),
};

/**
 * Unmarshal JSON as JS object.
 */
export const objectRetriever: ValueTransformer = {
	to: (value: object): object => value,
	from: (value: string | object): object =>
		typeof value === 'string' ? (JSON.parse(value) as object) : value,
};

/**
 * Transformer to store object as string and retrieve string as object.
 */
export const serializer: ValueTransformer = {
	to: (value: object | string): string =>
		typeof value === 'object' ? JSON.stringify(value) : value,
	from: (value: string | object): object =>
		typeof value === 'string' ? (JSON.parse(value) as object) : value,
};
