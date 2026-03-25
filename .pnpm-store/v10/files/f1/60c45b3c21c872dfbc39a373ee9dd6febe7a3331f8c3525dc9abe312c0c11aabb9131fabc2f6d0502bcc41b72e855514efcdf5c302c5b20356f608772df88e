'use strict';

const defaultExclude = require('./default-exclude.js');
const defaultExtension = require('./default-extension.js');

const nycCommands = {
	all: [null, 'check-coverage', 'instrument', 'merge', 'report'],
	testExclude: [null, 'instrument', 'report', 'check-coverage'],
	instrument: [null, 'instrument'],
	checkCoverage: [null, 'report', 'check-coverage'],
	report: [null, 'report'],
	main: [null],
	instrumentOnly: ['instrument']
};

const cwd = {
	description: 'working directory used when resolving paths',
	type: 'string',
	get default() {
		return process.cwd();
	},
	nycCommands: nycCommands.all
};

const nycrcPath = {
	description: 'specify an explicit path to find nyc configuration',
	nycCommands: nycCommands.all
};

const tempDir = {
	description: 'directory to output raw coverage information to',
	type: 'string',
	default: './.nyc_output',
	nycAlias: 't',
	nycHiddenAlias: 'temp-directory',
	nycCommands: [null, 'check-coverage', 'merge', 'report']
};

const testExclude = {
	exclude: {
		description: 'a list of specific files and directories that should be excluded from coverage, glob patterns are supported',
		type: 'array',
		items: {
			type: 'string'
		},
		default: defaultExclude,
		nycCommands: nycCommands.testExclude,
		nycAlias: 'x'
	},
	excludeNodeModules: {
		description: 'whether or not to exclude all node_module folders (i.e. **/node_modules/**) by default',
		type: 'boolean',
		default: true,
		nycCommands: nycCommands.testExclude
	},
	include: {
		description: 'a list of specific files that should be covered, glob patterns are supported',
		type: 'array',
		items: {
			type: 'string'
		},
		default: [],
		nycCommands: nycCommands.testExclude,
		nycAlias: 'n'
	},
	extension: {
		description: 'a list of extensions that nyc should handle in addition to .js',
		type: 'array',
		items: {
			type: 'string'
		},
		default: defaultExtension,
		nycCommands: nycCommands.testExclude,
		nycAlias: 'e'
	}
};

const instrumentVisitor = {
	coverageVariable: {
		description: 'variable to store coverage',
		type: 'string',
		default: '__coverage__',
		nycCommands: nycCommands.instrument
	},
	coverageGlobalScope: {
		description: 'scope to store the coverage variable',
		type: 'string',
		default: 'this',
		nycCommands: nycCommands.instrument
	},
	coverageGlobalScopeFunc: {
		description: 'avoid potentially replaced `Function` when finding global scope',
		type: 'boolean',
		default: true,
		nycCommands: nycCommands.instrument
	},
	ignoreClassMethods: {
		description: 'class method names to ignore for coverage',
		type: 'array',
		items: {
			type: 'string'
		},
		default: [],
		nycCommands: nycCommands.instrument
	}
};

const instrumentParseGen = {
	autoWrap: {
		description: 'allow `return` statements outside of functions',
		type: 'boolean',
		default: true,
		nycCommands: nycCommands.instrument
	},
	esModules: {
		description: 'should files be treated as ES Modules',
		type: 'boolean',
		default: true,
		nycCommands: nycCommands.instrument
	},
	parserPlugins: {
		description: 'babel parser plugins to use when parsing the source',
		type: 'array',
		items: {
			type: 'string'
		},
		/* Babel parser plugins are to be enabled when the feature is stage 3 and
		 * implemented in a released version of node.js. */
		default: [
			'asyncGenerators',
			'bigInt',
			'classProperties',
			'classPrivateProperties',
			'classPrivateMethods',
			'dynamicImport',
			'importMeta',
			'numericSeparator',
			'objectRestSpread',
			'optionalCatchBinding',
			'topLevelAwait'
		],
		nycCommands: nycCommands.instrument
	},
	compact: {
		description: 'should the output be compacted?',
		type: 'boolean',
		default: true,
		nycCommands: nycCommands.instrument
	},
	preserveComments: {
		description: 'should comments be preserved in the output?',
		type: 'boolean',
		default: true,
		nycCommands: nycCommands.instrument
	},
	produceSourceMap: {
		description: 'should source maps be produced?',
		type: 'boolean',
		default: true,
		nycCommands: nycCommands.instrument
	}
};

