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
import fs from 'node:fs/promises';
import path from 'node:path';
import color from 'picocolors';

import {
	copyFolder,
	delayAtLeast,
	detectPackageManager,
	folderExists,
	installDependencies,
} from '../utils';

export default class Create extends Command {
	static override description = 'Create a new n8n community node';
	static override examples = ['<%= config.bin %> <%= command.id %>'];
	static override args = {
		name: Args.string({ name: 'Name' }),
	};
	static override flags = {
		force: Flags.boolean({ char: 'f' }),
		'skip-install': Flags.boolean(),
		type: Flags.string({ char: 't', options: ['declarative', 'programmatic'] as const }),
	};

	async run(): Promise<void> {
		const { flags, args } = await this.parse(Create);

		const onCancel = (message = 'Cancelled', code = 0) => {
			cancel(message);
			process.exit(code);
		};

		const maybePackageManager = detectPackageManager();
		const packageManager = maybePackageManager ?? 'npm';
		const introMessage = maybePackageManager
			? ` ${packageManager} create @n8n/node `
			: ' n8n-node create ';

		intro(color.inverse(introMessage));

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

		const type =
			flags.type ??
			(await select<'declarative' | 'programmatic'>({
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
			}));

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
					copyingSpinner.stop('✓ Files copied');

					if (!flags['skip-install']) {
						const installingSpinner = spinner();
						installingSpinner.start('Installing dependencies');

						try {
							await delayAtLeast(installDependencies({ dir: destination, packageManager }), 1000);
						} catch (error: unknown) {
							installingSpinner.stop('Could not install dependencies', 1);
							return onCancel((error as Error).message, 1);
						}
						installingSpinner.stop('✓ Dependencies installed');
					}
				}

				if (template === 'minimal') {
					const baseUrl = await text({
						message: "What's the base URL of the API?",
						placeholder: 'https://api.example.com/v2',
						validate: (value) => {
							if (!value.startsWith('https://') && !value.startsWith('http://')) {
								return 'Base URL must start with http(s)://';
							}
							return;
						},
					});

					if (isCancel(baseUrl)) return onCancel();

					log.info(baseUrl);

					const credentialType = await select<'apiKey' | 'oauth2' | 'none'>({
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
								label: 'None',
								value: 'none',
							},
						],
						initialValue: 'apiKey',
					});

					if (isCancel(credentialType)) return onCancel();

					log.info(credentialType);

					if (credentialType === 'oauth2') {
						const flow = await select<'clientCredentials' | 'authorizationCode'>({
							message: 'What type of authentication does your API use?',
							options: [
								{
									label: 'Authorization code',
									value: 'authorizationCode',
									hint: 'Users log in and approve access (use this if unsure)',
								},
								{
									label: 'Client credentials',
									value: 'clientCredentials',
									hint: 'Server-to-server auth without user interaction',
								},
							],
							initialValue: 'authorizationCode',
						});

						if (isCancel(flow)) return onCancel();

						log.info(flow);
					}
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
