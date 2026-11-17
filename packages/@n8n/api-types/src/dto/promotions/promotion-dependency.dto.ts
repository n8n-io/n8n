import '../../openapi-extend';

import { z } from 'zod';

import { promotionProviderTypeSchema } from './promotion-provider.dto';
import { n8nIdSchema } from '../../schemas/id.schema';
import { Z } from '../../zod-class';

const sourceId = z.string().min(1);

/** A project that the user can access. A report never names any other project. */
export const promotionDependencyProjectSchema = z.object({ id: sourceId, name: z.string() });
export type PromotionDependencyProject = z.infer<typeof promotionDependencyProjectSchema>;

/**
 * Why a reference is a gap. One value for each row of the dependency report that is a gap.
 * A client must treat an unknown group as a blocker.
 */
export const promotionGapGroupSchema = z.enum([
	/** Same project as the consumer, not selected. */
	'same-project',
	/** Another project that the user can promote or apply. */
	'other-project',
	/** A project that the user can read and cannot promote or apply. */
	'read-only-project',
	/** A project that the user cannot access. */
	'no-access',
	'personal',
	/** A project that the environment does not cover. */
	'outside-environment',
	/** Apply: the target is archived on the destination. */
	'archived-on-destination',
	/** Apply: the consumer project cannot use the credential, and the user cannot share it. */
	'access-not-grantable',
	/** Apply: the selection deletes the target. */
	'deleted-by-apply',
	/** Apply: the caller policy of the sub-workflow refuses the caller. */
	'caller-policy',
	/** Apply: the branch does not hold the target. A confirmed gap, or a credential of an existing branch. */
	'not-on-branch',
]);
export type PromotionGapGroup = z.infer<typeof promotionGapGroupSchema>;

/** What the user can do about a gap. */
export const promotionGapExitSchema = z.enum([
	'include',
	'open-review',
	'ask-owner',
	'continue-incomplete',
	'restore',
	'remove-deletion',
	'change-policy',
	'add-project',
	'move-to-team-project',
]);
export type PromotionGapExit = z.infer<typeof promotionGapExitSchema>;

export const promotionReferenceUsageSchema = z.enum([
	'credential',
	'sub-workflow',
	'error-workflow',
]);
export type PromotionReferenceUsage = z.infer<typeof promotionReferenceUsageSchema>;

/** The item of the operation that holds the reference. The user can always read it. */
export const promotionReferenceConsumerSchema = z.object({
	kind: z.literal('workflow'),
	id: sourceId,
	name: z.string(),
	projectId: sourceId,
});
export type PromotionReferenceConsumer = z.infer<typeof promotionReferenceConsumerSchema>;

/**
 * The resource that the reference points to. Without access to it, `name` and
 * `credentialType` hold only what the node of the consumer holds, and `project` is not set.
 */
export const promotionReferenceTargetSchema = z.object({
	kind: z.enum(['credential', 'workflow']),
	id: sourceId,
	name: z.string().optional(),
	credentialType: z.string().optional(),
	project: promotionDependencyProjectSchema.optional().openapi({
		description: 'The project that owns the target. Set only when the user can access it.',
	}),
});
export type PromotionReferenceTarget = z.infer<typeof promotionReferenceTargetSchema>;

/** Where the target is. Set only when the user can access the target. */
export const promotionGapStateSchema = z.enum([
	'not-on-branch',
	'in-open-review',
	'missing-on-destination',
	'on-branch',
]);
export type PromotionGapState = z.infer<typeof promotionGapStateSchema>;

/** More about a gap, for the message. A client can ignore a value that it does not know. */
export const promotionGapDetailSchema = z.enum([
	/** Promote: the target is a placeholder on the source. A placeholder is never content. */
	'placeholder-on-source',
	/** Apply: the instance has no sharing licence, so nobody can grant the access. */
	'sharing-not-licensed',
	/** Apply: an incomplete Promote left the target out. */
	'confirmed-gap',
	/** Apply: an earlier version wrote the branch, so the requirement has no reason. */
	'legacy-reference',
	/** Apply: only the published version of the consumer on the destination holds the reference. */
	'published-version',
]);
export type PromotionGapDetail = z.infer<typeof promotionGapDetailSchema>;

