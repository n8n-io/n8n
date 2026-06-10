import type { DesktopAssistantTaskOutcome } from '@n8n/api-types';
import { z } from 'zod';

import { patchThread, type PatchableThreadMemory } from './thread-patch';
import { isRecord } from '../utils/stream-helpers';

/** Thread-metadata key holding `Record<runId, DesktopAssistantTaskOutcome>`. */
export const DESKTOP_TASK_OUTCOME_METADATA_KEY = 'instanceAiDesktopTaskOutcome';

const desktopTaskOutcomeSchema = z.object({
	success: z.boolean(),
	title: z.string(),
	summary: z.string(),
	failureReason: z.string().optional(),
}) satisfies z.ZodType<DesktopAssistantTaskOutcome>;

/**
 * Defensively read the outcome a one-shot run filed for `runId` from raw
 * thread metadata. Returns undefined when the metadata is missing or malformed.
 */
export function readDesktopTaskOutcome(
	metadata: unknown,
	runId: string,
): DesktopAssistantTaskOutcome | undefined {
	if (!isRecord(metadata)) return undefined;
	const outcomes = metadata[DESKTOP_TASK_OUTCOME_METADATA_KEY];
	if (!isRecord(outcomes)) return undefined;
	const parsed = desktopTaskOutcomeSchema.safeParse(outcomes[runId]);
	return parsed.success ? parsed.data : undefined;
}

export class DesktopTaskOutcomeStorage {
	constructor(private readonly memory: PatchableThreadMemory) {}

	async save(
		threadId: string,
		runId: string,
		outcome: DesktopAssistantTaskOutcome,
	): Promise<void> {
		await patchThread(this.memory, {
			threadId,
			update: ({ metadata = {} }) => {
				const current = metadata[DESKTOP_TASK_OUTCOME_METADATA_KEY];
				return {
					metadata: {
						...metadata,
						[DESKTOP_TASK_OUTCOME_METADATA_KEY]: {
							...(isRecord(current) ? current : {}),
							[runId]: outcome,
						},
					},
				};
			},
		});
	}
}
