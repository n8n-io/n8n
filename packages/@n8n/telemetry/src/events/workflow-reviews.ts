import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const WORKFLOW_REVIEWS_TELEMETRY = defineTelemetryEvents({
	USER_REQUESTED_WORKFLOW_REVIEW: {
		name: 'User requested workflow review',
		description:
			'A workflow was submitted for review, opening a review request that gates publishing. Fires once per opened review, not on a later re-pin.',
		properties: z.object({
			user_id: z.string(),
			workflow_review_request_id: z.string(),
			project_id: z.string().describe('Owning project when the review opened'),
			workflow_id: z.string(),
			workflow_version_id: z.string(),
			reviewer_count: z.number(),
		}),
	},
	USER_UPDATED_WORKFLOW_REVIEW_VERSION: {
		name: 'User updated workflow review version',
		description:
			'An open review was re-pinned to another version of the workflow it covers, which resets its decision to pending. Fires only on a real re-pin, not on a rename or a description edit.',
		properties: z.object({
			user_id: z.string(),
			workflow_review_request_id: z.string(),
			workflow_id: z.string(),
			workflow_version_id: z.string().describe('The newly pinned version, not the previous one'),
		}),
	},
	USER_DECIDED_WORKFLOW_REVIEW: {
		name: 'User decided workflow review',
		description:
			'A reviewer approved a review or requested changes on it. A review can be decided several times: requesting changes keeps it open, and a re-pin resets it to pending.',
		properties: z.object({
			user_id: z.string(),
			workflow_review_request_id: z.string(),
			workflow_id: z.string(),
			workflow_version_id: z
				.string()
				.nullable()
				.describe('Null when the pinned version was pruned before the decision'),
			decision: z.enum(['approved', 'changes_requested']),
			decided_via: z
				.enum(['assigned-reviewer', 'admin-override'])
				.describe(
					"'assigned-reviewer' = the decider was assigned to this review; 'admin-override' = they decided through an instance or project admin role. Assignment wins when both apply",
				),
			ms_since_review_opened: z
				.number()
				.describe('Wall clock from the review opening to this decision'),
		}),
	},
	WORKFLOW_REVIEW_CLOSED: {
		name: 'Workflow review closed',
		description:
			'An open review was closed without a decision because its workflow stopped being reviewable. No user performs it. An approval also closes the review, but reports "User decided workflow review" instead.',
		properties: z.object({
			workflow_review_request_id: z.string(),
			reason: z
				.enum([
					'workflow-archived',
					'workflow-moved',
					'workflow-deleted',
					'no-reviewable-workflows',
				])
				.describe(
					'What made the workflow unreviewable. "no-reviewable-workflows" means the cause was no longer recoverable when the review was closed',
				),
			actor_kind: z
				.enum(['user', 'system'])
				.describe('"system" means no actor was recorded for the cause, not that automation acted'),
		}),
	},
	USER_COMMENTED_ON_WORKFLOW_REVIEW: {
		name: 'User commented on workflow review',
		description:
			'A comment was posted on a review. Comments stay open after the review settles, so this can fire on a closed review.',
		properties: z.object({
			user_id: z.string(),
			workflow_review_request_id: z.string(),
		}),
	},
});
