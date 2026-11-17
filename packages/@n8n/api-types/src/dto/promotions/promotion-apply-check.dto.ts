import '../../openapi-extend';

import { z } from 'zod';

import { dataTableColumnTypeSchema } from '../../schemas/data-table.schema';
import { projectIconSchema } from '../../schemas/project.schema';
import {
	dataTableUnresolvedKindSchema,
	tagUnresolvedKindSchema,
} from '../packages/import-blocking-issue.schema';
import { variableTypeSchema, variableValueSchema } from '../variables/base.dto';

const sourceId = z.string().min(1);

export const promotionBindingProjectSchema = z.object({ id: sourceId, name: z.string() });
/**
 * A project on this instance. `name` is left out for a personal project, because its name holds
 * the owner's email.
 */
export const promotionInstanceProjectSchema = z.object({
	id: sourceId,
	name: z.string().optional(),
});
// Report package values unchanged. The create API validates them when used.
export const promotionMissingProjectSchema = promotionBindingProjectSchema.extend({
	icon: z.object({ type: projectIconSchema.shape.type, value: z.string() }).optional(),
	description: z.string().optional(),
	customTelemetryTags: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
});
const workflowSchema = z.object({ id: sourceId, name: z.string() });

export const promotionBindingConsumerSchema = z.object({
	project: promotionBindingProjectSchema,
	workflows: z.array(workflowSchema).min(1),
});
const consumersSchema = z.array(promotionBindingConsumerSchema).min(1);

export const promotionVariableScopeSchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('global') }),
	z.object({ kind: z.literal('project'), project: promotionBindingProjectSchema }),
]);

/**
 * The package reader keeps an expression for each leaf. It also keeps a plain value of a field
 * that decides which other fields show, such as a toggle or an auth type.
 */
export type PromotionCredentialExpressionValue =
	| string
	| boolean
	| PromotionCredentialExpressionValue[]
	| { [key: string]: PromotionCredentialExpressionValue };

const expressionValueComponentName = 'PromotionCredentialExpressionValue';
export const promotionCredentialExpressionValueRef = {
	$ref: `#/components/schemas/${expressionValueComponentName}`,
};

// Describe recursive branches explicitly because the OpenAPI generator cannot inspect z.lazy.
const promotionCredentialExpressionValueSchema: z.ZodType<PromotionCredentialExpressionValue> = z
	.union([
		z.string(),
		z.boolean(),
		z.array(z.lazy(() => promotionCredentialExpressionValueSchema)).openapi({
			type: 'array',
			items: promotionCredentialExpressionValueRef,
		}),
		z.record(z.lazy(() => promotionCredentialExpressionValueSchema)).openapi({
			type: 'object',
			additionalProperties: promotionCredentialExpressionValueRef,
		}),
	])
	.openapi(expressionValueComponentName, {
		description:
			'Values can be strings, booleans, arrays, or nested objects. A string leaf is an expression, ' +
			'except the plain value of a field that decides which other fields show.',
	});

export const promotionCredentialExpressionDataSchema = z
	.record(promotionCredentialExpressionValueSchema)
	.openapi({
		description: 'Credential expressions.',
	});

const credentialSchema = z.object({
	kind: z.literal('credential'),
	sourceId,
	name: z.string(),
	credentialType: z.string().min(1),
	consumers: consumersSchema,
});

export const promotionMissingCredentialBindingSchema = credentialSchema.extend({
	// A credential that the user selected for the Apply needs no workflow of the Apply.
	consumers: z.array(promotionBindingConsumerSchema),
	ownerProject: promotionBindingProjectSchema,
	expressionData: promotionCredentialExpressionDataSchema.optional(),
});

export const promotionMissingVariableBindingSchema = z.object({
	kind: z.literal('variable'),
	name: z.string().min(1),
	variableType: variableTypeSchema,
	scope: promotionVariableScopeSchema,
	/** Bundled creation value. An empty string is a supplied value. */
	sourceValue: variableValueSchema.optional(),
	consumers: consumersSchema,
});

export const promotionBindingAccessRequirementSchema = credentialSchema.extend({
	code: z.literal('access-required'),
});

const credentialConflictSchema = z.object({
	kind: z.literal('credential'),
	sourceId: sourceId.nullable(),
	name: z.string(),
	expectedTypes: z.array(z.string()).min(1),
	filePath: z.string().optional(),
	referenceFiles: z.array(z.string()).min(1),
	consumers: consumersSchema,
});

