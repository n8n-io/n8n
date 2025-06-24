import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { Help } from '@oclif/core';

// oclif expects a default export
// eslint-disable-next-line import-x/no-default-export
export default class CustomHelp extends Help {
	async showRootHelp() {
		Container.get(Logger).info(
			'You can find up to date information about the CLI here:\nhttps://docs.n8n.io/hosting/cli-commands/',
		);
	}
}
