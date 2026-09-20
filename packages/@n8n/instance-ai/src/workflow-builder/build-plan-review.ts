import { getThread, patchThread } from '../storage/thread-patch';
import type { InstanceAiContext } from '../types';

const METADATA_KEY = 'instanceAiReviewedBuildRun';
const localReviews = new WeakMap<InstanceAiContext, string>();

export async function recordBuildPlanReview(context: InstanceAiContext): Promise<void> {
	if (!context.runId) return;
	localReviews.set(context, context.runId);
	if (!context.threadMemory || !context.threadId) return;
	try {
		await patchThread(context.threadMemory, {
			threadId: context.threadId,
			update: ({ metadata = {} }) => ({
				metadata: { ...metadata, [METADATA_KEY]: context.runId },
			}),
		});
	} catch {
		context.logger.debug('Build plan review remains available in the current run.');
	}
}

export async function hasBuildPlanReview(context: InstanceAiContext): Promise<boolean> {
	if (!context.runId) return false;
	if (localReviews.get(context) === context.runId) return true;
	if (!context.threadMemory || !context.threadId) return false;
	try {
		const thread = await getThread(context.threadMemory, context.threadId);
		return thread?.metadata?.[METADATA_KEY] === context.runId;
	} catch {
		return false;
	}
}
