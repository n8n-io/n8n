import { intro, log } from '@clack/prompts';
import { Command } from '@oclif/core';

import { ChildProcessError, runCommand } from '../utils/child-process';
import { detectPackageManager } from '../utils/package-manager';
import { getCommandHeader } from '../utils/prompts';

export default class Release extends Command {
	static override description = `Publish your community node package to npm.

Starting May 1 2026, n8n requires all community nodes to be published via GitHub Actions with npm provenance. Provenance lets anyone cryptographically verify that a package was built from a specific repository and commit.

When this command is running locally: Runs release-it to bump the version interactively, generate a changelog, commit, tag, push, create a GitHub release, and publish to npm.

When it's running inside a GitHub Action: Detected automatically via the GITHUB_ACTIONS environment variable. Runs lint and build, then publishes with provenance enabled (NPM_CONFIG_PROVENANCE=true).

To set up GitHub Actions publishing:
  1. Add a publish.yml workflow that triggers on version tags (e.g. v*.*.*).
  2. Grant the publish job: permissions: { id-token: write, contents: read }
  3. Use actions/setup-node with registry-url: 'https://registry.npmjs.org/'
  4. Run \`npm run release\` as the publish step.

For npm Trusted Publishing (no long-lived secrets):
  On npmjs.com → package settings → Trusted Publishers → add your repo and workflow name.
  Leave NPM_TOKEN unset; GitHub's OIDC token is used automatically.

For token-based auth (fallback):
  Add NPM_TOKEN to your repository secrets and pass it as NODE_AUTH_TOKEN.`;

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

			log.warning(
				'Starting May 1 2026, n8n requires community nodes to be published via GitHub Actions with npm provenance.\nRun `n8n-node release --help` to learn how to set this up.',
			);

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
