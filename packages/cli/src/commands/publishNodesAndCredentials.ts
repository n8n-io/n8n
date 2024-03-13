import { Flags } from '@oclif/core';
import { ExecutionBaseError } from 'n8n-workflow';
import { Container } from 'typedi';

import { BaseCommand } from './BaseCommand';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { writeFileSync, rmSync } from 'fs';
import { execSync } from 'child_process';

export class PublishNodesAndCredentials extends BaseCommand {
	static description = '\nPublishes the nodes and credentials';

	static flags = {
		help: Flags.help({ char: 'h' }),
		path: Flags.string({
			description: 'S3 path to publish to',
		}),
	};

	async init() {
		await super.init();
	}

	async run() {
		const { flags } = await this.parse(PublishNodesAndCredentials);

		console.log('Publishing nodes and credentials...');

		const types = Container.get(LoadNodesAndCredentials).types;
		console.log(
			'Loaded',
			types.credentials.length,
			'credentials and',
			types.nodes.length,
			'nodes.',
		);

		await this.publish(types.credentials, 'credentials.json', flags.path!);
		await this.publish(types.nodes, 'nodes.json', flags.path!);
	}

	/* eslint-disable  @typescript-eslint/no-explicit-any */
	async publish(data: any, fileName: string, path: string) {
		writeFileSync(fileName, JSON.stringify(data));
		const publishCommand = `aws s3 cp ${fileName} ${path}/${fileName} --acl public-read`;
		execSync(publishCommand);
		rmSync(fileName);
	}

	async catch(error: Error) {
		this.logger.error('Error publishing nodes and credentials. See log messages for details.');
		this.logger.error('\nExecution error:');
		this.logger.info('====================================');
		this.logger.error(error.message);
		if (error instanceof ExecutionBaseError) this.logger.error(error.description!);
		this.logger.error(error.stack!);
	}
}
