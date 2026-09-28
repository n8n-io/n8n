import '../../openapi-extend';

import { z } from 'zod';

import { insightsSummaryQueryFieldDocs } from './insights-summary-public.openapi';
import { Z } from '../../zod-class';

const summaryMetricPublicSchema = <Unit extends string>(unit: Unit) =>
	z.object({
		value: z.number(),
		deviation: z.number().nullable(),
		unit: z.literal(unit),
	});

export class InsightsSummaryPublicDto extends Z.class({
	total: summaryMetricPublicSchema('count'),
	failed: summaryMetricPublicSchema('count'),
	failureRate: summaryMetricPublicSchema('ratio'),
	timeSaved: summaryMetricPublicSchema('minute'),
	averageRunTime: summaryMetricPublicSchema('millisecond'),
}) {}

// `{ offset: true }` matches the legacy `format: date-time` check. `.datetime()` only checks the
// pattern, so an impossible offset such as `+99:99` passes it; the refine rejects those values.
const dateTimeQuerySchema = z
	.string()
	.datetime({ offset: true })
	.refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid datetime');

export class InsightsSummaryQueryPublicDto extends Z.class({
	startDate: dateTimeQuerySchema.optional().openapi(insightsSummaryQueryFieldDocs.startDate),
	endDate: dateTimeQuerySchema.optional().openapi(insightsSummaryQueryFieldDocs.endDate),
	projectId: z.string().optional().openapi(insightsSummaryQueryFieldDocs.projectId),
}) {}
