import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const WORKFLOW_REVIEWS_TELEMETRY = defineTelemetryEvents({
	USER_REQUESTED_WORKFLOW_REVIEW: {
		name: 'User requested workflow review',
		description:
			'A workflow was submitted for review, opening a review request that blocks publishing until it is approved. Fires once per opened review; a re-pin to another version reports "User updated workflow review version" instead.',
		properties: z.object({
			user_id: z.string(),
			workflow_review_request_id: z.string(),
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
			'A reviewer approved a review or requested changes on it. Both decisions land on this event so approval rate is one query. A review can be decided several times: requesting changes keeps it open, and a re-pin resets it to pending.',
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
			decided_by_author: z
				.boolean()
				.describe(
					'Whether the decider also authored a version of this review. Not exclusive with assigned-reviewer: a reviewer who syncs a version becomes an author too',
				),
			ms_since_review_opened: z
				.number()
				.describe(
					'Wall clock from the review opening to this decision. Carried on the event rather than derived in the warehouse: it keeps review turnaround readable without a cross-table join, it is free to collect, and reviews opened before this event shipped have no "requested" event to join against',
				),
		}),
	},
	WORKFLOW_REVIEW_CLOSED: {
		name: 'Workflow review closed',
		description:
			'An open review was closed without a decision because its workflow stopped being reviewable. Nobody performs this: it is the auto-close hooks and the reconciliation sweep. An approval closes the review too but reports "User decided workflow review" instead.',
		properties: z.object({
			workflow_review_request_id: z.string(),
			project_id: z
				.string()
				.describe(
					"The review's own project, which on a 'workflow-moved' close is the project the workflow left, not the one it moved to",
				),
			workflow_id: z
				.string()
				.nullable()
				.describe("Null only when no workflow row is left behind the review's link"),
			reason: z
				.enum(['workflow-archived', 'workflow-moved', 'workflow-deleted'])
				.describe('What made the workflow unreviewable'),
		}),
	},
	USER_COMMENTED_ON_WORKFLOW_REVIEW: {
		name: 'User commented on workflow review',
		description:
			'A comment was posted on a review. Comments stay open after the review settles, so this can fire on a closed review. The comment body is never reported.',
		properties: z.object({
			user_id: z.string(),
			workflow_review_request_id: z.string(),
		}),
	},
});
