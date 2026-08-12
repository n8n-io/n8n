import { UpdateWorkflowHistoryVersionDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import {
	WorkflowHistory,
	WorkflowHistoryRepository,
	WorkflowPublishHistoryRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { In } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { IConnections, INode, IWorkflowBase } from 'n8n-workflow';
import { OperationalError, UnexpectedError } from 'n8n-workflow';
import { z } from 'zod';

import { SharedWorkflowNotFoundError } from '@/errors/shared-workflow-not-found.error';
import { WorkflowHistoryVersionNotFoundError } from '@/errors/workflow-history-version-not-found.error';
import { EventService } from '@/events/event.service';
import type { WorkflowActionSource } from '@/events/maps/relay.event-map';
import { InstanceAiModelService } from '@/modules/instance-ai/instance-ai-model.service';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

import { WorkflowFinderService } from '../workflow-finder.service';

const STICKY_NOTE_TYPE = 'n8n-nodes-base.stickyNote';
const GENERATE_DESCRIPTION_TIMEOUT_MS = 30_000;
const GENERATE_DESCRIPTION_MAX_OUTPUT_TOKENS = 400;

const generatePublishDescriptionSchema = z.object({
	hasMeaningfulChanges: z
		.boolean()
		.describe(
			'False only when comparing two versions and the current version is identical to the ' +
				'previous one — no difference in nodes, parameters, positions, names, connections, ' +
				'or sticky notes. Always true when summarizing a first publish.',
		),
	description: z
		.string()
		.describe(
			'1-3 concise sentences in the tone of a git commit message or PR description, no ' +
				'markdown. Empty string when hasMeaningfulChanges is false.',
		),
});

/**
 * Renders a workflow's structure (nodes, parameters, positions, connections,
 * and sticky notes) as compact text for an LLM prompt. Node parameters are
 * included (like n8n's AI workflow builder does when feeding node config to
 * an LLM) — credentials are a separate `node.credentials` reference field,
 * never embedded in `parameters`, so this doesn't leak secrets, and without
 * them a parameter-only edit (e.g. changing an HTTP node's URL) is invisible
 * to the diff. Position and sticky notes are included so that renames, moves,
 * and note additions surface as real changes rather than being invisible to
 * the comparison.
 */
function summarizeWorkflowStructure(nodes: INode[], connections: IConnections): string {
	const stickyNotes = nodes.filter((node) => node.type === STICKY_NOTE_TYPE);
	const realNodes = nodes.filter((node) => node.type !== STICKY_NOTE_TYPE);

	const nodeLines = realNodes.map((node) => {
		const [x, y] = node.position;
		const parameters = JSON.stringify(node.parameters);
		return `- ${node.name} (${node.type}${node.disabled ? ', disabled' : ''}) @ (${x}, ${y}) | ${parameters}`;
	});

	const stickyLines = stickyNotes.map((node) => {
		const [x, y] = node.position;
		const content = typeof node.parameters.content === 'string' ? node.parameters.content : '';
		return `- @ (${x}, ${y}) | ${content}`;
	});

	const realNodeNames = new Set(realNodes.map((node) => node.name));
	const connectionLines: string[] = [];
	for (const [sourceName, sourceConnections] of Object.entries(connections)) {
		if (!realNodeNames.has(sourceName)) continue;
		for (const connectionsOfType of Object.values(sourceConnections)) {
			for (const connectionGroup of connectionsOfType) {
				for (const connection of connectionGroup ?? []) {
					if (!realNodeNames.has(connection.node)) continue;
					connectionLines.push(`- ${sourceName} -> ${connection.node}`);
				}
			}
		}
	}

	return [
		'Nodes:',
		nodeLines.length > 0 ? nodeLines.join('\n') : '(none)',
		'Sticky notes:',
		stickyLines.length > 0 ? stickyLines.join('\n') : '(none)',
		'Connections:',
		connectionLines.length > 0 ? connectionLines.join('\n') : '(none)',
	].join('\n');
}

@Service()
export class WorkflowHistoryService {
	constructor(
		private readonly logger: Logger,
		private readonly workflowHistoryRepository: WorkflowHistoryRepository,
		private readonly workflowPublishHistoryRepository: WorkflowPublishHistoryRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly eventService: EventService,
		private readonly modelService: InstanceAiModelService,
		private readonly outboundHttp: OutboundHttp,
	) {}

	async getList(
		user: User,
		workflowId: string,
		take: number,
		skip: number,
	): Promise<Array<Omit<WorkflowHistory, 'nodes' | 'connections' | 'nodeGroups'>>> {
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
				'autosaved',
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

	/**
	 * Ensure a {@link WorkflowHistory} row exists for the workflow's *current*
	 * draft state and return its `versionId`. Used by the eval-collections
	 * setup wizard when the user picks "current draft" — the run is pinned to
	 * an immutable snapshot so future edits don't break comparability with
	 * sibling runs in the collection.
	 *
	 * Idempotent: if a history row already exists for the workflow's current
	 * `versionId`, we return it unchanged (no duplicate snapshot, no churn in
	 * the version history list). License-on instances will have a history row
	 * from the regular save flow; license-off instances get the snapshot
	 * lazily here for eval comparability without otherwise enabling history.
	 */
	async snapshotCurrent(workflowId: string): Promise<{ versionId: string }> {
		const workflow = await this.workflowRepository.findOneBy({ id: workflowId });
		if (!workflow) {
			throw new UnexpectedError(`Workflow ${workflowId} not found`);
		}

		const existing = await this.workflowHistoryRepository.findOne({
			where: { workflowId, versionId: workflow.versionId },
			select: ['versionId'],
		});
		if (existing) return { versionId: existing.versionId };

		await this.saveVersion(
			'eval-snapshot',
			{
				versionId: workflow.versionId,
				nodes: workflow.nodes,
				connections: workflow.connections,
				nodeGroups: workflow.nodeGroups,
			},
			workflowId,
		);

		// `saveVersion` deliberately swallows insert errors (it only logs them)
		// so the regular workflow-save flow can never be blocked by a history
		// write failure. The snapshot use case is different: callers will
		// hand this `versionId` to `findVersion()` moments later and assert
		// the row is non-null. Verify persistence here and fail loudly while
		// we still have the caller's stack — otherwise the next reader hits
		// a generic "version not found" deep inside the test runner.
		const persisted = await this.workflowHistoryRepository.findOne({
			where: { workflowId, versionId: workflow.versionId },
			select: ['versionId'],
		});
		if (!persisted) {
			throw new UnexpectedError(
				`Failed to persist workflow history snapshot for workflow ${workflowId}`,
			);
		}

		return { versionId: persisted.versionId };
	}

	async saveVersion(
		user: User | string,
		workflow: {
			versionId: string;
			nodes: IWorkflowBase['nodes'];
			connections: IWorkflowBase['connections'];
			nodeGroups?: IWorkflowBase['nodeGroups'];
		},
		workflowId: string,
		autosaved = false,
		source?: WorkflowActionSource,
		transactionManager?: EntityManager,
		versionMetadata?: { name?: string; description?: string },
	) {
		if (!workflow.nodes || !workflow.connections) {
			throw new UnexpectedError(
				`Cannot save workflow history: nodes and connections are required for workflow ${workflowId}`,
			);
		}

		const name = typeof user === 'string' ? user : `${user.firstName} ${user.lastName}`;
		const authors = source === 'n8n-mcp' ? `${name} (via MCP)` : name;

		const repository = transactionManager
			? transactionManager.getRepository(WorkflowHistory)
			: this.workflowHistoryRepository;

		try {
			await repository.insert({
				authors,
				connections: workflow.connections,
				nodes: workflow.nodes,
				nodeGroups: workflow.nodeGroups,
				versionId: workflow.versionId,
				workflowId,
				autosaved,
				...(versionMetadata?.name ? { name: versionMetadata.name } : {}),
				...(versionMetadata?.description ? { description: versionMetadata.description } : {}),
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
		// Cast avoids a TypeORM `QueryDeepPartialEntity` deep-instantiation (TS2589);
		// same workaround as workflow.service.ts / import.service.ts.
		await this.workflowHistoryRepository.update(
			{ versionId, workflowId },
			updateData as QueryDeepPartialEntity<WorkflowHistory>,
		);
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

	async getPublishTimeline(user: User, workflowId: string) {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);

		if (!workflow) {
			throw new SharedWorkflowNotFoundError('');
		}

		const events = await this.workflowPublishHistoryRepository
			.createQueryBuilder('wph')
			.leftJoinAndSelect('wph.user', 'user')
			.leftJoin('wph.workflowHistory', 'wh')
			.addSelect('wh.name')
			.where('wph.workflowId = :workflowId', { workflowId: workflow.id })
			.orderBy('wph.createdAt', 'ASC')
			.getMany();

		return events.map((e) => ({
			id: e.id,
			workflowId: e.workflowId,
			versionId: e.versionId,
			event: e.event,
			createdAt: e.createdAt,
			user: e.user,
			versionName: e.workflowHistory?.name ?? null,
		}));
	}

	/**
	 * Draft a publish-version description by asking Instance AI's model to
	 * summarize what changed since the workflow's last published version (or,
	 * for a first publish, what the workflow does). Proof-of-concept: reuses
	 * Instance AI's model resolution but skips its agent/tool/memory
	 * machinery entirely — this is a single one-off completion, closer to
	 * `InstanceAiVerificationService.verifyModel` than to a chat turn.
	 */
	async generatePublishDescription(
		user: User,
		workflowId: string,
	): Promise<{ hasMeaningfulChanges: boolean; description: string }> {
		const workflow = await this.workflowFinderService.findWorkflowForUser(
			workflowId,
			user,
			['workflow:read'],
			{ includeActiveVersion: true },
		);

		if (!workflow) {
			throw new SharedWorkflowNotFoundError('');
		}

		const currentSummary = summarizeWorkflowStructure(workflow.nodes, workflow.connections);
		const previousVersion = workflow.activeVersion;

		const prompt = previousVersion
			? [
					'You are drafting a short changelog-style description for a new published version of an',
					'automation workflow. Compare the previous published version to the current version below',
					'and summarize the changes: nodes added/removed/renamed/moved, parameter changes (URLs,',
					'expressions, conditions, request bodies, etc.), logic changes, trigger changes, connection',
					'rewiring, and sticky notes added/removed/edited. If, after that comparison, the two',
					'versions are identical, set hasMeaningfulChanges to false and leave description empty —',
					'do not invent a description for a no-op change.',
					'',
					'<previous_version>',
					summarizeWorkflowStructure(previousVersion.nodes, previousVersion.connections),
					'</previous_version>',
					'',
					'<current_version>',
					currentSummary,
					'</current_version>',
				].join('\n')
			: [
					'You are drafting a short description for the first published version of an automation',
					'workflow. Summarize what the workflow below does. Always set hasMeaningfulChanges to true',
					'here — there is nothing to compare against yet.',
					'',
					'<workflow>',
					currentSummary,
					'</workflow>',
				].join('\n');

		const modelConfig = await this.modelService.resolveAgentModelConfig(user);
		const { createModel } = await import('@n8n/agents');
		const { generateObject } = await import('ai');

		const result = await generateObject({
			model: createModel(modelConfig, createAiProxyFetch(this.outboundHttp)),
			schema: generatePublishDescriptionSchema,
			prompt,
			maxOutputTokens: GENERATE_DESCRIPTION_MAX_OUTPUT_TOKENS,
			abortSignal: AbortSignal.timeout(GENERATE_DESCRIPTION_TIMEOUT_MS),
		});

		const { hasMeaningfulChanges, description } = result.object;
		if (hasMeaningfulChanges && !description.trim()) {
			throw new OperationalError('Instance AI returned an empty publish description');
		}

		return { hasMeaningfulChanges, description: description.trim() };
	}
}
