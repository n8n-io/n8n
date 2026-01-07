import { v4 as uuid } from 'uuid';

import type { BuilderFeatureFlags, ChatPayload } from '../../src/workflow-builder-agent';
import { DEFAULTS } from '../constants';
import type { LlmCallLimiter } from '../harness-types';

export async function consumeGenerator<T>(gen: AsyncGenerator<T>) {
	for await (const _ of gen) {
		/* consume all */
	}
}

export async function runWithOptionalLimiter<T>(
	limiter: LlmCallLimiter | undefined,
	fn: () => Promise<T>,
): Promise<T> {
	return limiter ? await limiter(fn) : await fn();
}

export async function withTimeout<T>(args: {
	promise: Promise<T>;
	timeoutMs?: number;
	label: string;
}): Promise<T> {
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
