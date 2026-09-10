import '../../openapi-extend';
import { z } from 'zod';

import { auditReportExamples, noRisksFoundOpenApi } from './audit-public.openapi';
import { securityAuditReportSchema } from '../../schemas/security-audit.schema';

/**
 * Keyed by report title, which the service derives from the risk category. The five titles below
 * are named so that each carries its own example into the spec; the catchall keeps a title from a
 * new reporter in the response, because a plain `z.object` would strip it and answer 200 with the
 * whole section missing.
 */
const auditReportsSchema = z
	.object({
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
	})
	.catchall(securityAuditReportSchema);

/**
 * An instance with no risk to report answers with an empty array in place of the report object.
 * Kept as a capped `z.array` rather than `z.tuple([])`: an empty tuple emits `items: { anyOf: [] }`
 * under OpenAPI 3.0, which is not a valid schema, while `maxItems: 0` says the same thing.
 */
const noRisksFoundSchema = z.array(z.unknown()).max(0).openapi(noRisksFoundOpenApi);

const auditPublicSchema = z.union([auditReportsSchema, noRisksFoundSchema]);

export type AuditPublic = z.infer<typeof auditPublicSchema>;

/**
 * Union-rooted, so `Z.class` (object-rooted) does not fit: the endpoint answers with either the
 * report object or an empty array, and both must survive the registry's response parse.
 *
 * `parse` and `safeParse` are hand-rolled to mirror the part of the `Z.class` surface the public
 * API registry uses, so this class sits beside that contract rather than inside it. A response DTO
 * that needs more of the surface should get a union-capable base instead of copying this.
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
