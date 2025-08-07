import { confirm, intro, isCancel, note, outro, select, spinner, text } from '@clack/prompts';
import { Args, Command, Flags } from '@oclif/core';
import { camelCase } from 'change-case';
import fs from 'node:fs/promises';
import path from 'node:path';
import picocolors from 'picocolors';

import type { TemplateData, TemplateWithRun } from '../template/core';
import { templates } from '../template/templates';
import { delayAtLeast, folderExists } from '../utils/filesystem';
import { tryReadGitUser } from '../utils/git';
import { detectPackageManager, installDependencies } from '../utils/package-manager';
import { onCancel, withCancelHandler } from '../utils/prompts';

export default class Create extends Command {
	static override description = 'Create a new n8n community node';
	static override examples = ['<%= config.bin %> <%= command.id %>'];
	static override args = {
		name: Args.string({ name: 'Name' }),
	};
	static override flags = {
		force: Flags.boolean({
			char: 'f',
			description: 'Overwrite destination folder if it already exists',
		}),
		'skip-install': Flags.boolean({ description: 'Skip installing dependencies' }),
		template: Flags.string({
			options: ['declarative/github-issues', 'declarative/custom', 'programmatic/example'] as const,
		}),
	};

	async run(): Promise<void> {
		const { flags, args } = await this.parse(Create);

		const maybePackageManager = detectPackageManager();
		const packageManager = maybePackageManager ?? 'npm';
		const introMessage = maybePackageManager
			? ` ${packageManager} create @n8n/node `
			: ' n8n-node create ';

		intro(picocolors.inverse(introMessage));

		const nodeName =
			args.name ??
			(await withCancelHandler(
				text({
					message: 'What is your node called?',
					placeholder: 'n8n-nodes-example',
					validate(value) {
						if (!value) return;
						const kebabCase = /^[a-z0-9]+(-[a-z0-9]+)*$/;
						if (!kebabCase.test(value)) return 'Node name should be kebab-case';
						if (!value.startsWith('n8n-nodes')) return 'Node name should start with n8n-nodes-';
						return;
					},
					defaultValue: 'n8n-nodes-example',
				}),
			));

		const destination = path.resolve(process.cwd(), nodeName);

		let overwrite = false;
		if (await folderExists(destination)) {
			if (!flags.force) {
				const shouldOverwrite = await confirm({
					message: `./${nodeName} already exists, do you want to overwrite?`,
				});
				if (isCancel(shouldOverwrite) || !shouldOverwrite) return onCancel();
			}

			overwrite = true;
		}

		const type =
			flags.template?.split('/')[0] ??
			(await withCancelHandler(
				select<'declarative' | 'programmatic'>({
					message: 'What kind of node are you building?',
					options: [
						{
							label: 'HTTP API',
							value: 'declarative',
							hint: 'Low-code, faster approval for n8n Cloud',
						},
						{
							label: 'Other',
							value: 'programmatic',
							hint: 'Programmatic node with full flexibility',
						},
					],
					initialValue: 'declarative',
				}),
			));

		let template = templates.programmatic.example;
		if (flags.template) {
			const templateFlag = flags.template.split('/')[1];
			template = (templates as Record<string, Record<string, TemplateWithRun>>)[type][
				camelCase(templateFlag)
			];
		} else if (type === 'declarative') {
			const chosenTemplate = await withCancelHandler(
				select<keyof typeof templates.declarative>({
					message: 'What template do you want to use?',
					options: Object.entries(templates.declarative).map(([value, template]) => ({
						value: value as keyof typeof templates.declarative,
						label: template.name,
						hint: template.description,
					})),
					initialValue: 'githubIssues',
				}),
			);
			template = templates.declarative[chosenTemplate];
		}

		const config = (await template.prompts?.()) ?? {};
		const templateData: TemplateData = {
			path: destination,
			nodeName,
			config,
			user: tryReadGitUser(),
			packageManager: {
				name: packageManager,
				installCommand: packageManager === 'npm' ? 'ci' : 'install',
			},
		};
		const copyingSpinner = spinner();
		copyingSpinner.start('Copying files');
		if (overwrite) {
			await fs.rm(destination, { recursive: true, force: true });
		}
		await delayAtLeast(template.run(templateData), 1000);
		copyingSpinner.stop('Files copied');

		if (!flags['skip-install']) {
			const installingSpinner = spinner();
			installingSpinner.start('Installing dependencies');

			try {
				await delayAtLeast(installDependencies({ dir: destination, packageManager }), 1000);
			} catch (error: unknown) {
				installingSpinner.stop('Could not install dependencies', 1);
				return process.exit(1);
			}
			installingSpinner.stop('Dependencies installed');
		}

		note(
			`Need help? Check out the docs: https://docs.n8n.io/integrations/creating-nodes/build/${type}-style-node/`,
			'Next Steps',
		);

		outro(`Created ./${nodeName} ✨`);
	}
}
