import type { AgentIntegrationConfig, ImportedAgentChannel } from '@n8n/api-types';
import { ProjectScopeService, UrlService } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError } from '@n8n/errors';
import type { Scope } from '@n8n/permissions';
import { UserError } from 'n8n-workflow';

import { AgentConfigService } from '@/modules/agents/agent-config.service';
import { AgentConfigPreparationService } from '@/modules/agents/agent-config-preparation.service';
import { AgentPolicyService } from '@/modules/agents/agent-policy.service';
import { AgentsService } from '@/modules/agents/agents.service';
import { AgentsSettingsService } from '@/modules/agents/agents-settings.service';
import type { CompleteAgentDefinition } from '@/modules/agents/utils/agent-definition';
import type { ProjectAgent } from '@/modules/agents/entities/agent.entity';
import {
	resolveImportedChannels,
	type ImportedChannel,
} from '@/modules/agents/integrations/resolve-imported-channels';
import type { AgentImportIdentity } from '@/modules/agents/repositories/agent.repository';

import { agentBodyIssues } from './agent-body-issues';
import { AgentImportMatchService } from './agent-import-match.service';
import {
	requiredAgentScopes,
	type AgentImportMatchContext,
	type AgentImportPlan,
	type AgentImportIssue,
	type AgentPlanItem,
	type PreparedAgent,
	type PersistedAgentOutcome,
} from './agent-import.types';
import type { ImportEntityProperties } from '../../n8n-packages.types';
import type { SerializedSkill } from '../../spec/serialized/skill.schema';
import { decideImportConflictAction } from '../import-conflict-policy';
import { SkillImporter } from '../skill/skill-importer';
import { derivePublishedState } from '../workflow/workflow-published-state';
import { decidePublishingAction } from '../workflow/workflow-publishing-policy';

@Service()
export class AgentImporter {
	constructor(
		private readonly matcher: AgentImportMatchService,
		private readonly agentsService: AgentsService,
		private readonly configService: AgentConfigService,
		private readonly configPreparation: AgentConfigPreparationService,
		private readonly policyService: AgentPolicyService,
		private readonly projectScopeService: ProjectScopeService,
		private readonly settingsService: AgentsSettingsService,
		private readonly skillImporter: SkillImporter,
		private readonly urlService: UrlService,
	) {}

	async plan(
		context: AgentImportMatchContext,
		agents: PreparedAgent[],
		skills: SerializedSkill[],
		options: ImportEntityProperties,
	): Promise<AgentImportPlan> {
		const plan: AgentImportPlan = {
			items: [],
			issues: [],
		};
		if (agents.length === 0) return plan;
		const { matches, idConflicts } = await this.matcher.findImportMatches(
			context,
			agents.map((a) => a.sourceAgentId),
		);
		for (const conflict of idConflicts) {
			plan.issues.push({
				type: 'agent-conflict',
				kind: 'id',
				sourceAgentId: conflict.sourceAgentId,
				projectId: context.projectId,
				targetIds: [conflict.sourceAgentId],
			});
		}
		const conflictedIds = new Set(idConflicts.map(({ sourceAgentId }) => sourceAgentId));
		for (const agent of agents) {
			if (conflictedIds.has(agent.sourceAgentId)) continue;
			const result = await this.planDefinition(
				agent,
				matches.get(agent.sourceAgentId),
				context,
				options,
			);
			if ('action' in result) plan.items.push(result);
			else plan.issues.push(result);
		}
		await this.assertScopes(context, requiredAgentScopes(plan));
		const active = plan.items.filter(({ action }) => action !== 'skip');
		if (active.length > 0) await this.settingsService.assertEnabled();
		for (const item of active) plan.issues.push(...agentBodyIssues(item));
		const skillPlan = await this.skillImporter.plan(
			context,
			plan.items,
			skills,
			options.conflictPolicy,
		);
		plan.skills = skillPlan.plan;
		plan.issues.push(...skillPlan.issues);
		return plan;
	}

	async validate(plan: AgentImportPlan, projectId: string): Promise<AgentImportPlan> {
		const items = [...plan.items];
		const issues = [...plan.issues];
		for (const [index, item] of items.entries()) {
			if (item.action === 'skip') continue;
			let validated: AgentPlanItem;
			try {
				// Validate the source channels before they become destination channels.
				validated = withImportedChannels(
					await this.validateDefinition(item),
					item.existing?.integrations ?? [],
				);
			} catch (error) {
				if (!(error instanceof UserError) && !(error instanceof BadRequestError)) throw error;
				issues.push({
					type: 'agent-invalid',
					sourceAgentId: item.sourceAgentId,
					path: 'config',
					message: error.message,
				});
				continue;
			}
			items[index] = validated;
			const content = validated.config ?? { name: item.name };
			const { violations } = await this.policyService.evaluateSave(
				projectId,
				item.existing?.id ?? null,
				content,
				item.existing?.schema ?? null,
			);
			if (violations.length > 0) {
				issues.push({
					type: 'agent-policy-violation',
					sourceAgentId: item.sourceAgentId,
					name: item.name,
					violations,
				});
			}
		}
		return { ...plan, items, issues };
	}

