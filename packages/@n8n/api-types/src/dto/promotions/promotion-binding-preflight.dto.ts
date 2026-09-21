import '../../openapi-extend';

import { z } from 'zod';

import { projectIconSchema } from '../../schemas/project.schema';
import { Z } from '../../zod-class';
import { variableTypeSchema, variableValueSchema } from '../variables/base.dto';

const sourceId = z.string().min(1);

export const promotionBindingProjectSchema = z.object({ id: sourceId, name: z.string() });
// Keep legacy package values intact. Project creation validates writable fields.
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

/** The package reader validates that each leaf is an expression. */
export type PromotionCredentialExpressionValue =
	| string
	| PromotionCredentialExpressionValue[]
	| { [key: string]: PromotionCredentialExpressionValue };

const expressionValueComponentName = 'PromotionCredentialExpressionValue';
const expressionValueRef = { $ref: `#/components/schemas/${expressionValueComponentName}` };

// Describe recursive branches explicitly because the OpenAPI generator cannot inspect z.lazy.
const promotionCredentialExpressionValueSchema: z.ZodType<PromotionCredentialExpressionValue> = z
	.union([
		z.string(),
		z.array(z.lazy(() => promotionCredentialExpressionValueSchema)).openapi({
			type: 'array',
			items: expressionValueRef,
		}),
		z.record(z.lazy(() => promotionCredentialExpressionValueSchema)).openapi({
			type: 'object',
			additionalProperties: expressionValueRef,
		}),
	])
	.openapi(expressionValueComponentName, {
		description:
			'Values can be strings, arrays, or nested objects. Every leaf is an expression string.',
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

/** Conflicts need a package or target correction before creation can proceed. */
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
]);

export const promotionBindingWarningSchema = z.object({
	kind: z.literal('variable'),
	code: z.literal('variable-shadowed'),
	name: z.string().min(1),
	scope: z.object({ kind: z.literal('global') }),
	consumers: consumersSchema,
});

/**
 * Read-only check of package references. Source IDs define creation scope.
 * This result does not certify a complete mirror or authorize later writes.
 * Callers must enforce the permissions for their endpoint.
 */
export const promotionBindingPreflightResultSchema = z.object({
	missingProjects: z.array(promotionMissingProjectSchema),
	missingBindings: z.array(
		z.discriminatedUnion('kind', [
			promotionMissingCredentialBindingSchema,
			promotionMissingVariableBindingSchema,
		]),
	),
	accessRequirements: z.array(promotionBindingAccessRequirementSchema),
	conflicts: z.array(promotionBindingConflictSchema),
	warnings: z.array(promotionBindingWarningSchema),
});

export class PromotionBindingPreflightResultDto extends Z.class(
	promotionBindingPreflightResultSchema.shape,
) {}

export type PromotionBindingProject = z.infer<typeof promotionBindingProjectSchema>;
export type PromotionBindingConsumer = z.infer<typeof promotionBindingConsumerSchema>;
export type PromotionVariableScope = z.infer<typeof promotionVariableScopeSchema>;
export type PromotionCredentialExpressionData = z.infer<
	typeof promotionCredentialExpressionDataSchema
>;
export type PromotionBindingConflict = z.infer<typeof promotionBindingConflictSchema>;
export type PromotionBindingPreflightResult = z.infer<typeof promotionBindingPreflightResultSchema>;
