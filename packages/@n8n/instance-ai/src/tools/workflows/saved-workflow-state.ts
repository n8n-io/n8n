import { z } from 'zod';

import type { WorkflowDetail } from '../../types';

export const savedWorkflowStateSchema = z.object({
	publishState: z
		.object({
			live: z.enum(['unpublished', 'current', 'stale']),
			activeVersionId: z.string().nullable(),
			savedVersionId: z.string(),
		})
		.optional(),
	publishStateNote: z.string().optional(),
});

export type SavedWorkflowState = z.infer<typeof savedWorkflowStateSchema>;

/** Report where the save landed without requiring another workflow read. */
export function describeSavedPublishState(
	saved: Pick<WorkflowDetail, 'versionId' | 'activeVersionId'>,
): SavedWorkflowState {
	const { activeVersionId, versionId } = saved;
	if (activeVersionId === null) {
		return {
			publishState: { live: 'unpublished', activeVersionId, savedVersionId: versionId },
			publishStateNote: 'This workflow is an unpublished draft. Nothing is live in production.',
		};
	}

	const live = activeVersionId === versionId ? 'current' : 'stale';
	return {
		publishState: { live, activeVersionId, savedVersionId: versionId },
		...(live === 'stale'
			? {
					publishStateNote:
						'This workflow is published, and this save is a draft. The live version is still ' +
						'the previous one, so nothing changed for production yet. Do NOT describe the ' +
						'workflow as fixed, live, or working in production until it is published again.',
				}
			: {}),
	};
}
