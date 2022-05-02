/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { ChildProcess, spawn } from 'child_process';

import { readFile as fsReadFile } from 'fs/promises';
import { write as fsWrite } from 'fs';

import { join } from 'path';
import { file } from 'tmp-promise';
import { promisify } from 'util';

import { UserSettings } from 'n8n-core';
// eslint-disable-next-line import/no-cycle
import { IBuildOptions } from '.';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-var-requires
const copyfiles = require('copyfiles');

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const fsReadFileAsync = promisify(fsReadFile);
const fsWriteAsync = promisify(fsWrite);

/**
 * Create a custom tsconfig file as tsc currently has no way to define a base
 * directory:
 * https://github.com/Microsoft/TypeScript/issues/25430
 *
 * @export
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function createCustomTsconfig() {
	// Get path to simple tsconfig file which should be used for build
	const tsconfigPath = join(__dirname, '../../src/tsconfig-build.json');

	// Read the tsconfi file
	const tsConfigString = await fsReadFile(tsconfigPath, { encoding: 'utf8' });
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const tsConfig = JSON.parse(tsConfigString);

	// Set absolute include paths
	const newIncludeFiles = [];
	// eslint-disable-next-line no-restricted-syntax
	for (const includeFile of tsConfig.include) {
		newIncludeFiles.push(join(process.cwd(), includeFile));
	}
	tsConfig.include = newIncludeFiles;

	// Write new custom tsconfig file
	// eslint-disable-next-line @typescript-eslint/no-unsafe-call
	// eslint-disable-next-line @typescript-eslint/unbound-method
	const { fd, path, cleanup } = await file();
	await fsWriteAsync(fd, Buffer.from(JSON.stringify(tsConfig, null, 2), 'utf8'));

	return {
		path,
		cleanup,
	};
}

/**
 * Builds and copies credentials and nodes
 *
 * @export
 * @param {IBuildOptions} [options] Options to overwrite default behaviour
 * @returns {Promise<string>}
 */
export async function buildFiles(options?: IBuildOptions): Promise<string> {
	// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing, no-param-reassign
	options = options || {};

	let typescriptPath;

	// Check for OS to designate correct tsc path
	if (process.platform === 'win32') {
		typescriptPath = '../../node_modules/TypeScript/lib/tsc';
	} else {
		typescriptPath = '../../node_modules/.bin/tsc';
	}
	const tscPath = join(__dirname, typescriptPath);

	const tsconfigData = await createCustomTsconfig();

	const outputDirectory =
		// eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
		options.destinationFolder || UserSettings.getUserN8nFolderCustomExtensionPath();

	// Supply a node base path so that it finds n8n-core and n8n-workflow
	const nodeModulesPath = join(__dirname, '../../node_modules/');
	let buildCommand = `${tscPath} --p ${
		tsconfigData.path
	} --outDir ${outputDirectory} --rootDir ${process.cwd()} --baseUrl ${nodeModulesPath}`;
	if (options.watch === true) {
		buildCommand += ' --watch';
	}

	let buildProcess: ChildProcess;
	try {
		buildProcess = spawn('node', buildCommand.split(' '), {
			windowsVerbatimArguments: true,
			cwd: process.cwd(),
		});

		// Forward the output of the child process to the main one
		// that the user can see what is happening
		// @ts-ignore
		buildProcess.stdout.pipe(process.stdout);
		// @ts-ignore
		buildProcess.stderr.pipe(process.stderr);

		// Make sure that the child process gets also always terminated
		// when the main process does
		process.on('exit', () => {
			buildProcess.kill();
		});
	} catch (error) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		let errorMessage = error.message;

		if (error.stdout !== undefined) {
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			errorMessage = `${errorMessage}\nGot following output:\n${error.stdout}`;
		}

		// Remove the tmp tsconfig file
		// eslint-disable-next-line @typescript-eslint/no-floating-promises
		tsconfigData.cleanup();

		throw new Error(errorMessage);
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	return new Promise((resolve, reject) => {
		['*.png', '*.node.json'].forEach((filenamePattern) => {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-call
			copyfiles([join(process.cwd(), `./${filenamePattern}`), outputDirectory], { up: true }, () =>
				resolve(outputDirectory),
			);
		});
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		buildProcess.on('exit', (code) => {
			// Remove the tmp tsconfig file
			// eslint-disable-next-line @typescript-eslint/no-floating-promises
			tsconfigData.cleanup();
		});
	});
}
