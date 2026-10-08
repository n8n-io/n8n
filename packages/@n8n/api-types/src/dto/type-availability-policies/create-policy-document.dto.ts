import { policyRuleListSchema } from './policy-rule.schema';
import { Z } from '../../zod-class';

/** Request body for creating a policy document. */
export class CreatePolicyDocumentDto extends Z.class({
	rules: policyRuleListSchema,
}) {}
