import { NativeDoc } from 'n8n-workflow/src/Extensions/Extensions';

export const luxonStaticDocs: Required<NativeDoc> = {
	typeName: 'DateTime',
	properties: {},
	functions: {
		now: {
			doc: {
				name: 'now',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		local: {
			doc: {
				name: 'local',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		utc: {
			doc: {
				name: 'utc',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		fromJSDate: {
			doc: {
				name: 'fromJSDate',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'number',
			},
		},
		fromMillis: {
			doc: {
				name: 'fromMillis',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		fromSeconds: {
			doc: {
				name: 'fromSeconds',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		fromObject: {
			doc: {
				name: 'fromObject',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		fromISO: {
			doc: {
				name: 'fromISO',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		fromRFC2822: {
			doc: {
				name: 'fromRFC2822',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		fromHTTP: {
			doc: {
				name: 'fromHTTP',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		fromFormat: {
			doc: {
				name: 'fromFormat',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		fromSQL: {
			doc: {
				name: 'fromSQL',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		invalid: {
			doc: {
				name: 'invalid',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		isDateTime: {
			doc: {
				name: 'isDateTime',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		// TODO: Add i18n descriptions for these:
		expandFormat: {
			doc: {
				name: 'expandFormat',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		fromFormatExplain: {
			doc: {
				name: 'fromFormatExplain',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		fromString: {
			doc: {
				name: 'fromString',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		fromStringExplain: {
			doc: {
				name: 'fromStringExplain',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		max: {
			doc: {
				name: 'max',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		min: {
			doc: {
				name: 'min',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
		parseFormatForOpts: {
			doc: {
				name: 'parseFormatForOpts',
				docURL: 'https://moment.github.io/luxon/api-docs/index.html#datetime',
				returnType: 'string',
			},
		},
	},
};
