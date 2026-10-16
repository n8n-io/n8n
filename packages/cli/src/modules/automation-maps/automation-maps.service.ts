import type {
	AutomationMapChange,
	AutomationMapDetail,
	AutomationMapSummary,
	UpdateAutomationMapDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { FolderRepository, UserRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';

import { NotFoundError } from '@n8n/errors';
import { DataTableRepository } from '@/modules/data-table/data-table.repository';
import { DataTableService } from '@/modules/data-table/data-table.service';
import { NodeTypes } from '@/node-types';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { AutomationMapAiService } from './automation-map-ai.service';
import type { AutomationMap } from './automation-map.entity';
import {
	buildAutomationMapGraph,
	fingerprintFor,
	selectScopedWorkflowIds,
	type FolderSource,
	type WorkflowSource,
} from './automation-map-graph.builder';
import { AutomationMapRepository } from './automation-map.repository';

const AUTO_UPDATE_INTERVAL_MS = 5 * 60 * 1000;
const UNSAVED_RETENTION_MS = 24 * 60 * 60 * 1000;
const TABLE_ROWS_SCANNED = 500;
const WORKFLOW_ID_PATTERN = /\b[A-Za-z0-9]{16}\b/g;

@Service()
export class AutomationMapsService {
	private autoUpdateTimer: NodeJS.Timeout | undefined;

	private readonly buildsInProgress = new Set<string>();

	constructor(
		private readonly logger: Logger,
		private readonly repository: AutomationMapRepository,
		private readonly aiService: AutomationMapAiService,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly folderRepository: FolderRepository,
		private readonly dataTableRepository: DataTableRepository,
		private readonly dataTableService: DataTableService,
		private readonly userRepository: UserRepository,
		private readonly nodeTypes: NodeTypes,
	) {}

	startAutoUpdates() {
		this.autoUpdateTimer = setInterval(() => {
			void this.runAutoUpdates();
		}, AUTO_UPDATE_INTERVAL_MS);
	}

	stopAutoUpdates() {
		clearInterval(this.autoUpdateTimer);
	}

	async list(user: User): Promise<AutomationMapSummary[]> {
		const maps = await this.repository.findSaved();
		return maps.filter((map) => this.canAccess(map, user)).map((map) => this.toSummary(map));
	}

	async create(user: User, prompt: string): Promise<AutomationMapSummary> {
		await this.repository.deleteUnsavedOlderThan(new Date(Date.now() - UNSAVED_RETENTION_MS));
		const map = await this.repository.save(
			this.repository.create({
				name: 'New automation map',
				prompt,
				createdById: user.id,
				saved: false,
				autoUpdate: false,
				status: 'building',
				error: null,
				scope: { keywords: [], folderIds: [], tags: [], workflowIds: [] },
				graph: null,
				annotations: null,
				fingerprint: null,
				builtAt: null,
			}),
		);
		void this.build(map.id, user, true);
		return this.toSummary(map);
	}

	async get(user: User, id: string): Promise<AutomationMapDetail> {
		const map = await this.findAccessible(user, id);
		const changes = map.status === 'ready' ? await this.detectChanges(map, user) : [];
		return {
			...this.toSummary(map),
			error: map.error,
			scope: map.scope,
			graph: map.graph,
			annotations: map.annotations,
			changes,
		};
	}

	async update(user: User, id: string, dto: UpdateAutomationMapDto) {
		const map = await this.findAccessible(user, id);
		if (dto.name !== undefined) map.name = dto.name;
		if (dto.saved !== undefined) map.saved = dto.saved;
		if (dto.autoUpdate !== undefined) map.autoUpdate = dto.autoUpdate;
		await this.repository.save(map);
		return await this.get(user, id);
	}

	async refresh(user: User, id: string) {
		const map = await this.findAccessible(user, id);
		if (!this.buildsInProgress.has(map.id)) {
			map.status = 'building';
			await this.repository.save(map);
			void this.build(map.id, user, false);
		}
		return this.toSummary(map);
	}

	async delete(user: User, id: string) {
		const map = await this.findAccessible(user, id);
		await this.repository.delete({ id: map.id });
	}

	private canAccess(map: AutomationMap, user: User) {
		return map.createdById === user.id || hasGlobalScope(user, 'workflow:read');
	}

	private async findAccessible(user: User, id: string) {
		const map = await this.repository.findOneBy({ id });
		if (!map || !this.canAccess(map, user)) {
			throw new NotFoundError('Automation map not found');
		}
		return map;
	}

	private toSummary(map: AutomationMap): AutomationMapSummary {
		return {
			id: map.id,
			name: map.name,
			prompt: map.prompt,
			saved: map.saved,
			autoUpdate: map.autoUpdate,
			status: map.status,
			builtAt: map.builtAt?.toISOString() ?? null,
			createdAt: map.createdAt.toISOString(),
			updatedAt: map.updatedAt.toISOString(),
			counts: {
				workflows: map.graph?.workflows.length ?? 0,
				dataTables: map.graph?.dataTables.length ?? 0,
				services: map.graph?.services.length ?? 0,
			},
		};
	}

	private async loadSources(user: User) {
		const ids = await this.workflowFinderService.findAllWorkflowIdsForUser(user, ['workflow:read']);
		const [entities, folders, dataTables] = await Promise.all([
			this.workflowFinderService.findWorkflowsByIdsForUser(ids, user, ['workflow:read'], {
				includeParentFolder: true,
				includeTags: true,
			}),
			this.folderRepository.find({ select: { id: true, name: true, parentFolderId: true } }),
			this.dataTableRepository.find({ select: { id: true, name: true, projectId: true } }),
		]);
		const workflows: WorkflowSource[] = entities.map((workflow) => ({
			id: workflow.id,
			name: workflow.name,
			description: workflow.description ?? null,
			active: workflow.active,
			isArchived: workflow.isArchived,
			nodes: workflow.nodes ?? [],
			settings: workflow.settings ?? null,
			versionId: workflow.versionId,
			updatedAt: workflow.updatedAt,
			parentFolderId: workflow.parentFolder?.id ?? null,
			projectId: null,
			tags: (workflow.tags ?? []).map((tag) => tag.name),
		}));
		const folderSources: FolderSource[] = folders.map((folder) => ({
			id: folder.id,
			name: folder.name,
			parentFolderId: folder.parentFolderId,
		}));
		return { workflows, folders: folderSources, dataTables };
	}

	private describeNodeType(nodeType: string) {
		try {
			return this.nodeTypes.getByNameAndVersion(nodeType).description.displayName;
		} catch {
			return undefined;
		}
	}

	private async findWorkflowIdsInTable(
		tableId: string,
		projectId: string | undefined,
		knownWorkflowIds: Set<string>,
	) {
		if (!projectId) return [];
		try {
			const { data } = await this.dataTableService.getManyRowsAndCount(tableId, projectId, {
				take: TABLE_ROWS_SCANNED,
				skip: 0,
			});
			const found = new Set<string>();
			for (const row of data) {
				for (const value of Object.values(row)) {
					if (typeof value !== 'string') continue;
					for (const match of value.match(WORKFLOW_ID_PATTERN) ?? []) {
						if (knownWorkflowIds.has(match)) found.add(match);
					}
				}
			}
			return [...found];
		} catch (error) {
			this.logger.debug('Automation map: could not scan data table', { tableId, error });
			return [];
		}
	}

	private async build(mapId: string, user: User, interpretPrompt: boolean) {
		if (this.buildsInProgress.has(mapId)) return;
		this.buildsInProgress.add(mapId);
		try {
			const map = await this.repository.findOneByOrFail({ id: mapId });
			const sources = await this.loadSources(user);
			const foldersById = new Map(sources.folders.map((folder) => [folder.id, folder]));
			const folderPath = (folderId: string | null) => {
				const names: string[] = [];
				let current = folderId ? foldersById.get(folderId) : undefined;
				while (current && names.length < 10) {
					names.unshift(current.name);
					current = current.parentFolderId ? foldersById.get(current.parentFolderId) : undefined;
				}
				return names.join(' / ');
			};

			let interpretationError: string | null = null;
			if (interpretPrompt) {
				const interpretation = await this.aiService.interpretPrompt(
					user,
					map.prompt,
					sources.workflows,
					sources.folders,
					folderPath,
				);
				map.name = interpretation.name;
				map.scope = interpretation.scope;
				interpretationError = interpretation.aiError;
			}

			const knownWorkflowIds = new Set(sources.workflows.map((workflow) => workflow.id));
			const tableProjects = new Map(sources.dataTables.map((table) => [table.id, table.projectId]));
			const graph = await buildAutomationMapGraph(map.scope, {
				...sources,
				describeNodeType: (nodeType) => this.describeNodeType(nodeType),
				findWorkflowIdsInTable: async (tableId) =>
					await this.findWorkflowIdsInTable(tableId, tableProjects.get(tableId), knownWorkflowIds),
			});

			const annotations = await this.aiService.annotate(
				user,
				map.prompt,
				graph,
				map.annotations,
				new Map(sources.workflows.map((workflow) => [workflow.id, workflow])),
			);
			if (interpretationError && !annotations.aiError) annotations.aiError = interpretationError;

			map.graph = graph;
			map.annotations = annotations;
			map.fingerprint = fingerprintFor(graph);
			map.builtAt = new Date();
			map.status = 'ready';
			map.error = null;
			await this.repository.save(map);
		} catch (error) {
			this.logger.error('Automation map: build failed', { mapId, error });
			await this.repository.update(
				{ id: mapId },
				{ status: 'failed', error: error instanceof Error ? error.message : String(error) },
			);
		} finally {
			this.buildsInProgress.delete(mapId);
		}
	}

	private async detectChanges(map: AutomationMap, user: User): Promise<AutomationMapChange[]> {
		const sources = await this.loadSources(user);
		const currentById = new Map(sources.workflows.map((workflow) => [workflow.id, workflow]));
		const fingerprint = map.fingerprint ?? {};
		const changes: AutomationMapChange[] = [];
		const mappedNames = new Map(
			(map.graph?.workflows ?? []).map((workflow) => [workflow.id, workflow.name]),
		);

		for (const [workflowId, versionId] of Object.entries(fingerprint)) {
			const current = currentById.get(workflowId);
			if (!current || current.isArchived) {
				changes.push({
					workflowId,
					name: mappedNames.get(workflowId) ?? workflowId,
					change: 'removed',
				});
			} else if (current.versionId !== versionId) {
				changes.push({ workflowId, name: current.name, change: 'modified' });
			}
		}

		for (const workflowId of selectScopedWorkflowIds(
			map.scope,
			sources.workflows,
			sources.folders,
		)) {
			if (!mappedNames.has(workflowId)) {
				changes.push({
					workflowId,
					name: currentById.get(workflowId)?.name ?? workflowId,
					change: 'added',
				});
			}
		}
		return changes;
	}

	private async runAutoUpdates() {
		try {
			const maps = await this.repository.findAutoUpdating();
			for (const map of maps) {
				if (!map.createdById) continue;
				const user = await this.userRepository.findOne({
					where: { id: map.createdById },
					relations: ['role'],
				});
				if (!user) continue;
				const changes = await this.detectChanges(map, user);
				if (changes.length === 0) continue;
				this.logger.info('Automation map: dependencies changed, updating', {
					mapId: map.id,
					changes: changes.length,
				});
				await this.refresh(user, map.id);
			}
		} catch (error) {
			this.logger.warn('Automation map: auto update failed', { error });
		}
	}
}
