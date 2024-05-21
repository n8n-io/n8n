import { Help } from '@oclif/core';
import Container from 'typedi';
import { Logger } from 'winston';

// oclif expects a default export
// eslint-disable-next-line import/no-default-export
export default class CustomHelp extends Help {
	async showRootHelp() {
		Container.get(Logger).info(
			'You can find up to date information about the CLI here:\nhttps://docs.n8n.io/hosting/cli-commands/',
		);
	}
}
