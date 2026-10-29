import { credentialTypePolicyRuleSchemas, nodeTypePolicyRuleSchemas } from './policy-rule.schema';
import { Z } from '../../zod-class';

/** Request body for creating a node type policy document. */
export class CreatePolicyDocumentDto extends Z.class({
	rules: nodeTypePolicyRuleSchemas.ruleList,
}) {}

/** Request body for creating a credential type policy document. */
export class CreateCredentialTypePolicyDocumentDto extends Z.class({
	rules: credentialTypePolicyRuleSchemas.ruleList,
}) {}
