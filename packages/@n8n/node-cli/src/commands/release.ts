import { intro, log } from '@clack/prompts';
import { Command, Flags } from '@oclif/core';

import { ChildProcessError, runCommand } from '../utils/child-process';
import { detectPackageManager } from '../utils/package-manager';
import { getCommandHeader } from '../utils/prompts';

export default class Release extends Command {
	static override description = `Release your community node package.

When running locally (default): Runs release-it to bump the version interactively, generate a changelog, commit, tag, push, and create a GitHub release. Does NOT publish to npm — use GitHub Actions for that.

When running inside a GitHub Action: Detected automatically via the GITHUB_ACTIONS environment variable. Runs lint and build, then publishes with provenance enabled (NPM_CONFIG_PROVENANCE=true).

Starting May 1 2026, n8n requires all community nodes to be published via GitHub Actions with npm provenance. Provenance lets anyone cryptographically verify that a package was built from a specific repository and commit.

To set up GitHub Actions publishing:
  1. Add a publish.yml workflow that triggers on version tags (e.g. v*.*.*).
  2. Grant the publish job: permissions: { id-token: write, contents: read }
  3. Use actions/setup-node with registry-url: 'https://registry.npmjs.org/'
  4. Run \`npm run release\` as the publish step.

For npm Trusted Publishing (no long-lived secrets):
  On npmjs.com → package settings → Trusted Publishers → add your repo and workflow name.
  Leave NPM_TOKEN unset; GitHub's OIDC token is used automatically.

For token-based auth (fallback):
  Add NPM_TOKEN to your repository secrets and pass it as NODE_AUTH_TOKEN.

Full documentation: https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/`;

	static override examples = ['<%= config.bin %> <%= command.id %>'];

	static override flags = {
		publish: Flags.boolean({
			description:
				'Publish to npm from your local machine (not recommended). Packages published this way will not include npm provenance and cannot become verified community nodes.',
			default: false,
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(Release);

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

			if (flags.publish) {
				log.warning(
					'Publishing directly from your machine will not include npm provenance, which is required for n8n Cloud starting May 1 2026.\nConsider switching to GitHub Actions publishing. See: https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/',
				);
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
					...(flags.publish ? [] : ['--npm.publish=false']),
				],
				{
					stdio: 'inherit',
					context: 'local',
					env: {
						RELEASE_MODE: 'true',
					},
				},
			);

			if (!flags.publish) {
				log.info(
					'The node was not published to NPM. Starting May 1 2026, n8n requires verified community nodes to be published via GitHub Actions with npm provenance. Learn more in our documentation: https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/',
				);
			}
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
