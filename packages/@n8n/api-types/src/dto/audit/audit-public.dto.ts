import '../../openapi-extend';

import { z } from 'zod';

import { auditReportFieldDocs, auditRequestFieldDocs } from './audit-public.openapi';
import { Z } from '../../zod-class';

export const SECURITY_AUDIT_CATEGORIES = [
	'credentials',
	'database',
	'nodes',
	'filesystem',
	'instance',
] as const;

export class GenerateAuditPublicDto extends Z.class(
	{
		additionalOptions: z
			.object({
				daysAbandonedWorkflow: z
					.number()
					.int()
					.optional()
					.openapi(auditRequestFieldDocs.daysAbandonedWorkflow),
				categories: z.array(z.enum(SECURITY_AUDIT_CATEGORIES)).optional(),
			})
			.strict()
			.optional(),
	},
	{ strict: true },
) {}

const riskLocationSchema = z.discriminatedUnion('kind', [
	z.object({
		kind: z.literal('node'),
		workflowId: z.string(),
		workflowName: z.string(),
		nodeId: z.string(),
		nodeName: z.string(),
		nodeType: z.string(),
	}),
	z.object({
		kind: z.literal('credential'),
		id: z.string(),
		name: z.string(),
	}),
	z.object({
		kind: z.literal('community'),
		nodeType: z.string(),
		packageUrl: z.string(),
	}),
	z.object({
		kind: z.literal('custom'),
		nodeType: z.string(),
		filePath: z.string(),
	}),
]);

const riskReportSectionSchema = z.object({
	title: z.string(),
	description: z.string(),
	recommendation: z.string(),
	location: z.array(riskLocationSchema).optional(),
	settings: z.record(z.string(), z.unknown()).optional(),
	nextVersions: z.array(z.unknown()).optional(),
});

const riskReportSchema = z.object({
	risk: z.enum(SECURITY_AUDIT_CATEGORIES),
	sections: z.array(riskReportSectionSchema),
});

const auditReportsPublicSchema = z.object({
	'Credentials Risk Report': riskReportSchema.openapi(auditReportFieldDocs.credentials).optional(),
	'Database Risk Report': riskReportSchema.openapi(auditReportFieldDocs.database).optional(),
	'Filesystem Risk Report': riskReportSchema.openapi(auditReportFieldDocs.filesystem).optional(),
	'Nodes Risk Report': riskReportSchema.openapi(auditReportFieldDocs.nodes).optional(),
	'Instance Risk Report': riskReportSchema.openapi(auditReportFieldDocs.instance).optional(),
});

export const auditPublicSchema = z.union([
	auditReportsPublicSchema,
	z.array(z.unknown()).length(0),
]);

export type AuditPublic = z.infer<typeof auditPublicSchema>;

export class AuditPublicDto {
	static schema = auditPublicSchema;

	static safeParse(data: unknown) {
		return auditPublicSchema.safeParse(data);
	}

	static parse(data: unknown): AuditPublic {
		return auditPublicSchema.parse(data);
	}
}
