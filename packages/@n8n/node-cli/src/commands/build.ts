import { cancel, intro, outro, spinner } from '@clack/prompts';
import { Command } from '@oclif/core';
import { spawn } from 'child_process';
import { glob } from 'fast-glob';
import { cp } from 'node:fs/promises';

export default class Build extends Command {
	static override description = 'Build an n8n community node';
	static override examples = ['<%= config.bin %> <%= command.id %>'];
	static override flags = {};

	async run(): Promise<void> {
		await this.parse(Build);

		intro('n8n-node build');

		const buildSpinner = spinner();
		buildSpinner.start('Building TypeScript files');

		try {
			await runTscBuild();
			buildSpinner.stop('✓ TypeScript build successful');
		} catch (error) {
			cancel('TypeScript build failed');
			this.exit(1);
		}

		const copyStaticFilesSpinner = spinner();
		copyStaticFilesSpinner.start('Copying static files');

		await copyStaticFiles();

		copyStaticFilesSpinner.stop('✓ Copied static files');

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

		child.on('close', (code) => {
			if (code === 0) {
				resolve();
			} else {
				console.error(`\ntsc build failed (exit code ${code})`);
				if (stdout) console.error(stdout.trim());
				if (stderr) console.error(stderr.trim());
				reject(new Error(`tsc exited with code ${code}`));
			}
		});
	});
}

async function copyStaticFiles() {
	const staticFiles = glob.sync(['**/*.{png,svg}', '**/__schema__/**/*.json']);

	return await Promise.all(
		staticFiles.map(async (path) => await cp(path, `dist/${path}`, { recursive: true })),
	);
}
