import { arr, bool, int, lit, num, obj, oneOf, str, union, variant } from '@n8n/node-sdk';

import { googleSheetsTrigger } from '../google-sheets-trigger.node';

/** A resource locator of the built-in node: n8n reads `__rl` to show and resolve it. */
const locator = (hint: string) =>
	obj({ __rl: lit(true), mode: oneOf('url', 'id'), value: str().hint(hint) });

const hour = int().with({ minimum: 0, maximum: 23 }).optional();
const minute = int().with({ minimum: 0, maximum: 59 }).optional();

/** The Google Sheets Trigger node, version 1. */
export const sheetRowsChanged = googleSheetsTrigger.trigger('trigger', {
	trigger: 'On row added or updated',
	summary: 'Polls a sheet and starts the workflow with each row that was added or updated.',
	input: {
		authentication: oneOf('triggerOAuth2', 'serviceAccount')
			.default('triggerOAuth2')
			.hint('serviceAccount uses the googleApi credential'),
		documentId: locator('mode url: the spreadsheet URL; mode id: the spreadsheet ID'),
		sheetName: locator('mode url: a URL with #gid=; mode id: the numeric gid, 0 for the first tab'),
		event: oneOf('rowAdded', 'rowUpdate', 'anyUpdate')
			.default('anyUpdate')
			.hint('rowUpdate and anyUpdate need edit access to the document'),
		includeInOutput: oneOf('new', 'old')
			.optional()
			.hint('For rowUpdate and anyUpdate: the row before or after the change'),
		options: obj({
			columnsToWatch: arr(str())
				.optional()
				.hint('For rowUpdate and anyUpdate: header texts; other columns do not count'),
			dataLocationOnSheet: obj({
				values: variant('rangeDefinition', {
					specifyRangeA1: { range: str().hint('e.g. A1:F20; the first row holds the headers') },
					specifyRange: {
						headerRow: int().with({ minimum: 1 }).optional(),
						firstDataRow: int().with({ minimum: 1 }).optional(),
					},
				}),
			}).optional(),
			valueRender: oneOf('UNFORMATTED_VALUE', 'FORMATTED_VALUE', 'FORMULA')
				.optional()
				.hint('For rowAdded'),
			dateTimeRenderOption: oneOf('SERIAL_NUMBER', 'FORMATTED_STRING')
				.optional()
				.hint('For rowAdded'),
		}).optional(),
		pollTimes: obj({
			item: arr(
				variant('mode', {
					everyMinute: {},
					everyHour: { minute },
					everyDay: { hour, minute },
					everyWeek: { hour, minute, weekday: oneOf('0', '1', '2', '3', '4', '5', '6') },
					everyMonth: { hour, minute, dayOfMonth: int().with({ minimum: 1, maximum: 31 }) },
					everyX: { value: int().with({ minimum: 1 }), unit: oneOf('minutes', 'hours') },
					custom: { cronExpression: str().hint('Six fields, with seconds first') },
				}),
			),
		})
			.optional()
			.hint('Every minute when not set'),
	},
	output: obj({
		row_number: int().optional().hint('For rowUpdate and anyUpdate: the sheet row'),
		change_type: oneOf('added', 'updated').optional().hint('For anyUpdate'),
	}).with({
		additionalProperties: union(str(), num(), bool()).json,
		'x-n8n-hint': 'One key per header cell, exactly as written; an empty cell is ""',
	}),
	native: { type: 'n8n-nodes-base.googleSheetsTrigger', version: 1, on: 'poll' },
});
