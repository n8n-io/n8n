import { ChildProcess, spawn } from 'child_process';
const copyfiles = require('copyfiles');

import {
	readFile as fsReadFile,
} from 'fs/promises';
import {
	write as fsWrite,
} from 'fs';

import { join } from 'path';
import { file } from 'tmp-promise';
import { promisify } from 'util';

const fsReadFileAsync = promisify(fsReadFile);
const fsWriteAsync = promisify(fsWrite);

import { IBuildOptions } from '.';

import {
	UserSettings,
} from 'n8n-core';


/**
 * Create a custom tsconfig file as tsc currently has no way to define a base
 * directory:
 * https://github.com/Microsoft/TypeScript/issues/25430
 *
 * @export
 * @returns
 */
export async function createCustomTsconfig () {

	// Get path to simple tsconfig file which should be used for build
	const tsconfigPath = join(__dirname, '../../src/tsconfig-build.json');

	// Read the tsconfi file
	const tsConfigString = await fsReadFile(tsconfigPath, { encoding: 'utf8'}) as string;
	const tsConfig = JSON.parse(tsConfigString);

	// Set absolute include paths
	const newIncludeFiles = [];
	for (const includeFile of tsConfig.include) {
		newIncludeFiles.push(join(process.cwd(), includeFile));
	}
	tsConfig.include = newIncludeFiles;

	// Write new custom tsconfig file
	const { fd, path, cleanup } = await file({ dir: process.cwd() });
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
export async function buildFiles (options?: IBuildOptions): Promise<string> {
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

	const outputDirectory = options.destinationFolder || UserSettings.getUserN8nFolderCustomExtensionPath();

	// Supply a node base path so that it finds n8n-core and n8n-workflow
	const nodeModulesPath = join(__dirname, '../../node_modules/');
	let buildCommand = `${tscPath} --p ${tsconfigData.path} --outDir ${outputDirectory} --rootDir ${process.cwd()} --baseUrl ${nodeModulesPath}`;
	if (options.watch === true) {
		buildCommand += ' --watch';
	}

	let buildProcess: ChildProcess;
	try {
		buildProcess = spawn('node', buildCommand.split(' '), { windowsVerbatimArguments: true, cwd: process.cwd() });

		// Forward the output of the child process to the main one
		// that the user can see what is happening
		//@ts-ignore
		buildProcess.stdout.pipe(process.stdout);
		//@ts-ignore
		buildProcess.stderr.pipe(process.stderr);

		// Make sure that the child process gets also always terminated
		// when the main process does
		process.on('exit', () => {
			buildProcess.kill();
		});
	} catch (error) {
		let errorMessage = error.message;

		if (error.stdout !== undefined) {
			errorMessage = `${errorMessage}\nGot following output:\n${error.stdout}`;
		}

		// Remove the tmp tsconfig file
		tsconfigData.cleanup();

		throw new Error(errorMessage);
	}

	return new Promise((resolve, reject) => {
		copyfiles([join(process.cwd(), './*.png'), outputDirectory], { up: true }, () => resolve(outputDirectory));
		buildProcess.on('exit', code => {
			// Remove the tmp tsconfig file
			tsconfigData.cleanup();
		});
	});
}