export const promotionDataTableChangeSchema = z.discriminatedUnion('kind', [
	z.object({
		kind: z.literal('add-column'),
		column: z.string(),
		type: dataTableColumnTypeSchema,
		destructive: z.literal(false),
	}),
	z.object({
		kind: z.literal('remove-column'),
		column: z.string(),
		type: dataTableColumnTypeSchema,
		destructive: z.literal(true),
	}),
	z.object({
		kind: z.literal('change-column-type'),
		column: z.string(),
		from: dataTableColumnTypeSchema,
		to: dataTableColumnTypeSchema,
		destructive: z.literal(true),
	}),
	z.object({
		kind: z.literal('rename-column'),
		from: z.string(),
		to: z.string(),
		destructive: z.literal(false),
	}),
	z.object({ kind: z.literal('reorder-columns'), destructive: z.literal(false) }),
	z.object({
		kind: z.literal('rename-table'),
		from: z.string(),
		to: z.string(),
		destructive: z.literal(false),
	}),
]);

const crossProjectMoveSchema = z.object({
	id: z.string(),
	name: z.string(),
	/** The project that holds the item on the branch. */
	project: promotionBindingProjectSchema,
	/**
	 * False when the branch project does not exist on this instance yet. Then the item can only move
	 * back on the source instance.
	 */
	projectExists: z.boolean(),
	/** The project that holds the item on this instance. */
	instanceProject: promotionInstanceProjectSchema,
	/**
	 * Why the Apply cannot do the move. Apply transfers an item between two team projects when
	 * the operation can change both.
	 * - `personal-project`: this instance holds the item in a personal project.
	 * - `other-project-forbidden`: the user has no right to apply in the other project.
	 * - `other-project-not-covered`: the environment does not cover the other project.
	 * - `project-not-on-branch`: the branch does not hold the project that the item leaves. Only
	 *   an Apply on the environment can do this move, after a confirmation.
	 */
	blockedBy: z
		.enum([
			'personal-project',
			'other-project-forbidden',
			'other-project-not-covered',
			'project-not-on-branch',
		])
		.optional(),
});

/**
 * A workflow or folder that the Apply transfers between two team projects. The id, the history
 * and the executions stay. A project name is left out when the user cannot access the project.
 */
export const promotionPlannedMoveSchema = z.object({
	kind: z.enum(['workflow', 'folder']),
	id: z.string(),
	name: z.string(),
	/** The project that holds the item on this instance. */
	fromProject: promotionInstanceProjectSchema,
	/** The project that holds the item on the branch. */
	toProject: promotionInstanceProjectSchema,
	/**
	 * True when the branch does not hold `fromProject`. Only an Apply on the environment can do
	 * this move, after the user confirms it with `confirmDestructiveChanges`.
	 */
	needsConfirmation: z.boolean(),
	/** Workflow only: the workflow has shares on this instance. The move removes them. */
	losesShares: z.boolean().optional(),
});

/**
 * Continue can confirm a `destructive-change` or `project-deletion` conflict.
 * The other conflicts need a package or target correction before creation can proceed.
 */
export const promotionBindingConflictSchema = z.discriminatedUnion('code', [
	credentialConflictSchema.extend({ code: z.literal('missing-id') }),
	credentialConflictSchema.extend({ code: z.literal('conflicting-types') }),
	credentialConflictSchema.extend({ code: z.literal('unknown-type') }),
	credentialConflictSchema.extend({ code: z.literal('unknown-owner') }),
	credentialConflictSchema.extend({
		code: z.literal('type-mismatch'),
		targetType: z.string(),
	}),
	credentialConflictSchema.extend({
		code: z.literal('incompatible-usage-scope'),
		usageScope: z.string(),
	}),
	z.object({
		kind: z.literal('variable'),
		code: z.literal('missing-definition'),
		name: z.string().min(1),
		referenceFiles: z.array(z.string()).min(1),
		consumers: consumersSchema,
	}),
	z.object({
		kind: z.literal('project'),
		code: z.literal('project-not-team'),
		project: promotionBindingProjectSchema,
		filePath: z.string(),
		workflows: z.array(workflowSchema),
	}),
	/** A full apply deletes each team project that the package does not hold. */
	z.object({
		kind: z.literal('project'),
		code: z.literal('project-deletion'),
		project: promotionBindingProjectSchema,
	}),
	z.object({
		kind: z.literal('data-table'),
		code: z.literal('destructive-change'),
		id: sourceId,
		name: z.string(),
		consumers: consumersSchema,
		/** Every change that the import would make, destructive or not. */
		changes: z.array(promotionDataTableChangeSchema).min(1),
	}),
	/** The import refuses these workflows. `reason` holds the import detail, for logs and support. */
	z.object({
		kind: z.literal('workflow'),
		code: z.enum([
			'workflow-id-conflict',
			'lineage-conflict',
			'policy-violation',
			'missing-node-type',
			'workflow-forbidden',
		]),
		reason: z.string().optional(),
		consumers: consumersSchema,
	}),
	z.object({
		kind: z.literal('data-table'),
		code: z.literal('data-table-conflict'),
		id: sourceId.optional(),
		name: z.string().optional(),
		/** The import's cause. The UI shows a message for each cause. */
		reason: dataTableUnresolvedKindSchema,
		consumers: consumersSchema,
	}),
	z.object({
		kind: z.literal('tag'),
		code: z.literal('tag-conflict'),
		id: sourceId.optional(),
		name: z.string().optional(),
		/** The import's cause. The UI shows a message for each cause. */
		reason: tagUnresolvedKindSchema,
		consumers: consumersSchema,
	}),
	/** Stops every workflow of the project. */
	z.object({
		kind: z.literal('project'),
		code: z.enum(['project-conflict', 'check-not-run', 'import-blocked', 'project-not-on-branch']),
		project: promotionBindingProjectSchema,
		reason: z.string().optional(),
	}),
	/** Apply cannot move a workflow or folder between projects. The fields name both projects. */
	crossProjectMoveSchema.extend({
		kind: z.enum(['workflow', 'folder']),
		code: z.literal('moved'),
	}),
]);

