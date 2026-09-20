import { UserError } from 'n8n-workflow';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { getThread, patchThread } from '../storage/thread-patch';
import type { InstanceAiContext } from '../types';

const METADATA_KEY = 'instanceAiReviewedBuildRun';
const SELECTIONS_KEY = 'instanceAiBuildPlanSelections';
const localReviews = new WeakMap<InstanceAiContext, string>();

export const buildPlanSelectionSchema = z.object({
	id: z.string().min(1),
	nodeType: z.string().min(1),
	version: z.number().positive(),
	resource: z.string().optional(),
	operation: z.string().optional(),
	mode: z.string().optional(),
});

export type BuildPlanSelection = z.infer<typeof buildPlanSelectionSchema>;

const selectionsSchema = z.object({
	planId: z.string().min(1),
	runId: z.string().min(1),
	selections: z.array(buildPlanSelectionSchema),
});

const localSelections = new WeakMap<InstanceAiContext, z.infer<typeof selectionsSchema>>();

export async function recordBuildPlanReview(
	context: InstanceAiContext,
	selections?: BuildPlanSelection[],
): Promise<string | undefined> {
	if (!context.runId) return;
	localReviews.set(context, context.runId);
	const plan =
		selections === undefined
			? undefined
			: selectionsSchema.parse({
					planId: `build_plan_${nanoid(10)}`,
					runId: context.runId,
					selections,
				});
	if (plan) localSelections.set(context, plan);
	else localSelections.delete(context);
	if (!context.threadMemory || !context.threadId) return plan?.planId;
	try {
		await patchThread(context.threadMemory, {
			threadId: context.threadId,
			update: ({ metadata = {} }) => ({
				metadata: { ...metadata, [METADATA_KEY]: context.runId, [SELECTIONS_KEY]: plan ?? null },
			}),
		});
	} catch {
		context.logger.debug('Build plan review remains available in the current run.');
	}
	return plan?.planId;
}

/** Only the reviewed run can reuse selections. Approval resume retains the approved plan. */
export async function getBuildPlanSelections(
	context: InstanceAiContext,
	planId: string,
	approvalResumed = false,
): Promise<BuildPlanSelection[]> {
	let plan = localSelections.get(context);
	if (context.threadMemory && context.threadId) {
		try {
			const thread = await getThread(context.threadMemory, context.threadId);
			const parsed = selectionsSchema.safeParse(thread?.metadata?.[SELECTIONS_KEY]);
			plan = parsed.success ? parsed.data : undefined;
		} catch {
			context.logger.debug('Use the current context for build plan selections.');
		}
	}
	if (plan?.planId !== planId || (!approvalResumed && plan.runId !== context.runId)) {
		throw new UserError(
			'The graph planId is unavailable or belongs to another run. Use the latest plan-build result, or specify explicit node types and versions.',
		);
	}
	return plan.selections;
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
