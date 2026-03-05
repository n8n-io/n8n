import { intro } from '@clack/prompts';
import { Command } from '@oclif/core';

import { ChildProcessError, runCommand } from '../utils/child-process';
import { detectPackageManager } from '../utils/package-manager';
import { getCommandHeader } from '../utils/prompts';

export default class Release extends Command {
	static override description = 'Publish your community node package to npm';
	static override examples = ['<%= config.bin %> <%= command.id %>'];
	static override flags = {};

	async run(): Promise<void> {
		await this.parse(Release);

		intro(await getCommandHeader('n8n-node release'));

		const pm = (await detectPackageManager()) ?? 'npm';
		const isCI = Boolean(process.env.GITHUB_ACTIONS);

		try {
			if (isCI) {
				await runCommand(pm, ['run', 'lint'], { stdio: 'inherit' });
				await runCommand(pm, ['run', 'build'], { stdio: 'inherit' });
				await runCommand('npm', ['publish'], {
					stdio: 'inherit',
					env: {
						RELEASE_MODE: 'true',
						NPM_CONFIG_PROVENANCE: 'true',
					},
				});
				return;
			}

			await runCommand(
				'release-it',
				[
					'-n',
					'--git.requireBranch main',
					'--git.requireCleanWorkingDir',
					'--git.requireUpstream',
					'--git.requireCommits',
					'--git.commit',
					'--git.tag',
					'--git.push',
					'--git.changelog="npx auto-changelog --stdout --unreleased --commit-limit false -u --hide-credit"',
					'--github.release',
					`--hooks.before:init="${pm} run lint && ${pm} run build"`,
					'--hooks.after:bump="npx auto-changelog -p"',
				],
				{
					stdio: 'inherit',
					context: 'local',
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
