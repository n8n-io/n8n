import { ValueTransformer } from 'typeorm';
import config from '../../../config';

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
 * Transformer to account for sqlite storing and retrieving JSON as TEXT.
 */
const jsonSerializer: ValueTransformer = {
	to: (value: object): string | object =>
		config.getEnv('database.type') === 'sqlite' ? JSON.stringify(value) : value,
	from: (value: string | object): object =>
		typeof value === 'string' ? (JSON.parse(value) as object) : value,
};

export const sqlite = { jsonSerializer };
