import { Args, Flags } from '@oclif/core';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import * as tar from 'tar';

import { BaseCommand } from '../base-command';
import { summarizeValidation, toPackagesError } from './package/shared';

/** The exploded package layout — packed in this order (manifest FIRST), nothing else. */
const PACKAGE_ENTRIES = ['workflows', 'credentials', 'folders', 'projects'];

/**
 * Pack an exploded package tree into the gzip-tar (`.n8np`) the instance import
 * endpoint accepts. The server's reader requires `manifest.json` to be the FIRST
 * file entry, so we pass it explicitly first; we pack ONLY the known package entries
 * so stray repo files (README, scripts, .github) never enter the package.
 */
async function packDirectory(dir: string): Promise<Buffer> {
	const present = PACKAGE_ENTRIES.filter((entry) => fs.existsSync(path.join(dir, entry)));
	const tmp = path.join(os.tmpdir(), `n8n-deploy-${process.pid}-${Date.now()}.n8np`);
	// `portable` + `cwd` keep paths root-relative; manifest.json first satisfies the reader's invariant.
	await tar.create({ gzip: true, cwd: dir, portable: true, file: tmp }, [
		'manifest.json',
		...present,
	]);
	try {
		return fs.readFileSync(tmp);
	} finally {
		fs.rmSync(tmp, { force: true });
	}
}

/** Surface a value to a later GitHub Actions step (the sticky PR comment). No-op outside CI. */
function setGithubOutput(key: string, value: string): void {
	const file = process.env.GITHUB_OUTPUT;
	if (!file) return;
	fs.appendFileSync(file, `${key}=${value}\n`);
}

export default class Deploy extends BaseCommand {
	static override description =
		'Deploy an exploded n8n package tree to a remote instance (CI). With --dry-run it validates and gates the PR; without it, imports and publishes.';

	static override examples = [
		'<%= config.bin %> deploy --instance https://n8n.prd.com --dry-run --pr 123 .',
		'<%= config.bin %> deploy --instance https://n8n.prd.com --pr 123 .',
	];

	static override args = {
		dir: Args.string({ description: 'Exploded package tree directory', default: '.' }),
	};

	static override flags = {
		...BaseCommand.baseFlags,
		instance: Flags.string({ description: 'Target n8n instance URL (alias for --url)' }),
		pr: Flags.string({
			description: 'GitHub PR number; keys the credential-binding session',
			required: true,
		}),
		dryRun: Flags.boolean({
			description: 'Validate only; fail (exit 1) if credentials are missing, do not import',
			default: false,
			aliases: ['dry-run'],
		}),
		project: Flags.string({ description: 'Target project id (defaults to the personal project)' }),
		folder: Flags.string({ description: 'Target folder id within the project' }),
		conflictPolicy: Flags.string({
			description: 'What to do when a workflow already exists',
			options: ['new-version', 'fail', 'skip'],
			aliases: ['conflict-policy'],
		}),
		workflowIdPolicy: Flags.string({
			description: 'Whether imported workflows keep their source id or receive a new one',
			options: ['new', 'source'],
			aliases: ['workflow-id-policy'],
		}),
		credentialMatchingMode: Flags.string({
			description: 'How credential references are matched on the target instance',
			options: ['id-only'],
			aliases: ['credential-matching-mode'],
		}),
		credentialMissingMode: Flags.string({
			description: 'What to do when a referenced credential cannot be resolved',
			options: ['must-preexist', 'create-stub'],
			aliases: ['credential-missing-mode'],
		}),
	};

	async run(): Promise<void> {
		const { args, flags } = await this.parse(Deploy);
		const dir = args.dir ?? '.';
		if (!fs.existsSync(dir)) {
			this.error(`Directory not found: ${dir}`);
		}
		if (!fs.existsSync(path.join(dir, 'manifest.json'))) {
			this.error(
				`No manifest.json at the root of "${dir}" — expected an exploded n8n package tree.`,
			);
		}

		await this.execute(async () => {
			const client = this.getClient({ ...flags, url: flags.instance ?? flags.url });
			const buffer = await packDirectory(dir);
			const file = { buffer, filename: `deploy-pr-${flags.pr}.n8np` };
			const fields = {
				projectId: flags.project,
				folderId: flags.folder,
				workflowConflictPolicy: flags.conflictPolicy ?? 'new-version',
				workflowIdPolicy: flags.workflowIdPolicy ?? 'source',
				credentialMatchingMode: flags.credentialMatchingMode,
				credentialMissingMode: flags.credentialMissingMode ?? 'must-preexist',
			};

			if (flags.dryRun) {
				// Read-only gate: the server returns blocking issues + a binding link, never writes.
				const validation = await client
					.validatePackage(file, flags.pr, fields)
					.catch((error: unknown) => {
						throw toPackagesError(error);
					});

				const { hasIssues, issues, summary } = summarizeValidation(validation);
				this.log(summary);

				if (hasIssues) {
					if (validation.bindingUrl) {
						this.log(
							`\nResolve the required bindings on the target instance, then re-run this job:\n  ${validation.bindingUrl}`,
						);
						setGithubOutput('binding_url', validation.bindingUrl);
					}
					this.error(
						`Deployment blocked: ${issues.length} issue(s) must be resolved on the target instance`,
						{ exit: 1 },
					);
				}

				this.succeed(`Dry-run passed for PR ${flags.pr}: nothing blocking`, flags, {
					ok: true,
					pr: flags.pr,
				});
				return;
			}

			// Apply: import directly. The server re-gates and throws (409/422) on any blocking issue,
			// so a pre-validate would only add a wasted round-trip + a TOCTOU window.
			const result = await client
				.importPackage(file, { ...fields, workflowPublishingPolicy: 'publish-all' }, flags.pr)
				.catch((error: unknown) => {
					throw toPackagesError(error);
				});

			this.succeed(`Deployed PR ${flags.pr} to the target instance`, flags, {
				pr: flags.pr,
				...result,
			});
		});
	}
}
