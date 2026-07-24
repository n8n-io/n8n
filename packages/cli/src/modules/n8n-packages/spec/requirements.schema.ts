import { z } from 'zod';

export const packageCredentialRequirementSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	type: z.string().min(1),
	usedByWorkflows: z.array(z.string().min(1)).min(1),
});

export const packageDataTableRequirementSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	usedByWorkflows: z.array(z.string().min(1)).min(1),
});

export const packageWorkflowRequirementSchema = z.object({
	id: z.string().min(1),
	name: z.string().min(1),
	usedByWorkflows: z.array(z.string().min(1)).min(1),
});

// Node types used by the packaged workflows, folded into unique
// `(type, typeVersion)` pairs. Informational/derived only: import re-derives
// node type usage from workflow content and never trusts this section.
export const packageNodeTypeRequirementSchema = z.object({
	type: z.string().min(1),
	// `finite()`: JSON like `1e999` parses to Infinity (mirrors the workflow node schema).
	typeVersion: z.number().finite(),
	usedByWorkflows: z.array(z.string().min(1)).min(1),
});

// Variables are keyed by name, not id: a `$vars.<name>` reference resolves
// project-scope-first then global at runtime, so one requirement may be
// satisfied by different rows on different instances — no single portable id
// can travel with it.
export const packageVariableRequirementSchema = z.object({
	name: z.string().min(1),
	value: z.string().optional(),
	usedByWorkflows: z.array(z.string().min(1)).min(1),
});

function assertNoDuplicateKey<T>(
	entries: T[] | undefined,
	keyOf: (entry: T) => string,
	label: string,
	ctx: z.RefinementCtx,
) {
	if (!entries) return;
	const seen = new Set<string>();
	for (const entry of entries) {
		const key = keyOf(entry);
		if (seen.has(key)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Duplicate ${label}: ${key}`,
			});
		}
		seen.add(key);
	}
}

export const packageRequirementsSchema = z.object({
	credentials: z
		.array(packageCredentialRequirementSchema)
		.optional()
		.superRefine((credentials, ctx) =>
			assertNoDuplicateKey(credentials, ({ id }) => id, 'credential id', ctx),
		),
	dataTables: z
		.array(packageDataTableRequirementSchema)
		.optional()
		.superRefine((dataTables, ctx) =>
			assertNoDuplicateKey(dataTables, ({ id }) => id, 'data table id', ctx),
		),
	workflows: z
		.array(packageWorkflowRequirementSchema)
		.optional()
		.superRefine((workflows, ctx) =>
			assertNoDuplicateKey(workflows, ({ id }) => id, 'workflow id', ctx),
		),
	variables: z
		.array(packageVariableRequirementSchema)
		.optional()
		.superRefine((variables, ctx) =>
			assertNoDuplicateKey(variables, ({ name }) => name, 'variable name', ctx),
		),
	nodeTypes: z
		.array(packageNodeTypeRequirementSchema)
		.optional()
		.superRefine((nodeTypes, ctx) =>
			assertNoDuplicateKey(
				nodeTypes,
				({ type, typeVersion }) => `${type}@${typeVersion}`,
				'node type',
				ctx,
			),
		),
});

export type PackageCredentialRequirement = z.infer<typeof packageCredentialRequirementSchema>;
export type PackageDataTableRequirement = z.infer<typeof packageDataTableRequirementSchema>;
export type PackageWorkflowRequirement = z.infer<typeof packageWorkflowRequirementSchema>;
export type PackageVariableRequirement = z.infer<typeof packageVariableRequirementSchema>;
export type PackageNodeTypeRequirement = z.infer<typeof packageNodeTypeRequirementSchema>;
export type PackageRequirements = z.infer<typeof packageRequirementsSchema>;
