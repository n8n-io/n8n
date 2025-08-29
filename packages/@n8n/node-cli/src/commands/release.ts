import { Command } from '@oclif/core';

import { ChildProcessError, runWithDependencies } from '../utils/child-process';
import { detectPackageManager } from '../utils/package-manager';

export default class Release extends Command {
	static override description = 'Publish your community node package to npm';
	static override examples = ['<%= config.bin %> <%= command.id %>'];
	static override flags = {};

	async run(): Promise<void> {
		await this.parse(Release);

		const pm = (await detectPackageManager()) ?? 'npm';

		try {
			await runWithDependencies(
				'release-it',
				[
					'--git.requireBranch=main',
					'--git.requireCleanWorkingDir',
					'--git.requireUpstream',
					'--git.requireCommits',
					`--hooks.before:init="${pm} run lint && ${pm} run build"`,
				],
				{
					stdio: 'inherit',
					env: {
						RELEASE_MODE: 'true',
					},
				},
			);
		} catch (error) {
			if (error instanceof ChildProcessError) {
				if (error.signal) {
					process.kill(process.pid, error.signal);
				} else {
					process.exit(error.code ?? 0);
				}
			}
			throw error;
		}
	}
}
