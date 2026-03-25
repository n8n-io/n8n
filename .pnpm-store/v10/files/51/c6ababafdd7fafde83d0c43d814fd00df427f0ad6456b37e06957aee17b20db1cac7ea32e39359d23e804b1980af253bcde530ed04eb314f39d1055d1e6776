import type {Options} from './arguments/options.js';

// Message when the `serialization` option is `'advanced'`
type AdvancedMessage =
	| string
	| number
	| boolean
	| null
	| object;

// Message when the `serialization` option is `'json'`
type JsonMessage =
	| string
	| number
	| boolean
	| null
	| readonly JsonMessage[]
	| {readonly [key: string | number]: JsonMessage};

/**
Type of messages exchanged between a process and its subprocess using `sendMessage()`, `getOneMessage()` and `getEachMessage()`.

This requires the `ipc` option to be `true`. The type of `message` depends on the `serialization` option.
*/
export type Message<
	Serialization extends Options['serialization'] = Options['serialization'],
> = Serialization extends 'json' ? JsonMessage : AdvancedMessage;

/**
Options to `sendMessage()` and `subprocess.sendMessage()`
*/
type SendMessageOptions = {
	/**
	Throw when the other process is not receiving or listening to messages.

	@default false
	*/
	readonly strict?: boolean;
};

// IPC methods in subprocess
/**
Send a `message` to the parent process.

This requires the `ipc` option to be `true`. The type of `message` depends on the `serialization` option.
*/
export function sendMessage(message: Message, sendMessageOptions?: SendMessageOptions): Promise<void>;

/**
Options to `getOneMessage()` and `subprocess.getOneMessage()`
*/
type GetOneMessageOptions<
	Serialization extends Options['serialization'],
> = {
	/**
	Ignore any `message` that returns `false`.
	*/
	readonly filter?: (message: Message<Serialization>) => boolean;

	/**
	Keep the subprocess alive while `getOneMessage()` is waiting.

	@default true
	*/
	readonly reference?: boolean;
};

/**
Receive a single `message` from the parent process.

This requires the `ipc` option to be `true`. The type of `message` depends on the `serialization` option.
*/
export function getOneMessage(getOneMessageOptions?: GetOneMessageOptions<Options['serialization']>): Promise<Message>;

/**
Options to `getEachMessage()` and `subprocess.getEachMessage()`
*/
type GetEachMessageOptions = {
	/**
	Keep the subprocess alive while `getEachMessage()` is waiting.

	@default true
	*/
	readonly reference?: boolean;
};

/**
Iterate over each `message` from the parent process.

This requires the `ipc` option to be `true`. The type of `message` depends on the `serialization` option.
*/
export function getEachMessage(getEachMessageOptions?: GetEachMessageOptions): AsyncIterableIterator<Message>;

/**
Retrieves the [`AbortSignal`](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal) shared by the `cancelSignal` option.

This can only be called inside a subprocess. This requires the `gracefulCancel` option to be `true`.
*/
export function getCancelSignal(): Promise<AbortSignal>;

// IPC methods in the subprocess
export type IpcMethods<
	IpcEnabled extends boolean,
	Serialization extends Options['serialization'],
> = IpcEnabled extends true
	? {
		/**
		Send a `message` to the subprocess.

		This requires the `ipc` option to be `true`. The type of `message` depends on the `serialization` option.
		*/
		sendMessage(message: Message<Serialization>, sendMessageOptions?: SendMessageOptions): Promise<void>;

		/**
		Receive a single `message` from the subprocess.

		This requires the `ipc` option to be `true`. The type of `message` depends on the `serialization` option.
		*/
		getOneMessage(getOneMessageOptions?: GetOneMessageOptions<Serialization>): Promise<Message<Serialization>>;

		/**
		Iterate over each `message` from the subprocess.

		This requires the `ipc` option to be `true`. The type of `message` depends on the `serialization` option.
		*/
		getEachMessage(getEachMessageOptions?: GetEachMessageOptions): AsyncIterableIterator<Message<Serialization>>;
	}
	// Those methods only work if the `ipc` option is `true`.
	// At runtime, they are actually defined, in order to provide with a nice error message.
	// At type check time, they are typed as `undefined` to prevent calling them.
	: {
		sendMessage: undefined;
		getOneMessage: undefined;
		getEachMessage: undefined;
	};

// Whether IPC is enabled, based on the `ipc`, `ipcInput` and `gracefulCancel` options
export type HasIpc<OptionsType extends Options> = HasIpcOption<
OptionsType['ipc'],
'ipcInput' extends keyof OptionsType ? OptionsType['ipcInput'] : undefined,
'gracefulCancel' extends keyof OptionsType ? OptionsType['gracefulCancel'] : undefined
>;

type HasIpcOption<
	IpcOption extends Options['ipc'],
	IpcInputOption extends Options['ipcInput'],
	GracefulCancelOption extends Options['gracefulCancel'],
> = IpcOption extends true
	? true
	: IpcOption extends false
		? false
		: IpcInputOption extends undefined
			? GracefulCancelOption extends true
				? true
				: false
			: true;
