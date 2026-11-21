import {
	ruleSetSchema,
	rulesExportBundleSchema,
	type RuleDefaults,
	type RuleFinding,
	type RuleSet,
} from '@n8n/workflow-rules';
import { z } from 'zod';

import { Z } from '../../zod-class';

// Optimistic concurrency: callers send the version they last read. 0 means "no rule set yet".
const versionSchema = z.number().int().nonnegative();

export class PutWorkflowRuleSetDto extends Z.class({
	ruleSet: ruleSetSchema,
	version: versionSchema,
}) {}

/** Runs the rules over existing workflows. With `ruleSet`, it previews a draft for that scope. */
export class ScanWorkflowRulesDto extends Z.class({
	projectId: z.string().min(1).optional(),
	ruleSet: ruleSetSchema.optional(),
	/** Return at most this many workflows with findings. Totals always count every workflow. */
	limit: z.number().int().min(1).max(500).default(100),
}) {}

export class CreateWorkflowRuleExemptionDto extends Z.class({
	workflowId: z.string().min(1).max(36),
	ruleId: z.string().min(1).max(80),
	reason: z.string().trim().min(1).max(500),
}) {}

export class EffectiveWorkflowRulesQueryDto extends Z.class({
	workflowId: z.string().min(1).max(36).optional(),
}) {}

export const ruleCheckNodeSchema = z
	.object({
		id: z.string().optional(),
		name: z.string(),
		type: z.string(),
		typeVersion: z.number().optional(),
		parameters: z.record(z.unknown()).optional(),
		credentials: z.record(z.unknown()).nullable().optional(),
		disabled: z.boolean().optional(),
		retryOnFail: z.boolean().optional(),
	})
	.passthrough();

/** The parts of a workflow the rules read. Accepts the source control and package file formats. */
export const ruleCheckWorkflowSchema = z
	.object({
		id: z.string().nullable().optional(),
		name: z.string(),
		description: z.string().nullable().optional(),
		nodes: z.array(ruleCheckNodeSchema).max(2000),
		connections: z.record(z.unknown()).nullable().optional(),
		settings: z.record(z.unknown()).nullable().optional(),
	})
	.passthrough();

export class CheckWorkflowRulesDto extends Z.class({
	workflows: z
		.array(
			z.object({
				workflow: ruleCheckWorkflowSchema,
				/** The project whose rules apply. Without it, a known workflow id uses its own project. */
				projectId: z.string().min(1).optional(),
				/** A label for the result, such as the file path in a repository. */
				source: z.string().max(1000).optional(),
			}),
		)
		.min(1)
		.max(500),
}) {}

export interface WorkflowRuleSetResponse {
	ruleSet: RuleSet;
	/** 0 when nobody saved a rule set for this scope yet. */
	version: number;
	updatedAt: string | null;
	updatedBy: { id: string; name: string } | null;
}

export interface WorkflowRuleExemptionResponse {
	id: number;
	workflowId: string;
	workflowName: string;
	projectId: string | null;
	projectName: string | null;
	ruleId: string;
	reason: string;
	createdAt: string;
	createdBy: { id: string; name: string } | null;
}

/** What the editor needs to evaluate one workflow itself. */
export interface EffectiveWorkflowRulesResponse {
	instance: RuleSet;
	project: RuleSet | null;
	defaults: RuleDefaults;
	exemptions: WorkflowRuleExemptionResponse[];
}

export interface WorkflowRulesScanWorkflow {
	id: string;
	name: string;
	projectId: string | null;
	projectName: string | null;
	isPublished: boolean;
	findings: RuleFinding[];
}

export interface WorkflowRulesScanResponse {
	totals: {
		workflows: number;
		workflowsWithBlocking: number;
		workflowsWithWarnings: number;
		publishedWithBlocking: number;
		blocking: number;
		warnings: number;
	};
	rules: Array<{ ruleId: string; blocking: number; warnings: number; workflows: number }>;
	workflows: WorkflowRulesScanWorkflow[];
	/** True when more workflows have findings than `workflows` holds. */
	truncated: boolean;
}

export interface WorkflowRulesCheckResult {
	source: string | null;
	workflowId: string | null;
	workflowName: string;
	projectId: string | null;
	findings: RuleFinding[];
	blocking: number;
	warnings: number;
}

export interface WorkflowRulesCheckResponse {
	results: WorkflowRulesCheckResult[];
	summary: { workflows: number; blocking: number; warnings: number; passed: boolean };
}

const ruleFindingSchema = z.object({
	ruleId: z.string(),
	ruleKind: z.enum(['catalogue', 'custom']),
	scope: z.enum(['instance', 'project']),
	severity: z.enum(['warn', 'block']),
	message: z.string(),
	params: z.record(z.string()),
	nodeId: z.string().optional(),
	nodeName: z.string().optional(),
	parameterPath: z.string().optional(),
	exempted: z.boolean(),
	projectCanExempt: z.boolean(),
});

/** Public API response shapes. Request bodies reuse the internal DTOs above. */
export class WorkflowRuleSetPublicDto extends Z.class({
	ruleSet: ruleSetSchema,
	version: versionSchema,
	updatedAt: z.string().datetime().nullable(),
}) {}

export class WorkflowRulesExportPublicDto extends Z.class(rulesExportBundleSchema.shape) {}

export class WorkflowRulesCheckPublicDto extends Z.class({
	results: z.array(
		z.object({
			source: z.string().nullable(),
			workflowId: z.string().nullable(),
			workflowName: z.string(),
			projectId: z.string().nullable(),
			findings: z.array(ruleFindingSchema),
			blocking: z.number().int().nonnegative(),
			warnings: z.number().int().nonnegative(),
		}),
	),
	summary: z.object({
		workflows: z.number().int().nonnegative(),
		blocking: z.number().int().nonnegative(),
		warnings: z.number().int().nonnegative(),
		passed: z.boolean(),
	}),
}) {}
