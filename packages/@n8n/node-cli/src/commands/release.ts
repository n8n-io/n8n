import { intro, log } from '@clack/prompts';
import { Command, Flags } from '@oclif/core';
import handlebars from 'handlebars';
import fs from 'node:fs/promises';
import path from 'node:path';

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
		'init-workflow': Flags.boolean({
			description:
				'Scaffold a GitHub Actions publish workflow (.github/workflows/publish.yml) into the current project. Required for publishing with npm provenance, which is needed to submit your node for verification through the n8n Creator Portal.',
			default: false,
		}),
	};

	async run(): Promise<void> {
		const { flags } = await this.parse(Release);

		intro(await getCommandHeader('n8n-node release'));

		const pm = (await detectPackageManager()) ?? 'npm';
		const isCI = Boolean(process.env.GITHUB_ACTIONS);

		if (!isCI && !flags['init-workflow']) {
			const workflowPath = path.resolve(process.cwd(), '.github/workflows/publish.yml');
			const workflowExists = await fs
				.access(workflowPath)
				.then(() => true)
				.catch(() => false);
			if (!workflowExists) {
				log.info(
					'No GitHub Actions publish workflow found.\n' +
						'Run `n8n-node release --init-workflow` to scaffold one. ' +
						'This is required for npm provenance and n8n Cloud verification.',
				);
			}
		}

		if (flags['init-workflow']) {
			await this.initWorkflow(pm);
			return;
		}

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

	private async initWorkflow(pm: string): Promise<void> {
		const dest = path.resolve(process.cwd(), '.github/workflows/publish.yml');

		try {
			await fs.access(dest);
			log.warning('.github/workflows/publish.yml already exists — skipping.');
			return;
		} catch {
			// File does not exist, proceed
		}

		const templatePath = path.resolve(
			__dirname,
			'../template/templates/shared/default/.github/workflows/publish.yml',
		);
		const templateContent = await fs.readFile(templatePath, 'utf-8');
		const installCommand = pm === 'npm' ? 'ci' : 'install';
		const rendered = handlebars.compile(templateContent, { noEscape: true })({
			packageManager: { name: pm, installCommand },
		});

		await fs.mkdir(path.dirname(dest), { recursive: true });
		await fs.writeFile(dest, rendered);

		log.success('Created .github/workflows/publish.yml');
		log.info(
			'Next steps:\n' +
				'  1. Configure npm Trusted Publishing or add NPM_TOKEN to your repository secrets.\n' +
				'  2. See the workflow file for setup instructions, or visit:\n' +
				'     https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/',
		);
	}
}
