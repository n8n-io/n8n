/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/no-loop-func */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Command, flags } from '@oclif/command';

import { INode, INodeCredentialsDetails, LoggerProxy } from 'n8n-workflow';

import * as fs from 'fs';
import * as glob from 'fast-glob';
import { UserSettings } from 'n8n-core';
import { getConnection } from 'typeorm';
import { getLogger } from '../../src/Logger';
import { Db, ICredentialsDb } from '../../src';
import { User } from '../../src/databases/entities/User';
import { SharedWorkflow } from '../../src/databases/entities/SharedWorkflow';
import { WorkflowEntity } from '../../src/databases/entities/WorkflowEntity';
import { Role } from '../../src/databases/entities/Role';

export class ImportWorkflowsCommand extends Command {
	static description = 'Import workflows';

	static examples = [
		`$ n8n import:workflow --input=file.json`,
		`$ n8n import:workflow --separate --input=backups/latest/`,
	];

	static flags = {
		help: flags.help({ char: 'h' }),
		input: flags.string({
			char: 'i',
			description: 'Input file name or directory if --separate is used',
		}),
		separate: flags.boolean({
			description: 'Imports *.json files from directory provided by --input',
		}),
	};

	owner: User;

	ownerWorkflowRole: Role;

	private transformCredentials(node: INode, credentialsEntities: ICredentialsDb[]) {
		if (node.credentials) {
			const allNodeCredentials = Object.entries(node.credentials);
			// eslint-disable-next-line no-restricted-syntax
			for (const [type, name] of allNodeCredentials) {
				if (typeof name === 'string') {
					const nodeCredentials: INodeCredentialsDetails = {
						id: null,
						name,
					};

					const matchingCredentials = credentialsEntities.filter(
						(credentials) => credentials.name === name && credentials.type === type,
					);

					if (matchingCredentials.length === 1) {
						nodeCredentials.id = matchingCredentials[0].id.toString();
					}

					// eslint-disable-next-line no-param-reassign
					node.credentials[type] = nodeCredentials;
				}
			}
		}
	}

	async run(): Promise<void> {
		const logger = getLogger();
		LoggerProxy.init(logger);

		const { flags } = this.parse(ImportWorkflowsCommand);

		if (!flags.input) {
			console.info('An input file or directory with --input must be provided');
			return;
		}

		if (flags.separate) {
			if (fs.existsSync(flags.input)) {
				if (!fs.lstatSync(flags.input).isDirectory()) {
					console.info('The argument to --input must be a directory');
					return;
				}
			}
		}

		try {
			await Db.init();

			await this.initOwnershipFields();

			// Make sure the settings exist
			await UserSettings.prepareUserSettings();
			const credentials = (await Db.collections.Credentials?.find()) ?? [];
			let i: number;
			if (flags.separate) {
				let inputPath = flags.input;
				if (process.platform === 'win32') {
					inputPath = inputPath.replace(/\\/g, '/');
				}
				inputPath = inputPath.replace(/\/$/g, '');
				const files = await glob(`${inputPath}/*.json`);
				for (i = 0; i < files.length; i++) {
					const workflow = JSON.parse(fs.readFileSync(files[i], { encoding: 'utf8' }));
					if (credentials.length > 0) {
						workflow.nodes.forEach((node: INode) => {
							this.transformCredentials(node, credentials);
						});
					}
					await this.storeWorkflow(workflow);
				}
			} else {
				const workflows = JSON.parse(fs.readFileSync(flags.input, { encoding: 'utf8' }));

				if (!Array.isArray(workflows)) {
					throw new Error(
						'File does not seem to contain workflows. Make sure the workflows are contained in an array.',
					);
				}

				for (i = 0; i < workflows.length; i++) {
					if (credentials.length > 0) {
						workflows[i].nodes.forEach((node: INode) => {
							this.transformCredentials(node, credentials);
						});
					}
					await this.storeWorkflow(workflows[i]);
				}
			}

			console.info(`Successfully imported ${i} ${i === 1 ? 'workflow.' : 'workflows.'}`);
			process.exit();
		} catch (error) {
			console.error('An error occurred while importing workflows. See log messages for details.');
			if (error instanceof Error) logger.error(error.message);
			this.exit(1);
		}
	}

	private async initOwnershipFields() {
		const fixInstruction =
			'Please fix the database by running ./packages/cli/bin/n8n user-management:reset';

		const roles = await Db.collections.Role!.find({
			where: ['global', 'workflow'].map((scope) => ({ name: 'owner', scope })),
		});

		if (roles.length !== 2) {
			throw new Error(`Owner-global and owner-workflow roles not found. ${fixInstruction}`);
		}

		this.ownerWorkflowRole = roles[1].scope === 'workflow' ? roles.pop()! : roles.shift()!;

		const owner = await Db.collections.User!.findOne({ globalRole: roles.pop()! });

		if (!owner) {
			throw new Error(`No owner found. ${fixInstruction}`);
		}

		this.owner = owner;
	}

	private async storeWorkflow(workflow: object) {
		await getConnection().transaction(async (transactionManager) => {
			const newWorkflow = new WorkflowEntity();

			Object.assign(newWorkflow, workflow);

			const savedWorkflow = await transactionManager.save<WorkflowEntity>(newWorkflow);

			const newSharedWorkflow = new SharedWorkflow();

			Object.assign(newSharedWorkflow, {
				workflow: savedWorkflow,
				user: this.owner,
				role: this.ownerWorkflowRole,
			});

			await transactionManager.save<SharedWorkflow>(newSharedWorkflow);
		});
	}
}
