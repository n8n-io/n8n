import '../../openapi-extend';
import { z } from 'zod';

import { daysAbandonedWorkflowOpenApi } from './audit-public.openapi';
import { Z } from '../../zod-class';

/**
 * Listed in the order the hand-written `audit.yml` used, because the generator emits enum members
 * in declaration order. `AuditRiskCategory` is asserted against the backend `Risk.Category` union
 * at the call site, so the two cannot drift apart unnoticed.
 */
export const AUDIT_RISK_CATEGORIES = [
	'credentials',
	'database',
	'nodes',
	'filesystem',
	'instance',
] as const;

export type AuditRiskCategory = (typeof AUDIT_RISK_CATEGORIES)[number];

const auditAdditionalOptionsSchema = z.object({
	daysAbandonedWorkflow: z.number().int().optional().openapi(daysAbandonedWorkflowOpenApi),
	categories: z.array(z.enum(AUDIT_RISK_CATEGORIES)).optional(),
});

/**
 * Not strict: the schema this replaced set no `additionalProperties: false`, so the legacy
 * validator accepted and ignored unknown body keys. A strict DTO would answer 400 where the
 * endpoint answers 200 today.
 */
export class GenerateAuditRequestDto extends Z.class({
	additionalOptions: auditAdditionalOptionsSchema.optional(),
}) {}
