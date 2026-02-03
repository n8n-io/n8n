import type { Callbacks } from '@langchain/core/callbacks/manager';
import { getLangchainCallbacks } from 'langsmith/langchain';
import { v4 as uuid } from 'uuid';

import type { LlmCallLimiter } from './harness-types';
import type { BuilderFeatureFlags, ChatPayload } from '../../src/workflow-builder-agent';
import { DEFAULTS } from '../support/constants';

/**
 * Get LangChain callbacks that bridge the current traceable context.
 * Returns undefined if not in a traceable context.
 */
export async function getTracingCallbacks(): Promise<Callbacks | undefined> {
	try {
		return await getLangchainCallbacks();
	} catch {
		return undefined;
	}
}

export async function consumeGenerator<T>(gen: AsyncGenerator<T>) {
	for await (const _ of gen) {
		/* consume all */
	}
}

export async function runWithOptionalLimiter<T>(
	fn: () => Promise<T>,
	limiter?: LlmCallLimiter,
): Promise<T> {
	return limiter ? await limiter(fn) : await fn();
}

export async function withTimeout<T>(args: {
	promise: Promise<T>;
	timeoutMs?: number;
	label: string;
}): Promise<T> {
	// NOTE:
	// - This is a best-effort timeout. It does NOT cancel/abort the underlying work.
	// - If the underlying work supports cancellation (e.g. AbortSignal), plumb that through instead.
	// - When combined with `p-limit`, prefer applying the timeout *inside* the limited function so the
	//   limiter slot is released when the timeout triggers.
	const { promise, timeoutMs, label } = args;
	if (typeof timeoutMs !== 'number') return await promise;
	if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
		throw new Error(`Invalid timeoutMs (${String(timeoutMs)}) for ${label}`);
	}

	let timer: NodeJS.Timeout | undefined;
	try {
		const timeout = new Promise<never>((_resolve, reject) => {
			timer = setTimeout(
				() => reject(new Error(`Timed out after ${timeoutMs}ms in ${label}`)),
				timeoutMs,
			);
		});
		return await Promise.race([promise, timeout]);
	} finally {
		if (timer) clearTimeout(timer);
	}
}

export interface GetChatPayloadOptions {
	evalType: string;
	message: string;
	workflowId: string;
	featureFlags?: BuilderFeatureFlags;
}

export function getChatPayload(options: GetChatPayloadOptions): ChatPayload {
	const { evalType, message, workflowId, featureFlags } = options;

	return {
		id: `${evalType}-${uuid()}`,
		featureFlags: featureFlags ?? DEFAULTS.FEATURE_FLAGS,
		message,
		workflowContext: {
			currentWorkflow: { id: workflowId, nodes: [], connections: {} },
		},
	};
}
