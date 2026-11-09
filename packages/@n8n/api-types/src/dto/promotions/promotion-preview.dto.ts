import { z } from 'zod';

import { promotionChangesSchema } from './promotable-resource.dto';
import {
	promotionBindingProjectSchema,
	promotionDataTableChangeSchema,
	promotionInstanceProjectSchema,
	promotionPreviewCheckSchema,
} from './promotion-apply-check.dto';
import { Z } from '../../zod-class';
import { serializedCredentialSchema } from '../packages/credential.schema';
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

export const promotionResourceSchema = z.object({
	/** Stable identity, such as `workflow:<id>` or `variable:project:<projectId>:<name>`. */
	key: z.string(),
	type: promotionResourceTypeSchema,
	id: z.string(),
	name: z.string(),
	previousName: z.string().optional(),
	/** Only for tags on Apply: the local tag with this name that Apply moves to the branch id. */
	previousId: z.string().optional(),
	/** The project or folder that holds the resource. `null` for instance-wide resources. */
	parentKey: z.string().nullable(),
	previousParentKey: z.string().nullable().optional(),
	change: promotionResourceChangeSchema,
	/** Whether the user can select the resource directly. Only workflows can be selected for now. */
	selectable: z.boolean(),
	/**
	 * Only for deleted workflows on Promote: the project that owns the workflow on this instance now.
	 * Promote refuses the workflow, because the destination would delete it.
	 */
	movedToProject: promotionInstanceProjectSchema.optional(),
	/**
	 * Only for added workflows on Promote: the project that holds the workflow on the branch. It moved
	 * into this project on this instance, and a project promote refuses it.
	 */
	movedFromProject: promotionBindingProjectSchema.optional(),
	revision: revisionSchema,
});

export type PromotionResource = z.infer<typeof promotionResourceSchema>;

export const promotionResourceDependencySchema = z.object({
	workflowKey: z.string(),
	resourceKey: z.string(),
	/** False when the operation does not carry the resource with the workflow, as for sub-workflows. */
	included: z.boolean(),
});

export type PromotionResourceDependency = z.infer<typeof promotionResourceDependencySchema>;

/** Why a promote preview shows no changes. `reviewId` is the open review that holds them. */
export const promotionBlockerSchema = z.object({
	code: z.literal('reviewOpen'),
	reviewId: z.string(),
});

export type PromotionBlocker = z.infer<typeof promotionBlockerSchema>;

export const promotionPreviewSchema = promotionChangesSchema.extend({
	resources: z.array(promotionResourceSchema),
	dependencies: z.array(promotionResourceDependencySchema),
	blocker: promotionBlockerSchema.optional(),
	/** Apply only: what stops the Apply of each workflow, from the same plan as the resources. */
	check: promotionPreviewCheckSchema.optional(),
	/**
	 * Apply only: a hash of the resources and the check. Apply compares it with a fresh preview
	 * and stops when the instance changed after the preview was loaded.
	 */
	revision: z.string().optional(),
});

export type PromotionPreview = z.infer<typeof promotionPreviewSchema>;

export class PromotionResourceDetailsRequestDto extends Z.class(
	{
		/** The commit of the summary. `null` when the branch had no commit yet. */
		commitSha: z
			.string()
			.regex(/^[0-9a-f]{40}([0-9a-f]{24})?$/)
			.nullable(),
		keys: z.array(z.string().min(1)).min(1).max(50),
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

export const promotionResourceDetailSchema = z.discriminatedUnion('type', [
	resourceDetailSchema('project', serializedProjectSchema),
	resourceDetailSchema('folder', serializedFolderSchema),
	resourceDetailSchema('workflow', serializedWorkflowSchema),
	resourceDetailSchema('credential', serializedCredentialSchema),
	resourceDetailSchema('dataTable', serializedDataTableSchema).extend({
		/** Column and name changes of a data table that exists on both sides. */
		dataTableChanges: z.array(promotionDataTableChangeSchema).optional(),
	}),
	resourceDetailSchema('variable', serializedVariableSchema).extend({
		/** True when variable values are left out, because the user cannot list variables. */
		valueHidden: z.boolean().optional(),
	}),
	resourceDetailSchema('tag', serializedTagSchema),
]);

export type PromotionResourceDetail = z.infer<typeof promotionResourceDetailSchema>;

export const promotionResourceDetailsSchema = z.object({
	details: z.array(promotionResourceDetailSchema),
	/** Requested keys that neither side holds anymore. The resource changed after the summary. */
	missingKeys: z.array(z.string()),
});

export type PromotionResourceDetails = z.infer<typeof promotionResourceDetailsSchema>;
