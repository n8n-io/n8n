import { Service } from 'typedi';
import { v4 as uuid } from 'uuid';
import { type INode, type INodeCredentialsDetails } from 'n8n-workflow';

import { Logger } from '@/Logger';
import * as Db from '@/Db';
import { CredentialsRepository } from '@/databases/repositories/credentials.repository';
import { TagRepository } from '@/databases/repositories/tag.repository';
import { SharedWorkflow } from '@/databases/entities/SharedWorkflow';
import { RoleService } from '@/services/role.service';
import { replaceInvalidCredentials } from '@/WorkflowHelpers';
import { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import { WorkflowTagMapping } from '@/databases/entities/WorkflowTagMapping';

import type { TagEntity } from '@/databases/entities/TagEntity';
import type { Role } from '@/databases/entities/Role';
import type { ICredentialsDb } from '@/Interfaces';

@Service()
export class ImportService {
	private dbCredentials: ICredentialsDb[] = [];

	private dbTags: TagEntity[] = [];

	private workflowOwnerRole: Role;

	constructor(
		private readonly logger: Logger,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly tagRepository: TagRepository,
		private readonly roleService: RoleService,
	) {}

	async initRecords() {
		this.dbCredentials = await this.credentialsRepository.find();
		this.dbTags = await this.tagRepository.find();
		this.workflowOwnerRole = await this.roleService.findWorkflowOwnerRole();
	}

	async importWorkflows(workflows: WorkflowEntity[], userId: string) {
		await this.initRecords();

		for (const workflow of workflows) {
			workflow.nodes.forEach((node) => {
				this.toNewCredentialFormat(node);

				if (!node.id) node.id = uuid();
			});

			const hasInvalidCreds = workflow.nodes.some((node) => !node.credentials?.id);

			if (hasInvalidCreds) await this.replaceInvalidCreds(workflow);
		}

		await Db.transaction(async (tx) => {
			for (const workflow of workflows) {
				if (workflow.active) {
					workflow.active = false;

					this.logger.info(`Deactivating workflow "${workflow.name}". Remember to activate later.`);
				}

				const upsertResult = await tx.upsert(WorkflowEntity, workflow, ['id']);

				const workflowId = upsertResult.identifiers.at(0)?.id as string;

				await tx.upsert(SharedWorkflow, { workflowId, userId, roleId: this.workflowOwnerRole.id }, [
					'workflowId',
					'userId',
				]);

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

	async replaceInvalidCreds(workflow: WorkflowEntity) {
		try {
			await replaceInvalidCredentials(workflow);
		} catch (e) {
			const error = e instanceof Error ? e : new Error(`${e}`);
			this.logger.error('Failed to replace invalid credential', error);
		}
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
