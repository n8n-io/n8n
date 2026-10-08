import { z } from 'zod';

import { projectTypeSchema } from './project.schema';

/** The run target of this n8n instance. B05 offers only this target. */
export const AUTOMATION_LOCAL_TARGET_ID = 'local';

export const AUTOMATION_PROPOSAL_LIMITS = {
	titleLength: 120,
	whyItems: 5,
	whyLength: 200,
	steps: 12,
	sharedWith: 10,
} as const;

/**
 * Why the card recommends a place to run. The literals are the same as `RecommendationReason`
 * of `@n8n/instance-ai`. A type test there fails when the two lists differ.
 */
export const automationRecommendationReasonSchema = z.enum([
	'needs-local-files',
	'needs-local-commands',
	'needs-local-trigger',
	'always-on-trigger',
	'cloud-offline',
	'no-cloud-linked',
	'manual-only',
]);
export type AutomationRecommendationReason = z.infer<typeof automationRecommendationReasonSchema>;

/** What starts the workflow. `manual` also covers a workflow without a trigger. */
export const automationTriggerKindSchema = z.enum([
	'schedule',
	'webhook',
	'form',
	'chat',
	'app-event',
	'manual',
	'other',
]);
export type AutomationTriggerKind = z.infer<typeof automationTriggerKindSchema>;

const runTargetKindSchema = z.enum(['local', 'linked']);

/** A place where the automation can run. Mirrors `RunTargetOption` of `@n8n/instance-ai`. */
export const automationRunTargetSchema = z.object({
	id: z.string().min(1),
	kind: runTargetKindSchema,
	/** Display name of a linked instance. The frontend names the local target. */
	label: z.string().optional(),
	status: z.enum(['online', 'offline', 'unauthorised', 'unknown']),
});
export type AutomationRunTarget = z.infer<typeof automationRunTargetSchema>;

/**
 * The answers that the card can send. The server rejects a value that is not in these lists,
 * so the frontend builds its buttons from them.
 */
export const automationProposalOfferedSchema = z.object({
	target: z.array(z.string().min(1)).min(1),
	activate: z.array(z.boolean()).min(1),
});

/** A project on the card. Its members can see the workflow. */
const automationProjectSchema = z.object({
	projectId: z.string().min(1),
	projectName: z.string(),
	projectType: projectTypeSchema,
});

/** The `automationProposal` field of the confirmation card of `propose_automation`. */
export const automationProposalCardSchema = z.object({
	workflowId: z.string().min(1),
	/**
	 * The saved version that the card shows. "Turn it on" publishes only this version: the
	 * server refuses the answer when the workflow changed after the card was shown.
	 */
	versionId: z.string().min(1),
	title: z.string().min(1).max(AUTOMATION_PROPOSAL_LIMITS.titleLength),
	why: z
		.array(z.string().min(1).max(AUTOMATION_PROPOSAL_LIMITS.whyLength))
		.max(AUTOMATION_PROPOSAL_LIMITS.whyItems),
	trigger: z.object({
		kind: automationTriggerKindSchema,
		/**
		 * Five-field cron expression of the schedule. When the Schedule Trigger has one cron rule,
		 * this is that rule. Absent when the card cannot say when the workflow runs.
		 */
		cron: z.string().min(1).optional(),
	}),
	/**
	 * The first running nodes of the workflow in their order, for the node icons. Sticky notes and
	 * disabled nodes are left out.
	 */
	steps: z
		.array(z.object({ name: z.string(), type: z.string().min(1) }))
		.max(AUTOMATION_PROPOSAL_LIMITS.steps),
	/** The number of all running nodes. It is larger than `steps.length` when steps were left out. */
	stepCount: z.number().int().nonnegative(),
	recommended: z.object({
		targetId: z.string().min(1),
		kind: runTargetKindSchema,
		reasons: z.array(automationRecommendationReasonSchema).min(1),
	}),
	targets: z.array(automationRunTargetSchema).min(1),
	/** The project that owns the workflow. Its members can see the automation. */
	visibleTo: automationProjectSchema,
	/**
	 * The other projects that the workflow is shared with. Their members can also see and run it.
	 * `projects` holds the first of them, `total` counts all of them.
	 */
	sharedWith: z.object({
		projects: z.array(automationProjectSchema).max(AUTOMATION_PROPOSAL_LIMITS.sharedWith),
		total: z.number().int().nonnegative(),
	}),
	/** True when the workflow is archived. Keeping it also restores it from the archive. */
	archived: z.boolean(),
	/** True when a version of the workflow is live now. */
	active: z.boolean(),
	/**
	 * True when a version is live and the saved version differs from it. "Turn it on" then
	 * replaces the live version with the saved changes.
	 */
	hasUnpublishedChanges: z.boolean(),
	/**
	 * True when the card can turn the workflow on: it has a trigger that starts it, the user can
	 * publish it, and no admin blocked publishing for the n8n Assistant.
	 */
	canActivate: z.boolean(),
	offered: automationProposalOfferedSchema,
});
export type AutomationProposalCard = z.infer<typeof automationProposalCardSchema>;

/** The result of `propose_automation` after the workflow was kept. */
export const automationProposalResultSchema = z.object({
	workflowId: z.string(),
	/** Link that opens the workflow in the editor. */
	url: z.string(),
	/** True when a version of the workflow is live. */
	active: z.boolean(),
	kept: z.literal(true),
	/** Input that the tool ignored, for example a cron expression that is not valid. */
	warnings: z.array(z.string()).optional(),
	/** Set when the workflow was kept, but could not be turned on. */
	error: z.string().optional(),
});
export type AutomationProposalResult = z.infer<typeof automationProposalResultSchema>;
