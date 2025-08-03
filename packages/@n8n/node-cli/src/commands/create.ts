import { intro, note, outro, select, text, isCancel, cancel } from '@clack/prompts';
import { Args, Command, Flags } from '@oclif/core';
import path from 'node:path';
import color from 'picocolors';

export default class Create extends Command {
	static override description = 'Create a new n8n community node';
	static override examples = ['<%= config.bin %> <%= command.id %>'];
	static override args = {
		name: Args.string({ name: 'Name' }),
	};
	static override flags = {
		// flag with no value (-f, --force)
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

		intro(color.inverse(' pnpm create @n8n/node '));

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
				},
				defaultValue: 'n8n-nodes-example',
			}));

		if (isCancel(nodeName)) return onCancel();

		const destination = path.resolve(process.cwd(), nodeName);

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

				break;
			}

			case 'programmatic':
			default:
				break;
		}

		note(
			`cd ./${nodeName} && pnpm dev

Need help? Check out the docs: https://docs.n8n.io/integrations/creating-nodes/build/${type}-style-node/`,
			'Next Steps',
		);

		outro(`Created ./${nodeName} ✨`);
	}
}
