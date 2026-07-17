import type { BuiltTool, InterruptibleToolContext, ToolContext } from '@n8n/agents';

const ABORTABLE_WRAPPED_KEY = 'abortableWrapped';

type ToolHandler = NonNullable<BuiltTool['handler']>;

export function isAbortError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;
	if (error.name === 'AbortError') return true;
	return error.message === 'Aborted' || error.message === 'This operation was aborted';
}

export function createAbortError(reason?: unknown): Error {
	if (reason instanceof Error) return reason;
	const error = new Error(typeof reason === 'string' ? reason : 'This operation was aborted');
	error.name = 'AbortError';
	return error;
}

/** Throw if the run abort signal has already fired. */
export function throwIfAborted(ctx: Pick<ToolContext, 'abortSignal'>): void {
	const signal = ctx.abortSignal;
	if (signal?.aborted) {
		throw createAbortError(signal.reason);
	}
}

function abortRejection(signal: AbortSignal): Promise<never> {
	return new Promise((_, reject) => {
		if (signal.aborted) {
			reject(createAbortError(signal.reason));
			return;
		}
		signal.addEventListener(
			'abort',
			() => {
				reject(createAbortError(signal.reason));
			},
			{ once: true },
		);
	});
}

/**
 * Race a tool handler against the run abort signal so Stop unblocks the
 * executor even when the underlying work does not cooperate. Cooperative
 * tools should still forward `ctx.abortSignal` into I/O to stop real work.
 */
export function withAbortableToolHandler(handler: ToolHandler): ToolHandler {
	return async (input, ctx) => {
		const signal = ctx.abortSignal;
		if (!signal) {
			return await handler(input, ctx);
		}
		throwIfAborted(ctx);
		return await Promise.race([handler(input, ctx), abortRejection(signal)]);
	};
}

function isAlreadyWrapped(tool: BuiltTool): boolean {
	return tool.metadata?.[ABORTABLE_WRAPPED_KEY] === true;
}

/**
 * Wrap a BuiltTool so its handler settles promptly when the run abort signal
 * fires. Idempotent — safe to call on already-wrapped tools.
 */
export function makeToolAbortable(tool: BuiltTool): BuiltTool {
	if (!tool.handler || isAlreadyWrapped(tool)) {
		return tool;
	}

	const wrappedHandler = withAbortableToolHandler(tool.handler);

	return {
		...tool,
		handler: async (input, ctx: ToolContext | InterruptibleToolContext) =>
			await wrappedHandler(input, ctx),
		metadata: {
			...tool.metadata,
			[ABORTABLE_WRAPPED_KEY]: true,
		},
	};
}
