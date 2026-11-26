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
});

/**
 * Continue can confirm a `destructive-change` or `project-deletion` conflict.
 * The other conflicts need a package or target correction before creation can proceed.
 */
export const promotionBindingConflictSchema = z.discriminatedUnion('code', [
	credentialConflictSchema.extend({ code: z.literal('missing-id') }),
	credentialConflictSchema.extend({ code: z.literal('conflicting-types') }),
	credentialConflictSchema.extend({ code: z.literal('unknown-type') }),
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

const promotionVariableShadowedWarningSchema = z.object({
	kind: z.literal('variable'),
	code: z.literal('variable-shadowed'),
	name: z.string().min(1),
	scope: z.object({ kind: z.literal('global') }),
	consumers: consumersSchema,
});

export const promotionMissingDependencyKindSchema = z.enum(['credential', 'variable', 'workflow']);

/**
 * Where a missing dependency stands for the user:
 * - `needs-action`: Apply only. The user can resolve it on this instance.
 * - `outside-access`: it is in a project that the user cannot access, or the branch does not hold
 *   it under a project (Apply, reason `not-on-branch`). The user cannot resolve it here.
 * - `other-project`: Promote only. It is in another project that the user can access. Promote does not include it.
 * - `personal`: Promote only. It is in a personal project, which a promotion does not carry.
 */
export const promotionMissingDependencyGroupSchema = z.enum([
	'needs-action',
	'outside-access',
	'other-project',
	'personal',
]);

/**
 * Promote reports `not-on-branch` and `personal-project`. Apply reports the other reasons, and
 * `not-on-branch` for a dependency that this instance lacks and that the branch does not hold
 * under a project.
 */
export const promotionMissingDependencyReasonSchema = z.enum([
	'not-on-branch',
	'personal-project',
	'not-on-instance',
	'not-shared',
	'type-mismatch',
	'unknown-type',
	'incompatible-usage-scope',
	'archived',
	'caller-policy',
]);

/**
 * A credential, variable, sub-workflow or error workflow that a workflow of the operation uses,
 * and that is not on the branch after a Promote, or not usable on this instance after an Apply.
 * It never names the owner of the dependency. It names the project only when the user can read it.
 */
export const promotionMissingDependencySchema = z
	.object({
		kind: promotionMissingDependencyKindSchema.openapi({
			description: 'A sub-workflow and an error workflow are both `workflow`.',
		}),
		id: sourceId.optional().openapi({
			description: 'The id that the workflows reference. A variable has no id.',
		}),
		name: z.string(),
		credentialType: z.string().min(1).optional(),
		group: promotionMissingDependencyGroupSchema.openapi({
			description:
				'`needs-action` (Apply): you can resolve it on this instance. ' +
				'`outside-access`: it is in a project that you cannot access, or (Apply, reason `not-on-branch`) the branch does not hold it under a project. ' +
				'`other-project` (Promote): it is in another project that you can access, and this Promote does not include it. ' +
				'`personal` (Promote): it is in a personal project, which a promotion does not carry.',
		}),
		reason: promotionMissingDependencyReasonSchema,
		accessible: z.boolean().openapi({
			description: 'Whether you can access the project that holds the dependency.',
		}),
		project: promotionBindingProjectSchema.optional().openapi({
			description:
				'The team project that holds the dependency. Only an entry of the group `other-project` has it, because you can access that project.',
		}),
		blocking: z.boolean().openapi({
			description:
				'Whether the operation stops on this dependency until you resolve it. When false, the operation continues without it when the request sends `confirmMissingDependencies`.',
		}),
		condition: z.enum(['target-selected', 'target-not-selected']).optional().openapi({
			description:
				'Only in the Apply preview of a project, for a workflow entry. The entry holds only when the selection includes (`target-selected`) or does not include (`target-not-selected`) the workflow with this `id`. Without it, the entry holds for every selection.',
		}),
		consumers: consumersSchema,
	})
	.openapi('PromotionMissingDependency');

/** A dependency that a workflow references and that does not exist on the source instance. */
export const promotionDependencyWarningSchema = z
	.object({
		kind: promotionMissingDependencyKindSchema,
		code: z.literal('missing-on-source'),
		id: sourceId.optional(),
		name: z.string(),
		consumers: consumersSchema,
	})
	.openapi('PromotionDependencyWarning');

/**
 * What an Apply reports without stopping. `missing-on-source`: Promote marked the reference as
 * broken on the source instance, so it is not a missing dependency and needs no confirmation.
 */
export const promotionBindingWarningSchema = z.discriminatedUnion('code', [
	promotionVariableShadowedWarningSchema,
	promotionDependencyWarningSchema,
]);

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
		missingDependencies: z.array(promotionMissingDependencySchema).openapi({
			description:
				'Every credential, variable, sub-workflow and error workflow that the applied workflows use, and that is not usable on this instance after the Apply. ' +
				'An entry of the group `needs-action` can also be in `missingBindings`, `accessRequirements` or `conflicts`, which hold the details to resolve it. ' +
				'An entry of the group `outside-access` is only in this list.',
		}),
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
export type PromotionMissingDependencyKind = z.infer<typeof promotionMissingDependencyKindSchema>;
export type PromotionMissingDependencyGroup = z.infer<typeof promotionMissingDependencyGroupSchema>;
export type PromotionMissingDependencyReason = z.infer<
	typeof promotionMissingDependencyReasonSchema
>;
export type PromotionMissingDependency = z.infer<typeof promotionMissingDependencySchema>;
export type PromotionDependencyWarning = z.infer<typeof promotionDependencyWarningSchema>;
export type PromotionBindingWarning = z.infer<typeof promotionBindingWarningSchema>;
