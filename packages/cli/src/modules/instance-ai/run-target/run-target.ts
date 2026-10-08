import type { InstanceAiThreadRunTarget } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { z } from 'zod';

/** Thread metadata keys with this prefix belong to the server. A client write to them is dropped. */
const SERVER_METADATA_PREFIX = 'assistant';

export const LOCAL_RUN_TARGET: InstanceAiThreadRunTarget = { kind: 'local' };

const storedRunTargetSchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('local') }),
	z.object({ kind: z.literal('linked'), instanceId: z.string().uuid(), name: z.string().min(1) }),
]);

/** The run target in the turn defaults of a thread, or `undefined` when there is none or it is not valid. */
export function storedRunTargetOf(defaults: unknown): InstanceAiThreadRunTarget | undefined {
	if (!isRecord(defaults)) return undefined;
	const parsed = storedRunTargetSchema.safeParse(defaults.runTarget);
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

/** Removes the server-owned keys from a client metadata write. */
export function withoutServerMetadata(
	metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
	if (!metadata) return undefined;
	return Object.fromEntries(
		Object.entries(metadata).filter(([key]) => !key.startsWith(SERVER_METADATA_PREFIX)),
	);
}

/** The notice that a chat gets once, when its linked instance is no longer linked. */
export function lostLinkNotice(name: string): string {
	return `This chat runs in ${name}, which isn't linked any more. Link it again in Settings, or start a new chat.`;
}
