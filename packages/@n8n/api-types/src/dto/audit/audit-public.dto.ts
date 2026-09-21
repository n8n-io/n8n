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

const auditRiskReportSchema = z.record(z.string(), z.unknown());

const auditReportsPublicSchema = z.object({
	'Credentials Risk Report': auditRiskReportSchema
		.openapi(auditReportFieldDocs.credentials)
		.optional(),
	'Database Risk Report': auditRiskReportSchema.openapi(auditReportFieldDocs.database).optional(),
	'Filesystem Risk Report': auditRiskReportSchema
		.openapi(auditReportFieldDocs.filesystem)
		.optional(),
	'Nodes Risk Report': auditRiskReportSchema.openapi(auditReportFieldDocs.nodes).optional(),
	'Instance Risk Report': auditRiskReportSchema.openapi(auditReportFieldDocs.instance).optional(),
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
