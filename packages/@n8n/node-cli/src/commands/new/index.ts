import { confirm, intro, isCancel, note, outro, spinner } from '@clack/prompts';
import { Args, Command, Flags } from '@oclif/core';
import { camelCase } from 'change-case';
import fs from 'node:fs/promises';
import path from 'node:path';
import picocolors from 'picocolors';

import { declarativeTemplatePrompt, nodeNamePrompt, nodeTypePrompt } from './prompts';
import { createIntro } from './utils';
import type { TemplateData, TemplateWithRun } from '../../template/core';
import { getTemplate, isTemplateName, isTemplateType, templates } from '../../template/templates';
import { delayAtLeast, folderExists } from '../../utils/filesystem';
import { tryReadGitUser } from '../../utils/git';
import { detectPackageManager, installDependencies } from '../../utils/package-manager';
import { onCancel } from '../../utils/prompts';
import { validateNodeName } from '../../utils/validation';

export default class New extends Command {
	static override description = 'Create a starter community node in a new directory';
	static override examples = [
		'<%= config.bin %> <%= command.id %>',
		'<%= config.bin %> <%= command.id %> n8n-nodes-my-app --skip-install',
		'<%= config.bin %> <%= command.id %> n8n-nodes-my-app --force',
		'<%= config.bin %> <%= command.id %> n8n-nodes-my-app --template declarative/custom',
	];
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
		const { flags, args } = await this.parse(New);
		const [typeFlag, templateFlag] = flags.template?.split('/') ?? [];

		intro(picocolors.inverse(createIntro()));

		const nodeName = args.name ?? (await nodeNamePrompt());
		const invalidNodeNameError = validateNodeName(nodeName);

		if (invalidNodeNameError) return onCancel(invalidNodeNameError);

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

		const type = typeFlag ?? (await nodeTypePrompt());
		if (!isTemplateType(type)) {
			return onCancel(`Invalid template type: ${type}`);
		}

		let template: TemplateWithRun = templates.programmatic.example;
		if (templateFlag) {
			const name = camelCase(templateFlag);
			if (!isTemplateName(type, name)) {
				return onCancel(`Invalid template name: ${name} for type: ${type}`);
			}
			template = getTemplate(type, name);
		} else if (type === 'declarative') {
			const chosenTemplate = await declarativeTemplatePrompt();
			template = getTemplate('declarative', chosenTemplate) as TemplateWithRun;
		}

		const config = (await template.prompts?.()) ?? {};
		const packageManager = detectPackageManager() ?? 'npm';
		const templateData: TemplateData = {
			destinationPath: destination,
			nodePackageName: nodeName,
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
