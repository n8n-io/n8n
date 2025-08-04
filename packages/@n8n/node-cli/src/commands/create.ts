import {
	intro,
	note,
	outro,
	select,
	text,
	isCancel,
	cancel,
	confirm,
	spinner,
	log,
} from '@clack/prompts';
import { Args, Command, Flags } from '@oclif/core';
import fs from 'fs/promises';
import path from 'node:path';
import color from 'picocolors';

import { copyFolder, delayAtLeast, folderExists } from '../utils';

export default class Create extends Command {
	static override description = 'Create a new n8n community node';
	static override examples = ['<%= config.bin %> <%= command.id %>'];
	static override args = {
		name: Args.string({ name: 'Name' }),
	};
	static override flags = {
		force: Flags.boolean({ char: 'f' }),
		skipInstall: Flags.boolean(),
		template: Flags.string({ char: 't', options: ['declarative', 'programmatic'] as const }),
	};

	async run(): Promise<void> {
		const { flags, args } = await this.parse(Create);

		const onCancel = () => {
			cancel('Cancelled');
			process.exit(0);
		};

		intro(color.inverse(' create @n8n/node '));

		const nodeName =
			args.name ??
			(await text({
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
			}));

		if (isCancel(nodeName)) return onCancel();

		const destination = path.resolve(process.cwd(), nodeName);

		if (await folderExists(destination)) {
			if (!flags.force) {
				const overwrite = await confirm({
					message: `./${nodeName} already exists, do you want to overwrite?`,
				});
				if (isCancel(overwrite) || !overwrite) return onCancel();
			}

			await fs.rm(destination, { recursive: true, force: true });
		}

		const type = await select<'declarative' | 'programmatic'>({
			message: 'What kind of node are looking to build?',
			options: [
				{
					label: 'HTTP API',
					value: 'declarative',
					hint: 'Low-code, faster approval for n8n Cloud',
				},
				{ label: 'Other', value: 'programmatic', hint: 'Programmatic node with full flexibility' },
			],
			initialValue: 'declarative',
		});

		if (isCancel(type)) return onCancel();

		switch (type) {
			case 'declarative': {
				const template = await select<'github-issues' | 'minimal'>({
					message: 'What template do you want to use?',
					options: [
						{
							label: 'GitHub Issues API',
							value: 'github-issues',
							hint: 'Demo node with multiple operations and credentials',
						},
						{
							label: 'Start from scratch',
							value: 'minimal',
							hint: 'Blank template with guided setup',
						},
					],
					initialValue: 'github-issues',
				});

				if (isCancel(template)) return onCancel();

				if (template === 'github-issues') {
					const copyingSpinner = spinner();
					copyingSpinner.start('Copying files');
					const templateFolder = path.resolve(__dirname, '../templates/declarative/github-issues');
					const ignore = ['dist', 'node_modules'];

					await delayAtLeast(copyFolder({ source: templateFolder, destination, ignore }), 1000);
					copyingSpinner.stop('Done');
				}

				if (template === 'minimal') {
					const credentialType = await select({
						message: 'What type of authentication does your API use?',
						options: [
							{
								label: 'API key',
								value: 'apiKey',
								hint: 'A secret key sent in the request',
							},
							{
								label: 'OAuth2',
								value: 'oauth2',
							},
							{
								label: 'Other',
								value: 'other',
								hint: 'Will generate an empty credential',
							},
							{
								label: 'None',
								value: 'none',
							},
						],
						initialValue: 'apiKey',
					});

					if (isCancel(credentialType)) return onCancel();

					log.info(credentialType);
				}

				break;
			}

			case 'programmatic':
			default:
				break;
		}

		note(
			`Need help? Check out the docs: https://docs.n8n.io/integrations/creating-nodes/build/${type}-style-node/`,
			'Next Steps',
		);

		outro(`Created ./${nodeName} ✨`);
	}
}
