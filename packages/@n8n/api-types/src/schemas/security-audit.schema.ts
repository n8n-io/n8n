import { z } from 'zod';

export const securityAuditRiskLocationSchema = z.union([
	z.object({ kind: z.literal('credential'), id: z.string(), name: z.string() }),
	z.object({
		kind: z.literal('node'),
		workflowId: z.string(),
		workflowName: z.string(),
		nodeId: z.string(),
		nodeName: z.string(),
		nodeType: z.string(),
	}),
	z.object({ kind: z.literal('community'), nodeType: z.string(), packageUrl: z.string() }),
	z.object({ kind: z.literal('custom'), nodeType: z.string(), filePath: z.string() }),
]);

export const securityAuditRiskSectionSchema = z.object({
	title: z.string(),
	description: z.string(),
	recommendation: z.string(),
	location: z.array(securityAuditRiskLocationSchema).optional(),
	settings: z.record(z.unknown()).optional(),
	// Relayed as received from the n8n version API, so the entries stay opaque here: a tighter
	// schema would turn an upstream field change into a 500 for the caller.
	nextVersions: z.array(z.record(z.unknown())).optional(),
});

export const securityAuditReportSchema = z.object({
	// A string rather than an enum: the report title already names the category, and a new reporter
	// must not make the response fail to parse.
	risk: z.string(),
	sections: z.array(securityAuditRiskSectionSchema),
});

export type SecurityAuditReport = z.infer<typeof securityAuditReportSchema>;
