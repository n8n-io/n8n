import '../../openapi-extend';
import { z } from 'zod';

import { auditReportExamples, noRisksFoundOpenApi } from './audit-public.openapi';
import { securityAuditReportSchema } from '../../schemas/security-audit.schema';

const auditReportsSchema = z.object({
	'Credentials Risk Report': securityAuditReportSchema
		.optional()
		.openapi({ example: auditReportExamples.credentials }),
	'Database Risk Report': securityAuditReportSchema
		.optional()
		.openapi({ example: auditReportExamples.database }),
	'Filesystem Risk Report': securityAuditReportSchema
		.optional()
		.openapi({ example: auditReportExamples.filesystem }),
	'Nodes Risk Report': securityAuditReportSchema
		.optional()
		.openapi({ example: auditReportExamples.nodes }),
	'Instance Risk Report': securityAuditReportSchema
		.optional()
		.openapi({ example: auditReportExamples.instance }),
});

/** An instance with no risk to report answers with an empty array in place of the report object. */
const noRisksFoundSchema = z.array(z.unknown()).max(0).openapi(noRisksFoundOpenApi);

const auditPublicSchema = z.union([auditReportsSchema, noRisksFoundSchema]);

export type AuditPublic = z.infer<typeof auditPublicSchema>;

/**
 * Union-rooted, so `Z.class` (object-rooted) does not fit: the endpoint answers with either the
 * report object or an empty array, and both must survive the registry's response parse.
 */
export class AuditPublicDto {
	static schema = auditPublicSchema;

	static parse(data: unknown): AuditPublic {
		return auditPublicSchema.parse(data);
	}

	static safeParse(data: unknown) {
		return auditPublicSchema.safeParse(data);
	}
}
