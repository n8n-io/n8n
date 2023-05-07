import type { NativeDoc } from 'n8n-workflow/src/Extensions/Extensions';

// Autocomplete documentation definition for DateTime class static props and methods
// Descriptions are added dynamically so they can be localized
export const luxonStaticDocs: Required<NativeDoc> = {
	typeName: 'DateTime',
	properties: {},
	functions: {
		now: {
			doc: {
				name: 'now',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimenow',
				returnType: 'DateTime',
			},
		},
		local: {
			doc: {
				name: 'local',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimelocal',
				returnType: 'DateTime',
				args: [
					{ name: 'year?', type: 'number' },
					{ name: 'month', type: 'number' },
					{ name: 'day', type: 'number' },
					{ name: 'hour', type: 'number' },
					{ name: 'minute', type: 'number' },
					{ name: 'second', type: 'number' },
					{ name: 'millisecond', type: 'number' },
				],
			},
		},
		utc: {
			doc: {
				name: 'utc',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeutc',
				returnType: 'DateTime',
				args: [
					{ name: 'year?', type: 'number' },
					{ name: 'month', type: 'number' },
					{ name: 'day', type: 'number' },
					{ name: 'hour', type: 'number' },
					{ name: 'minute', type: 'number' },
					{ name: 'second', type: 'number' },
					{ name: 'millisecond', type: 'number' },
				],
			},
		},
		fromJSDate: {
			doc: {
				name: 'fromJSDate',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimefromjsdate',
				returnType: 'DateTime',
				args: [
					{ name: 'date', type: 'Date' },
					{ name: 'options?', type: 'object' },
				],
			},
		},
		fromMillis: {
			doc: {
				name: 'fromMillis',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimefrommillis',
				returnType: 'DateTime',
				args: [
					{ name: 'milliseconds', type: 'number' },
					{ name: 'options?', type: 'object' },
				],
			},
		},
		fromSeconds: {
			doc: {
				name: 'fromSeconds',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimefromseconds',
				returnType: 'DateTime',
				args: [
					{ name: 'seconds', type: 'number' },
					{ name: 'options?', type: 'object' },
				],
			},
		},
		fromObject: {
			doc: {
				name: 'fromObject',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimefromobject',
				returnType: 'DateTime',
				args: [
					{ name: 'obj', type: 'object' },
					{ name: 'options?', type: 'object' },
				],
			},
		},
		fromISO: {
			doc: {
				name: 'fromISO',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimefromiso',
				returnType: 'DateTime',
				args: [
					{ name: 'text', type: 'string' },
					{ name: 'options?', type: 'object' },
				],
			},
		},
		fromRFC2822: {
			doc: {
				name: 'fromRFC2822',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimefromrfc2822',
				returnType: 'DateTime',
				args: [
					{ name: 'text', type: 'string' },
					{ name: 'options?', type: 'object' },
				],
			},
		},
		fromHTTP: {
			doc: {
				name: 'fromHTTP',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimefromhttp',
				returnType: 'DateTime',
				args: [
					{ name: 'text', type: 'string' },
					{ name: 'options?', type: 'object' },
				],
			},
		},
		fromFormat: {
			doc: {
				name: 'fromFormat',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimefromformat',
				returnType: 'DateTime',
				args: [
					{ name: 'text', type: 'string' },
					{ name: 'fmt', type: 'string' },
					{ name: 'options?', type: 'object' },
				],
			},
		},
		fromSQL: {
			doc: {
				name: 'fromSQL',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimefromsql',
				returnType: 'DateTime',
				args: [
					{ name: 'text', type: 'string' },
					{ name: 'options?', type: 'object' },
				],
			},
		},
		invalid: {
			doc: {
				name: 'invalid',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeinvalid',
				returnType: 'DateTime',
				args: [
					{ name: 'reason', type: 'DateTime' },
					{ name: 'explanation?', type: 'string' },
				],
			},
		},
		isDateTime: {
			doc: {
				name: 'isDateTime',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeisdatetime',
				returnType: 'boolean',
				args: [{ name: 'o', type: 'object' }],
			},
		},
		expandFormat: {
			doc: {
				name: 'expandFormat',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeexpandformat',
				returnType: 'string',
				args: [
					{ name: 'fmt', type: 'any' },
					{ name: 'localeOpts?', type: 'any' },
				],
			},
		},
		fromFormatExplain: {
			doc: {
				name: 'fromFormatExplain',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimefromformatexplain',
				returnType: 'object',
				args: [
					{ name: 'text', type: 'string' },
					{ name: 'fmt', type: 'string' },
					{ name: 'options?', type: 'object' },
				],
			},
		},
		fromString: {
			doc: {
				name: 'fromString',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimefromstring',
				returnType: 'DateTime',
				args: [
					{ name: 'text', type: 'string' },
					{ name: 'fmt', type: 'string' },
					{ name: 'options?', type: 'object' },
				],
			},
		},
		fromStringExplain: {
			doc: {
				name: 'fromStringExplain',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimefromstringexplain',
				returnType: 'object',
				args: [
					{ name: 'text', type: 'string' },
					{ name: 'fmt', type: 'string' },
					{ name: 'options?', type: 'object' },
				],
			},
		},
		max: {
			doc: {
				name: 'max',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimemax',
				returnType: 'DateTime|undefined',
				args: [
					{ name: 'dateTime1', type: 'DateTime' },
					{ name: '...' },
					{ name: 'dateTimeN', type: 'DateTime' },
				],
			},
		},
		min: {
			doc: {
				name: 'min',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimemin',
				returnType: 'DateTime|undefined',
				args: [
					{ name: 'dateTime1', type: 'DateTime' },
					{ name: '...' },
					{ name: 'dateTimeN', type: 'DateTime' },
				],
			},
		},
		parseFormatForOpts: {
			doc: {
				name: 'parseFormatForOpts',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetimeparseformatforopts',
				returnType: 'string',
				args: [
					{ name: 'fmt', type: 'any' },
					{ name: 'localeOpts?', type: 'any' },
				],
			},
		},
	},
};
