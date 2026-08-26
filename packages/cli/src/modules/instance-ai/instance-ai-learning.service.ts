import type {
	InstanceAiLearning as InstanceAiLearningDto,
	InstanceAiLearningRun as InstanceAiLearningRunDto,
	ListInstanceAiLearningsQueryDto,
	StartInstanceAiLearningRunDto,
	UpdateInstanceAiLearningDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { InstanceAiLearning } from './database/entities/instance-ai-learning.entity';
import type { InstanceAiLearningRun } from './database/entities/instance-ai-learning-run.entity';
import { InstanceAiLearningRepository } from './database/repositories/instance-ai-learning.repository';
import { InstanceAiLearningRunRepository } from './database/repositories/instance-ai-learning-run.repository';
import { InstanceAiLearningAiService } from './instance-ai-learning-ai.service';
import { InstanceAiLearningSerializer } from './instance-ai-learning-serializer.service';
import type { InstanceAiWorkflowForLearning } from './instance-ai-learning-serializer.service';

const OBSERVATION_CONCURRENCY = 3;

@Service()
export class InstanceAiLearningService {
	private readonly logger: Logger;

	constructor(
		private readonly runRepository: InstanceAiLearningRunRepository,
		private readonly learningRepository: InstanceAiLearningRepository,
		private readonly workflowFinder: WorkflowFinderService,
		private readonly serializer: InstanceAiLearningSerializer,
		private readonly aiService: InstanceAiLearningAiService,
		logger: Logger,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	async startRun(
		user: User,
		projectId: string,
		payload: StartInstanceAiLearningRunDto,
	): Promise<InstanceAiLearningRunDto> {
		const uniqueWorkflowIds = [...new Set(payload.workflowIds)];
		const owned = await this.workflowFinder.findOwnedWorkflowPlacementsInProject(projectId, {
			includeArchived: false,
		});
		const ownedIds = new Set(owned.map(({ id }) => id));
		const inaccessibleIds = uniqueWorkflowIds.filter((id) => !ownedIds.has(id));
		if (inaccessibleIds.length > 0) {
			throw new NotFoundError('One or more selected workflows were not found in this project');
		}

		const workflows = await this.workflowFinder.findWorkflowsByIdsForUser(
			uniqueWorkflowIds,
			user,
			['workflow:read'],
			{ includeActiveVersion: true, includeTags: true },
		);
		const workflowById = new Map(workflows.map((workflow) => [workflow.id, workflow]));
		const selectedWorkflows = uniqueWorkflowIds.flatMap((id) => {
			const workflow = workflowById.get(id);
			return workflow ? [workflow] : [];
		});
		const eligibleWorkflows = payload.publishedOnly
			? selectedWorkflows.filter((workflow) => workflow.activeVersionId !== null)
			: selectedWorkflows;
		if (eligibleWorkflows.length === 0) {
			throw new BadRequestError('No selected workflows match the analysis filters');
		}

		const run = this.runRepository.create({
			projectId,
			createdById: user.id,
			status: 'queued',
			stage: 'observe',
			workflowIds: eligibleWorkflows.map(({ id }) => id),
			observations: null,
			totalWorkflows: eligibleWorkflows.length,
			completedWorkflows: 0,
			error: null,
		});
		await this.runRepository.save(run);

		const serialized = eligibleWorkflows.map((workflow) =>
			this.serializer.serialize(workflow, payload.publishedOnly),
		);
		void this.executeRun(run.id, user, projectId, serialized).catch((error: unknown) => {
			this.logger.error('Unhandled workflow learning run error', { error });
		});

		return this.toRunDto(run);
	}

	async getRun(projectId: string, runId: string): Promise<InstanceAiLearningRunDto> {
		const run = await this.runRepository.findByIdAndProjectId(runId, projectId);
		if (!run) throw new NotFoundError('Learning run not found');
		return this.toRunDto(run);
	}

	async list(
		projectId: string,
		query: ListInstanceAiLearningsQueryDto,
	): Promise<InstanceAiLearningDto[]> {
		const learnings = await this.learningRepository.findByProjectId(projectId, query);
		return learnings.map((learning) => this.toLearningDto(learning));
	}

	async update(
		user: User,
		projectId: string,
		learningId: string,
		payload: UpdateInstanceAiLearningDto,
	): Promise<InstanceAiLearningDto> {
		const learning = await this.getLearningEntity(projectId, learningId);
		if (
			payload.reviewStatus === undefined &&
			payload.enabled === undefined &&
			payload.statement === undefined &&
			payload.appliesWhen === undefined
		) {
			throw new BadRequestError('No learning changes were provided');
		}

		if (payload.statement !== undefined) learning.statement = payload.statement;
		if (payload.appliesWhen !== undefined) learning.appliesWhen = payload.appliesWhen;
		if (payload.reviewStatus !== undefined) {
			learning.reviewStatus = payload.reviewStatus;
			learning.reviewedById = user.id;
			learning.reviewedAt = new Date();
			if (payload.reviewStatus === 'approved' && payload.enabled === undefined) {
				learning.enabled = true;
			}
			if (payload.reviewStatus === 'rejected') learning.enabled = false;
		}
		if (payload.enabled !== undefined) {
			if (payload.enabled && learning.reviewStatus !== 'approved') {
				throw new BadRequestError('Approve the learning before enabling it');
			}
			learning.enabled = payload.enabled;
		}

		await this.learningRepository.save(learning);
		return this.toLearningDto(learning);
	}

	async delete(projectId: string, learningId: string): Promise<void> {
		const learning = await this.getLearningEntity(projectId, learningId);
		await this.learningRepository.remove(learning);
	}

	async listApprovedEnabled(projectId: string) {
		const learnings = await this.learningRepository.findApprovedEnabled(projectId);
		return learnings.map(({ id, appliesWhen, kind }) => ({ id, appliesWhen, kind }));
	}

	async getApprovedEnabledByIds(projectId: string, ids: string[]) {
		const learnings = await this.learningRepository.findApprovedEnabledByIds(projectId, ids);
		return learnings.map((learning) => this.toLearningDto(learning));
	}

	private async executeRun(
		runId: string,
		user: User,
		projectId: string,
		workflows: InstanceAiWorkflowForLearning[],
	): Promise<void> {
		try {
			await this.runRepository.update(runId, { status: 'running' });
			const model = await this.aiService.resolveModel(user);
			const observations = await this.mapConcurrent(
				workflows,
				OBSERVATION_CONCURRENCY,
				async (workflow) => {
					const observation = await this.aiService.observe(model, workflow);
					await this.runRepository.increment({ id: runId }, 'completedWorkflows', 1);
					return observation;
				},
			);

			await this.runRepository.update(runId, { stage: 'reduce', observations });
			const reduction = await this.aiService.reduce(model, projectId, observations);
			const learningEntities = reduction.learnings.map((learning) =>
				this.learningRepository.create({
					projectId,
					runId,
					statement: learning.statement,
					kind: learning.kind,
					appliesWhen: learning.appliesWhen,
					confidence: learning.confidence,
					sensitivity: learning.sensitivity,
					transferability: learning.transferability,
					evidence: {
						supportingWorkflowIds: learning.supportingWorkflowIds,
						supportingObservationIds: learning.supportingObservationIds,
						supportingWorkflowCount: learning.supportingWorkflowCount,
						counterexampleWorkflowIds: learning.counterexampleWorkflowIds,
						counterexampleCount: learning.counterexampleCount,
						rejectedAlternatives: learning.rejectedAlternatives,
					},
					reviewStatus: 'pending',
					enabled: false,
					reviewedById: null,
					reviewedAt: null,
				}),
			);
			await this.learningRepository.save(learningEntities);
			await this.runRepository.update(runId, {
				status: 'completed',
				stage: 'completed',
				observations,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Learning analysis failed';
			this.logger.error('Workflow learning run failed', { runId, error });
			try {
				await this.runRepository.update(runId, { status: 'error', error: message });
			} catch (updateError) {
				this.logger.error('Failed to persist workflow learning run error', {
					runId,
					error: updateError,
				});
			}
		}
	}

	private async getLearningEntity(
		projectId: string,
		learningId: string,
	): Promise<InstanceAiLearning> {
		const learning = await this.learningRepository.findByIdAndProjectId(learningId, projectId);
		if (!learning) throw new NotFoundError('Learning not found');
		return learning;
	}

	private toRunDto(run: InstanceAiLearningRun): InstanceAiLearningRunDto {
		return {
			id: run.id,
			projectId: run.projectId,
			status: run.status,
			stage: run.stage,
			workflowIds: run.workflowIds,
			totalWorkflows: run.totalWorkflows,
			completedWorkflows: run.completedWorkflows,
			error: run.error,
			createdAt: run.createdAt.toISOString(),
			updatedAt: run.updatedAt.toISOString(),
		};
	}

	private toLearningDto(learning: InstanceAiLearning): InstanceAiLearningDto {
		return {
			id: learning.id,
			projectId: learning.projectId,
			runId: learning.runId,
			statement: learning.statement,
			kind: learning.kind,
			appliesWhen: learning.appliesWhen,
			confidence: learning.confidence,
			sensitivity: learning.sensitivity,
			transferability: learning.transferability,
			evidence: learning.evidence,
			reviewStatus: learning.reviewStatus,
			enabled: learning.enabled,
			createdAt: learning.createdAt.toISOString(),
			updatedAt: learning.updatedAt.toISOString(),
		};
	}

	private async mapConcurrent<T, R>(
		items: T[],
		concurrency: number,
		mapper: (item: T) => Promise<R>,
	): Promise<R[]> {
		const results: Array<R | undefined> = Array.from({ length: items.length });
		let nextIndex = 0;

		const worker = async () => {
			while (nextIndex < items.length) {
				const index = nextIndex++;
				results[index] = await mapper(items[index]);
			}
		};

		await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
		return results.flatMap((result) => (result === undefined ? [] : [result]));
	}
}
