import { instanceAiThreadRunTargetSchema, type InstanceAiThreadRunTarget } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

import {
	ASSISTANT_RUN_TARGET_LOST_KEY,
	ASSISTANT_TURN_DEFAULTS_KEY,
	type AssistantTurnDefaults,
} from '../assistant-turn-options';

/** Thread metadata keys with this prefix belong to the server. A client write to them is dropped. */
const SERVER_METADATA_PREFIX = 'assistant';

/** Shared by every local answer, so it is frozen. */
export const LOCAL_RUN_TARGET: InstanceAiThreadRunTarget = Object.freeze({ kind: 'local' });

const lostRunTargetSchema = z.object({ name: z.string().min(1) });

/** The run target in the turn defaults of a thread, or `undefined` when there is none or it is not valid. */
export function storedRunTargetOf(defaults: unknown): InstanceAiThreadRunTarget | undefined {
	if (!isRecord(defaults)) return undefined;
	const parsed = instanceAiThreadRunTargetSchema.safeParse(defaults.runTarget);
	return parsed.success ? parsed.data : undefined;
}

/**
 * The target that a thread keeps. The stored target wins, so the first turn decides. Without a
 * stored target, the first target is used, and local is the fallback.
 */
export function keepFirstRunTarget(
	currentDefaults: unknown,
	first: InstanceAiThreadRunTarget | undefined,
): InstanceAiThreadRunTarget {
	return storedRunTargetOf(currentDefaults) ?? first ?? LOCAL_RUN_TARGET;
}

/**
 * The thread metadata with new turn defaults. Every turn replaces them, so a stored run target
 * must survive the replacement. The first turn decides the target.
 */
export function withTurnDefaults(
	metadata: Record<string, unknown> | undefined,
	defaults: AssistantTurnDefaults,
): Record<string, unknown> {
	const current = metadata?.[ASSISTANT_TURN_DEFAULTS_KEY];
	const runTarget = keepFirstRunTarget(current, defaults.runTarget);
	return { ...metadata, [ASSISTANT_TURN_DEFAULTS_KEY]: { ...defaults, runTarget } };
}

/** The name of the linked instance that a chat lost, or `undefined` when the chat has none. */
export function lostRunTargetOf(
	metadata: Record<string, unknown> | undefined,
): { name: string } | undefined {
	const parsed = lostRunTargetSchema.safeParse(metadata?.[ASSISTANT_RUN_TARGET_LOST_KEY]);
	return parsed.success ? parsed.data : undefined;
}

/** The thread metadata without the lost link marker. */
export function withoutLostRunTarget(metadata: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(metadata).filter(([key]) => key !== ASSISTANT_RUN_TARGET_LOST_KEY),
	);
}

/** Removes the server-owned keys from a client metadata write. */
export function withoutServerMetadata(
	metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
	if (!metadata) return undefined;
	return Object.fromEntries(
		Object.entries(metadata).filter(([key]) => !key.startsWith(SERVER_METADATA_PREFIX)),
	);
}