const checkCoverage = {
	excludeAfterRemap: {
		description: 'should exclude logic be performed after the source-map remaps filenames?',
		type: 'boolean',
		default: true,
		nycCommands: nycCommands.checkCoverage
	},
	branches: {
		description: 'what % of branches must be covered?',
		type: 'number',
		default: 0,
		minimum: 0,
		maximum: 100,
		nycCommands: nycCommands.checkCoverage
	},
	functions: {
		description: 'what % of functions must be covered?',
		type: 'number',
		default: 0,
		minimum: 0,
		maximum: 100,
		nycCommands: nycCommands.checkCoverage
	},
	lines: {
		description: 'what % of lines must be covered?',
		type: 'number',
		default: 90,
		minimum: 0,
		maximum: 100,
		nycCommands: nycCommands.checkCoverage
	},
	statements: {
		description: 'what % of statements must be covered?',
		type: 'number',
		default: 0,
		minimum: 0,
		maximum: 100,
		nycCommands: nycCommands.checkCoverage
	},
	perFile: {
		description: 'check thresholds per file',
		type: 'boolean',
		default: false,
		nycCommands: nycCommands.checkCoverage
	}
};

const report = {
	checkCoverage: {
		description: 'check whether coverage is within thresholds provided',
		type: 'boolean',
		default: false,
		nycCommands: nycCommands.report
	},
	reporter: {
		description: 'coverage reporter(s) to use',
		type: 'array',
		items: {
			type: 'string'
		},
		default: ['text'],
		nycCommands: nycCommands.report,
		nycAlias: 'r'
	},
	reportDir: {
		description: 'directory to output coverage reports in',
		type: 'string',
		default: 'coverage',
		nycCommands: nycCommands.report
	},
	showProcessTree: {
		description: 'display the tree of spawned processes',
		type: 'boolean',
		default: false,
		nycCommands: nycCommands.report
	},
	skipEmpty: {
		description: 'don\'t show empty files (no lines of code) in report',
		type: 'boolean',
		default: false,
		nycCommands: nycCommands.report
	},
	skipFull: {
		description: 'don\'t show files with 100% statement, branch, and function coverage',
		type: 'boolean',
		default: false,
		nycCommands: nycCommands.report
	}
};

const nycMain = {
	silent: {
		description: 'don\'t output a report after tests finish running',
		type: 'boolean',
		default: false,
		nycCommands: nycCommands.main,
		nycAlias: 's'
	},
	all: {
		description: 'whether or not to instrument all files of the project (not just the ones touched by your test suite)',
		type: 'boolean',
		default: false,
		nycCommands: nycCommands.main,
		nycAlias: 'a'
	},
	eager: {
		description: 'instantiate the instrumenter at startup (see https://git.io/vMKZ9)',
		type: 'boolean',
		default: false,
		nycCommands: nycCommands.main
	},
	cache: {
		description: 'cache instrumentation results for improved performance',
		type: 'boolean',
		default: true,
		nycCommands: nycCommands.main,
		nycAlias: 'c'
	},
	cacheDir: {
		description: 'explicitly set location for instrumentation cache',
		type: 'string',
		nycCommands: nycCommands.main
	},
	babelCache: {
		description: 'cache babel transpilation results for improved performance',
		type: 'boolean',
		default: false,
		nycCommands: nycCommands.main
	},
	useSpawnWrap: {
		description: 'use spawn-wrap instead of setting process.env.NODE_OPTIONS',
		type: 'boolean',
		default: false,
		nycCommands: nycCommands.main
	},
	hookRequire: {
		description: 'should nyc wrap require?',
		type: 'boolean',
		default: true,
		nycCommands: nycCommands.main
	},
	hookRunInContext: {
		description: 'should nyc wrap vm.runInContext?',
		type: 'boolean',
		default: false,
		nycCommands: nycCommands.main
	},
	hookRunInThisContext: {
		description: 'should nyc wrap vm.runInThisContext?',
		type: 'boolean',
		default: false,
		nycCommands: nycCommands.main
	},
	clean: {
		description: 'should the .nyc_output folder be cleaned before executing tests',
		type: 'boolean',
		default: true,
		nycCommands: nycCommands.main
	}
};

