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
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		diffNow: {
			doc: {
				name: 'diffNow',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		endOf: {
			doc: {
				name: 'diff',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		equals: {
			doc: {
				name: 'equals',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		hasSame: {
			doc: {
				name: 'hasSame',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		minus: {
			doc: {
				name: 'minus',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		plus: {
			doc: {
				name: 'plus',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		reconfigure: {
			doc: {
				name: 'reconfigure',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		resolvedLocaleOptions: {
			doc: {
				name: 'resolvedLocaleOptions',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		set: {
			doc: {
				name: 'set',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		setLocale: {
			doc: {
				name: 'setLocale',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		setZone: {
			doc: {
				name: 'setZone',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		startOf: {
			doc: {
				name: 'startOf',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		toBSON: {
			doc: {
				name: 'toBSON',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		toFormat: {
			doc: {
				name: 'toFormat',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		toHTTP: {
			doc: {
				name: 'toHTTP',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		toISO: {
			doc: {
				name: 'toISO',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		toISODate: {
			doc: {
				name: 'toISODate',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		toISOTime: {
			doc: {
				name: 'toISOTime',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		toISOWeekDate: {
			doc: {
				name: 'toISOWeekDate',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		toJSDate: {
			doc: {
				name: 'toJSDate',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		toJSON: {
			doc: {
				name: 'toJSON',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		toLocal: {
			doc: {
				name: 'toLocal',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		toLocaleParts: {
			doc: {
				name: 'toLocaleParts',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		toLocaleString: {
			doc: {
				name: 'toLocaleString',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		toMillis: {
			doc: {
				name: 'toMillis',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		toObject: {
			doc: {
				name: 'toObject',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		toRelative: {
			doc: {
				name: 'toRelative',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		toRelativeCalendar: {
			doc: {
				name: 'toRelativeCalendar',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		toRFC2822: {
			doc: {
				name: 'toRFC2822',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		toSeconds: {
			doc: {
				name: 'toSeconds',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		toSQL: {
			doc: {
				name: 'toSQL',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		toSQLDate: {
			doc: {
				name: 'toSQLDate',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		toSQLTime: {
			doc: {
				name: 'toSQLTime',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		toString: {
			doc: {
				name: 'toString',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		toUnixInteger: {
			doc: {
				name: 'toUnixInteger',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		toUTC: {
			doc: {
				name: 'toUTC',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		until: {
			doc: {
				name: 'until',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		valueOf: {
			doc: {
				name: 'valueOf',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
	},
};
