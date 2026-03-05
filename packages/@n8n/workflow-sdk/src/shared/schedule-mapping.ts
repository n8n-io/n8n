/**
 * Bidirectional mapping between simplified schedule options and n8n schedule trigger rules.
 * Used by both the compiler (simplified → SDK) and the generator (SDK → simplified).
 */

const UNIT_TO_INTERVAL: Record<string, { field: string; paramKey: string }> = {
	s: { field: 'seconds', paramKey: 'secondsInterval' },
	m: { field: 'minutes', paramKey: 'minutesInterval' },
	h: { field: 'hours', paramKey: 'hoursInterval' },
	d: { field: 'days', paramKey: 'daysInterval' },
	w: { field: 'weeks', paramKey: 'weeksInterval' },
};

const FIELD_TO_UNIT: Record<string, { unit: string; paramKey: string }> = {
	seconds: { unit: 's', paramKey: 'secondsInterval' },
	minutes: { unit: 'm', paramKey: 'minutesInterval' },
	hours: { unit: 'h', paramKey: 'hoursInterval' },
	days: { unit: 'd', paramKey: 'daysInterval' },
	weeks: { unit: 'w', paramKey: 'weeksInterval' },
};

/** Convert simplified schedule options to n8n rule parameters */
export function toScheduleRule(options: Record<string, unknown>): Record<string, unknown> {
	if (typeof options.every === 'string') {
		const match = (options.every as string).match(/^(\d+)\s*(s|m|h|d|w)$/);
		if (match) {
			const value = parseInt(match[1], 10);
			const info = UNIT_TO_INTERVAL[match[2]];
			return { rule: { interval: [{ field: info.field, [info.paramKey]: value }] } };
		}
	}
	if (typeof options.cron === 'string') {
		return { rule: { interval: [{ field: 'cronExpression', expression: options.cron }] } };
	}
	return { rule: { interval: [{ field: 'days', daysInterval: 1 }] } };
}

/** Convert n8n rule parameters back to simplified schedule string */
export function fromScheduleRule(params: Record<string, unknown>): string {
	const rule = params.rule as { interval?: Array<Record<string, unknown>> } | undefined;
	if (!rule?.interval?.[0]) return "{ every: '1h' }";

	const interval = rule.interval[0];
	const field = interval.field as string;

	if (field === 'cronExpression') {
		return `{ cron: '${interval.expression}' }`;
	}

	const info = FIELD_TO_UNIT[field];
	if (info) {
		return `{ every: '${interval[info.paramKey]}${info.unit}' }`;
	}

	return "{ every: '1h' }";
}
