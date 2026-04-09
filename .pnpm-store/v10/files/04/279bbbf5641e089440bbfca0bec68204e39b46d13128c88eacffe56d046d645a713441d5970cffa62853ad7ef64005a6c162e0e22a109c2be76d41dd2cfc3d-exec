#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync, globSync, mkdirSync, rmSync } from 'node:fs';
import { join, parse, basename } from 'node:path';
import { parseArgs } from 'node:util';

const { values: options, positionals } = parseArgs({
	options: {
		// Output
		help: { short: 'h', type: 'boolean', default: false },
		verbose: { short: 'w', type: 'boolean', default: false },
		quiet: { short: 'q', type: 'boolean', default: false },
		log: { short: 'l', type: 'string', default: '' },
		'file-names': { short: 'N', type: 'boolean', default: false },
		ci: { short: 'C', type: 'boolean', default: false },

		// Test behavior
		test: { short: 't', type: 'string' },
		force: { short: 'f', type: 'boolean', default: false },
		auto: { short: 'a', type: 'boolean', default: false },
		build: { short: 'b', type: 'boolean', default: false },
		common: { short: 'c', type: 'boolean', default: false },
		inspect: { short: 'I', type: 'boolean', default: false },
		'exit-on-fail': { short: 'e', type: 'boolean' },

		// Coverage
		coverage: { type: 'string', default: 'tests/.coverage' },
		preserve: { short: 'p', type: 'boolean' },
		report: { type: 'boolean', default: false },
		clean: { type: 'boolean', default: false },
	},
	allowPositionals: true,
});

if (options.help) {
	console.log(`zenfs-test [...options] <...paths> 

Paths: The setup files to run tests on

Behavior:
    -a, --auto          Automatically detect setup files
    -b, --build         Run the npm build script prior to running tests
    -c, --common        Also run tests not specific to any backend
    -e, --exit-on-fail  If any tests suites fail, exit immediately
    -t, --test <glob>   Which FS test suite(s) to run
    -f, --force         Whether to use --test-force-exit
    -I, --inspect       Use the inspector for debugging

Output:
    -h, --help          Outputs this help message
    -w, --verbose       Output verbose messages
    -q, --quiet         Don't output normal messages
    -l, --logs <level>  Change the default log level for test output. Level can be a number or string
    -N, --file-names    Use full file paths for tests from setup files instead of the base name
    -C, --ci            Continuous integration (CI) mode. This interacts with the Github
                        Checks API for better test status. Requires @octokit/action

Coverage:
    --coverage <dir>    Override the default coverage data directory
    -p, --preserve      Do not delete or report coverage data
    --report            ONLY report coverage
    --clean             ONLY clean up coverage directory`);
	process.exit();
}

if (options.quiet && options.verbose) {
	console.error('ERROR: Can not specify --verbose and --quiet');
	process.exit(1);
}

process.env.NODE_V8_COVERAGE = options.coverage;
process.env.ZENFS_LOG_LEVEL = options.log;

if (options.clean) {
	rmSync(options.coverage, { recursive: true, force: true });
	process.exit();
}

if (options.report) {
	execSync('npx c8 report --reporter=text', { stdio: 'inherit' });
	rmSync(options.coverage, { recursive: true, force: true });
	process.exit();
}

let ci;
if (options.ci) ci = await import('./ci.js');

options.verbose && options.force && console.debug('Forcing tests to exit (--test-force-exit)');

if (options.build) {
	!options.quiet && console.log('Building...');
	try {
		execSync('npm run build');
	} catch {
		console.warn('Build failed, continuing without it.');
	}
}

if (!existsSync(join(import.meta.dirname, '../dist'))) {
	console.error('ERROR: Missing build. If you are using an installed package, please submit a bug report.');
	process.exit(1);
}

if (options.auto) {
	let sum = 0;

	for (const pattern of ['**/tests/setup/*.ts', '**/tests/setup-*.ts']) {
		const files = await globSync(pattern).filter(f => !f.includes('node_modules'));
		sum += files.length;
		positionals.push(...files);
	}

	!options.quiet && console.log(`Auto-detected ${sum} test setup files`);
}

/**
 * Colorizes some text
 * @param {string} text Text to color
 * @param {string | number} code ANSI escape code
 * @returns
 */
function color(text, code) {
	return `\x1b[${code}m${text}\x1b[0m`;
}

async function status(name) {
	const start = performance.now();

	if (options.ci) await ci.startCheck(name);

	const time = () => {
		let delta = Math.round(performance.now() - start),
			unit = 'ms';

		if (delta > 5000) {
			delta /= 1000;
			unit = 's';
		}

		return color(`(${delta} ${unit})`, '2;37');
	};

	return {
		async pass() {
			if (!options.quiet) console.log(`${color('passed', 32)}: ${name} ${time()}`);
			if (options.ci) await ci.completeCheck(name, 'success');
		},
		async skip() {
			if (!options.quiet) console.log(`${color('skipped', 33)}: ${name} ${time()}`);
			if (options.ci) await ci.completeCheck(name, 'skipped');
		},
		async fail() {
			console.error(`${color('failed', '1;31')}: ${name} ${time()}`);
			if (options.ci) await ci.completeCheck(name, 'failure');
			process.exitCode = 1;
			if (options['exit-on-fail']) process.exit();
		},
	};
}

if (!options.preserve) rmSync(options.coverage, { force: true, recursive: true });
mkdirSync(options.coverage, { recursive: true });

if (options.common) {
	!options.quiet && console.log('Running common tests...');
	const { pass, fail } = await status('Common tests');
	try {
		execSync(
			`tsx ${options.inspect ? 'inspect' : ''} ${options.force ? '--test-force-exit' : ''} --test --experimental-test-coverage 'tests/*.test.ts' 'tests/**/!(fs)/*.test.ts'`,
			{
				stdio: ['ignore', options.verbose ? 'inherit' : 'ignore', 'inherit'],
			}
		);
		await pass();
	} catch {
		await fail();
	}
}

const testsGlob = join(import.meta.dirname, `../tests/fs/${options.test || '*'}.test.ts`);

for (const setupFile of positionals) {
	if (!existsSync(setupFile)) {
		!options.quiet && console.warn('Skipping tests for non-existent setup file:', setupFile);
		continue;
	}

	process.env.SETUP = setupFile;

	const name = options['file-names'] && !options.ci ? setupFile : parse(setupFile).name;

	!options.quiet && console.log('Running tests:', name);

	const { pass, fail, skip } = await status(name);

	if (basename(setupFile).startsWith('_')) {
		await skip();
		continue;
	}

	try {
		execSync(
			[
				'tsx --trace-deprecation',
				options.inspect ? 'inspect' : '',
				'--test --experimental-test-coverage',
				options.force ? '--test-force-exit' : '',
				testsGlob,
				process.env.CMD,
			].join(' '),
			{
				stdio: ['ignore', options.verbose ? 'inherit' : 'ignore', 'inherit'],
			}
		);
		await pass();
	} catch {
		await fail();
	}
}

if (!options.preserve) {
	execSync('npx c8 report --reporter=text', { stdio: 'inherit' });
	rmSync(options.coverage, { recursive: true });
}