/**
 * One reference that will not resolve after the operation. A gap is one consumer and one
 * target, so "2 gaps" counts references.
 */
export const promotionGapSchema = z
	.object({
		id: z.string().min(1).openapi({
			description:
				'Stable for one reference. It comes from the consumer, the target and the usage, so the preview and the operation give the same id. Send it in `confirmedGapIds`.',
		}),
		consumer: promotionReferenceConsumerSchema,
		target: promotionReferenceTargetSchema,
		usage: promotionReferenceUsageSchema,
		group: promotionGapGroupSchema,
		state: promotionGapStateSchema.optional(),
		/** The open review that holds the target. Set only when the user can access it. */
		review: z.object({ reviewId: z.string(), webUrl: z.string().optional() }).optional(),
		exits: z.array(promotionGapExitSchema),
		/** What the client adds to the selection for the exit `include`. */
		include: z.object({ projectId: sourceId, resourceKey: z.string() }).optional(),
		/** The user already sent an "Ask the owner" request for this target. */
		ownerRequestSent: z.boolean().optional(),
		/** Apply: an incomplete Apply creates a placeholder credential for this gap. */
		placeholder: z.boolean().optional(),
		detail: promotionGapDetailSchema.optional(),
	})
	.openapi('PromotionGap');
export type PromotionGap = z.infer<typeof promotionGapSchema>;

/** A reference that does not stop the operation. */
export const promotionDependencyWarningSchema = z.object({
	id: z.string().min(1),
	consumer: promotionReferenceConsumerSchema,
	target: promotionReferenceTargetSchema,
	usage: promotionReferenceUsageSchema,
	code: z.enum(['broken-on-source', 'legacy-workflow-reference']),
});
export type PromotionDependencyWarning = z.infer<typeof promotionDependencyWarningSchema>;

/** Information only. A note is never a gap. */
export const promotionDependencyNoteSchema = z.object({
	consumer: promotionReferenceConsumerSchema,
	/** Not set for a reference that an expression computes: it has no static target. */
	target: promotionReferenceTargetSchema.optional(),
	usage: promotionReferenceUsageSchema,
	code: z.enum(['instance-credential', 'expression-not-checked']),
});
export type PromotionDependencyNote = z.infer<typeof promotionDependencyNoteSchema>;

const credentialRefSchema = z.object({ id: sourceId, name: z.string(), type: z.string() });
const namedRefSchema = z.object({ id: sourceId, name: z.string() });

/** Apply: access to a credential that a consumer project gets after the user confirms. */
export const promotionCredentialGrantSchema = z.object({
	id: z.string().min(1).openapi({
		description:
			'Stable for one credential and one consumer project. Send it in `confirmedGrantIds`.',
	}),
	credential: credentialRefSchema,
	/** The consumer project that gets access. */
	project: promotionDependencyProjectSchema,
	consumers: z.array(namedRefSchema),
});
export type PromotionCredentialGrant = z.infer<typeof promotionCredentialGrantSchema>;

/** Apply: the owner on the destination follows the branch. */
export const promotionCredentialMoveSchema = z.object({
	credential: credentialRefSchema,
	toProject: promotionDependencyProjectSchema,
	/** The owner on the destination now. Set only when the user can access it. */
	fromProject: promotionDependencyProjectSchema.optional(),
	/** The credential is a placeholder, so the move needs rights in `toProject` only. */
	placeholder: z.boolean(),
	/** False when the user may not move the credential. Apply then leaves it as it is. */
	allowed: z.boolean(),
	/** Why `allowed` is false. A managed and an end-user credential never move. */
	blockedReason: z
		.enum(['no-move-right', 'missing-create-right', 'managed', 'end-user'])
		.optional(),
});
export type PromotionCredentialMove = z.infer<typeof promotionCredentialMoveSchema>;

/** Apply: workflows that the Apply does not write and that call a workflow that it deletes. */
export const promotionDeletionCallersSchema = z.object({
	target: namedRefSchema,
	/** Only the callers that the user can access. */
	callers: z.array(
		namedRefSchema.extend({
			projectId: sourceId,
			/** The Apply writes the caller, and only its published version still calls the target. */
			publishedOnly: z.boolean().optional(),
		}),
	),
	/** How many callers the user cannot access. */
	hiddenCallerCount: z.number().int().nonnegative(),
});
export type PromotionDeletionCallers = z.infer<typeof promotionDeletionCallersSchema>;

