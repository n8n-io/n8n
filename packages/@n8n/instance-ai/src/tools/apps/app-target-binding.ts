import {
	INSTANCE_AI_APP_TARGETS_METADATA_KEY,
	INSTANCE_AI_PENDING_APP_TARGET_METADATA_KEY,
	instanceAiAppTargetSchema,
	type InstanceAiAppTarget,
	type InstanceAiAppSubject,
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

/**
 * The thread metadata that binds an app subject, like the editor writes before
 * it opens a thread on the current runtime. A pending app gets the
 * pending marker, so the first build creates the app under its id. Returns
 * `undefined` when the metadata already has the app or another pending app.
 */
export function withAppSubject(
	metadata: Record<string, unknown>,
	{ id: appId, projectId, name, pending }: InstanceAiAppSubject,
): Record<string, unknown> | undefined {
	if (parseAppTargets(metadata).some((target) => target.appId === appId)) return undefined;
	const target = { appId, projectId, ...(name ? { name } : {}) };
	if (!pending) return withAppTarget(metadata, target);
	if (parsePendingAppTarget(metadata)) return undefined;
	return { ...metadata, [INSTANCE_AI_PENDING_APP_TARGET_METADATA_KEY]: target };
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
