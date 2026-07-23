import {
	channelIntegrationRecorder,
	type ChannelIntegrationRecorder,
} from './channel-integration-recorder';

const METHODS_BY_PLATFORM: Record<string, string[]> = {
	slack: [
		'postMessage',
		'editMessage',
		'deleteMessage',
		'addReaction',
		'removeReaction',
		'startTyping',
		'stream',
		'openDM',
		'fetchMessages',
	],
	telegram: [
		'postMessage',
		'editMessage',
		'deleteMessage',
		'addReaction',
		'removeReaction',
		'startTyping',
		'openDM',
		'fetchMessages',
	],
	linear: ['postMessage', 'editMessage', 'deleteMessage', 'addReaction', 'fetchMessages'],
};

type UnknownMethod = (this: unknown, ...args: unknown[]) => unknown;

function isObject(value: unknown): value is object {
	return typeof value === 'object' && value !== null;
}

function isAsyncIterable(value: unknown): value is AsyncIterable<unknown> {
	return isObject(value) && Symbol.asyncIterator in value;
}

function wrapStreamArg(args: unknown[]): { args: unknown[]; getChunks: () => unknown[] } {
	const [threadId, textStream, ...rest] = args;
	if (!isAsyncIterable(textStream)) {
		return { args, getChunks: () => [] };
	}

	const chunks: unknown[] = [];
	const wrappedStream: AsyncIterable<unknown> = {
		[Symbol.asyncIterator]: () => {
			const iterator = textStream[Symbol.asyncIterator]();
			return {
				async next() {
					const result = await iterator.next();
					if (!result.done) chunks.push(result.value);
					return result;
				},
			};
		},
	};

	return {
		args: [threadId, wrappedStream, ...rest],
		getChunks: () => chunks,
	};
}

export function recordAdapterCalls(
	platform: string,
	adapter: unknown,
	recorder: ChannelIntegrationRecorder = channelIntegrationRecorder,
	methodsToRecord: string[] = METHODS_BY_PLATFORM[platform] ?? [],
): unknown {
	if (!isObject(adapter)) return adapter;
	if (!recorder.isEnabled || methodsToRecord.length === 0) return adapter;

	return new Proxy(adapter, {
		get(target, prop, receiver) {
			const value = Reflect.get(target, prop, receiver) as unknown;
			if (
				typeof prop !== 'string' ||
				typeof value !== 'function' ||
				!methodsToRecord.includes(prop)
			) {
				return value;
			}

			const method = value as UnknownMethod;
			return async (...args: unknown[]) => {
				const streamRecording = prop === 'stream' ? wrapStreamArg(args) : undefined;
				const callArgs = streamRecording?.args ?? args;
				let response: unknown;
				let error: Error | undefined;
				try {
					response = await method.apply(target, callArgs);
					return response;
				} catch (caught) {
					error = caught instanceof Error ? caught : new Error(String(caught));
					throw caught;
				} finally {
					const recordedArgs =
						streamRecording === undefined
							? args
							: [args[0], { streamChunks: streamRecording.getChunks() }, ...args.slice(2)];
					await recorder
						.recordApiCall(platform, prop, recordedArgs, response, error)
						.catch(() => {});
				}
			};
		},
	});
}
