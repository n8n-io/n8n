import type { Worker } from 'node:worker_threads';

declare module '@sqlite.org/sqlite-wasm' {
	type OnreadyFunction = () => void;

	export type Sqlite3Worker1PromiserConfig = {
		onready?: OnreadyFunction;
		worker?: Worker | (() => Worker);
		generateMessageId?: (messageObject: unknown) => string;
		debug?: (...args: any[]) => void;
		onunhandled?: (event: MessageEvent) => void;
	};

	export type DbId = string | undefined;

	export type PromiserMethods = {
		'config-get': {
			args: Record<string, never>;
			result: {
				dbID: DbId;
				version: {
					libVersion: string;
					sourceId: string;
					libVersionNumber: number;
					downloadVersion: number;
				};
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
