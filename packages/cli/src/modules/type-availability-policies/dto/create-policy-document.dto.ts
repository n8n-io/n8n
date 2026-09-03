import { Z } from '@n8n/api-types';

import { policyRuleListSchema } from './policy-rule.schema';

/** Request body for creating a policy document. */
export class CreatePolicyDocumentDto extends Z.class({
	rules: policyRuleListSchema,
}) {}
