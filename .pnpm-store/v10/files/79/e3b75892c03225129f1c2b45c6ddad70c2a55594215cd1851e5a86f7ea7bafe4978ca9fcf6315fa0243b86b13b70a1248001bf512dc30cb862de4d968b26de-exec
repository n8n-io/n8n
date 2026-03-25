#!/usr/bin/env node
'use strict';

const path = require('path');
const process = require('process');
const program = require('commander');
const rc = require('rc')('madge');
const version = require('../package.json').version;
const ora = require('ora');
const chalk = require('chalk');
const startTime = Date.now();

// Revert https://github.com/tj/commander.js/pull/1409
program.storeOptionsAsProperties();

program
	.version(version)
	.usage('[options] <src...>')
	.option('-b, --basedir <path>', 'base directory for resolving paths')
	.option('-s, --summary', 'show dependency count summary')
	.option('-c, --circular', 'show circular dependencies')
	.option('-d, --depends <name>', 'show module dependents')
	.option('-x, --exclude <regexp>', 'exclude modules using RegExp')
	.option('-j, --json', 'output as JSON')
	.option('-i, --image <file>', 'write graph to file as an image')
	.option('-l, --layout <name>', 'layout engine to use for graph (dot/neato/fdp/sfdp/twopi/circo)')
	.option('--orphans', 'show modules that no one is depending on')
	.option('--leaves', 'show modules that have no dependencies')
	.option('--dot', 'show graph using the DOT language')
	.option('--rankdir <direction>', 'set the direction of the graph layout')
	.option('--extensions <list>', 'comma separated string of valid file extensions')
	.option('--require-config <file>', 'path to RequireJS config')
	.option('--webpack-config <file>', 'path to webpack config')
	.option('--ts-config <file>', 'path to typescript config')
	.option('--include-npm', 'include shallow NPM modules', false)
	.option('--no-color', 'disable color in output and image', false)
	.option('--no-spinner', 'disable progress spinner', false)
	.option('--no-count', 'disable circular dependencies counting', false)
	.option('--stdin', 'read predefined tree from STDIN', false)
	.option('--warning', 'show warnings about skipped files', false)
	.option('--debug', 'turn on debug output', false)
	.parse(process.argv);

if (!program.args.length && !program.stdin) {
	console.log(program.helpInformation());
	process.exit(1);
}

if (program.debug) {
	process.env.DEBUG = '*';
}

if (!program.color) {
	process.env.DEBUG_COLORS = false;
}

const log = require('../lib/log');
const output = require('../lib/output');
const madge = require('../lib/api');

let packageConfig = {};
try {
	packageConfig = require(path.join(process.cwd(), 'package.json')).madge;
} catch (e) { }
const config = Object.assign(rc, packageConfig);

program.options.forEach((opt) => {
	const name = opt.name();

	if (program[name]) {
		config[name] = program[name];
	}
});

const spinner = ora({
	text: 'Finding files',
	color: 'white',
	interval: 100000,
	isEnabled: program.spinner === 'false' ? false : null
});

let exitCode = 0;

delete config._;
delete config.config;
delete config.configs;

if (rc.config) {
	log('using runtime config %s', rc.config);
}

if (program.basedir) {
	config.baseDir = program.basedir;
}

if (program.exclude) {
	config.excludeRegExp = [program.exclude];
}

if (program.extensions) {
	config.fileExtensions = program.extensions.split(',').map((s) => s.trim());
}

if (program.requireConfig) {
	config.requireConfig = program.requireConfig;
}

if (program.webpackConfig) {
	config.webpackConfig = program.webpackConfig;
}

if (program.tsConfig) {
	config.tsConfig = program.tsConfig;
}

if (program.includeNpm) {
	config.includeNpm = program.includeNpm;
}

if (!program.color) {
	config.backgroundColor = '#ffffff';
	config.nodeColor = '#000000';
	config.noDependencyColor = '#000000';
	config.cyclicNodeColor = '#000000';
	config.edgeColor = '#757575';
}

if (program.rankdir) {
	config.rankdir = program.rankdir;
}

function dependencyFilter() {
	let prevFile;

	return (dependencyFilePath, traversedFilePath, baseDir) => {
		if (prevFile !== traversedFilePath) {
			const relPath = path.relative(baseDir, traversedFilePath);
			const dir = path.dirname(relPath) + '/';
			const file = path.basename(relPath);

			spinner.text = chalk.grey(dir) + chalk.cyan(file);

			prevFile = traversedFilePath;
		}
	};
}

new Promise((resolve, reject) => {
	if (program.stdin) {
		let buffer = '';

		process.stdin
			.resume()
			.setEncoding('utf8')
			.on('data', (chunk) => {
				buffer += chunk;
			})
			.on('end', () => {
				try {
					resolve(JSON.parse(buffer));
				} catch (e) {
					reject(e);
				}
			});
	} else {
		resolve(program.args);
	}
})
	.then((src) => {
		if (!program.json && !program.dot) {
			spinner.start();
			config.dependencyFilter = dependencyFilter();
		}

		return madge(src, config);
	})
	.then((res) => {
		if (!program.json && !program.dot) {
			spinner.stop();
			output.getResultSummary(res, startTime);
		}

		const result = createOutputFromOptions(program, res);
		if (result !== undefined) {
			return result;
		}

		output.list(res.obj(), {
			json: program.json
		});

		return res;
	})
	.then((res) => {
		if (program.warning && !program.json) {
			output.warnings(res);
		}

		if (!program.json && !program.dot) {
			console.log('');
		}

		process.exit(exitCode);
	})
	.catch((err) => {
		spinner.stop();
		console.log('\n%s %s\n', chalk.red('✖'), err.stack);
		process.exit(1);
	});

function createOutputFromOptions(program, res) {
	if (program.summary) {
		output.summary(res.obj(), {
			json: program.json
		});

		return res;
	}

	if (program.depends) {
		output.modules(res.depends(program.depends), {
			json: program.json
		});

		return res;
	}

	if (program.orphans) {
		output.modules(res.orphans(), {
			json: program.json
		});

		return res;
	}

	if (program.leaves) {
		output.modules(res.leaves(), {
			json: program.json
		});

		return res;
	}

	if (program.image) {
		return res.image(program.image, program.circular).then((imagePath) => {
			spinner.succeed(`${chalk.bold('Image created at')} ${chalk.cyan.bold(imagePath)}`);
			return res;
		});
	}

	if (program.dot) {
		return res.dot(program.circular).then((output) => {
			process.stdout.write(output);
			return res;
		});
	}

	if (program.circular) {
		const circular = res.circular();

		output.circular(spinner, res, circular, {
			json: program.json,
			printCount: program.count
		});

		if (circular.length) {
			exitCode = 1;
		}

		return res;
	}
}
