import { Logger } from '@n8n/backend-common';
import { UpdateWorkflowHistoryVersionDto } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { WorkflowHistory, WorkflowHistoryRepository } from '@n8n/db';
import { Service } from '@n8n/di';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import type { EntityManager } from '@n8n/typeorm';
// eslint-disable-next-line n8n-local-rules/misplaced-n8n-typeorm-import
import { In } from '@n8n/typeorm';
import type { IWorkflowBase } from 'n8n-workflow';
import { ensureError, UnexpectedError } from 'n8n-workflow';

import { WorkflowFinderService } from '../workflow-finder.service';

import { SharedWorkflowNotFoundError } from '@/errors/shared-workflow-not-found.error';
import { WorkflowHistoryVersionNotFoundError } from '@/errors/workflow-history-version-not-found.error';
import { EventService } from '@/events/event.service';

@Service()
export class WorkflowHistoryService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowHistoryRepository: WorkflowHistoryRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly eventService: EventService,
	) {}

	async getList(
		user: User,
		workflowId: string,
		take: number,
		skip: number,
	): Promise<Array<Omit<WorkflowHistory, 'nodes' | 'connections'>>> {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);

		if (!workflow) {
			throw new SharedWorkflowNotFoundError('');
		}

		return await this.workflowHistoryRepository.find({
			where: {
				workflowId: workflow.id,
			},
			take,
			skip,
			select: [
				'workflowId',
				'versionId',
				'authors',
				'createdAt',
				'updatedAt',
				'name',
				'description',
			],
			relations: ['workflowPublishHistory'],
			order: { createdAt: 'DESC' },
		});
	}

	async getVersion(
		user: User,
		workflowId: string,
		versionId: string,
		settings?: { includePublishHistory?: boolean },
	): Promise<WorkflowHistory> {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);

		if (!workflow) {
			throw new SharedWorkflowNotFoundError('');
		}

		const includePublishHistory = settings?.includePublishHistory ?? true;
		const relations = includePublishHistory ? ['workflowPublishHistory'] : [];

		const hist = await this.workflowHistoryRepository.findOne({
			where: {
				workflowId: workflow.id,
				versionId,
			},
			relations,
		});
		if (!hist) {
			throw new WorkflowHistoryVersionNotFoundError('');
		}
		return hist;
	}

	/**
	 * Find a workflow history version without permission checks.
	 */
	async findVersion(workflowId: string, versionId: string): Promise<WorkflowHistory | null> {
		return await this.workflowHistoryRepository.findOne({
			where: {
				workflowId,
				versionId,
			},
		});
	}

	async saveVersion(
		user: User | string,
		workflow: {
			versionId: string;
			nodes: IWorkflowBase['nodes'];
			connections: IWorkflowBase['connections'];
		},
		workflowId: string,
		autosaved = false,
		transactionManager?: EntityManager,
	) {
		if (!workflow.nodes || !workflow.connections) {
			throw new UnexpectedError(
				`Cannot save workflow history: nodes and connections are required for workflow ${workflowId}`,
			);
		}

		const authors = typeof user === 'string' ? user : `${user.firstName} ${user.lastName}`;

		const repository = transactionManager
			? transactionManager.getRepository(WorkflowHistory)
			: this.workflowHistoryRepository;

		try {
			await repository.insert({
				authors,
				connections: workflow.connections,
				nodes: workflow.nodes,
				versionId: workflow.versionId,
				workflowId,
				autosaved,
			});
		} catch (e) {
			const error = ensureError(e);
			this.logger.error(`Failed to save workflow history version for workflow ${workflowId}`, {
				error,
			});
		}
	}

	async updateVersionForUser(
		user: User,
		workflowId: string,
		versionId: string,
		updateData: UpdateWorkflowHistoryVersionDto,
	) {
		// Check rights and ensure version exists
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:update',
		]);

		if (!workflow) {
			throw new SharedWorkflowNotFoundError('');
		}

		const version = await this.workflowHistoryRepository.findOne({
			where: {
				workflowId: workflow.id,
				versionId,
			},
		});
		if (!version) {
			throw new WorkflowHistoryVersionNotFoundError('');
		}

		await this.updateVersion(workflowId, versionId, updateData);

		if (updateData.name !== undefined || updateData.description !== undefined) {
			this.eventService.emit('workflow-version-updated', {
				user: {
					id: user.id,
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
					role: user.role,
				},
				workflowId: workflow.id,
				workflowName: workflow.name,
				versionId,
				versionName: updateData.name,
				versionDescription: updateData.description,
			});
		}
	}

	/**
	 * Update a workflow history version without permission checks.
	 */
	async updateVersion(
		workflowId: string,
		versionId: string,
		updateData: Omit<
			Partial<WorkflowHistory>,
			'versionId' | 'workflowId' | 'createdAt' | 'updatedAt'
		>,
	) {
		await this.workflowHistoryRepository.update({ versionId, workflowId }, updateData);
	}

	/**
	 * Get multiple versions by their IDs
	 * Returns only versions that exist, skipping non-existent ones
	 */
	async getVersionsByIds(
		user: User,
		workflowId: string,
		versionIds: string[],
	): Promise<Array<{ versionId: string; createdAt: Date }>> {
		if (versionIds.length === 0) {
			return [];
		}

		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);

		if (!workflow) {
			throw new SharedWorkflowNotFoundError('');
		}

		const versions = await this.workflowHistoryRepository.find({
			where: {
				workflowId: workflow.id,
				versionId: In(versionIds),
			},
			select: ['versionId', 'createdAt'],
		});

		return versions.map((v) => ({ versionId: v.versionId, createdAt: v.createdAt }));
	}
}
