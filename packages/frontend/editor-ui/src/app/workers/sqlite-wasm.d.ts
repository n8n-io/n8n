declare module '@sqlite.org/sqlite-wasm' {
	export type DbId = string | undefined;

	export interface Sqlite3Version {
		libVersion: string;
		sourceId: string;
		libVersionNumber: number;
		downloadVersion: number;
	}

	export interface Database {
		filename: string;
		exec(sql: string): void;
		exec(options: {
			sql: string;
			bind?: unknown[];
			returnValue?: 'resultRows' | 'saveSql';
			rowMode?: 'array' | 'object' | 'stmt';
			resultRows?: unknown[];
			callback?: (row: unknown) => void;
		}): unknown;
		close(): void;
		selectArray(sql: string, bind?: unknown[]): unknown[];
		selectArrays(sql: string, bind?: unknown[]): unknown[][];
		selectObject(sql: string, bind?: unknown[]): Record<string, unknown> | undefined;
		selectObjects(sql: string, bind?: unknown[]): Record<string, unknown>[];
		selectValue(sql: string, bind?: unknown[]): unknown;
		selectValues(sql: string, bind?: unknown[]): unknown[];
		changes(): number;
		totalChanges(): number;
		isOpen(): boolean;
	}

	export interface OO1Api {
		DB: new (filename?: string, flags?: string) => Database;
		OpfsDb: new (filename: string, flags?: string) => Database;
	}

	export interface Sqlite3Static {
		version: Sqlite3Version;
		oo1: OO1Api;
		opfs?: unknown;
		capi: unknown;
		wasm: unknown;
	}

	export interface Sqlite3InitOptions {
		print?: (...args: unknown[]) => void;
		printErr?: (...args: unknown[]) => void;
		locateFile?: (filename: string) => string;
	}

	export default function sqlite3InitModule(options?: Sqlite3InitOptions): Promise<Sqlite3Static>;

	// Legacy promiser API types (for reference)
	type OnreadyFunction = () => void;

	export type Sqlite3Worker1PromiserConfig = {
		onready?: OnreadyFunction;
		worker?: Worker | (() => Worker);
		generateMessageId?: (messageObject: unknown) => string;
		debug?: (...args: unknown[]) => void;
		onunhandled?: (event: MessageEvent) => void;
	};

	export type PromiserMethods = {
		'config-get': {
			args: Record<string, never>;
			result: {
				dbID: DbId;
				version: Sqlite3Version;
				bigIntEnabled: boolean;
				opfsEnabled: boolean;
				vfsList: string[];
			};
		};
		open: {
			args: Partial<{
				filename?: string;
				vfs?: string;
			}>;
			result: {
				dbId: DbId;
				filename: string;
				persistent: boolean;
				vfs: string;
			};
		};
		exec: {
			args: {
				sql: string;
				dbId?: DbId;
				bind?: unknown[];
				returnValue?: string;
			};
			result: {
				dbId: DbId;
				sql: string;
				bind: unknown[];
				returnValue: string;
				resultRows?: unknown[][];
			};
		};
	};

	export type PromiserResponseSuccess<T extends keyof PromiserMethods> = {
		type: T;
		result: PromiserMethods[T]['result'];
		messageId: string;
		dbId: DbId;
		workerReceivedTime: number;
		workerRespondTime: number;
		departureTime: number;
	};

	export type PromiserResponseError = {
		type: 'error';
		result: {
			operation: string;
			message: string;
			errorClass: string;
			input: object;
			stack: unknown[];
		};
		messageId: string;
		dbId: DbId;
	};

	export type PromiserResponse<T extends keyof PromiserMethods> =
		| PromiserResponseSuccess<T>
		| PromiserResponseError;

	export type Promiser = <T extends keyof PromiserMethods>(
		messageType: T,
		messageArguments: PromiserMethods[T]['args'],
	) => Promise<PromiserResponse<T>>;

	export function sqlite3Worker1Promiser(
		config?: Sqlite3Worker1PromiserConfig | OnreadyFunction,
	): Promiser;
}