const instrumentOnly = {
	inPlace: {
		description: 'should nyc run the instrumentation in place?',
		type: 'boolean',
		default: false,
		nycCommands: nycCommands.instrumentOnly
	},
	exitOnError: {
		description: 'should nyc exit when an instrumentation failure occurs?',
		type: 'boolean',
		default: false,
		nycCommands: nycCommands.instrumentOnly
	},
	delete: {
		description: 'should the output folder be deleted before instrumenting files?',
		type: 'boolean',
		default: false,
		nycCommands: nycCommands.instrumentOnly
	},
	completeCopy: {
		description: 'should nyc copy all files from input to output as well as instrumented files?',
		type: 'boolean',
		default: false,
		nycCommands: nycCommands.instrumentOnly
	}
};

const nyc = {
	description: 'nyc configuration options',
	type: 'object',
	properties: {
		cwd,
		nycrcPath,
		tempDir,

		/* Test Exclude */
		...testExclude,

		/* Instrumentation settings */
		...instrumentVisitor,

		/* Instrumentation parser/generator settings */
		...instrumentParseGen,
		sourceMap: {
			description: 'should nyc detect and handle source maps?',
			type: 'boolean',
			default: true,
			nycCommands: nycCommands.instrument
		},
		require: {
			description: 'a list of additional modules that nyc should attempt to require in its subprocess, e.g., @babel/register, @babel/polyfill',
			type: 'array',
			items: {
				type: 'string'
			},
			default: [],
			nycCommands: nycCommands.instrument,
			nycAlias: 'i'
		},
		instrument: {
			description: 'should nyc handle instrumentation?',
			type: 'boolean',
			default: true,
			nycCommands: nycCommands.instrument
		},

		/* Check coverage */
		...checkCoverage,

		/* Report options */
		...report,

		/* Main command options */
		...nycMain,

		/* Instrument command options */
		...instrumentOnly
	}
};

const configs = {
	nyc,
	testExclude: {
		description: 'test-exclude options',
		type: 'object',
		properties: {
			cwd,
			...testExclude
		}
	},
	babelPluginIstanbul: {
		description: 'babel-plugin-istanbul options',
		type: 'object',
		properties: {
			cwd,
			...testExclude,
			...instrumentVisitor
		}
	},
	instrumentVisitor: {
		description: 'instrument visitor options',
		type: 'object',
		properties: instrumentVisitor
	},
	instrumenter: {
		description: 'stand-alone instrumenter options',
		type: 'object',
		properties: {
			...instrumentVisitor,
			...instrumentParseGen
		}
	}
};

function defaultsReducer(defaults, [name, {default: value}]) {
	/* Modifying arrays in defaults is safe, does not change schema. */
	if (Array.isArray(value)) {
		value = [...value];
	}

	return Object.assign(defaults, {[name]: value});
}

module.exports = {
	...configs,
	defaults: Object.keys(configs).reduce(
		(defaults, id) => {
			Object.defineProperty(defaults, id, {
				enumerable: true,
				get() {
					/* This defers `process.cwd()` until defaults are requested. */
					return Object.entries(configs[id].properties)
						.filter(([, info]) => 'default' in info)
						.reduce(defaultsReducer, {});
				}
			});

			return defaults;
		},
		{}
	)
};
