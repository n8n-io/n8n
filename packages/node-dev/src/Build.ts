import { join } from 'path';
import { ChildProcess, spawn } from 'child_process';

import { IBuildOptions } from '.';

import {
	UserSettings,
} from "n8n-core";


/**
 * Builds and copies credentials and nodes
 *
 * @export
 * @param {IBuildOptions} [options] Options to overwrite default behaviour
 * @returns {Promise<string>}
 */
export async function buildFiles (options?: IBuildOptions): Promise<string> {
	options = options || {};

	// Get the path of the TypeScript cli of this project
	const tscPath = join(__dirname, '../../node_modules/typescript/bin/tsc');

	// Get path to simple tsconfig file which should be used for build
	const tsconfigPath = join(__dirname, '../../src/tsconfig-build.json');

	const outputDirectory = options.destinationFolder || UserSettings.getUserN8nFolderCustomExtensionPath();

	let buildCommand = `${tscPath} --p ${tsconfigPath} --outDir ${outputDirectory}`;
	if (options.watch === true) {
		buildCommand += ' --watch';
	}

	let buildProcess: ChildProcess;
	try {
		buildProcess = spawn('node', buildCommand.split(' '), { windowsVerbatimArguments: true, cwd: process.cwd() });

		// Forward the output of the child process to the main one
		// that the user can see what is happening
		buildProcess.stdout.pipe(process.stdout);
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

		throw new Error(errorMessage);
	}

	return new Promise((resolve, reject) => {
		buildProcess.on('exit', code => {
			resolve(outputDirectory);
		});
	});
}