/** Apply: a workflow that an instance Apply keeps, because a workflow of the package references it. */
export const promotionKeptWorkflowSchema = namedRefSchema.extend({
	projectId: sourceId,
	referencedBy: z.array(namedRefSchema),
});
export type PromotionKeptWorkflow = z.infer<typeof promotionKeptWorkflowSchema>;

/** Apply: a top-level credential file of an existing branch has no owner. The user selects the home. */
export const promotionCredentialHomeChoiceSchema = z.object({
	credential: credentialRefSchema,
	candidateProjects: z.array(promotionDependencyProjectSchema),
});
export type PromotionCredentialHomeChoice = z.infer<typeof promotionCredentialHomeChoiceSchema>;

/**
 * Apply: a project that an instance Apply does not delete, because a workflow of the package
 * uses a credential that the project owns. Only what the user can access.
 */
export const promotionKeptProjectSchema = z.object({
	project: promotionDependencyProjectSchema,
	credentials: z.array(namedRefSchema),
});
export type PromotionKeptProject = z.infer<typeof promotionKeptProjectSchema>;

export const promotionHardBlockCodeSchema = z.enum([
	'credential-type-mismatch',
	'ambiguous-credential-owner',
	'instance-credential-missing',
	'incompatible-usage-scope',
	'placeholder-create-forbidden',
	'credential-move-forbidden',
]);
export type PromotionHardBlockCode = z.infer<typeof promotionHardBlockCodeSchema>;

/** Stops the operation in both modes. A confirmation does not lift it. */
export const promotionHardBlockSchema = z.object({
	code: promotionHardBlockCodeSchema,
	target: promotionReferenceTargetSchema,
	consumer: promotionReferenceConsumerSchema.optional(),
	/** Values for the message, such as both credential types. Only what the user may see. */
	detail: z.record(z.string(), z.string()).optional(),
});
export type PromotionHardBlock = z.infer<typeof promotionHardBlockSchema>;

/**
 * The dependency report of a Promote or an Apply. The preview and the operation compute it
 * from the same plan. It carries only what the user may see.
 */
export const promotionDependencyReportSchema = z
	.object({
		/** The value of the environment setting. */
		allowIncomplete: z.boolean(),
		blocked: z.boolean().openapi({
			description:
				'True when the operation cannot run: the environment is strict and the report has gaps, or it has a hard block.',
		}),
		gaps: z.array(promotionGapSchema),
		warnings: z.array(promotionDependencyWarningSchema),
		notes: z.array(promotionDependencyNoteSchema),
		grants: z.array(promotionCredentialGrantSchema),
		credentialMoves: z.array(promotionCredentialMoveSchema),
		deletionCallers: z.array(promotionDeletionCallersSchema),
		keptWorkflows: z.array(promotionKeptWorkflowSchema),
		/** How many kept workflows the user cannot access. */
		hiddenKeptWorkflowCount: z.number().int().nonnegative().optional(),
		/** Apply: the projects that an instance Apply keeps for their credentials. */
		keptProjects: z.array(promotionKeptProjectSchema).optional(),
		/** How many kept projects the user cannot access. */
		hiddenKeptProjectCount: z.number().int().nonnegative().optional(),
		credentialHomeChoices: z.array(promotionCredentialHomeChoiceSchema),
		hardBlocks: z.array(promotionHardBlockSchema),
	})
	.openapi('PromotionDependencyReport');
export type PromotionDependencyReport = z.infer<typeof promotionDependencyReportSchema>;

export class PromotionDependencyReportDto extends Z.class(promotionDependencyReportSchema.shape) {}

/** A report with nothing in it, for the code paths that do not compute one yet. */
export function emptyPromotionDependencyReport(
	allowIncomplete: boolean,
): PromotionDependencyReport {
	return {
		allowIncomplete,
		blocked: false,
		gaps: [],
		warnings: [],
		notes: [],
		grants: [],
		credentialMoves: [],
		deletionCallers: [],
		keptWorkflows: [],
		credentialHomeChoices: [],
		hardBlocks: [],
	};
}

