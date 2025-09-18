import { Logger } from '@n8n/backend-common';
import type { TagEntity, ICredentialsDb, IWorkflowDb } from '@n8n/db';
import {
	Project,
	WorkflowEntity,
	SharedWorkflow,
	WorkflowTagMapping,
	CredentialsRepository,
	TagRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { type INode, type INodeCredentialsDetails, type IWorkflowBase } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { replaceInvalidCredentials } from '@/workflow-helpers';
import { DataSource } from '@n8n/db';

@Service()
export class ImportService {
	private dbCredentials: ICredentialsDb[] = [];

	private dbTags: TagEntity[] = [];

	constructor(
		private readonly logger: Logger,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly tagRepository: TagRepository,
		private readonly dataSource: DataSource,
	) {}

	async initRecords() {
		this.dbCredentials = await this.credentialsRepository.find();
		this.dbTags = await this.tagRepository.find();
	}

	async importWorkflows(workflows: IWorkflowDb[], projectId: string) {
		await this.initRecords();

		for (const workflow of workflows) {
			workflow.nodes.forEach((node) => {
				this.toNewCredentialFormat(node);

				if (!node.id) node.id = uuid();
			});

			const hasInvalidCreds = workflow.nodes.some((node) => !node.credentials?.id);

			if (hasInvalidCreds) await this.replaceInvalidCreds(workflow);
		}

		const { manager: dbManager } = this.credentialsRepository;
		await dbManager.transaction(async (tx) => {
			for (const workflow of workflows) {
				if (workflow.active) {
					workflow.active = false;

					this.logger.info(`Deactivating workflow "${workflow.name}". Remember to activate later.`);
				}

				const exists = workflow.id ? await tx.existsBy(WorkflowEntity, { id: workflow.id }) : false;

				// @ts-ignore CAT-957
				const upsertResult = await tx.upsert(WorkflowEntity, workflow, ['id']);
				const workflowId = upsertResult.identifiers.at(0)?.id as string;

				const personalProject = await tx.findOneByOrFail(Project, { id: projectId });

				// Create relationship if the workflow was inserted instead of updated.
				if (!exists) {
					await tx.upsert(
						SharedWorkflow,
						{ workflowId, projectId: personalProject.id, role: 'workflow:owner' },
						['workflowId', 'projectId'],
					);
				}

				if (!workflow.tags?.length) continue;

				await this.tagRepository.setTags(tx, this.dbTags, workflow);

				for (const tag of workflow.tags) {
					await tx.upsert(WorkflowTagMapping, { tagId: tag.id, workflowId }, [
						'tagId',
						'workflowId',
					]);
				}
			}
		});
	}

	async replaceInvalidCreds(workflow: IWorkflowBase) {
		try {
			await replaceInvalidCredentials(workflow);
		} catch (e) {
			this.logger.error('Failed to replace invalid credential', { error: e });
		}
	}

	/**
	 * Generate SQL command to disable foreign key constraints for the specified database type
	 * @param dbType - Database type ('sqlite' or 'postgres')
	 * @returns SQL command string to disable foreign key constraints
	 */
	generateForeignKeyDisableCommand(dbType: string): string {
		switch (dbType.toLowerCase()) {
			case 'sqlite':
				return 'PRAGMA foreign_keys = OFF;';
			case 'postgres':
			case 'postgresql':
				return 'SET session_replication_role = replica;';
			default:
				throw new Error(`Unsupported database type: ${dbType}. Supported types: sqlite, postgres`);
		}
	}

	/**
	 * Generate SQL command to enable foreign key constraints for the specified database type
	 * @param dbType - Database type ('sqlite' or 'postgres')
	 * @returns SQL command string to enable foreign key constraints
	 */
	generateForeignKeyEnableCommand(dbType: string): string {
		switch (dbType.toLowerCase()) {
			case 'sqlite':
				return 'PRAGMA foreign_keys = ON;';
			case 'postgres':
			case 'postgresql':
				return 'SET session_replication_role = DEFAULT;';
			default:
				throw new Error(`Unsupported database type: ${dbType}. Supported types: sqlite, postgres`);
		}
	}

	/**
	 * Disable and re-enable foreign key constraints for entity import operations
	 * @returns Promise that resolves when foreign key constraints are disabled and re-enabled
	 */
	async importEntities(): Promise<void> {
		if (!this.dataSource.isInitialized) {
			throw new Error('DataSource is not initialized');
		}

		// Get database type from DataSource
		const dbType = this.dataSource.options.type;
		if (!dbType) {
			throw new Error('Unable to determine database type from DataSource');
		}

		this.logger.info(`Disabling foreign key constraints for database type: ${dbType}`);

		// Disable foreign key constraints
		const disableCommand = this.generateForeignKeyDisableCommand(dbType);
		this.logger.debug(`Executing: ${disableCommand}`);
		await this.dataSource.query(disableCommand);

		this.logger.info('Foreign key constraints disabled');

		// Re-enable foreign key constraints
		const enableCommand = this.generateForeignKeyEnableCommand(dbType);
		this.logger.debug(`Executing: ${enableCommand}`);
		await this.dataSource.query(enableCommand);

		this.logger.info('Foreign key constraints re-enabled');
	}

	/**
	 * Convert a node's credentials from old format `{ <nodeType>: <credentialName> }`
	 * to new format: `{ <nodeType>: { id: string | null, name: <credentialName> } }`
	 */
	private toNewCredentialFormat(node: INode) {
		if (!node.credentials) return;

		for (const [type, name] of Object.entries(node.credentials)) {
			if (typeof name !== 'string') continue;

			const nodeCredential: INodeCredentialsDetails = { id: null, name };

			const match = this.dbCredentials.find((c) => c.name === name && c.type === type);

			if (match) nodeCredential.id = match.id;

			node.credentials[type] = nodeCredential;
		}
	}
}
