import { z } from 'zod';

import { policyActionSchema, policyRuleSchema } from './policy-rule.schema';
import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';

/**
 * Response shapes for the public node type policy routes. Request bodies reuse the internal
 * DTOs (`PutInstancePolicyDto`, `PutProjectPolicyDto`, …) so validation is identical on both
 * surfaces; only the responses need a public allowlist.
 */

/** A rule that never matches because an earlier rule in the same list already covers it. */
const shadowWarningSchema = z.object({
	ruleId: z.string(),
	shadowedByRuleId: z.string(),
});

/** Plain array on purpose: the response never re-runs the duplicate-id refinement. */
const policyRulesSchema = z.array(policyRuleSchema);

const effectivePolicySchema = z.object({
	// `null` until the scope is first written; the scope then reports `version: 0`.
	scopeId: z.string().nullable(),
	rules: policyRulesSchema,
	defaultAction: policyActionSchema,
	version: z.number().int().nonnegative(),
});

/** `GET` of a scope's composed policy. */
export class NodeTypePolicyEffectivePublicDto extends Z.class(effectivePolicySchema.shape) {}

/** `PUT` of a scope's composed policy: the new state plus shadowing warnings. */
export class NodeTypePolicyEffectiveWriteResultPublicDto extends Z.class({
	...effectivePolicySchema.shape,
	warnings: z.array(shadowWarningSchema),
}) {}

const policyDocumentSchema = z.object({
	id: z.string(),
	kind: z.string(),
	rules: policyRulesSchema,
	version: z.number().int().positive(),
	/** A user id, or the literal `environment` for env-bootstrap writes. */
	updatedBy: z.string(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

/** One reusable policy document. */
export class NodeTypePolicyDocumentPublicDto extends Z.class(policyDocumentSchema.shape) {}

/** Create or update of a policy document: the document plus shadowing warnings. */
export class NodeTypePolicyDocumentWriteResultPublicDto extends Z.class({
	policy: policyDocumentSchema,
	warnings: z.array(shadowWarningSchema),
}) {}

export class NodeTypePolicyDocumentListPublicDto extends Z.class({
	data: z.array(policyDocumentSchema),
	nextCursor: z.string().nullable(),
}) {}

export class ListNodeTypePolicyDocumentsQueryDto extends Z.class({
	limit: publicApiPaginationSchema.limit,
	cursor: z.string().optional(),
}) {}

const policyAttachmentSchema = z.object({
	policyId: z.string(),
	rules: policyRulesSchema,
	priority: z.number().int(),
	isFloor: z.boolean(),
});

/** The attachments on one scope after a replace, with the scope's bumped version. */
export class NodeTypePolicyAttachmentsPublicDto extends Z.class({
	attachments: z.array(policyAttachmentSchema),
	version: z.number().int().positive(),
}) {}