/**
 * The gaps that the user saw and accepts. The operation computes the gaps again. When the two
 * lists differ, it writes nothing and returns the status `gaps-changed`.
 */
export const confirmedGapIdsSchema = z
	.array(z.string().min(1))
	.optional()
	.openapi({
		description:
			'The `id` of each gap that the user accepts, from the dependency report of the preview. ' +
			'Needs an environment that allows incomplete operations. When the list differs from the ' +
			'current gaps, the operation returns status `gaps-changed` and changes nothing.',
	});

/** The confirmations of an Apply. A confirmation never gives a permission. */
export const promotionApplyConfirmationShape = {
	confirmedGapIds: confirmedGapIdsSchema,
	confirmedGrantIds: z.array(z.string().min(1)).optional().openapi({
		description: 'The `id` of each credential grant that the user accepts, from the report.',
	}),
	confirmDeletionCallers: z.boolean().optional().openapi({
		description:
			'Accepts that the Apply deletes workflows that other workflows on this instance call.',
	}),
	credentialHomes: z.record(n8nIdSchema, n8nIdSchema).optional().openapi({
		description:
			'The project that gets each credential that the branch holds without an owner, by credential id.',
	}),
};

/** A created placeholder credential, in the result of an incomplete Apply. */
export const promotionPlaceholderResultSchema = z.object({
	id: sourceId,
	name: z.string(),
	type: z.string(),
	projectId: sourceId,
});
export type PromotionPlaceholderResult = z.infer<typeof promotionPlaceholderResultSchema>;

/** What an Apply did for its dependencies. Each list holds only what the user may see. */
export const promotionApplyDependencyResultShape = {
	placeholders: z.array(promotionPlaceholderResultSchema).optional(),
	grants: z.array(promotionCredentialGrantSchema).optional(),
	credentialMoves: z.array(promotionCredentialMoveSchema).optional(),
	keptWorkflows: z.array(promotionKeptWorkflowSchema).optional(),
	keptProjects: z.array(promotionKeptProjectSchema).optional(),
	/** Sentences for a client without its own texts, such as the CLI. One for each fact. */
	dependencyMessages: z.array(z.string()).optional(),
};

const ownerRequestTargetSchema = z.object({
	kind: z.enum(['credential', 'workflow']),
	id: n8nIdSchema,
});

/**
 * "Ask the owner". The environment gives the operation: a promote environment asks for a
 * Promote, an apply environment asks for an Apply.
 */
export class CreatePromotionOwnerRequestDto extends Z.class(
	{
		target: ownerRequestTargetSchema,
		/** The workflow of the user that holds the reference. It proves that the user knows the id. */
		consumerWorkflowId: n8nIdSchema,
	},
	{ strict: true },
) {}

/** The response never says anything about the owner project. */
export const promotionOwnerRequestResultSchema = z.object({ status: z.literal('sent') });
export type PromotionOwnerRequestResult = z.infer<typeof promotionOwnerRequestResultSchema>;

export class PromotionOwnerRequestResultDto extends Z.class(
	promotionOwnerRequestResultSchema.shape,
) {}

/** The environment of a project for one direction, as a user of the project may see it. */
const projectEnvironmentFields = {
	id: n8nIdSchema,
	name: z.string(),
	/** The kind of provider, so a client knows whether a Promote can open a review. */
	providerType: promotionProviderTypeSchema,
	allowIncomplete: z.boolean(),
	branchName: z.string(),
	/** Whether the user can run the operation of this direction in the project. */
	canOperate: z.boolean(),
};

/**
 * The environments that serve one project. A project admin reads this without the global
 * promotion scopes. A direction is left out when no environment covers the project.
 */
export const promotionProjectEnvironmentsSchema = z.object({
	promote: z
		.object({ ...projectEnvironmentFields, createBranchOnPromotion: z.boolean() })
		.optional(),
	apply: z.object(projectEnvironmentFields).optional(),
});
export type PromotionProjectEnvironments = z.infer<typeof promotionProjectEnvironmentsSchema>;

export class PromotionProjectEnvironmentsDto extends Z.class(
	promotionProjectEnvironmentsSchema.shape,
) {}
