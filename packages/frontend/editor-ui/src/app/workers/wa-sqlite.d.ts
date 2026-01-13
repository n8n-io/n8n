/**
 * Type declarations for wa-sqlite
 *
 * wa-sqlite is a WebAssembly build of SQLite with support for
 * browser storage extensions like OPFS.
 */

declare module 'wa-sqlite' {
	export interface SQLiteModule {
		_malloc(size: number): number;
		_free(ptr: number): void;
		HEAPU8: Uint8Array;
		HEAP32: Int32Array;
	}

	export interface SQLiteAPI {
		open_v2(filename: string, flags?: number, vfs?: string): Promise<number>;

		close(db: number): Promise<number>;

		exec(
			db: number,
			sql: string,
			callback?: (row: unknown[], columns: string[]) => void,
		): Promise<number>;

		prepare_v2(db: number, sql: number): Promise<{ stmt: number; sql: number } | null>;

		step(stmt: number): Promise<number>;

		finalize(stmt: number): Promise<number>;

		reset(stmt: number): number;

		bind_null(stmt: number, index: number): number;
		bind_int(stmt: number, index: number, value: number): number;
		bind_int64(stmt: number, index: number, value: bigint): number;
		bind_double(stmt: number, index: number, value: number): number;
		bind_text(stmt: number, index: number, value: string): number;
		bind_blob(stmt: number, index: number, value: Uint8Array): number;

		column_count(stmt: number): number;
		column_name(stmt: number, index: number): string;
		column_type(stmt: number, index: number): number;
		column_int(stmt: number, index: number): number;
		column_int64(stmt: number, index: number): bigint;
		column_double(stmt: number, index: number): number;
		column_text(stmt: number, index: number): string;
		column_blob(stmt: number, index: number): Uint8Array;

		str_new(db: number, s?: string): number;
		str_value(str: number): number;
		str_finish(str: number): void;

		vfs_register(vfs: SQLiteVFS, makeDefault?: boolean): number;
	}

	export interface SQLiteVFS {
		name: string;
		close(): Promise<void>;
	}

	export function Factory(module: SQLiteModule): SQLiteAPI;

	export function sqlite3_libversion(): string;

	// SQLite constants
	export const SQLITE_OK: number;
	export const SQLITE_ERROR: number;
	export const SQLITE_BUSY: number;
	export const SQLITE_ROW: number;
	export const SQLITE_DONE: number;

	export const SQLITE_OPEN_READONLY: number;
	export const SQLITE_OPEN_READWRITE: number;
	export const SQLITE_OPEN_CREATE: number;

	export const SQLITE_INTEGER: number;
	export const SQLITE_FLOAT: number;
	export const SQLITE_TEXT: number;
	export const SQLITE_BLOB: number;
	export const SQLITE_NULL: number;
}

declare module 'wa-sqlite/dist/wa-sqlite.mjs' {
	import type { SQLiteModule } from 'wa-sqlite';

	export default function SQLiteESMFactory(): Promise<SQLiteModule>;
}

declare module 'wa-sqlite/dist/wa-sqlite-async.mjs' {
	import type { SQLiteModule } from 'wa-sqlite';

	export default function SQLiteAsyncESMFactory(): Promise<SQLiteModule>;
}

declare module 'wa-sqlite/src/examples/AccessHandlePoolVFS.js' {
	import type { SQLiteModule, SQLiteVFS } from 'wa-sqlite';

	export class AccessHandlePoolVFS implements SQLiteVFS {
		name: string;

		static create(name: string, module: SQLiteModule): Promise<AccessHandlePoolVFS>;

		constructor(name: string, module: SQLiteModule);

		isReady(): Promise<boolean>;

		close(): Promise<void>;

		getSize(): number;

		getCapacity(): number;

		addCapacity(n: number): Promise<number>;

		removeCapacity(n: number): Promise<number>;
	}
}

declare module 'wa-sqlite/src/VFS.js' {
	export const SQLITE_OK: number;
	export const SQLITE_ERROR: number;
	export const SQLITE_IOERR: number;
	export const SQLITE_IOERR_SHORT_READ: number;
	export const SQLITE_CANTOPEN: number;

	export const SQLITE_OPEN_READONLY: number;
	export const SQLITE_OPEN_READWRITE: number;
	export const SQLITE_OPEN_CREATE: number;
	export const SQLITE_OPEN_DELETEONCLOSE: number;
	export const SQLITE_OPEN_EXCLUSIVE: number;
	export const SQLITE_OPEN_MAIN_DB: number;
	export const SQLITE_OPEN_MAIN_JOURNAL: number;
	export const SQLITE_OPEN_TEMP_DB: number;
	export const SQLITE_OPEN_TEMP_JOURNAL: number;
	export const SQLITE_OPEN_TRANSIENT_DB: number;
	export const SQLITE_OPEN_SUBJOURNAL: number;
	export const SQLITE_OPEN_SUPER_JOURNAL: number;
	export const SQLITE_OPEN_WAL: number;

	export const SQLITE_IOCAP_UNDELETABLE_WHEN_OPEN: number;
}
