import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * Result of the read-only binding check before Apply imports a package.
 * Lists credential and variable bindings that need review. Includes variables
 * that resolve through a global fallback. Each record contains facts from the
 * package and destination. The check never chooses where to create an item.
 * All ids and names are source values from the package files.
 */

const sourceId = z.string().min(1);

export const promotionBindingProjectSchema = z.object({
	id: sourceId,
	name: z.string(),
});

const workflowSchema = z.object({
	id: sourceId,
	name: z.string(),
});

/** What the destination has for a source project id. */
export const promotionDestinationProjectStatusSchema = z.enum(['team', 'personal', 'missing']);

/**
 * What the package files say about who owns the item. A file inside an exported
 * project directory names its owner. A file outside every project directory
 * does not: the owner can be global or a project that was not exported.
 */
export const promotionSourceFileSchema = z.discriminatedUnion('location', [
	z.object({
		location: z.literal('project'),
		project: promotionBindingProjectSchema,
		destinationProjectStatus: promotionDestinationProjectStatusSchema,
		filePath: z.string(),
	}),
	z.object({ location: z.literal('outside-project'), filePath: z.string() }),
	z.object({ location: z.literal('missing') }),
]);

/**
 * Exported credential data. This schema checks the shape only. The package
 * reader validates that every leaf is an n8n expression before it gets here,
 * so no secret can arrive through this field.
 */
export type PromotionCredentialExpressionValue =
	| string
	| PromotionCredentialExpressionValue[]
	| { [key: string]: PromotionCredentialExpressionValue };

const promotionCredentialExpressionValueSchema: z.ZodType<PromotionCredentialExpressionValue> =
	z.lazy(() =>
		z.union([
			z.string(),
			z.array(promotionCredentialExpressionValueSchema),
			z.record(promotionCredentialExpressionValueSchema),
		]),
	);

export const promotionCredentialExpressionDataSchema = z.record(
	promotionCredentialExpressionValueSchema,
);

export const promotionBindingIssueSchema = z.enum([
	/** A workflow node references the credential without an id. */
	'missing-id',
	/** Workflows use one credential id with different credential types. */
	'conflicting-types',
	/** The destination does not know the credential type. */
	'unknown-type',
	/** The destination has no credential with this id. */
	'missing-credential',
	/** The destination has no variable with this name in the project or globally. */
	'missing-variable',
	/** Only a global variable with this name exists. The workflow runs with it unless a project variable is created. */
	'global-only',
	/** The destination credential with this id has another type. */
	'type-mismatch',
	/** The destination credential exists but a consuming project cannot use it. */
	'unavailable',
	/** The files do not say which project owns the item. */
	'unknown-owner',
	/** The project that owns the item does not exist on the destination yet. */
	'owner-project-missing',
	/** The project id that owns the item belongs to a personal project on the destination. */
	'owner-project-not-team',
	/** A project that uses the item does not exist on the destination yet. */
	'consuming-project-missing',
	/** A project id that uses the item belongs to a personal project on the destination. */
	'consuming-project-not-team',
	/** The item is owned by one project and used in others. Creation alone does not grant access there. */
	'sharing-required',
]);

const consumingProjectSchema = z.object({
	project: promotionBindingProjectSchema,
	destinationProjectStatus: promotionDestinationProjectStatusSchema,
	workflows: z.array(workflowSchema).min(1),
});

/** One record per source credential id, or per expected type for references without an id. */
export const promotionCredentialBindingReviewSchema = z.object({
	kind: z.literal('credential'),
	sourceId: sourceId.nullable(),
	name: z.string(),
	/** More than one entry means the workflows disagree about the type. */
	expectedTypes: z.array(z.string()).min(1),
	expressionData: promotionCredentialExpressionDataSchema.optional(),
	sourceFile: promotionSourceFileSchema,
	/** `unchecked` when the reference has no usable id or type. */
	destinationMatch: z.enum(['missing', 'matched', 'type-mismatch', 'unchecked']),
	consumers: z
		.array(
			consumingProjectSchema.extend({
				/** `unchecked` when the credential or the project is not there to check against. */
				accessStatus: z.enum(['usable', 'unavailable', 'unchecked']),
			}),
		)
		.min(1),
	issues: z.array(promotionBindingIssueSchema).min(1),
});

/** One record per variable name and consuming project. Values are never included. */
export const promotionVariableBindingReviewSchema = z.object({
	kind: z.literal('variable'),
	name: z.string().min(1),
	sourceFile: promotionSourceFileSchema,
	consumer: consumingProjectSchema,
	/** A project variable resolves the requirement, so a listed variable is at most matched globally. */
	destinationMatch: z.enum(['missing', 'global-fallback']),
	issues: z.array(promotionBindingIssueSchema).min(1),
});

export const promotionBindingReviewSchema = z.discriminatedUnion('kind', [
	promotionCredentialBindingReviewSchema,
	promotionVariableBindingReviewSchema,
]);

export const promotionBindingPreflightResultSchema = z.object({
	bindingsNeedingReview: z.array(promotionBindingReviewSchema),
});

export class PromotionBindingPreflightResultDto extends Z.class(
	promotionBindingPreflightResultSchema.shape,
) {}

export type PromotionBindingProject = z.infer<typeof promotionBindingProjectSchema>;
export type PromotionDestinationProjectStatus = z.infer<
	typeof promotionDestinationProjectStatusSchema
>;
export type PromotionSourceFile = z.infer<typeof promotionSourceFileSchema>;
export type PromotionCredentialExpressionData = z.infer<
	typeof promotionCredentialExpressionDataSchema
>;
export type PromotionBindingIssue = z.infer<typeof promotionBindingIssueSchema>;
export type PromotionCredentialBindingReview = z.infer<
	typeof promotionCredentialBindingReviewSchema
>;
export type PromotionVariableBindingReview = z.infer<typeof promotionVariableBindingReviewSchema>;
export type PromotionBindingReview = z.infer<typeof promotionBindingReviewSchema>;
export type PromotionBindingPreflightResult = z.infer<typeof promotionBindingPreflightResultSchema>;
