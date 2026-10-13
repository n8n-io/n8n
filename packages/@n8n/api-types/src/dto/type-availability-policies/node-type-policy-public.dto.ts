import { z } from 'zod';

import {
	credentialTypePolicyRuleSchemas,
	nodeTypePolicyRuleSchemas,
	policyActionSchema,
} from './policy-rule.schema';
import { Z } from '../../zod-class';
import { publicApiPaginationSchema } from '../pagination/pagination.dto';

/**
 * Response shapes for the public policy routes, one set per policy `kind` because each kind
 * accepts different selectors. Request bodies reuse the internal DTOs (`PutInstancePolicyDto`,
 * `PutCredentialTypeInstancePolicyDto`, …), so validation is identical on both surfaces.
 */

/** A rule that never matches because an earlier rule in the same list already covers it. */
const shadowWarningSchema = z.object({
	ruleId: z.string(),
	shadowedByRuleId: z.string(),
});

/** Plain rule arrays on purpose: a response never re-runs the duplicate-id refinement. */
function publicSchemasFor<Rule extends z.ZodTypeAny>(rule: Rule) {
	const rules = z.array(rule);

	const effectivePolicy = z.object({
		// `null` until the scope is first written; the scope then reports `version: 0`.
		scopeId: z.string().nullable(),
		rules,
		defaultAction: policyActionSchema,
		version: z.number().int().nonnegative(),
	});

	const policyDocument = z.object({
		id: z.string(),
		kind: z.string(),
		rules,
		version: z.number().int().positive(),
		/** A user id, or the literal `environment` for env-bootstrap writes. */
		updatedBy: z.string(),
		createdAt: z.string().datetime(),
		updatedAt: z.string().datetime(),
	});

	const attachment = z.object({
		policyId: z.string(),
		rules,
		priority: z.number().int(),
		isFloor: z.boolean(),
	});

	return {
		effective: effectivePolicy.shape,
		effectiveWriteResult: { ...effectivePolicy.shape, warnings: z.array(shadowWarningSchema) },
		document: policyDocument.shape,
		documentWriteResult: { policy: policyDocument, warnings: z.array(shadowWarningSchema) },
		documentList: { data: z.array(policyDocument), nextCursor: z.string().nullable() },
		// The scope's version after a replace, which always bumps it.
		attachments: { attachments: z.array(attachment), version: z.number().int().positive() },
	};
}

const nodeType = publicSchemasFor(nodeTypePolicyRuleSchemas.rule);
const credentialType = publicSchemasFor(credentialTypePolicyRuleSchemas.rule);

/** `GET` of a scope's composed node type policy. */
export class PolicyEffectivePublicDto extends Z.class(nodeType.effective) {}

/** `PUT` of a scope's composed node type policy: the new state plus shadowing warnings. */
export class PolicyEffectiveWriteResultPublicDto extends Z.class(nodeType.effectiveWriteResult) {}

/** One reusable node type policy document. */
export class PolicyDocumentPublicDto extends Z.class(nodeType.document) {}

/** Create or update of a node type policy document, plus shadowing warnings. */
export class PolicyDocumentWriteResultPublicDto extends Z.class(nodeType.documentWriteResult) {}

export class PolicyDocumentListPublicDto extends Z.class(nodeType.documentList) {}

/** The attachments on one node type scope after a replace. */
export class PolicyAttachmentsPublicDto extends Z.class(nodeType.attachments) {}

export class CredentialTypePolicyEffectivePublicDto extends Z.class(credentialType.effective) {}

export class CredentialTypePolicyEffectiveWriteResultPublicDto extends Z.class(
	credentialType.effectiveWriteResult,
) {}

export class CredentialTypePolicyDocumentPublicDto extends Z.class(credentialType.document) {}

export class CredentialTypePolicyDocumentWriteResultPublicDto extends Z.class(
	credentialType.documentWriteResult,
) {}

export class CredentialTypePolicyDocumentListPublicDto extends Z.class(
	credentialType.documentList,
) {}

export class CredentialTypePolicyAttachmentsPublicDto extends Z.class(credentialType.attachments) {}

export class ListNodeTypePolicyDocumentsQueryDto extends Z.class({
	limit: publicApiPaginationSchema.limit,
	cursor: z.string().optional(),
}) {}
