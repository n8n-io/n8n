import '../../openapi-extend';

import { z } from 'zod';

import {
	promotionCredentialExpressionValueRef,
	promotionDataTableChangeSchema,
	promotionInstanceProjectSchema,
	promotionPreviewCheckSchema,
} from './promotion-apply-check.dto';
import { promotionDependencyReportSchema } from './promotion-dependency.dto';
import { n8nIdSchema } from '../../schemas/id.schema';
import { Z } from '../../zod-class';
import {
	serializedCredentialDataSchema,
	serializedCredentialSchema,
} from '../packages/credential.schema';
import { serializedDataTableSchema } from '../packages/data-table.schema';
import { serializedFolderSchema } from '../packages/folder.schema';
import { serializedProjectSchema } from '../packages/project.schema';
import { serializedTagSchema } from '../packages/tag.schema';
import { serializedVariableSchema } from '../packages/variable.schema';
import { serializedWorkflowSchema } from '../packages/workflow.schema';

export const promotionResourceTypeSchema = z.enum([
	'project',
	'folder',
	'workflow',
	'credential',
	'dataTable',
	'variable',
	'tag',
]);

export type PromotionResourceType = z.infer<typeof promotionResourceTypeSchema>;

/** How the resource changes when the operation runs. `unchanged` resources give context, such as a parent folder. */
export const promotionResourceChangeSchema = z.enum([
	'added',
	'modified',
	'archived',
	'deleted',
	'unchanged',
]);

export type PromotionResourceChange = z.infer<typeof promotionResourceChangeSchema>;

/** Git blob SHAs of the resource file before and after the operation. `null` when that side has no file. */
const revisionSchema = z.object({
	before: z.string().nullable(),
	after: z.string().nullable(),
});

export const promotionResourceSchema = z
	.object({
		/** Stable identity, such as `workflow:<id>` or `variable:project:<projectId>:<name>`. */
		key: z.string(),
		type: promotionResourceTypeSchema,
		id: z.string(),
		name: z.string(),
		previousName: z.string().optional(),
		/** Only for tags on Apply: the local tag with this name that Apply moves to the branch id. */
		previousId: z.string().optional(),
		/** The project or folder that holds the resource. `null` for instance-wide resources. */
		parentKey: z.string().nullable().openapi({
			description:
				'The `key` of the project or folder that holds the resource. `null` for instance-wide resources.',
		}),
		previousParentKey: z.string().nullable().optional(),
		/**
		 * The project that holds the resource, so that a client groups by project without a walk
		 * of `parentKey`. Not set for instance-wide resources and for a top-level credential.
		 */
		projectId: z.string().optional(),
		projectName: z.string().optional(),
		change: promotionResourceChangeSchema.openapi({
			description:
				'How the operation changes the resource. `unchanged` resources give context, such as a parent folder or a workflow that uses a changed credential.',
		}),
		/**
		 * Whether the user can select the resource directly: a workflow, a project or folder that
		 * is added or modified, or a changed credential of the project. Other dependencies come with
		 * the workflows that use them.
		 */
		selectable: z.boolean().openapi({
			description:
				'Whether the resource can be selected for Promote or Apply: a workflow, or a project or folder that is added or modified. Credentials, data tables, variables and tags come with the workflows that use them.',
		}),
		/**
		 * Only on a row of the project that the item leaves, when the view does not hold the other
		 * project: the project that holds the item on the other side. The operation moves the item
		 * between two team projects. It refuses a move into a personal project, and then `name` is
		 * left out. `name` is also left out when the user cannot access the project.
		 */
		movedToProject: promotionInstanceProjectSchema.optional(),
		/**
		 * The project that holds the item on the other side: on the branch for a Promote, on this
		 * instance for an Apply. The item moved into the project of this row. `name` is left out when
		 * the user cannot access the project.
		 */
		movedFromProject: promotionInstanceProjectSchema.optional(),
		/**
		 * Promote only, on a credential of the project: the branch already references the credential
		 * and does not hold it, so a workflow of another project waits for it.
		 */
		neededByBranch: z.boolean().optional(),
		revision: revisionSchema,
	})
	.openapi('PromotionResource');

