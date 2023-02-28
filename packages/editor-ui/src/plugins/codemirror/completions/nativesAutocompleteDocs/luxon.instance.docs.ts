import { NativeDoc } from 'n8n-workflow/src/Extensions/Extensions';

// Autocomplete documentation definition for DateTime instance props and methods
// Descriptions are added dynamically so they can be localized
export const luxonInstanceDocs: Required<NativeDoc> = {
	typeName: 'DateTime',
	properties: {
		day: {
			doc: {
				name: 'day',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeday',
				returnType: 'number',
			},
		},
		daysInMonth: {
			doc: {
				name: 'daysInMonth',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimedaysinmonth',
				returnType: 'number',
			},
		},
		daysInYear: {
			doc: {
				name: 'daysInYear',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimedaysinyear',
				returnType: 'number',
			},
		},
		hour: {
			doc: {
				name: 'hour',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimehour',
				returnType: 'number',
			},
		},
		locale: {
			doc: {
				name: 'locale',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimelocale',
				returnType: 'string',
			},
		},
		millisecond: {
			doc: {
				name: 'millisecond',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimemillisecond',
				returnType: 'number',
			},
		},
		minute: {
			doc: {
				name: 'minute',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeminute',
				returnType: 'number',
			},
		},
		month: {
			doc: {
				name: 'month',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimemonth',
				returnType: 'number',
			},
		},
		monthLong: {
			doc: {
				name: 'monthLong',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimemonthlong',
				returnType: 'string',
			},
		},
		monthShort: {
			doc: {
				name: 'monthShort',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimemonthshort',
				returnType: 'string',
			},
		},
		numberingSystem: {
			doc: {
				name: 'numberingSystem',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimenumberingsystem',
				returnType: 'string',
			},
		},
		offset: {
			doc: {
				name: 'offset',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeoffset',
				returnType: 'number',
			},
		},
		offsetNameLong: {
			doc: {
				name: 'offsetNameLong',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeoffsetnamelong',
				returnType: 'string',
			},
		},
		offsetNameShort: {
			doc: {
				name: 'offsetNameShort',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeoffsetnameshort',
				returnType: 'string',
			},
		},
		ordinal: {
			doc: {
				name: 'ordinal',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeordinal',
				returnType: 'string',
			},
		},
		outputCalendar: {
			doc: {
				name: 'outputCalendar',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeoutputcalendar',
				returnType: 'string',
			},
		},
		quarter: {
			doc: {
				name: 'quarter',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimequarter',
				returnType: 'number',
			},
		},
		second: {
			doc: {
				name: 'second',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimesecond',
				returnType: 'number',
			},
		},
		weekday: {
			doc: {
				name: 'weekday',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeweekday',
				returnType: 'number',
			},
		},
		weekdayLong: {
			doc: {
				name: 'weekdayLong',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeweekdaylong',
				returnType: 'string',
			},
		},
		weekdayShort: {
			doc: {
				name: 'weekdayShort',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeweekdayshort',
				returnType: 'string',
			},
		},
		weekNumber: {
			doc: {
				name: 'weekNumber',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeweeknumber',
				returnType: 'number',
			},
		},
		weeksInWeekYear: {
			doc: {
				name: 'weeksInWeekYear',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeweeksinweekyear',
				returnType: 'number',
			},
		},
		weekYear: {
			doc: {
				name: 'weekYear',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeweekyear',
				returnType: 'number',
			},
		},
		year: {
			doc: {
				name: 'year',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeyear',
				returnType: 'number',
			},
		},
		zone: {
			doc: {
				name: 'zone',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimezone',
				returnType: 'Zone',
			},
		},
		zoneName: {
			doc: {
				name: 'zoneName',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimezonename',
				returnType: 'string',
			},
		},
		isInDST: {
			doc: {
				name: 'isInDST',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeisindst',
				returnType: 'boolean',
			},
		},
		isInLeapYear: {
			doc: {
				name: 'isInLeapYear',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeisinleapyear',
				returnType: 'boolean',
			},
		},
		isOffsetFixed: {
			doc: {
				name: 'isOffsetFixed',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeisoffsetfixed',
				returnType: 'boolean',
			},
		},
		isValid: {
			doc: {
				name: 'isValid',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeisvalid',
				returnType: 'boolean',
			},
		},
	},
	functions: {
		diff: {
			doc: {
				name: 'diff',
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
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeendof',
				returnType: 'DateTime',
				args: [{ name: 'unit', type: 'string' }],
			},
		},
		equals: {
			doc: {
				name: 'equals',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeequals',
				returnType: 'boolean',
				args: [{ name: 'other', type: 'DateTime' }],
			},
		},
		hasSame: {
			doc: {
				name: 'hasSame',
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
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeminus',
				returnType: 'DateTime',
				args: [{ name: 'duration', type: 'Duration|object|number' }],
			},
		},
		plus: {
			doc: {
				name: 'plus',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeplus',
				returnType: 'DateTime',
				args: [{ name: 'duration', type: 'Duration|object|number' }],
			},
		},
		reconfigure: {
			doc: {
				name: 'reconfigure',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimereconfigure',
				returnType: 'DateTime',
				args: [{ name: 'properties', type: 'object' }],
			},
		},
		resolvedLocaleOptions: {
			doc: {
				name: 'resolvedLocaleOptions',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeresolvedlocaleoptions',
				returnType: 'object',
				args: [{ name: 'opts', type: 'object' }],
			},
		},
		set: {
			doc: {
				name: 'set',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeset',
				returnType: 'DateTime',
				args: [{ name: 'values', type: 'object' }],
			},
		},
		setLocale: {
			doc: {
				name: 'setLocale',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimesetlocale',
				returnType: 'DateTime',
				args: [{ name: 'locale', type: 'any' }],
			},
		},
		setZone: {
			doc: {
				name: 'setZone',
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
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimestartof',
				returnType: 'DateTime',
				args: [{ name: 'unit', type: 'string' }],
			},
		},
		toBSON: {
			doc: {
				name: 'toBSON',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetobson',
				returnType: 'Date',
			},
		},
		toFormat: {
			doc: {
				name: 'toFormat',
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
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetohttp',
				returnType: 'string',
			},
		},
		toISO: {
			doc: {
				name: 'toISO',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetoiso',
				returnType: 'string',
				args: [{ name: 'opts', type: 'object' }],
			},
		},
		toISODate: {
			doc: {
				name: 'toISODate',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetoisodate',
				returnType: 'string',
				args: [{ name: 'opts', type: 'object' }],
			},
		},
		toISOTime: {
			doc: {
				name: 'toISOTime',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetoisotime',
				returnType: 'string',
				args: [{ name: 'opts', type: 'object' }],
			},
		},
		toISOWeekDate: {
			doc: {
				name: 'toISOWeekDate',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetoisoweekdate',
				returnType: 'string',
			},
		},
		toJSDate: {
			doc: {
				name: 'toJSDate',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetojsdate',
				returnType: 'Date',
			},
		},
		toJSON: {
			doc: {
				name: 'toJSON',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetojson',
				returnType: 'string',
			},
		},
		toLocal: {
			doc: {
				name: 'toLocal',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetolocal',
				returnType: 'DateTime',
			},
		},
		toLocaleParts: {
			doc: {
				name: 'toLocaleParts',
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
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetomillis',
				returnType: 'number',
			},
		},
		toObject: {
			doc: {
				name: 'toObject',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetoobject',
				returnType: 'object',
				args: [{ name: 'opts', type: 'any' }],
			},
		},
		toRelative: {
			doc: {
				name: 'toRelative',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetorelative',
				returnType: 'string',
				args: [{ name: 'options', type: 'object' }],
			},
		},
		toRelativeCalendar: {
			doc: {
				name: 'toRelativeCalendar',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetorelativecalendar',
				returnType: 'string',
				args: [{ name: 'options', type: 'object' }],
			},
		},
		toRFC2822: {
			doc: {
				name: 'toRFC2822',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetorfc2822',
				returnType: 'string',
			},
		},
		toSeconds: {
			doc: {
				name: 'toSeconds',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetoseconds',
				returnType: 'number',
			},
		},
		toSQL: {
			doc: {
				name: 'toSQL',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetosql',
				returnType: 'string',
				args: [{ name: 'options', type: 'object' }],
			},
		},
		toSQLDate: {
			doc: {
				name: 'toSQLDate',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetosqldate',
				returnType: 'string',
			},
		},
		toSQLTime: {
			doc: {
				name: 'toSQLTime',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetosqltime',
				returnType: 'string',
			},
		},
		toString: {
			doc: {
				name: 'toString',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetostring',
				returnType: 'string',
			},
		},
		toUnixInteger: {
			doc: {
				name: 'toUnixInteger',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimetounixinteger',
				returnType: 'number',
			},
		},
		toUTC: {
			doc: {
				name: 'toUTC',
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
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeuntil',
				returnType: 'Interval',
				args: [{ name: 'other', type: 'DateTime' }],
			},
		},
		valueOf: {
			doc: {
				name: 'valueOf',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimevalueof',
				returnType: 'number',
			},
		},
	},
};
