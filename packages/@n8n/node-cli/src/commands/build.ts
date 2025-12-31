import { cancel, intro, log, outro, spinner } from '@clack/prompts';
import { Command } from '@oclif/core';
import { spawn } from 'child_process';
import glob from 'fast-glob';
import { cp, mkdir } from 'node:fs/promises';
import path from 'node:path';
import picocolors from 'picocolors';
import { rimraf } from 'rimraf';

import { ensureN8nPackage } from '../utils/prompts';

export default class Build extends Command {
	static override description = 'Compile the node in the current directory and copy assets';
	static override examples = ['<%= config.bin %> <%= command.id %>'];
	static override flags = {};

	async run(): Promise<void> {
		await this.parse(Build);

		const commandName = 'n8n-node build';
		intro(picocolors.inverse(` ${commandName} `));

		await ensureN8nPackage(commandName);

		const buildSpinner = spinner();
		buildSpinner.start('Building TypeScript files');
		await rimraf('dist');

		try {
			await runTscBuild();
			buildSpinner.stop('TypeScript build successful');
		} catch (error) {
			cancel('TypeScript build failed');
			this.exit(1);
		}

		const copyStaticFilesSpinner = spinner();
		copyStaticFilesSpinner.start('Copying static files');
		await copyStaticFiles();
		copyStaticFilesSpinner.stop('Copied static files');

		outro('✓ Build successful');
	}
}

async function runTscBuild(): Promise<void> {
	return await new Promise((resolve, reject) => {
		const child = spawn('tsc', [], {
			stdio: ['ignore', 'pipe', 'pipe'],
			shell: true,
		});

		let stderr = '';
		let stdout = '';

		child.stdout.on('data', (chunk: Buffer) => {
			stdout += chunk.toString();
		});

		child.stderr.on('data', (chunk: Buffer) => {
			stderr += chunk.toString();
		});

		child.on('error', (error) => {
			log.error(`${stdout.trim()}\n${stderr.trim()}`);
			reject(error);
		});

		child.on('close', (code) => {
			if (code === 0) {
				resolve();
			} else {
				log.error(`${stdout.trim()}\n${stderr.trim()}`);
				reject(new Error(`tsc exited with code ${code}`));
			}
		});
	});
}

export async function copyStaticFiles() {
	const staticFiles = glob.sync(['**/*.{png,svg}', '**/__schema__/**/*.json'], {
		ignore: ['dist'],
	});

	return await Promise.all(
		staticFiles.map(async (filePath) => {
			const destPath = path.join('dist', filePath);
			await mkdir(path.dirname(destPath), { recursive: true });
			return await cp(filePath, destPath, { recursive: true });
		}),
	);
}