export type PromotionResource = z.infer<typeof promotionResourceSchema>;

export const promotionResourceDependencySchema = z.object({
	workflowKey: z.string(),
	resourceKey: z.string(),
	/** False when the operation does not carry the resource with the workflow, as for sub-workflows. */
	included: z.boolean().openapi({
		description:
			'Whether selecting the workflow also sends the resource. `false` for sub-workflows, which need their own selection.',
	}),
});

export type PromotionResourceDependency = z.infer<typeof promotionResourceDependencySchema>;

/** Why a promote preview shows no changes. `reviewId` is the open review that holds them. */
export const promotionBlockerSchema = z.object({
	code: z.literal('reviewOpen'),
	reviewId: z.string(),
});

export type PromotionBlocker = z.infer<typeof promotionBlockerSchema>;

export const promotionPreviewSchema = z.object({
	/** The commit the preview was read from. `null` when the branch has no commit yet. */
	commitSha: z.string().nullable(),
	source: z.object({ environmentId: n8nIdSchema, branchName: z.string() }),
	resources: z.array(promotionResourceSchema),
	dependencies: z.array(promotionResourceDependencySchema),
	blocker: promotionBlockerSchema.optional().openapi({
		description:
			'Set when an open review already holds the changes of this project. The preview then lists no resources. Only a Promote that opens a review on a new branch sets it.',
	}),
	/** Apply only: what stops the Apply of each workflow, from the same plan as the resources. */
	check: promotionPreviewCheckSchema.optional(),
	/** The dependency report of the changes that the preview lists. */
	dependencyReport: promotionDependencyReportSchema.optional(),
	/**
	 * A hash of what this preview shows. Promote and Apply compare it with a fresh preview and
	 * stop when the project or its branch changed after the preview was loaded.
	 */
	revision: z.string().openapi({
		description:
			'A hash of what this preview shows. Send it as `expectedPreviewRevision` with Promote or Apply to run only when the preview did not change.',
	}),
});

export type PromotionPreview = z.infer<typeof promotionPreviewSchema>;

export class PromotionPreviewDto extends Z.class(promotionPreviewSchema.shape) {}

/** The preview of a whole-instance Apply. It always has a commit, a check and a revision. */
export const promotionInstanceApplyPreviewSchema = promotionPreviewSchema
	.omit({ blocker: true })
	.extend({
		commitSha: z.string(),
		check: promotionPreviewCheckSchema,
		revision: z.string().openapi({
			description:
				'Send it as `expectedPreviewRevision` to apply only when this instance still matches the preview.',
		}),
	});

export type PromotionInstanceApplyPreview = z.infer<typeof promotionInstanceApplyPreviewSchema>;

export class PromotionInstanceApplyPreviewDto extends Z.class(
	promotionInstanceApplyPreviewSchema.shape,
) {}

/** A project of the changes view. The view lists only projects that the user can access. */
export const promotionEnvironmentChangesProjectSchema = z.object({
	id: n8nIdSchema,
	name: z.string(),
	/** Whether the user can run the operation in the project. False for a project that the user can only read. */
	canOperate: z.boolean(),
});
export type PromotionEnvironmentChangesProject = z.infer<
	typeof promotionEnvironmentChangesProjectSchema
>;

/** Why the changes of one project cannot be promoted now. */
export const promotionProjectBlockerSchema = promotionBlockerSchema.extend({
	projectId: n8nIdSchema,
});
export type PromotionProjectBlocker = z.infer<typeof promotionProjectBlockerSchema>;

/**
 * The changes view of an environment, for Promote and for Apply: the changes of every project
 * of the environment that the user can access, grouped by `projectId` of each resource.
 */
