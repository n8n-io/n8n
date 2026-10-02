import { t } from '@n8n/node-sdk';

import { googleSheetsTrigger } from '../google-sheets-trigger.node';

/** A resource locator of the built-in node: n8n reads `__rl` to show and resolve it. */
const locator = (hint: string) =>
	t.obj({ __rl: t.lit(true), mode: t.oneOf('url', 'id'), value: t.str().hint(hint) });

const hour = t.int().with({ minimum: 0, maximum: 23 }).optional();
const minute = t.int().with({ minimum: 0, maximum: 59 }).optional();

/** The Google Sheets Trigger node, version 1. */
export const sheetRowsChanged = googleSheetsTrigger.trigger('trigger', {
	trigger: 'On row added or updated',
	summary: 'Polls a sheet and starts the workflow with each row that was added or updated.',
	input: {
		authentication: t
			.oneOf('triggerOAuth2', 'serviceAccount')
			.default('triggerOAuth2')
			.hint('serviceAccount uses the googleApi credential'),
		documentId: locator('mode url: the spreadsheet URL; mode id: the spreadsheet ID'),
		sheetName: locator('mode url: a URL with #gid=; mode id: the numeric gid, 0 for the first tab'),
		event: t
			.oneOf('rowAdded', 'rowUpdate', 'anyUpdate')
			.default('anyUpdate')
			.hint('rowUpdate and anyUpdate need edit access to the document'),
		includeInOutput: t
			.oneOf('new', 'old')
			.optional()
			.hint('For rowUpdate and anyUpdate: the row before or after the change'),
		options: t
			.obj({
				columnsToWatch: t
					.arr(t.str())
					.optional()
					.hint('For rowUpdate and anyUpdate: header texts; other columns do not count'),
				dataLocationOnSheet: t
					.obj({
						values: t.variant('rangeDefinition', {
							specifyRangeA1: {
								range: t.str().hint('e.g. A1:F20; the first row holds the headers'),
							},
							specifyRange: {
								headerRow: t.int().with({ minimum: 1 }).optional(),
								firstDataRow: t.int().with({ minimum: 1 }).optional(),
							},
						}),
					})
					.optional(),
				valueRender: t
					.oneOf('UNFORMATTED_VALUE', 'FORMATTED_VALUE', 'FORMULA')
					.optional()
					.hint('For rowAdded'),
				dateTimeRenderOption: t
					.oneOf('SERIAL_NUMBER', 'FORMATTED_STRING')
					.optional()
					.hint('For rowAdded'),
			})
			.optional(),
		pollTimes: t
			.obj({
				item: t.arr(
					t.variant('mode', {
						everyMinute: {},
						everyHour: { minute },
						everyDay: { hour, minute },
						everyWeek: { hour, minute, weekday: t.oneOf('0', '1', '2', '3', '4', '5', '6') },
						everyMonth: { hour, minute, dayOfMonth: t.int().with({ minimum: 1, maximum: 31 }) },
						everyX: { value: t.int().with({ minimum: 1 }), unit: t.oneOf('minutes', 'hours') },
						custom: { cronExpression: t.str().hint('Six fields, with seconds first') },
					}),
				),
			})
			.optional()
			.hint('Every minute when not set'),
	},
	output: t
		.obj({
			row_number: t.int().optional().hint('For rowUpdate and anyUpdate: the sheet row'),
			change_type: t.oneOf('added', 'updated').optional().hint('For anyUpdate'),
		})
		.with({
			additionalProperties: t.union(t.str(), t.num(), t.bool()).json,
			'x-n8n-hint': 'One key per header cell, exactly as written; an empty cell is ""',
		}),
	native: { type: 'n8n-nodes-base.googleSheetsTrigger', version: 1, on: 'poll' },
});
