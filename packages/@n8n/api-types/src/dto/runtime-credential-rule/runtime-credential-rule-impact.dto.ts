import {
	runtimeCredentialRuleNodeTypeSchema,
	runtimeCredentialRulePathSchema,
} from './runtime-credential-rule.dto';
import { Z } from '../../zod-class';

/** The rule values to check. `nodeType: '*'` means any trigger. */
export class RuntimeCredentialRuleImpactDto extends Z.class({
	nodeType: runtimeCredentialRuleNodeTypeSchema,
	path: runtimeCredentialRulePathSchema,
}) {}

export type RuntimeCredentialRuleImpactWorkflow = {
	id: string;
	name: string;
	projectId: string;
	projectName: string;
	/** Nodes that read the removed value. At most 20 names. */
	nodeNames: string[];
};

export type RuntimeCredentialRuleImpact = {
	workflows: RuntimeCredentialRuleImpactWorkflow[];
	/** True when the list is not complete (more than 100 matches, or the scan limit was reached). */
	truncated: boolean;
};