	async apply(
		context: AgentImportMatchContext,
		plan: AgentImportPlan,
	): Promise<PersistedAgentOutcome[]> {
		const outcomes: PersistedAgentOutcome[] = [];
		// The project has been created. Pending-project planning grants no apply-time exception.
		await this.assertScopes(
			{ ...context, projectPendingCreation: false },
			requiredAgentScopes(plan),
		);
		if (plan.skills) await this.skillImporter.applyShared(context.user, plan.skills);
		const raisedRevisions = plan.skills?.raisedRevisions ?? new Map<string, number>();
		for (const item of plan.items) {
			if (item.action === 'skip') {
				outcomes.push({
					status: 'skipped',
					agent: item.existing,
					sourceAgentId: item.sourceAgentId,
				});
				continue;
			}
			const definition = completeDefinition(item);
			const options = {
				metadata: {
					availableInMCP: item.availableInMCP,
				},
				plannedDestinations: plan.plannedDestinations,
				writeSkills: plan.skills
					? this.skillImporter.writerFor(plan.skills, item.sourceAgentId)
					: undefined,
			};
			let agent: ProjectAgent;
			if (item.action === 'create') {
				agent = await this.agentsService.create(context.projectId, item.name, {
					...options,
					id: item.sourceAgentId,
					definition,
					user: context.user,
					actor: { kind: 'user', user: context.user },
				});
			} else {
				agent = await this.configService.replaceDefinition(
					item.sourceAgentId,
					context.projectId,
					definition,
					context.user,
					{
						...options,
						// The shared skill writes of this package raised the revision of the Agents that follow them.
						expectedRevision:
							item.existing.revision + (raisedRevisions.get(item.sourceAgentId) ?? 0),
					},
				);
			}
			const channels = item.channels.map((channel) => this.withSetupUrl(channel, agent));
			outcomes.push({
				status: item.action === 'create' ? 'created' : 'updated',
				agent,
				sourceAgentId: item.sourceAgentId,
				publishingAction: item.publishingAction,
				channels,
				...(channels.some(({ status }) => status === 'setup-required')
					? { blockedFromPublish: 'channel-setup-required' as const }
					: {}),
			});
		}
		for (const outcome of outcomes) {
			if (outcome.status === 'skipped') continue;
			await this.agentsService.recordSavedSetupComplete(outcome.agent, context.user);
		}
		return outcomes;
	}

	private async planDefinition(
		agent: PreparedAgent,
		match: AgentImportIdentity | undefined,
		context: AgentImportMatchContext,
		options: ImportEntityProperties,
	): Promise<AgentPlanItem | AgentImportIssue> {
		const { action, blocked } = decideImportConflictAction(
			options.conflictPolicy,
			match !== undefined,
		);
		if (blocked) {
			return {
				type: 'agent-conflict',
				kind: 'existing',
				sourceAgentId: agent.sourceAgentId,
				projectId: context.projectId,
				targetIds: [agent.sourceAgentId],
			};
		}
		const existing = match
			? await this.agentsService.findById(agent.sourceAgentId, context.projectId)
			: null;
		const statuses = { create: 'created', update: 'updated', skip: 'skipped' } as const;
		const publishingAction = decidePublishingAction(options.publishingPolicy, {
			status: statuses[action],
			currentlyPublished: Boolean(existing?.activeVersionId),
			sourcePublished: derivePublishedState(agent.metadata),
		});
		const channels: ImportedChannel[] = [];
		const item = { ...structuredClone(agent), publishingAction, channels };
		if (action === 'create') return { ...item, action, existing: null };
		if (!existing) {
			return {
				type: 'agent-invalid',
				sourceAgentId: agent.sourceAgentId,
				path: 'id',
				message: 'The destination Agent no longer exists.',
			};
		}
		return { ...item, action, existing };
	}

	private withSetupUrl(channel: ImportedChannel, agent: ProjectAgent): ImportedAgentChannel {
		if (channel.status === 'reused') return channel;
		// Concatenate, so the link keeps the base path of an instance under a sub-path.
		const setupUrl = `${this.urlService.getInstanceBaseUrl()}/projects/${agent.projectId}/agents/${agent.id}`;
		return { ...channel, setupUrl };
	}

	private async validateDefinition(item: AgentPlanItem): Promise<AgentPlanItem> {
		for (const [id, tool] of Object.entries(item.tools)) {
			if (id !== tool.descriptor.name)
				throw new UserError(`Custom tool "${id}" must use its descriptor name as its ID.`);
		}
		const definition = await this.configPreparation.validateDefinition(
			item.sourceAgentId,
			completeDefinition(item),
		);
		return { ...item, config: definition.config };
	}

	private async assertScopes(context: AgentImportMatchContext, scopes: Scope[]): Promise<void> {
		if (context.projectPendingCreation) return;
		const projectIds = await this.projectScopeService.getProjectIds(context.user, scopes);
		if (projectIds !== null && !projectIds.includes(context.projectId)) {
			throw new ForbiddenError(
				'You do not have permission to perform the planned Agent import actions in the destination project.',
			);
		}
	}
}

/** A package credential never connects a channel. */
function withImportedChannels<T extends PreparedAgent & { channels: ImportedChannel[] }>(
	item: T,
	destination: AgentIntegrationConfig[],
): T {
	const source = item.config?.integrations;
	if (!item.config || !source) return item;
	const { integrations, channels } = resolveImportedChannels(destination, source);
	return { ...item, config: { ...item.config, integrations }, channels };
}

function completeDefinition(item: PreparedAgent): CompleteAgentDefinition {
	return {
		name: item.name,
		config: item.config,
		tools: item.tools,
		tasks: new Map(Object.entries(item.tasks)),
	};
}
