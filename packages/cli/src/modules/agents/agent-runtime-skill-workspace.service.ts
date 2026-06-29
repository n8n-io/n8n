import { type RuntimeSkillSource, Workspace, createRuntimeSkillRegistry } from '@n8n/agents';
import { DAYTONA_WORKSPACE_ROOT } from '@n8n/agents/sandbox';
import type { AgentJsonConfig, AgentSkill } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import {
	clearRuntimeSkillsFromWorkspace,
	materializeRuntimeSkillsIntoWorkspace,
} from '@n8n/instance-ai';

import { AgentKnowledgeSandboxService } from './agent-knowledge-sandbox.service';
import { createConfiguredSkillSource } from './json-config/from-json-config';

const AGENT_SKILLS_ROOT_DIR = 'agent-skills';

export interface AgentRuntimeSkillWorkspaceScope {
	projectId: string;
	agentId: string;
	userId: string;
	kind: 'draft' | 'published';
	versionId?: string;
}

interface RuntimeSkillWorkspaceEntry {
	scope: AgentRuntimeSkillWorkspaceScope;
	workspace: Workspace;
	root: string;
}

@Service()
export class AgentRuntimeSkillWorkspaceService {
	private readonly entries = new Map<string, RuntimeSkillWorkspaceEntry>();
	private readonly entryCreations = new Map<string, Promise<RuntimeSkillWorkspaceEntry>>();

	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly agentKnowledgeSandboxService: AgentKnowledgeSandboxService,
		private readonly logger: Logger,
	) {}

	async getWorkspace(scope: AgentRuntimeSkillWorkspaceScope): Promise<Workspace | undefined> {
		if (!this.isEnabled()) return undefined;
		return (await this.getOrCreateEntry(scope)).workspace;
	}

	wrapSkillSource(
		source: RuntimeSkillSource,
		scope: AgentRuntimeSkillWorkspaceScope,
	): RuntimeSkillSource {
		if (!this.isEnabled() || source.registry.skills.length === 0) return source;

		let materializedSource: RuntimeSkillSource | undefined;
		let preparePromise: Promise<void> | undefined;
		const workspaceSource: RuntimeSkillSource = {
			registry: source.registry,
			prepare: async () => {
				if (materializedSource) return;
				preparePromise ??= this.materializeSource(source, scope, true)
					.then((prepared) => {
						if (!prepared) return;
						materializedSource = prepared;
						workspaceSource.registry = prepared.registry;
					})
					.finally(() => {
						preparePromise = undefined;
					});
				await preparePromise;
			},
			loadSkill: async (skillId) => await (materializedSource ?? source).loadSkill(skillId),
			...(source.loadFile
				? {
						loadFile: async (skillId: string, filePath: string) =>
							(await (materializedSource ?? source).loadFile?.(skillId, filePath)) ?? null,
					}
				: {}),
		};

		return workspaceSource;
	}

	async syncActiveSkillWorkspaces(params: {
		projectId: string;
		agentId: string;
		userId?: string;
		config: AgentJsonConfig | null | undefined;
		skills: Record<string, AgentSkill>;
	}): Promise<void> {
		if (!this.isEnabled() || !params.config) return;

		const source = createConfiguredSkillSource(
			params.config.skills ?? [],
			params.skills,
			createRuntimeSkillRegistry,
		);
		let entries = [...this.entries.values()].filter(
			(entry) =>
				entry.scope.projectId === params.projectId && entry.scope.agentId === params.agentId,
		);
		if (entries.length === 0 && source.registry.skills.length === 0) return;
		if (entries.length === 0 && params.userId) {
			entries = [
				await this.getOrCreateEntry({
					kind: 'draft',
					projectId: params.projectId,
					agentId: params.agentId,
					userId: params.userId,
				}),
			];
		}
		if (entries.length === 0) return;

		await Promise.all(
			entries.map(async (entry) => {
				if (source.registry.skills.length === 0) {
					await clearRuntimeSkillsFromWorkspace({
						workspace: entry.workspace,
						root: entry.root,
						logger: this.logger,
					});
					return;
				}

				await materializeRuntimeSkillsIntoWorkspace({
					source,
					workspace: entry.workspace,
					root: entry.root,
					logger: this.logger,
					pruneStale: true,
				});
			}),
		);
	}

	private async materializeSource(
		source: RuntimeSkillSource,
		scope: AgentRuntimeSkillWorkspaceScope,
		pruneStale: boolean,
	): Promise<RuntimeSkillSource | undefined> {
		const entry = await this.getOrCreateEntry(scope);
		const materialized = await materializeRuntimeSkillsIntoWorkspace({
			source,
			workspace: entry.workspace,
			root: entry.root,
			logger: this.logger,
			pruneStale,
		});

		return materialized?.source;
	}

	private isEnabled(): boolean {
		return this.agentsConfig.sandboxEnabled && this.agentsConfig.sandboxProvider === 'daytona';
	}

	private async getOrCreateEntry(
		scope: AgentRuntimeSkillWorkspaceScope,
	): Promise<RuntimeSkillWorkspaceEntry> {
		const key = this.cacheKey(scope);
		const existing = this.entries.get(key);
		if (existing) return existing;

		let pending = this.entryCreations.get(key);
		if (!pending) {
			pending = this.createEntry(scope).finally(() => {
				this.entryCreations.delete(key);
			});
			this.entryCreations.set(key, pending);
		}

		return await pending;
	}

	private async createEntry(
		scope: AgentRuntimeSkillWorkspaceScope,
	): Promise<RuntimeSkillWorkspaceEntry> {
		const workspace = await this.agentKnowledgeSandboxService.getWorkspace(
			scope.projectId,
			scope.agentId,
			scope.userId,
		);
		const entry = {
			scope,
			workspace,
			root: `${DAYTONA_WORKSPACE_ROOT}/${AGENT_SKILLS_ROOT_DIR}`,
		};
		this.entries.set(this.cacheKey(scope), entry);
		return entry;
	}

	private cacheKey(scope: AgentRuntimeSkillWorkspaceScope): string {
		return [scope.projectId, scope.agentId, scope.userId].join(':');
	}
}
