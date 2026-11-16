/**
 * A converted Schedule Trigger fires when the v1 node fires: the cron
 * expression of each rule is the expression of `toCronExpression` of
 * n8n-nodes-base, and the trigger item is the item of the v1 node.
 */
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { convertWorkflow } from '../index.ts';

const here = dirname(fileURLToPath(import.meta.url));
const v1File = join(here, '../../../../../nodes-base/dist/nodes/Schedule/GenericFunctions.js');

const workflowWith = (interval: Record<string, unknown>) => ({
	id: 'wf-1',
	name: 'Schedule',
	nodes: [
		{
			id: 'node-1',
			name: 'Schedule Trigger',
			type: 'n8n-nodes-base.scheduleTrigger',
			typeVersion: 1.2,
			position: [0, 0],
			parameters: { rule: { interval: [interval] } },
		},
		{
			id: 'node-2',
			name: 'Edit Fields',
			type: 'n8n-nodes-base.set',
			typeVersion: 3.4,
			position: [200, 0],
			parameters: {},
		},
	],
	connections: {
		'Schedule Trigger': { main: [[{ node: 'Edit Fields', type: 'main', index: 0 }]] },
	},
});

const RULES: Array<Record<string, unknown>> = [
	{ field: 'seconds', secondsInterval: 30 },
	{ field: 'minutes', minutesInterval: 5 },
	{ field: 'hours', hoursInterval: 1 },
	{ field: 'hours', hoursInterval: 1, triggerAtMinute: 15 },
	{ field: 'days', daysInterval: 1 },
	{ field: 'days', daysInterval: 1, triggerAtHour: 9, triggerAtMinute: 30 },
	{ field: 'weeks', weeksInterval: 1, triggerAtDay: [1, 3], triggerAtHour: 8 },
	{ field: 'months', monthsInterval: 1, triggerAtDayOfMonth: 12 },
	{ field: 'months', monthsInterval: 1 },
];

describe.runIf(existsSync(v1File))('Schedule Trigger against v1', () => {
	const v1: { toCronExpression: (interval: unknown, nodeKey: string) => string } = createRequire(
		import.meta.url,
	)(v1File);

	it.each(RULES.map((rule) => ({ rule, label: JSON.stringify(rule) })))(
		'has the cron expression of v1 for $label',
		({ rule }) => {
			const result = convertWorkflow(workflowWith(rule));
			const expected = v1.toCronExpression({ triggerAtDay: [0], ...rule }, 'wf-1:node-1');
			expect(result.source).toContain(`schedule({ cron: '${expected}'`);
		},
	);

	it('keeps an interval above 1 as an `every` schedule, because v1 filters its fires by the last run', () => {
		const result = convertWorkflow(workflowWith({ field: 'hours', hoursInterval: 2 }));
		expect(result.source).toContain("every: { unit: 'hours', value: 2");
	});

	it('gives the item of the v1 node by default', () => {
		const result = convertWorkflow(workflowWith({ field: 'days', daysInterval: 1 }));
		expect(result.source).toContain('scheduleItem(trigger.scheduledAt');
	});
});
