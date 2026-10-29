import { z } from 'zod';

import { credentialTypePolicyRuleSchemas, nodeTypePolicyRuleSchemas } from './policy-rule.schema';
import { Z } from '../../zod-class';

// Optimistic concurrency: callers send the version they last read, so a stale write is rejected.
const versionSchema = z.number().int().nonnegative();

/** Request body for replacing a node type policy document's rules. */
export class UpdatePolicyDocumentDto extends Z.class({
	rules: nodeTypePolicyRuleSchemas.ruleList,
	version: versionSchema,
}) {}

/** Request body for replacing a credential type policy document's rules. */
export class UpdateCredentialTypePolicyDocumentDto extends Z.class({
	rules: credentialTypePolicyRuleSchemas.ruleList,
	version: versionSchema,
}) {}
