import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const WORKFLOW_REVIEWS_TELEMETRY = defineTelemetryEvents({
	USER_REQUESTED_WORKFLOW_REVIEW: {
		name: 'User requested workflow review',
		description:
			'A workflow was submitted for review, opening a review request. Fires once per opened review, not on a later re-pin.',
		properties: z.object({
			user_id: z.string(),
			workflow_review_request_id: z.string(),
			project_id: z.string().describe('Owning project when the review opened'),
			workflow_id: z.string(),
			workflow_version_id: z.string(),
			reviewer_count: z
				.number()
				.describe('Reviewers assigned when the review opened, not everyone eligible to review'),
		}),
	},
	USER_UPDATED_WORKFLOW_VERSION_UNDER_REVIEW: {
		name: 'User updated workflow version under review',
		description:
			'An open review was re-pinned to another version of the workflow it covers. Fires only on a real re-pin, not on a rename or a description edit.',
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
			'A user approved a review or requested changes on it. Fires once per decision, so a review can appear several times.',
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
			review_created_at: z.string().describe('When the review was opened, ISO 8601'),
		}),
	},
	WORKFLOW_REVIEW_CLOSED: {
		name: 'Workflow review closed',
		description:
			'An open review was closed without a decision because no reviewable workflow was left on it. No user performs it.',
		properties: z.object({
			workflow_review_request_id: z.string(),
			cause_trigger: z
				.enum(['workflow-archived', 'workflow-moved', 'workflow-deleted', 'unknown'])
				.describe(
					'What left the review without a reviewable workflow. "unknown" means the trigger went unrecorded and the review was swept up later, not that nothing triggered it',
				),
			cause_actor_kind: z
				.enum(['user', 'system'])
				.describe(
					'Who caused the trigger, not who closed the review. "system" means no actor was recorded, not that automation acted',
				),
		}),
	},
	USER_COMMENTED_ON_WORKFLOW_REVIEW: {
		name: 'User commented on workflow review',
		description: 'A comment was posted on an open review.',
		properties: z.object({
			user_id: z.string(),
			workflow_review_request_id: z.string(),
		}),
	},
});
