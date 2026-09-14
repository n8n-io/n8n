import { z } from 'zod';

import { Z } from '../../zod-class';

/**
 * Result of the read-only binding check that runs before an Apply imports a
 * package. It lists every credential and variable the incoming workflows need
 * that the destination cannot resolve, with the facts pre-flight can establish
 * about each one. It never chooses where to create an item. All ids and names
 * are source values from the package files.
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
export const promotionDestinationProjectSchema = z.enum(['team', 'personal', 'absent']);

/**
 * What the package files say about who owns the item. A file inside an exported
 * project directory names its owner. A file outside every project directory
 * does not: the owner can be global or a project that was not exported.
 */
export const promotionSourcePlacementSchema = z.discriminatedUnion('state', [
	z.object({
		state: z.literal('known'),
		project: promotionBindingProjectSchema,
		destination: promotionDestinationProjectSchema,
		filePath: z.string(),
	}),
	z.object({ state: z.literal('unknown'), filePath: z.string() }),
	z.object({ state: z.literal('none') }),
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
	/** The destination has no item with this identity. */
	'absent',
	/** Only a global variable with this name exists. The workflow runs with it unless a project variable is created. */
	'global-only',
	/** The destination credential with this id has another type. */
	'type-mismatch',
	/** The destination credential exists but a consuming project cannot use it. */
	'unavailable',
	/** The files do not say which project owns the item. */
	'unknown-owner',
	'owner-project-absent',
	'owner-project-not-team',
	'consuming-project-absent',
	'consuming-project-not-team',
	/** The item is owned by one project and used in others. Creation alone does not grant access there. */
	'sharing-required',
]);

const consumingProjectSchema = z.object({
	project: promotionBindingProjectSchema,
	destination: promotionDestinationProjectSchema,
	workflows: z.array(workflowSchema).min(1),
});

/** One record per source credential id, or per expected type for references without an id. */
export const promotionUnresolvedCredentialSchema = z.object({
	kind: z.literal('credential'),
	sourceId: sourceId.nullable(),
	name: z.string(),
	/** More than one entry means the workflows disagree about the type. */
	expectedTypes: z.array(z.string()).min(1),
	expressionData: promotionCredentialExpressionDataSchema.optional(),
	sourcePlacement: promotionSourcePlacementSchema,
	/** `unchecked` when the reference has no usable id or type. */
	destination: z.enum(['absent', 'exists', 'type-mismatch', 'unchecked']),
	consumers: z
		.array(
			consumingProjectSchema.extend({
				/** `unchecked` when the credential or the project is not there to check against. */
				access: z.enum(['usable', 'unavailable', 'unchecked']),
			}),
		)
		.min(1),
	issues: z.array(promotionBindingIssueSchema).min(1),
});

/** One record per variable name and consuming project. Values are never included. */
export const promotionUnresolvedVariableSchema = z.object({
	kind: z.literal('variable'),
	name: z.string().min(1),
	sourcePlacement: promotionSourcePlacementSchema,
	consumer: consumingProjectSchema,
	/** A project variable resolves the requirement, so a listed variable is at most matched globally. */
	destination: z.enum(['absent', 'global']),
	issues: z.array(promotionBindingIssueSchema).min(1),
});

export const promotionUnresolvedBindingSchema = z.discriminatedUnion('kind', [
	promotionUnresolvedCredentialSchema,
	promotionUnresolvedVariableSchema,
]);

export const promotionBindingPreflightResultSchema = z.object({
	unresolvedBindings: z.array(promotionUnresolvedBindingSchema),
});

export class PromotionBindingPreflightResultDto extends Z.class(
	promotionBindingPreflightResultSchema.shape,
) {}

export type PromotionBindingProject = z.infer<typeof promotionBindingProjectSchema>;
export type PromotionDestinationProject = z.infer<typeof promotionDestinationProjectSchema>;
export type PromotionSourcePlacement = z.infer<typeof promotionSourcePlacementSchema>;
export type PromotionCredentialExpressionData = z.infer<
	typeof promotionCredentialExpressionDataSchema
>;
export type PromotionBindingIssue = z.infer<typeof promotionBindingIssueSchema>;
export type PromotionUnresolvedCredential = z.infer<typeof promotionUnresolvedCredentialSchema>;
export type PromotionUnresolvedVariable = z.infer<typeof promotionUnresolvedVariableSchema>;
export type PromotionUnresolvedBinding = z.infer<typeof promotionUnresolvedBindingSchema>;
export type PromotionBindingPreflightResult = z.infer<typeof promotionBindingPreflightResultSchema>;
