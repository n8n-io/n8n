import { z } from 'zod';

import {
	credentialTypePolicyRuleSchemas,
	nodeTypePolicyRuleSchemas,
	policyActionSchema,
} from './policy-rule.schema';
import { Z } from '../../zod-class';

// Optimistic concurrency: callers send the version they last read, so a stale write is rejected.
const versionSchema = z.number().int().nonnegative();

/** Request body for setting the composed instance node type policy. */
export class PutInstancePolicyDto extends Z.class({
	rules: nodeTypePolicyRuleSchemas.ruleList,
	defaultAction: policyActionSchema,
	version: versionSchema,
}) {}

/** Request body for setting the composed instance credential type policy. */
export class PutCredentialTypeInstancePolicyDto extends Z.class({
	rules: credentialTypePolicyRuleSchemas.ruleList,
	defaultAction: policyActionSchema,
	version: versionSchema,
}) {}