export const promotionBindingWarningSchema = z.object({
	kind: z.literal('variable'),
	code: z.literal('variable-shadowed'),
	name: z.string().min(1),
	scope: z.object({ kind: z.literal('global') }),
	consumers: consumersSchema,
});

/**
 * What stops an Apply. Source IDs define creation scope.
 * This result does not certify a complete mirror or authorize later writes.
 * Callers must enforce the permissions for their endpoint.
 */
export const promotionApplyCheckSchema = z
	.object({
		missingProjects: z.array(promotionMissingProjectSchema).openapi({
			description:
				'Projects in the package that do not exist on this instance. ' +
				'The check keeps their metadata without checking project creation rules. ' +
				'The project creation API can reject invalid values.',
		}),
		missingBindings: z.array(
			z.discriminatedUnion('kind', [
				promotionMissingCredentialBindingSchema,
				promotionMissingVariableBindingSchema,
			]),
		),
		accessRequirements: z.array(promotionBindingAccessRequirementSchema),
		conflicts: z.array(promotionBindingConflictSchema),
		warnings: z.array(promotionBindingWarningSchema),
		/** The moves between team projects that the Apply does. */
		plannedMoves: z.array(promotionPlannedMoveSchema).optional(),
		/** Each project that a planned move changes, so a project Apply can say that it changes two. */
		changedProjects: z.array(promotionInstanceProjectSchema).optional(),
	})
	// One component for the Apply results and the Apply preview.
	.openapi('PromotionApplyCheck');

/** The Apply check of the preview, with the moves between projects as separate lists. */
export const promotionPreviewCheckSchema = promotionApplyCheckSchema.extend({
	/**
	 * Workflows that the branch holds in one project and this instance holds in another, where one of
	 * the two is this project. Apply cannot move them between projects.
	 */
	movedWorkflows: z.array(crossProjectMoveSchema),
	/** Folders that the branch and this instance hold in different projects, as for workflows. */
	movedFolders: z.array(crossProjectMoveSchema),
});

/** A move between two team projects that an Apply did. */
export const promotionAppliedMoveSchema = z.object({
	kind: z.enum(['workflow', 'folder']),
	id: z.string(),
	name: z.string(),
	/** The project that held the item before the Apply. `name` is left out when the user cannot access it. */
	fromProject: promotionInstanceProjectSchema,
	toProject: promotionInstanceProjectSchema,
	/**
	 * Workflow only: the new project refused the published version, so the move unpublished the
	 * workflow. This is the only case where an Apply unpublishes. Show it as a warning.
	 */
	unpublished: z.object({ reason: z.string() }).optional(),
});
export type PromotionAppliedMove = z.infer<typeof promotionAppliedMoveSchema>;

export type PromotionBindingProject = z.infer<typeof promotionBindingProjectSchema>;
export type PromotionMissingProject = z.infer<typeof promotionMissingProjectSchema>;
export type PromotionBindingConsumer = z.infer<typeof promotionBindingConsumerSchema>;
export type PromotionVariableScope = z.infer<typeof promotionVariableScopeSchema>;
export type PromotionCredentialExpressionData = z.infer<
	typeof promotionCredentialExpressionDataSchema
>;
export type PromotionBindingConflict = z.infer<typeof promotionBindingConflictSchema>;
export type PromotionDataTableChange = z.infer<typeof promotionDataTableChangeSchema>;
export type PromotionApplyCheck = z.infer<typeof promotionApplyCheckSchema>;
export type PromotionPreviewCheck = z.infer<typeof promotionPreviewCheckSchema>;
export type PromotionPlannedMove = z.infer<typeof promotionPlannedMoveSchema>;
