import {
	INSTANCE_AI_APP_TARGETS_METADATA_KEY,
	INSTANCE_AI_PENDING_APP_TARGET_METADATA_KEY,
	instanceAiAppTargetSchema,
	type InstanceAiAppTarget,
} from '@n8n/api-types';

import { getThread, patchThread } from '../../storage/thread-patch';
import type { InstanceAiContext } from '../../types';

const appTargetsSchema = instanceAiAppTargetSchema.array().catch([]);

async function readMetadata(context: InstanceAiContext) {
	if (!context.threadMemory || !context.threadId) return {};
	const thread = await getThread(context.threadMemory, context.threadId);
	return thread?.metadata ?? {};
}

export function parseAppTargets(metadata: Record<string, unknown>): InstanceAiAppTarget[] {
	return appTargetsSchema.parse(metadata[INSTANCE_AI_APP_TARGETS_METADATA_KEY]);
}

export function parsePendingAppTarget(
	metadata: Record<string, unknown>,
): InstanceAiAppTarget | undefined {
	const parsed = instanceAiAppTargetSchema.safeParse(
		metadata[INSTANCE_AI_PENDING_APP_TARGET_METADATA_KEY],
	);
	return parsed.success ? parsed.data : undefined;
}

export async function readPendingAppTarget(context: InstanceAiContext) {
	return parsePendingAppTarget(await readMetadata(context));
}

export function withAppTarget(
	metadata: Record<string, unknown>,
	target: InstanceAiAppTarget,
): Record<string, unknown> {
	const targets = parseAppTargets(metadata);
	const { [INSTANCE_AI_PENDING_APP_TARGET_METADATA_KEY]: _pending, ...rest } = metadata;
	const keepPending = parsePendingAppTarget(metadata)?.appId !== target.appId;
	return {
		...(keepPending ? metadata : rest),
		[INSTANCE_AI_APP_TARGETS_METADATA_KEY]: targets.some(({ appId }) => appId === target.appId)
			? targets
			: [...targets, target],
	};
}

export async function addAppTarget(
	context: InstanceAiContext,
	target: InstanceAiAppTarget,
): Promise<void> {
	if (!context.threadMemory || !context.threadId) return;
	await patchThread(context.threadMemory, {
		threadId: context.threadId,
		update: ({ metadata = {} }) => ({ metadata: withAppTarget(metadata, target) }),
	});
}
