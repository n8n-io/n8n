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
					.nonnegative()
					.optional()
					.openapi(auditRequestFieldDocs.daysAbandonedWorkflow),
				categories: z.array(z.enum(SECURITY_AUDIT_CATEGORIES)).optional(),
			})
			.strict()
			.optional(),
	},
	{ strict: true },
) {
	// Every field is optional, so an omitted body should generate the default audit
	static override safeParse(data: unknown) {
		return super.safeParse(data ?? {});
	}

	static override parse(data: unknown) {
		return super.parse(data ?? {});
	}
}

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

const versionNodeArraySchema = z.array(z.unknown());

// Registered under a refId so the generator emits it once as a shared component instead of
// inlining it under each of the five named risk reports below.
const versionSchema = z
	.object({
		name: z.string(),
		nodes: versionNodeArraySchema,
		createdAt: z.string(),
		description: z.string(),
		documentationUrl: z.string(),
		hasBreakingChange: z.boolean(),
		// The version-notifications API returns `null`, not `false`/`''`, when a release has no
		// security fix or issue to report.
		hasSecurityFix: z.boolean().nullable(),
		hasSecurityIssue: z.boolean().nullable(),
		securityIssueFixVersion: z.string().nullable(),
	})
	.openapi('AuditVersion');

const riskReportSectionSchema = z.object({
	title: z.string(),
	description: z.string(),
	recommendation: z.string(),
	location: z.array(riskLocationSchema).optional(),
	settings: z.record(z.string(), z.unknown()).optional(),
	nextVersions: z.array(versionSchema).optional(),
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
	z.array(z.unknown()).length(0).openapi({ maxItems: 0 }),
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
