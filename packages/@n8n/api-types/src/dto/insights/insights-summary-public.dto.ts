import '../../openapi-extend';

import { z } from 'zod';

import { insightsSummaryQueryFieldDocs } from './insights-summary-public.openapi';
import { Z } from '../../zod-class';

/** One summary metric: the value for the selected range, the change against the previous range, and the unit. */
const summaryMetricPublicSchema = <Unit extends string>(unit: Unit) =>
	z.object({
		value: z.number(),
		// Null when the previous range holds no executions, so there is nothing to compare against.
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

// `{ offset: true }` matches the legacy `format: date-time` check exactly: it accepts `Z` and a
// numeric offset, and rejects a value with no timezone. The shape check still passes an offset
// that is out of range, such as `+99:99`, so the refine rejects what `Date` cannot parse.
const dateTimeQuerySchema = z
	.string()
	.datetime({ offset: true })
	.refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid datetime');

export class InsightsSummaryQueryPublicDto extends Z.class({
	startDate: dateTimeQuerySchema.optional().openapi(insightsSummaryQueryFieldDocs.startDate),
	endDate: dateTimeQuerySchema.optional().openapi(insightsSummaryQueryFieldDocs.endDate),
	projectId: z.string().optional().openapi(insightsSummaryQueryFieldDocs.projectId),
}) {}
