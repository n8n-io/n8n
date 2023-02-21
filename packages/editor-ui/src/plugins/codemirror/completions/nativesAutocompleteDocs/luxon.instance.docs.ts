import { i18n } from '@/plugins/i18n';
import { NativeDoc } from 'n8n-workflow/src/Extensions/Extensions';

export const luxonInstanceDocs: Required<NativeDoc> = {
	typeName: 'DateTime',
	properties: {
		day: {
			doc: {
				name: 'day',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		daysInMonth: {
			doc: {
				name: 'daysInMonth',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		daysInYear: {
			doc: {
				name: 'daysInYear',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		hour: {
			doc: {
				name: 'hour',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		locale: {
			doc: {
				name: 'locale',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		millisecond: {
			doc: {
				name: 'millisecond',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		minute: {
			doc: {
				name: 'minute',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		month: {
			doc: {
				name: 'month',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		monthLong: {
			doc: {
				name: 'monthLong',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		monthShort: {
			doc: {
				name: 'monthShort',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		numberingSystem: {
			doc: {
				name: 'numberingSystem',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		offset: {
			doc: {
				name: 'offset',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		offsetNameLong: {
			doc: {
				name: 'offsetNameLong',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		offsetNameShort: {
			doc: {
				name: 'offsetNameShort',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		ordinal: {
			doc: {
				name: 'ordinal',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		outputCalendar: {
			doc: {
				name: 'outputCalendar',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		quarter: {
			doc: {
				name: 'quarter',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		second: {
			doc: {
				name: 'second',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		weekday: {
			doc: {
				name: 'weekday',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		weekdayLong: {
			doc: {
				name: 'weekdayLong',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		weekdayShort: {
			doc: {
				name: 'weekdayShort',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		weekNumber: {
			doc: {
				name: 'weekNumber',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		weeksInWeekYear: {
			doc: {
				name: 'weeksInWeekYear',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		weekYear: {
			doc: {
				name: 'weekYear',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		year: {
			doc: {
				name: 'year',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		zone: {
			doc: {
				name: 'zone',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		zoneName: {
			doc: {
				name: 'zoneName',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
	},
	functions: {
		isInDST: {
			doc: {
				name: 'isInDST',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		isInLeapYear: {
			doc: {
				name: 'isInLeapYear',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		isOffsetFixed: {
			doc: {
				name: 'isOffsetFixed',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		isValid: {
			doc: {
				name: 'isValid',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
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
