import type { NativeDoc } from 'n8n-workflow';
import { i18n } from '@/plugins/i18n';

// Autocomplete documentation definition for DateTime class static props and methods
export const luxonStaticDocs: Required<NativeDoc> = {
	typeName: 'DateTime',
	properties: {},
	functions: {
		now: {
			doc: {
				name: 'now',
				description: i18n.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.now'),
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimenow',
				returnType: 'DateTime',
			},
		},
		local: {
			doc: {
				name: 'local',
				description: i18n.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.local'),
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimelocal',
				returnType: 'DateTime',
				args: [
					{
						name: 'year',
						optional: true,
						type: 'number',
						description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.year'),
					},
					{
						name: 'month',
						optional: true,
						type: 'number',
						description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.month'),
					},
					{
						name: 'day',
						optional: true,
						type: 'number',
						description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.day'),
					},
					{
						name: 'hour',
						optional: true,
						type: 'number',
						description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.hour'),
					},
					{
						name: 'minute',
						optional: true,
						type: 'number',
						description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.minute'),
					},
					{
						name: 'second',
						optional: true,
						type: 'number',
						description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.second'),
					},
					{
						name: 'millisecond',
						optional: true,
						type: 'number',
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.instanceMethods.millisecond',
						),
					},
				],
				examples: [
					{ example: 'DateTime.local(1982, 12, 3)', evaluated: '1982-12-03T00:00:00.000-05:00' },
				],
			},
		},
		utc: {
			doc: {
				name: 'utc',
				description: i18n.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.utc'),
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeutc',
				returnType: 'DateTime',
				args: [
					{
						name: 'year',
						optional: true,
						type: 'number',
						description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.year'),
					},
					{
						name: 'month',
						optional: true,
						type: 'number',
						description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.month'),
					},
					{
						name: 'day',
						optional: true,
						type: 'number',
						description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.day'),
					},
					{
						name: 'hour',
						optional: true,
						type: 'number',
						description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.hour'),
					},
					{
						name: 'minute',
						optional: true,
						type: 'number',
						description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.minute'),
					},
					{
						name: 'second',
						optional: true,
						type: 'number',
						description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.second'),
					},
					{
						name: 'millisecond',
						optional: true,
						type: 'number',
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.instanceMethods.millisecond',
						),
					},
				],
				examples: [{ example: 'DateTime.utc(1982, 12, 3)', evaluated: '1982-12-03T00:00:00.000Z' }],
			},
		},
		fromJSDate: {
			doc: {
				name: 'fromJSDate',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimefromjsdate',
				returnType: 'DateTime',
				args: [
					{ name: 'date', type: 'Date' },
					{ name: 'options', optional: true, type: 'object' },
				],
			},
		},
		fromMillis: {
			doc: {
				name: 'fromMillis',
				description: i18n.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromMillis',
				),
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimefrommillis',
				returnType: 'DateTime',
				args: [
					{
						name: 'milliseconds',
						type: 'number',
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromMillis.args.milliseconds',
						),
					},
					{
						name: 'options',
						optional: true,
						type: 'object',
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromMillis.args.opts',
						),
					},
				],
				examples: [
					{ example: 'DateTime.fromMillis(1711838940000)', evaluated: '2024-03-30T18:49' },
				],
			},
		},
		fromSeconds: {
			doc: {
				name: 'fromSeconds',
				description: i18n.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromSeconds',
				),
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimefromseconds',
				returnType: 'DateTime',
				args: [
					{
						name: 'seconds',
						type: 'number',
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromSeconds.args.seconds',
						),
					},
					{
						name: 'options',
						optional: true,
						type: 'object',
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromSeconds.args.opts',
						),
					},
				],
				examples: [{ example: 'DateTime.fromSeconds(1711838940)', evaluated: '2024-03-30T18:49' }],
			},
		},
		fromObject: {
			doc: {
				name: 'fromObject',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimefromobject',
				returnType: 'DateTime',
				hidden: true,
				args: [
					{ name: 'obj', type: 'object' },
					{ name: 'options', optional: true, type: 'object' },
				],
			},
		},
		fromISO: {
			doc: {
				name: 'fromISO',
				description: i18n.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.fromISO'),
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimefromiso',
				returnType: 'DateTime',
				args: [
					{ name: 'text', type: 'string' },
					{ name: 'options', optional: true, type: 'object' },
				],
			},
		},
		fromRFC2822: {
			doc: {
				name: 'fromRFC2822',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimefromrfc2822',
				returnType: 'DateTime',
				args: [
					{ name: 'text', type: 'string' },
					{ name: 'options', optional: true, type: 'object' },
				],
			},
		},
		fromHTTP: {
			doc: {
				name: 'fromHTTP',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimefromhttp',
				returnType: 'DateTime',
				args: [
					{ name: 'text', type: 'string' },
					{ name: 'options', optional: true, type: 'object' },
				],
			},
		},
		fromFormat: {
			doc: {
				name: 'fromFormat',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimefromformat',
				returnType: 'DateTime',
				args: [
					{ name: 'text', type: 'string' },
					{ name: 'fmt', type: 'string' },
					{ name: 'options', optional: true, type: 'object' },
				],
			},
		},
		fromSQL: {
			doc: {
				name: 'fromSQL',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimefromsql',
				returnType: 'DateTime',
				args: [
					{ name: 'text', type: 'string' },
					{ name: 'options', optional: true, type: 'object' },
				],
			},
		},
		invalid: {
			doc: {
				name: 'invalid',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeinvalid',
				returnType: 'DateTime',
				hidden: true,
				args: [
					{ name: 'reason', type: 'DateTime' },
					{ name: 'explanation', optional: true, type: 'string' },
				],
			},
		},
		isDateTime: {
			doc: {
				name: 'isDateTime',
				description: i18n.baseText(
					'codeNodeEditor.completer.luxon.dateTimeStaticMethods.isDateTime',
				),
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeisdatetime',
				returnType: 'boolean',
				args: [
					{
						name: 'maybeDateTime',
						type: 'any',
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.dateTimeStaticMethods.isDateTime.args.maybeDateTime',
						),
					},
				],
			},
		},
		expandFormat: {
			doc: {
				name: 'expandFormat',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeexpandformat',
				returnType: 'string',
				hidden: true,
				args: [
					{ name: 'fmt', type: 'any' },
					{ name: 'localeOpts', optional: true, type: 'any' },
				],
			},
		},
		fromFormatExplain: {
			doc: {
				name: 'fromFormatExplain',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimefromformatexplain',
				returnType: 'object',
				hidden: true,
				args: [
					{ name: 'text', type: 'string' },
					{ name: 'fmt', type: 'string' },
					{ name: 'options', optional: true, type: 'object' },
				],
			},
		},
		fromString: {
			doc: {
				name: 'fromString',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimefromstring',
				returnType: 'DateTime',
				hidden: true,
				args: [
					{ name: 'text', type: 'string' },
					{ name: 'fmt', type: 'string' },
					{ name: 'options', optional: true, type: 'object' },
				],
			},
		},
		fromStringExplain: {
			doc: {
				name: 'fromStringExplain',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimefromstringexplain',
				returnType: 'object',
				hidden: true,
				args: [
					{ name: 'text', type: 'string' },
					{ name: 'fmt', type: 'string' },
					{ name: 'options', optional: true, type: 'object' },
				],
			},
		},
		max: {
			doc: {
				name: 'max',
				description: i18n.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.max'),
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimemax',
				returnType: 'DateTime | undefined',
				args: [
					{ name: 'dateTime1', type: 'DateTime' },
					{ name: 'dateTime2', type: 'DateTime' },
					{ name: 'dateTimeN', type: 'DateTime' },
				],
				examples: [
					{
						example:
							"DateTime.max('2024-03-30T18:49'.toDateTime(), '2025-03-30T18:49'.toDateTime())",
						evaluated: '2025-03-30T18:49',
					},
				],
			},
		},
		min: {
			doc: {
				name: 'min',
				description: i18n.baseText('codeNodeEditor.completer.luxon.dateTimeStaticMethods.min'),
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimemin',
				returnType: 'DateTime | undefined',
				args: [
					{ name: 'dateTime1', type: 'DateTime' },
					{ name: 'dateTime2', type: 'DateTime' },
					{ name: 'dateTimeN', type: 'DateTime' },
				],
				examples: [
					{
						example:
							"DateTime.min('2024-03-30T18:49'.toDateTime(), '2025-03-30T18:49'.toDateTime())",
						evaluated: '2024-03-30T18:49',
					},
				],
			},
		},
		parseFormatForOpts: {
			doc: {
				name: 'parseFormatForOpts',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeparseformatforopts',
				returnType: 'string',
				hidden: true,
				args: [
					{ name: 'fmt', type: 'any' },
					{ name: 'localeOpts', optional: true, type: 'any' },
				],
			},
		},
	},
};
