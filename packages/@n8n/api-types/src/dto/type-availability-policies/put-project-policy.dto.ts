import { z } from 'zod';

import {
	credentialTypePolicyRuleSchemas,
	nodeTypePolicyRuleSchemas,
	nonDelegatingPolicyActionSchema,
} from './policy-rule.schema';
import { Z } from '../../zod-class';

// Optimistic concurrency: callers send the version they last read, so a stale write is rejected.
const versionSchema = z.number().int().nonnegative();

/**
 * Request body for setting a project's composed node type policy. Same shape as
 * `PutInstancePolicyDto`, except `delegate` is rejected — there is no scope narrower than
 * project for it to defer to.
 */
export class PutProjectPolicyDto extends Z.class({
	rules: nodeTypePolicyRuleSchemas.nonDelegatingRuleList,
	defaultAction: nonDelegatingPolicyActionSchema,
	version: versionSchema,
}) {}

/** Same as `PutProjectPolicyDto`, for a project's credential type policy. */
export class PutCredentialTypeProjectPolicyDto extends Z.class({
	rules: credentialTypePolicyRuleSchemas.nonDelegatingRuleList,
	defaultAction: nonDelegatingPolicyActionSchema,
	version: versionSchema,
}) {}
