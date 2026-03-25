/**
 * Adapted from https://github.com/mysqljs/sqlstring/blob/cd528556b4b6bcf300c3db515026935dedf7cfa1/lib/SqlString.js
 * MIT LICENSE: https://github.com/mysqljs/sqlstring/blob/cd528556b4b6bcf300c3db515026935dedf7cfa1/LICENSE
 */
import type { Raw, SqlValue, Timezone } from './types.js';
import { Buffer } from 'node:buffer';
export type { Raw, SqlValue, Timezone } from './types.js';
export declare const dateToString: (date: Date, timezone: Timezone) => string;
export declare const escapeId: (value: SqlValue, forbidQualified?: boolean) => string;
export declare const objectToValues: (object: Record<string, SqlValue>, timezone?: Timezone) => string;
export declare const bufferToString: (buffer: Buffer) => string;
export declare const arrayToList: (array: SqlValue[], timezone?: Timezone) => string;
export declare const escape: (value: SqlValue, stringifyObjects?: boolean, timezone?: Timezone) => string;
export declare const format: (sql: string, values?: SqlValue | SqlValue[], stringifyObjects?: boolean, timezone?: Timezone) => string;
export declare const raw: (sql: string) => Raw;
