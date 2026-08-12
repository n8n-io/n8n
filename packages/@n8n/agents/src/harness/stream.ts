import type { TextStreamPart, ToolSet } from 'ai';

import { convertChunk } from '../runtime/streaming/stream';
import type { StreamChunk } from '../types';

type ToolLifecycleChunk = Extract<
	StreamChunk,
	{ type: 'tool-execution-start' | 'tool-execution-end' }
>;

export interface HarnessStreamLifecycleEmitter {
	emit(chunk: ToolLifecycleChunk): void;
}

export function chainHarnessStreams(
	first: ReadableStream<TextStreamPart<ToolSet>>,
	next: () => Promise<ReadableStream<TextStreamPart<ToolSet>>>,
): ReadableStream<TextStreamPart<ToolSet>> {
	let reader = first.getReader();
	let isFirst = true;

	return new ReadableStream<TextStreamPart<ToolSet>>({
		async pull(controller) {
			while (true) {
				const { done, value } = await reader.read();
				if (!done) {
					if (isFirst && value.type === 'finish') continue;
					controller.enqueue(value);
					return;
				}

				if (!isFirst) {
					controller.close();
					return;
				}

				isFirst = false;
				reader.releaseLock();
				reader = (await next()).getReader();
			}
		},
		async cancel(reason) {
			await reader.cancel(reason);
		},
	});
}

export function translateHarnessStream(
	stream: ReadableStream<TextStreamPart<ToolSet>>,
	options: {
		model: string;
		lifecycle: HarnessStreamLifecycleEmitter;
		onComplete(): Promise<void>;
		onFailure(error: unknown): Promise<void>;
	},
): ReadableStream<StreamChunk> {
	const source = stream.getReader();
	const seenToolCalls = new Set<string>();
	const pendingLifecycle = new Map<string, ToolLifecycleChunk[]>();
	let controller: ReadableStreamDefaultController<StreamChunk> | undefined;
	let finalized = false;

	const emit = (chunk: StreamChunk) => {
		controller?.enqueue(chunk);
	};

	options.lifecycle.emit = (chunk) => {
		if (seenToolCalls.has(chunk.toolCallId)) {
			emit(chunk);
			return;
		}
		const pending = pendingLifecycle.get(chunk.toolCallId) ?? [];
		pending.push(chunk);
		pendingLifecycle.set(chunk.toolCallId, pending);
	};

	const finalizeSuccess = async () => {
		if (finalized) return;
		finalized = true;
		await options.onComplete();
	};

	const finalizeFailure = async (error: unknown) => {
		if (finalized) return;
		finalized = true;
		await options.onFailure(error);
	};

	return new ReadableStream<StreamChunk>({
		start(outputController) {
			controller = outputController;
		},
		async pull(outputController) {
			try {
				const { done, value } = await source.read();
				if (done) {
					await finalizeSuccess();
					outputController.close();
					return;
				}

				const converted = convertChunk(value);
				if (!converted) return;
				const chunk =
					converted.type === 'finish' ? { ...converted, model: options.model } : converted;
				outputController.enqueue(chunk);

				if (chunk.type === 'tool-call') {
					seenToolCalls.add(chunk.toolCallId);
					for (const lifecycleChunk of pendingLifecycle.get(chunk.toolCallId) ?? []) {
						outputController.enqueue(lifecycleChunk);
					}
					pendingLifecycle.delete(chunk.toolCallId);
				}
			} catch (error) {
				try {
					await finalizeFailure(error);
				} finally {
					outputController.error(error);
				}
			}
		},
		async cancel(reason) {
			try {
				await source.cancel(reason);
			} finally {
				await finalizeFailure(reason);
			}
		},
	});
}
