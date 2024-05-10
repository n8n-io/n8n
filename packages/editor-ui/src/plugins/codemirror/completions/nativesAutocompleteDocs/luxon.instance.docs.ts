import type { NativeDoc } from 'n8n-workflow';

// Autocomplete documentation definition for DateTime instance props and methods
// Descriptions are added dynamically so they can be localized
export const luxonInstanceDocs: Required<NativeDoc> = {
	typeName: 'DateTime',
	properties: {
		day: {
			doc: {
				name: 'day',
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeday',
				returnType: 'number',
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
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimehour',
				returnType: 'number',
			},
		},
		locale: {
			doc: {
				name: 'locale',
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimelocale',
				returnType: 'string',
			},
		},
		millisecond: {
			doc: {
				name: 'millisecond',
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimemillisecond',
				returnType: 'number',
			},
		},
		minute: {
			doc: {
				name: 'minute',
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeminute',
				returnType: 'number',
			},
		},
		month: {
			doc: {
				name: 'month',
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimemonth',
				returnType: 'number',
			},
		},
		monthLong: {
			doc: {
				name: 'monthLong',
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimemonthlong',
				returnType: 'string',
			},
		},
		monthShort: {
			doc: {
				name: 'monthShort',
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimemonthshort',
				returnType: 'string',
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
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimequarter',
				returnType: 'number',
			},
		},
		second: {
			doc: {
				name: 'second',
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimesecond',
				returnType: 'number',
			},
		},
		weekday: {
			doc: {
				name: 'weekday',
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeweekday',
				returnType: 'number',
			},
		},
		weekdayLong: {
			doc: {
				name: 'weekdayLong',
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeweekdaylong',
				returnType: 'string',
			},
		},
		weekdayShort: {
			doc: {
				name: 'weekdayShort',
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeweekdayshort',
				returnType: 'string',
			},
		},
		weekNumber: {
			doc: {
				name: 'weekNumber',
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeweeknumber',
				returnType: 'number',
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
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeyear',
				returnType: 'number',
			},
		},
		zone: {
			doc: {
				name: 'zone',
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimezone',
				returnType: 'Zone',
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
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeisindst',
				returnType: 'boolean',
			},
		},
		isInLeapYear: {
			doc: {
				name: 'isInLeapYear',
				section: 'query',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeisinleapyear',
				returnType: 'boolean',
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
				section: 'compare',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimediff',
				returnType: 'Duration',
				args: [
					{ name: 'other', type: 'DateTime' },
					{ name: 'unit', type: 'string|string[]' },
					{ name: 'opts', type: 'object' },
				],
			},
		},
		diffNow: {
			doc: {
				name: 'diffNow',
				section: 'compare',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimediffnow',
				returnType: 'Duration',
				args: [
					{ name: 'unit', type: 'string|string[]' },
					{ name: 'opts', type: 'object' },
				],
			},
		},
		endOf: {
			doc: {
				name: 'endOf',
				section: 'edit',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeendof',
				returnType: 'DateTime',
				args: [{ name: 'unit', type: 'string', default: "'month'" }],
			},
		},
		equals: {
			doc: {
				name: 'equals',
				section: 'compare',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeequals',
				returnType: 'boolean',
				args: [{ name: 'other', type: 'DateTime' }],
			},
		},
		hasSame: {
			doc: {
				name: 'hasSame',
				section: 'compare',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimehassame',
				returnType: 'boolean',
				args: [
					{ name: 'other', type: 'DateTime' },
					{ name: 'unit', type: 'string' },
				],
			},
		},
		minus: {
			doc: {
				name: 'minus',
				section: 'edit',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeminus',
				returnType: 'DateTime',
				args: [{ name: 'duration', type: 'Duration|object|number' }],
			},
		},
		plus: {
			doc: {
				name: 'plus',
				section: 'edit',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeplus',
				returnType: 'DateTime',
				args: [{ name: 'duration', type: 'Duration|object|number' }],
			},
		},
		reconfigure: {
			doc: {
				name: 'reconfigure',
				section: 'other',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimereconfigure',
				returnType: 'DateTime',
				args: [{ name: 'properties', type: 'object' }],
			},
		},
		resolvedLocaleOptions: {
			doc: {
				name: 'resolvedLocaleOptions',
				section: 'other',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeresolvedlocaleoptions',
				returnType: 'object',
				args: [{ name: 'opts', type: 'object' }],
			},
		},
		set: {
			doc: {
				name: 'set',
				section: 'edit',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeset',
				returnType: 'DateTime',
				args: [{ name: 'values', type: 'object' }],
			},
		},
		setLocale: {
			doc: {
				name: 'setLocale',
				section: 'edit',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimesetlocale',
				returnType: 'DateTime',
				args: [{ name: 'locale', type: 'any' }],
			},
		},
		setZone: {
			doc: {
				name: 'setZone',
				section: 'edit',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimesetzone',
				returnType: 'DateTime',
				args: [
					{ name: 'zone', type: 'string|Zone' },
					{ name: 'opts', type: 'object' },
				],
			},
		},
		startOf: {
			doc: {
				name: 'startOf',
				section: 'edit',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimestartof',
				returnType: 'DateTime',
				args: [{ name: 'unit', type: 'string', default: "'month'" }],
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
					{ name: 'opts', type: 'object' },
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
				section: 'format',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetoiso',
				returnType: 'string',
				args: [{ name: 'opts', type: 'object' }],
			},
		},
		toISODate: {
			doc: {
				name: 'toISODate',
				section: 'format',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetoisodate',
				returnType: 'string',
				args: [{ name: 'opts', type: 'object' }],
			},
		},
		toISOTime: {
			doc: {
				name: 'toISOTime',
				section: 'format',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetoisotime',
				returnType: 'string',
				args: [{ name: 'opts', type: 'object' }],
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
				section: 'edit',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetolocal',
				returnType: 'DateTime',
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
					{ name: 'opts', type: 'object' },
				],
			},
		},
		toLocaleString: {
			doc: {
				name: 'toLocaleString',
				section: 'format',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetolocalestring',
				returnType: 'string',
				args: [
					{ name: 'formatOpts', type: 'any' },
					{ name: 'opts', type: 'object' },
				],
			},
		},
		toMillis: {
			doc: {
				name: 'toMillis',
				section: 'format',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetomillis',
				returnType: 'number',
			},
		},
		toObject: {
			doc: {
				name: 'toObject',
				section: 'format',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetoobject',
				returnType: 'object',
				args: [{ name: 'opts', type: 'any' }],
			},
		},
		toRelative: {
			doc: {
				name: 'toRelative',
				section: 'format',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetorelative',
				returnType: 'string',
				args: [{ name: 'options', type: 'object' }],
			},
		},
		toRelativeCalendar: {
			doc: {
				name: 'toRelativeCalendar',
				section: 'format',
				hidden: true,
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetorelativecalendar',
				returnType: 'string',
				args: [{ name: 'options', type: 'object' }],
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
				section: 'format',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetoseconds',
				returnType: 'number',
			},
		},
		toSQL: {
			doc: {
				name: 'toSQL',
				section: 'format',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetosql',
				returnType: 'string',
				hidden: true,
				args: [{ name: 'options', type: 'object' }],
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
				section: 'format',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetostring',
				returnType: 'string',
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
				section: 'edit',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetoutc',
				returnType: 'DateTime',
				args: [
					{ name: 'offset', type: 'number' },
					{ name: 'opts', type: 'object' },
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