export const promotionEnvironmentChangesSchema = z.object({
	direction: z.enum(['apply', 'promote']),
	/** The commit the preview was read from. `null` when the branch has no commit yet. */
	commitSha: z.string().nullable(),
	source: z.object({ environmentId: n8nIdSchema, branchName: z.string() }),
	projects: z.array(promotionEnvironmentChangesProjectSchema),
	resources: z.array(promotionResourceSchema),
	dependencies: z.array(promotionResourceDependencySchema),
	/** Promote only: the projects whose changes an open review already holds. */
	blockers: z.array(promotionProjectBlockerSchema).optional(),
	/** Apply only: what stops the Apply of each workflow. */
	check: promotionPreviewCheckSchema.optional(),
	dependencyReport: promotionDependencyReportSchema.optional(),
	revision: z.string().openapi({
		description:
			'A hash of what this preview shows. Send it as `expectedPreviewRevision` with Promote or Apply to run only when the preview did not change.',
	}),
});
export type PromotionEnvironmentChanges = z.infer<typeof promotionEnvironmentChangesSchema>;

export class PromotionEnvironmentChangesDto extends Z.class(
	promotionEnvironmentChangesSchema.shape,
) {}

export class PromotionResourceDetailsRequestDto extends Z.class(
	{
		/** The commit of the summary. `null` when the branch had no commit yet. */
		commitSha: z
			.string()
			.regex(/^[0-9a-f]{40}([0-9a-f]{24})?$/)
			.nullable()
			.openapi({
				description: 'The `commitSha` of the preview. `null` when the preview had none.',
			}),
		keys: z
			.array(z.string().min(1))
			.min(1)
			.max(50)
			.openapi({ description: 'The `key` of each resource to read, from the preview.' }),
	},
	{ strict: true },
) {}

const resourceDetailSchema = <Type extends PromotionResourceType, Content extends z.ZodTypeAny>(
	type: Type,
	content: Content,
) =>
	z.object({
		key: z.string(),
		type: z.literal(type),
		/**
		 * The content of the resource file on each side. `null` when the side has no file, or
		 * when its file does not match the package format. In the second case, the revision is set.
		 */
		before: content.nullable(),
		after: content.nullable(),
		revision: revisionSchema,
	});

export const promotionResourceDetailSchema = z
	.discriminatedUnion('type', [
		resourceDetailSchema('project', serializedProjectSchema),
		resourceDetailSchema('folder', serializedFolderSchema),
		resourceDetailSchema('workflow', serializedWorkflowSchema),
		resourceDetailSchema(
			'credential',
			serializedCredentialSchema.extend({
				// The generator cannot read the recursive schema. Describe it, and keep its validation.
				data: serializedCredentialDataSchema.optional().openapi({
					type: 'object',
					additionalProperties: promotionCredentialExpressionValueRef,
				}),
			}),
		),
		resourceDetailSchema('dataTable', serializedDataTableSchema).extend({
			/** Column and name changes of a data table that exists on both sides. */
			dataTableChanges: z.array(promotionDataTableChangeSchema).optional(),
		}),
		resourceDetailSchema('variable', serializedVariableSchema).extend({
			/** True when variable values are left out, because the user cannot list variables. */
			valueHidden: z.boolean().optional(),
		}),
		resourceDetailSchema('tag', serializedTagSchema),
	])
	.openapi('PromotionResourceDetail');

export type PromotionResourceDetail = z.infer<typeof promotionResourceDetailSchema>;

export const promotionResourceDetailsSchema = z.object({
	details: z.array(promotionResourceDetailSchema),
	/** Requested keys that neither side holds anymore. The resource changed after the summary. */
	missingKeys: z.array(z.string()),
});

export type PromotionResourceDetails = z.infer<typeof promotionResourceDetailsSchema>;

export class PromotionResourceDetailsDto extends Z.class(promotionResourceDetailsSchema.shape) {}
