import { Z } from '@n8n/api-types';

import { policyRuleListSchema } from './policy-rule.schema';

/** Request body for replacing a policy document's rules. */
export class UpdatePolicyDocumentDto extends Z.class({
	rules: policyRuleListSchema,
}) {}
