import { Command } from '@oclif/core';
import { spawn } from 'node:child_process';

import { detectPackageManager } from '../utils/package-manager';

export default class Release extends Command {
	static override description = 'Publish your community node package to npm';
	static override examples = ['<%= config.bin %> <%= command.id %>'];
	static override flags = {};

	async run(): Promise<void> {
		await this.parse(Release);

		const pm = (await detectPackageManager()) ?? 'npm';

		const child = spawn(
			pm,
			[
				'exec',
				'--',
				'release-it',
				'--git.requireBranch=main',
				'--git.requireCleanWorkingDir',
				'--git.requireUpstream',
				'--git.requireCommits',
				`--hooks.before:init="${pm} lint && ${pm} build"`,
			],
			{
				stdio: 'inherit',
				cwd: process.cwd(),
				env: {
					...process.env,
					RELEASE_MODE: 'true',
				},
			},
		);

		child.on('exit', (code, signal) => {
			if (signal) {
				process.kill(process.pid, signal);
			} else {
				process.exit(code ?? 0);
			}
		});
	}
}
