import Vorpal = require('vorpal');
import { Args } from 'vorpal';
import {
	buildFiles,
	IBuildOptions,
} from '../src';

import {
	UserSettings,
} from "n8n-core";

module.exports = (vorpal: Vorpal) => {
	return vorpal
		.command('build')
		// @ts-ignore
		.description('Builds credentials and nodes and copies it to n8n custom extension folder')
		.option('--destination <folder>',
			`The path to copy the compiles files to [default: ${UserSettings.getUserN8nFolderCustomExtensionPath()}]`)
		.option('--watch',
			'Starts in watch mode and automatically builds and copies file whenever they change')
		.option('\n')
		.action(async (args: Args) => {

			console.log('\nBuild credentials and nodes');
			console.log('=========================');

			try {
				const options: IBuildOptions = {};

				if (args.options.destination) {
					options.destinationFolder = args.options.destination;
				}
				if (args.options.watch) {
					options.watch = true;
				}

				const outputDirectory = await buildFiles(options);

				console.log(`The nodes got build and saved into the following folder:\n${outputDirectory}`);

			} catch (error) {
				console.error('\nGOT ERROR');
				console.error('====================================');
				console.error(error.message);
				return;
			}

		});
};
