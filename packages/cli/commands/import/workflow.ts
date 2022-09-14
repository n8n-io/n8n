/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
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

import fs from 'fs';
import glob from 'fast-glob';
import { UserSettings } from 'n8n-core';
import { EntityManager, getConnection } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { getLogger } from '../../src/Logger';
import { Db, ICredentialsDb, IWorkflowToImport } from '../../src';
import { SharedWorkflow } from '../../src/databases/entities/SharedWorkflow';
import { WorkflowEntity } from '../../src/databases/entities/WorkflowEntity';
import { Role } from '../../src/databases/entities/Role';
import { User } from '../../src/databases/entities/User';
import { setTagsForImport } from '../../src/TagHelpers';

const FIX_INSTRUCTION =
	'Please fix the database by running ./packages/cli/bin/n8n user-management:reset';

function assertHasWorkflowsToImport(workflows: unknown): asserts workflows is IWorkflowToImport[] {
	if (!Array.isArray(workflows)) {
		throw new Error(
			'File does not seem to contain workflows. Make sure the workflows are contained in an array.',
		);
	}

	for (const workflow of workflows) {
		if (
			typeof workflow !== 'object' ||
			!Object.prototype.hasOwnProperty.call(workflow, 'nodes') ||
			!Object.prototype.hasOwnProperty.call(workflow, 'connections')
		) {
			throw new Error('File does not seem to contain valid workflows.');
		}
	}
}

export class ImportWorkflowsCommand extends Command {
	static description = 'Import workflows';

	static examples = [
		'$ n8n import:workflow --input=file.json',
		'$ n8n import:workflow --separate --input=backups/latest/',
		'$ n8n import:workflow --input=file.json --userId=1d64c3d2-85fe-4a83-a649-e446b07b3aae',
		'$ n8n import:workflow --separate --input=backups/latest/ --userId=1d64c3d2-85fe-4a83-a649-e446b07b3aae',
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
		userId: flags.string({
			description: 'The ID of the user to assign the imported workflows to',
		}),
	};

	ownerWorkflowRole: Role;

	transactionManager: EntityManager;

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

			await this.initOwnerWorkflowRole();
			const user = flags.userId ? await this.getAssignee(flags.userId) : await this.getOwner();

			// Make sure the settings exist
			await UserSettings.prepareUserSettings();
			const credentials = await Db.collections.Credentials.find();
			const tags = await Db.collections.Tag.find();

			let totalImported = 0;

			if (flags.separate) {
				let { input: inputPath } = flags;

				if (process.platform === 'win32') {
					inputPath = inputPath.replace(/\\/g, '/');
				}

				const files = await glob('*.json', {
					cwd: inputPath,
					absolute: true,
				});

				totalImported = files.length;

				await getConnection().transaction(async (transactionManager) => {
					this.transactionManager = transactionManager;

					for (const file of files) {
						const workflow = JSON.parse(fs.readFileSync(file, { encoding: 'utf8' }));

						if (credentials.length > 0) {
							workflow.nodes.forEach((node: INode) => {
								this.transformCredentials(node, credentials);

								if (!node.id) {
									// eslint-disable-next-line no-param-reassign
									node.id = uuid();
								}
							});
						}

						if (Object.prototype.hasOwnProperty.call(workflow, 'tags')) {
							await setTagsForImport(transactionManager, workflow, tags);
						}

						await this.storeWorkflow(workflow, user);
					}
				});

				this.reportSuccess(totalImported);
				process.exit();
			}

			const workflows = JSON.parse(fs.readFileSync(flags.input, { encoding: 'utf8' }));

			assertHasWorkflowsToImport(workflows);

			totalImported = workflows.length;

			await getConnection().transaction(async (transactionManager) => {
				this.transactionManager = transactionManager;

				for (const workflow of workflows) {
					if (credentials.length > 0) {
						workflow.nodes.forEach((node: INode) => {
							this.transformCredentials(node, credentials);

							if (!node.id) {
								// eslint-disable-next-line no-param-reassign
								node.id = uuid();
							}
						});
					}

					if (Object.prototype.hasOwnProperty.call(workflow, 'tags')) {
						await setTagsForImport(transactionManager, workflow, tags);
					}

					await this.storeWorkflow(workflow, user);
				}
			});

			this.reportSuccess(totalImported);
			process.exit();
		} catch (error) {
			console.error('An error occurred while importing workflows. See log messages for details.');
			if (error instanceof Error) logger.error(error.message);
			this.exit(1);
		}
	}

	private reportSuccess(total: number) {
		console.info(`Successfully imported ${total} ${total === 1 ? 'workflow.' : 'workflows.'}`);
	}

	private async initOwnerWorkflowRole() {
		const ownerWorkflowRole = await Db.collections.Role.findOne({
			where: { name: 'owner', scope: 'workflow' },
		});

		if (!ownerWorkflowRole) {
			throw new Error(`Failed to find owner workflow role. ${FIX_INSTRUCTION}`);
		}

		this.ownerWorkflowRole = ownerWorkflowRole;
	}

	private async storeWorkflow(workflow: object, user: User) {
		const newWorkflow = new WorkflowEntity();

		Object.assign(newWorkflow, workflow);

		const savedWorkflow = await this.transactionManager.save<WorkflowEntity>(newWorkflow);

		const newSharedWorkflow = new SharedWorkflow();

		Object.assign(newSharedWorkflow, {
			workflow: savedWorkflow,
			user,
			role: this.ownerWorkflowRole,
		});

		await this.transactionManager.save<SharedWorkflow>(newSharedWorkflow);
	}

	private async getOwner() {
		const ownerGlobalRole = await Db.collections.Role.findOne({
			where: { name: 'owner', scope: 'global' },
		});

		const owner = await Db.collections.User.findOne({ globalRole: ownerGlobalRole });

		if (!owner) {
			throw new Error(`Failed to find owner. ${FIX_INSTRUCTION}`);
		}

		return owner;
	}

	private async getAssignee(userId: string) {
		const user = await Db.collections.User.findOne(userId);

		if (!user) {
			throw new Error(`Failed to find user with ID ${userId}`);
		}

		return user;
	}

	private transformCredentials(node: INode, credentialsEntities: ICredentialsDb[]) {
		if (node.credentials) {
			const allNodeCredentials = Object.entries(node.credentials);
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
}
