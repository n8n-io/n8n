import type { Command } from '@oclif/core';
import { HelpBase } from '@oclif/core';

// oclif expects a default export
// eslint-disable-next-line import/no-default-export
export default class CustomHelp extends HelpBase {
	async showHelp(_args: string[]) {
		console.log(
			'You can find up to date information about the CLI here:\nhttps://docs.n8n.io/hosting/cli-commands/',
		);
	}

	async showCommandHelp(_command: Command.Loadable) {
		// This is not used because we have a multi-command CLI, but it needs to
		// be defined to satisfy the abstract base class.
	}
}
