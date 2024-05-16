import type { NativeDoc } from 'n8n-workflow';
import { i18n } from '@/plugins/i18n';

// Autocomplete documentation definition for DateTime instance props and methods
export const luxonInstanceDocs: Required<NativeDoc> = {
	typeName: 'DateTime',
	properties: {
		day: {
			doc: {
				name: 'day',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.day'),
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeday',
				returnType: 'number',
				examples: [{ example: "dt = '2024-03-30T18:49'.toDateTime()\ndt.day", evaluated: '30' }],
			},
		},
		daysInMonth: {
			doc: {
				name: 'daysInMonth',
				section: 'query',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimedaysinmonth',
				returnType: 'number',
			},
		},
		daysInYear: {
			doc: {
				name: 'daysInYear',
				hidden: true,
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimedaysinyear',
				returnType: 'number',
			},
		},
		hour: {
			doc: {
				name: 'hour',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.hour'),
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimehour',
				returnType: 'number',
				examples: [{ example: "dt = '2024-03-30T18:49'.toDateTime()\ndt.hour", evaluated: '18' }],
			},
		},
		locale: {
			doc: {
				name: 'locale',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.locale'),
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimelocale',
				returnType: 'string',
				examples: [{ example: '$now.locale', evaluated: "'en-US'" }],
			},
		},
		millisecond: {
			doc: {
				name: 'millisecond',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.millisecond'),
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimemillisecond',
				returnType: 'number',
				examples: [
					{
						example: "dt = '2024-03-30T18:49:07.234'.toDateTime()\ndt.millisecond",
						evaluated: '234',
					},
				],
			},
		},
		minute: {
			doc: {
				name: 'minute',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.minute'),
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeminute',
				returnType: 'number',
				examples: [
					{ example: "dt = '2024-03-30T18:49:07.234'.toDateTime()\ndt.minute", evaluated: '49' },
				],
			},
		},
		month: {
			doc: {
				name: 'month',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.month'),
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimemonth',
				returnType: 'number',
				examples: [
					{ example: "dt = '2024-03-30T18:49:07.234'.toDateTime()\ndt.month", evaluated: '3' },
				],
			},
		},
		monthLong: {
			doc: {
				name: 'monthLong',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.monthLong'),
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimemonthlong',
				returnType: 'string',
				examples: [
					{
						example: "dt = '2024-03-30T18:49:07.234'.toDateTime()\ndt.monthLong",
						evaluated: "'March'",
					},
					{
						example: "dt = '2024-03-30T18:49:07.234'.toDateTime()\ndt.setLocale('de-DE').monthLong",
						evaluated: "'März'",
					},
				],
			},
		},
		monthShort: {
			doc: {
				name: 'monthShort',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.monthShort'),
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimemonthshort',
				returnType: 'string',
				examples: [
					{
						example: "dt = '2024-03-30T18:49:07.234'.toDateTime()\ndt.monthShort",
						evaluated: "'Mar'",
					},
					{
						example:
							"dt = '2024-03-30T18:49:07.234'.toDateTime()\ndt.setLocale('de-DE').monthShort",
						evaluated: "'Mär'",
					},
				],
			},
		},
		numberingSystem: {
			doc: {
				name: 'numberingSystem',
				section: 'query',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimenumberingsystem',
				returnType: 'string',
			},
		},
		offset: {
			doc: {
				name: 'offset',
				section: 'query',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeoffset',
				returnType: 'number',
			},
		},
		offsetNameLong: {
			doc: {
				name: 'offsetNameLong',
				section: 'query',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeoffsetnamelong',
				returnType: 'string',
			},
		},
		offsetNameShort: {
			doc: {
				name: 'offsetNameShort',
				section: 'query',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeoffsetnameshort',
				returnType: 'string',
			},
		},
		ordinal: {
			doc: {
				name: 'ordinal',
				section: 'query',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeordinal',
				returnType: 'string',
			},
		},
		outputCalendar: {
			doc: {
				name: 'outputCalendar',
				section: 'query',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeoutputcalendar',
				returnType: 'string',
			},
		},
		quarter: {
			doc: {
				name: 'quarter',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.quarter'),
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimequarter',
				returnType: 'number',
				examples: [
					{ example: "dt = '2024-03-30T18:49'.toDateTime()\ndt.quarter", evaluated: '1' },
					{ example: "'2024-12-01T18:49'.toDateTime().quarter", evaluated: '4' },
				],
			},
		},
		second: {
			doc: {
				name: 'second',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.second'),
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimesecond',
				returnType: 'number',
				examples: [
					{ example: "dt = '2024-03-30T18:49:07.234'.toDateTime()\ndt.second", evaluated: '7' },
				],
			},
		},
		weekday: {
			doc: {
				name: 'weekday',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.weekday'),
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeweekday',
				returnType: 'number',
				examples: [{ example: "dt = '2024-03-30T18:49'.toDateTime()\ndt.weekday", evaluated: '6' }],
			},
		},
		weekdayLong: {
			doc: {
				name: 'weekdayLong',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.weekdayLong'),
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeweekdaylong',
				returnType: 'string',
				examples: [
					{
						example: "dt = '2024-03-30T18:49'.toDateTime()\ndt.weekdayLong",
						evaluated: "'Saturday'",
					},
					{
						example: "dt = '2024-03-30T18:49'.toDateTime()\ndt.setLocale('de-DE').weekdayLong",
						evaluated: "'Samstag'",
					},
				],
			},
		},
		weekdayShort: {
			doc: {
				name: 'weekdayShort',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.weekdayShort'),
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeweekdayshort',
				returnType: 'string',
				examples: [
					{ example: "dt = '2024-03-30T18:49'.toDateTime()\ndt.weekdayShort", evaluated: "'Sat'" },
					{
						example: "dt = '2024-03-30T18:49'.toDateTime()\ndt.setLocale('fr-FR').weekdayShort",
						evaluated: "'sam.'",
					},
				],
			},
		},
		weekNumber: {
			doc: {
				name: 'weekNumber',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.weekNumber'),
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeweeknumber',
				returnType: 'number',
				examples: [
					{ example: "dt = '2024-03-30T18:49'.toDateTime()\ndt.weekNumber", evaluated: '13' },
				],
			},
		},
		weeksInWeekYear: {
			doc: {
				name: 'weeksInWeekYear',
				section: 'query',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeweeksinweekyear',
				returnType: 'number',
			},
		},
		weekYear: {
			doc: {
				name: 'weekYear',
				section: 'query',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeweekyear',
				returnType: 'number',
			},
		},
		year: {
			doc: {
				name: 'year',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.year'),
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeyear',
				returnType: 'number',
				examples: [{ example: "dt = '2024-03-30T18:49'.toDateTime()\ndt.year", evaluated: '2024' }],
			},
		},
		zone: {
			doc: {
				name: 'zone',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.zone'),
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimezone',
				returnType: 'Zone',
				examples: [
					{ example: '$now.zone', evaluated: '{ zoneName: "Europe/Berlin", valid: true }' },
				],
			},
		},
		zoneName: {
			doc: {
				name: 'zoneName',
				section: 'query',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimezonename',
				returnType: 'string',
			},
		},
		isInDST: {
			doc: {
				name: 'isInDST',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.isInDST'),
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeisindst',
				returnType: 'boolean',
			},
		},
		isInLeapYear: {
			doc: {
				name: 'isInLeapYear',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.isInLeapYear'),
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeisinleapyear',
				returnType: 'boolean',
				examples: [
					{ example: "'2024'.toDateTime().isInLeapYear", evaluated: 'true' },
					{ example: "'2025'.toDateTime().isInLeapYear", evaluated: 'false' },
				],
			},
		},
		isOffsetFixed: {
			doc: {
				name: 'isOffsetFixed',
				section: 'query',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeisoffsetfixed',
				returnType: 'boolean',
			},
		},
		isValid: {
			doc: {
				name: 'isValid',
				hidden: true,
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeisvalid',
				returnType: 'boolean',
			},
		},
	},
	functions: {
		diff: {
			doc: {
				name: 'diff',
				hidden: true,
				section: 'compare',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimediff',
				returnType: 'Duration',
				args: [
					{ name: 'other', type: 'DateTime' },
					{ name: 'unit', type: 'string | string[]' },
					{ name: 'options', type: 'Object' },
				],
			},
		},
		diffNow: {
			doc: {
				name: 'diffNow',
				hidden: true,
				section: 'compare',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimediffnow',
				returnType: 'Duration',
				args: [
					{ name: 'unit', type: 'string | string[]' },
					{ name: 'options', type: 'Object' },
				],
			},
		},
		endOf: {
			doc: {
				name: 'endOf',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.endOf'),
				section: 'edit',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeendof',
				returnType: 'DateTime',
				args: [
					{
						name: 'unit',
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.instanceMethods.endOf.args.unit',
						),
						type: 'string',
					},
					{
						name: 'options',
						optional: true,
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.instanceMethods.endOf.args.opts',
						),
						default: '{}',
						type: 'Object',
					},
				],
				examples: [
					{
						example: "dt = '2024-03-30T18:49'.toDateTime()\ndt.endOf('month')",
						evaluated: '[DateTime: 2024-03-31T23:59:59.999Z]',
					},
				],
			},
		},
		equals: {
			doc: {
				name: 'equals',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.equals'),
				section: 'compare',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeequals',
				returnType: 'boolean',
				args: [
					{
						name: 'other',
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.instanceMethods.equals.args.other',
						),
						type: 'DateTime',
					},
				],
				examples: [
					{
						example:
							"dt = '2024-03-20T18:49+02:00'.toDateTime()\ndt.equals('2024-03-20T19:49+02:00'.toDateTime())",
						evaluated: 'false',
					},
				],
			},
		},
		hasSame: {
			doc: {
				name: 'hasSame',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.hasSame'),
				section: 'compare',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimehassame',
				returnType: 'boolean',
				args: [
					{
						name: 'other',
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.instanceMethods.hasSame.args.other',
						),
						type: 'DateTime',
					},
					{
						name: 'unit',
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.instanceMethods.hasSame.args.unit',
						),
						type: 'string',
					},
				],
				examples: [
					{
						example: "'2024-03-20'.toDateTime().hasSame('2024-03-18'.toDateTime(), 'month')",
						evaluated: 'true',
					},
					{
						example: "'1982-03-20'.toDateTime().hasSame('2024-03-18'.toDateTime(), 'month')",
						evaluated: 'false',
					},
				],
			},
		},
		reconfigure: {
			doc: {
				name: 'reconfigure',
				section: 'other',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimereconfigure',
				returnType: 'DateTime',
				args: [{ name: 'properties', type: 'Object' }],
			},
		},
		resolvedLocaleOptions: {
			doc: {
				name: 'resolvedLocaleOptions',
				section: 'other',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeresolvedlocaleoptions',
				returnType: 'Object',
				args: [{ name: 'options', type: 'Object' }],
			},
		},
		set: {
			doc: {
				name: 'set',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.set'),
				section: 'edit',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeset',
				returnType: 'DateTime',
				args: [
					{
						name: 'values',
						optional: false,
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.instanceMethods.set.args.values',
						),
						type: 'Object',
					},
				],
				examples: [
					{
						example: "dt = '2024-03-30T18:49'.toDateTime()\ndt.set({ year:1982, month:10 })",
						evaluated: '[DateTime: 1982-10-20T18:49:00.000Z]',
					},
				],
			},
		},
		setLocale: {
			doc: {
				name: 'setLocale',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.setLocale'),
				section: 'edit',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimesetlocale',
				returnType: 'DateTime',
				args: [
					{
						name: 'locale',
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.instanceMethods.setLocale.args.locale',
						),
						type: 'string',
					},
				],
				examples: [
					{
						example: "$now.setLocale('de-DE').toLocaleString({ dateStyle: 'long' })",
						evaluated: "'5. Oktober 2024'",
					},
					{
						example: "$now.setLocale('fr-FR').toLocaleString({ dateStyle: 'long' })",
						evaluated: "'5 octobre 2024'",
					},
				],
			},
		},
		setZone: {
			doc: {
				name: 'setZone',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.setZone'),
				section: 'edit',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimesetzone',
				returnType: 'DateTime',
				args: [
					{
						name: 'zone',
						optional: true,
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.instanceMethods.setZone.args.zone',
						),
						default: '"local"',
						type: 'string',
					},
					{
						name: 'options',
						optional: true,
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.instanceMethods.setZone.args.opts',
						),
						type: 'Object',
					},
				],
				examples: [
					{
						example:
							"dt = '2024-01-01T00:00:00.000+02:00'.toDateTime()\ndt.setZone('America/Buenos_Aires')",
						evaluated: '[DateTime: 2023-12-31T19:00:00.000-03:00]',
					},
					{
						example: "dt = '2024-01-01T00:00:00.000+02:00'.toDateTime()\ndt.setZone('UTC+7')",
						evaluated: '[DateTime: 2024-01-01T05:00:00.000+07:00]',
					},
				],
			},
		},
		startOf: {
			doc: {
				name: 'startOf',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.startOf'),
				section: 'edit',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimestartof',
				returnType: 'DateTime',
				args: [
					{
						name: 'unit',
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.instanceMethods.startOf.args.unit',
						),
						type: 'string',
					},
					{
						name: 'options',
						optional: true,
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.instanceMethods.startOf.args.opts',
						),
						type: 'Object',
					},
				],
				examples: [
					{
						example: "'2024-03-20T18:49'.toDateTime().startOf('month')",
						evaluated: '[DateTime: 2024-03-01T00:00:00.000Z]',
					},
				],
			},
		},
		toBSON: {
			doc: {
				name: 'toBSON',
				section: 'format',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetobson',
				returnType: 'Date',
			},
		},
		toFormat: {
			doc: {
				name: 'toFormat',
				section: 'format',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
				args: [
					{ name: 'fmt', type: 'string' },
					{ name: 'options', type: 'Object' },
				],
			},
		},
		toHTTP: {
			doc: {
				name: 'toHTTP',
				section: 'format',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetohttp',
				returnType: 'string',
			},
		},
		toISO: {
			doc: {
				name: 'toISO',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.toISO'),
				section: 'format',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetoiso',
				returnType: 'string',
				args: [
					{
						name: 'options',
						optional: true,
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.instanceMethods.toISO.args.opts',
						),
						type: 'Object',
					},
				],
				examples: [{ example: '$now.toISO()', evaluated: "'2024-04-05T18:44:55.525+02:00'" }],
			},
		},
		toISODate: {
			doc: {
				name: 'toISODate',
				section: 'format',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetoisodate',
				returnType: 'string',
				args: [{ name: 'options', type: 'Object' }],
			},
		},
		toISOTime: {
			doc: {
				name: 'toISOTime',
				section: 'format',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetoisotime',
				returnType: 'string',
				args: [{ name: 'options', type: 'Object' }],
			},
		},
		toISOWeekDate: {
			doc: {
				name: 'toISOWeekDate',
				section: 'format',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetoisoweekdate',
				returnType: 'string',
			},
		},
		toJSDate: {
			doc: {
				name: 'toJSDate',
				section: 'format',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetojsdate',
				returnType: 'Date',
			},
		},
		toJSON: {
			doc: {
				name: 'toJSON',
				section: 'format',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetojson',
				returnType: 'string',
			},
		},
		toLocal: {
			doc: {
				name: 'toLocal',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.toLocal'),
				section: 'edit',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetolocal',
				returnType: 'DateTime',
				examples: [
					{
						example: "dt = '2024-01-01T00:00:00.000Z'.toDateTime()\ndt.toLocal()",
						evaluated: '[DateTime: 2024-01-01T01:00:00.000+01:00]',
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.instanceMethods.toLocal.example',
						),
					},
				],
			},
		},
		toLocaleParts: {
			doc: {
				name: 'toLocaleParts',
				section: 'format',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetolocaleparts',
				returnType: 'string',
				args: [
					{ name: 'formatOpts', type: 'any' },
					{ name: 'options', type: 'Object' },
				],
			},
		},
		toLocaleString: {
			doc: {
				name: 'toLocaleString',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.toLocaleString'),
				section: 'format',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetolocalestring',
				returnType: 'string',
				args: [
					{
						name: 'formatOpts',
						optional: true,
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.instanceMethods.toLocaleString.args.opts',
						),
						type: 'Object',
					},
				],
				examples: [
					{ example: '$now.toLocaleString()', evaluated: "'4/30/2024'" },
					{
						example: "$now.toLocaleString({ dateStyle: 'medium', timeStyle: 'short' })",
						evaluated: "'Apr 30, 2024, 10:00 PM'",
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.instanceMethods.toLocaleString.example',
						),
					},
					{ example: "$now.setLocale('de-DE').toLocaleString()", evaluated: "'30.4.2024'" },
					{ example: "$now.toLocaleString({ dateStyle: 'short' })", evaluated: "'4/30/2024'" },
					{ example: "$now.toLocaleString({ dateStyle: 'medium' })", evaluated: "'Apr 30, 2024'" },
					{ example: "$now.toLocaleString({ dateStyle: 'long' })", evaluated: "'April 30, 2024'" },
					{
						example: "$now.toLocaleString({ dateStyle: 'full' })",
						evaluated: "'Tuesday, April 30, 2024'",
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.instanceMethods.toLocaleString.example',
						),
					},
					{
						example: "$now.toLocaleString({ year: 'numeric', month: 'numeric', day: 'numeric' })",
						evaluated: "'4/30/2024'",
					},
					{
						example: "$now.toLocaleString({ year: '2-digit', month: '2-digit', day: '2-digit' })",
						evaluated: "'04/30/24'",
					},
					{
						example: "$now.toLocaleString({ month: 'short', weekday: 'short', day: 'numeric' })",
						evaluated: "'Tue, Apr 30'",
					},
					{
						example: "$now.toLocaleString({ month: 'long', weekday: 'long', day: 'numeric' })",
						evaluated: "'Tuesday, April 30'",
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.instanceMethods.toLocaleString.example',
						),
					},
					{ example: "$now.toLocaleString({ timeStyle: 'short' })", evaluated: "'10:00 PM'" },
					{ example: "$now.toLocaleString({ timeStyle: 'medium' })", evaluated: "'10:00:58 PM'" },
					{
						example: "$now.toLocaleString({ timeStyle: 'long' })",
						evaluated: "'10:00:58 PM GMT+2'",
					},
					{
						example: "$now.toLocaleString({ timeStyle: 'full' })",
						evaluated: "'10:00:58 PM Central European Summer Time'",
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.instanceMethods.toLocaleString.example',
						),
					},
					{
						example:
							"$now.toLocaleString({ hour: 'numeric', minute: 'numeric', hourCycle: 'h24' })",
						evaluated: "'22:00'",
					},
					{
						example:
							"$now.toLocaleString({ hour: '2-digit', minute: '2-digit', hourCycle: 'h12' })",
						evaluated: "'10:00 PM'",
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.instanceMethods.toLocaleString.example',
						),
					},
				],
			},
		},
		toMillis: {
			doc: {
				name: 'toMillis',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.toMillis'),
				section: 'format',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetomillis',
				returnType: 'number',
				examples: [{ example: '$now.toMillis()', evaluated: '1712334324677' }],
			},
		},
		toObject: {
			doc: {
				name: 'toObject',
				section: 'format',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetoobject',
				returnType: 'Object',
				args: [{ name: 'options', type: 'any' }],
			},
		},
		toRelative: {
			doc: {
				name: 'toRelative',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.toRelative'),
				section: 'format',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetorelative',
				returnType: 'string',
				args: [
					{
						name: 'options',
						optional: true,
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.instanceMethods.toRelative.args.opts',
						),
						type: 'Object',
					},
				],
			},
		},
		toRelativeCalendar: {
			doc: {
				name: 'toRelativeCalendar',
				section: 'format',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetorelativecalendar',
				returnType: 'string',
				args: [{ name: 'options', type: 'Object' }],
			},
		},
		toRFC2822: {
			doc: {
				name: 'toRFC2822',
				section: 'format',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetorfc2822',
				returnType: 'string',
			},
		},
		toSeconds: {
			doc: {
				name: 'toSeconds',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.toSeconds'),
				section: 'format',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetoseconds',
				returnType: 'number',
				examples: [{ example: '$now.toSeconds()', evaluated: '1712334442.372' }],
			},
		},
		toSQL: {
			doc: {
				name: 'toSQL',
				section: 'format',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetosql',
				returnType: 'string',
				hidden: true,
				args: [{ name: 'options', type: 'Object' }],
			},
		},
		toSQLDate: {
			doc: {
				name: 'toSQLDate',
				section: 'format',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetosqldate',
				returnType: 'string',
			},
		},
		toSQLTime: {
			doc: {
				name: 'toSQLTime',
				section: 'format',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetosqltime',
				returnType: 'string',
			},
		},
		toString: {
			doc: {
				name: 'toString',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.toString'),
				section: 'format',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetostring',
				returnType: 'string',
				examples: [{ example: '$now.toString()', evaluated: "'2024-04-05T18:44:55.525+02:00'" }],
			},
		},
		toUnixInteger: {
			doc: {
				name: 'toUnixInteger',
				section: 'format',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetounixinteger',
				returnType: 'number',
			},
		},
		toUTC: {
			doc: {
				name: 'toUTC',
				description: i18n.baseText('codeNodeEditor.completer.luxon.instanceMethods.toUTC'),
				section: 'edit',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetoutc',
				returnType: 'DateTime',
				args: [
					{
						name: 'zone',
						optional: true,
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.instanceMethods.toUTC.args.zone',
						),
						default: '"local"',
						type: 'string',
					},
					{
						name: 'options',
						optional: true,
						description: i18n.baseText(
							'codeNodeEditor.completer.luxon.instanceMethods.toUTC.args.opts',
						),
						type: 'Object',
					},
				],
				examples: [
					{
						example: "dt = '2024-01-01T00:00:00.000+02:00'.toDateTime()\ndt.toUTC()",
						evaluated: '[DateTime: 2023-12-31T22:00:00.000Z]',
					},
				],
			},
		},
		until: {
			doc: {
				name: 'until',
				section: 'compare',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeuntil',
				returnType: 'Interval',
				args: [{ name: 'other', type: 'DateTime' }],
			},
		},
		valueOf: {
			doc: {
				name: 'valueOf',
				section: 'format',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimevalueof',
				returnType: 'number',
			},
		},
	},
};
