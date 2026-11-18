import type {
	CheckWorkflowRulesDto,
	EffectiveWorkflowRulesResponse,
	WorkflowRuleExemptionResponse,
	WorkflowRuleSetResponse,
	WorkflowRulesCheckResponse,
} from '@n8n/api-types';
import {
	accountFullName,
	ProjectRepository,
	SharedWorkflowRepository,
	type User,
	UserRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ConflictError, NotFoundError } from '@n8n/errors';
import {
	EMPTY_RULE_SET,
	evaluateWorkflowRules,
	resolveEffectiveRules,
	ruleSetSchema,
	type EffectiveRule,
	type RuleEvaluation,
	type RuleSet,
	type RulesExportBundle,
	type RuleWorkflow,
} from '@n8n/workflow-rules';

import type { WorkflowRuleExemptionEntity } from './database/workflow-rule-exemption.entity';
import { WorkflowRuleExemptionRepository } from './database/workflow-rule-exemption.repository';
import { WorkflowRuleSetRepository } from './database/workflow-rule-set.repository';
import { WorkflowRulesContext } from './workflow-rules-context';
import { WorkflowRulesSnapshot, type WorkflowRulesState } from './workflow-rules.snapshot';

export interface ExemptionGrant {
	workflowId: string;
	ruleId: string;
	reason: string;
}

/** Who asks for an exemption change: an instance admin, or a project admin for one project. */
export type ExemptionActor =
	| { kind: 'instance'; user: User }
	| { kind: 'project'; user: User; projectId: string };

@Service()
export class WorkflowRulesService {
	constructor(
		private readonly ruleSetRepository: WorkflowRuleSetRepository,
		private readonly exemptionRepository: WorkflowRuleExemptionRepository,
		private readonly snapshot: WorkflowRulesSnapshot,
		private readonly context: WorkflowRulesContext,
		private readonly userRepository: UserRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {}

	async getRuleSet(projectId: string | null): Promise<WorkflowRuleSetResponse> {
		const row = await this.ruleSetRepository.findForScope(projectId, {});
		if (!row) {
			return { ruleSet: EMPTY_RULE_SET, version: 0, updatedAt: null, updatedBy: null };
		}
		const parsed = ruleSetSchema.safeParse(row.config);
		return {
			ruleSet: parsed.success ? parsed.data : EMPTY_RULE_SET,
			version: row.version,
			updatedAt: row.updatedAt.toISOString(),
			updatedBy: await this.describeUser(row.updatedById),
		};
	}

	async putRuleSet(
		projectId: string | null,
		ruleSet: RuleSet,
		expectedVersion: number,
		user: User,
	): Promise<WorkflowRuleSetResponse> {
		// Only the instance decides which rules projects may relax.
		const stored: RuleSet =
			projectId === null
				? ruleSet
				: {
						rules: ruleSet.rules.map(({ adjustable: _adjustable, ...setting }) => setting),
						customRules: ruleSet.customRules.map(({ adjustable: _adjustable, ...rule }) => rule),
					};

		const saved = await this.ruleSetRepository.saveIfVersionMatches(
			projectId,
			stored,
			expectedVersion,
			user.id,
			{},
		);
		if (!saved) {
			throw new ConflictError(
				'Someone else changed these rules. Reload the page to see their changes.',
			);
		}

		await this.snapshot.refreshAfterWrite();
		return {
			ruleSet: stored,
			version: saved.version,
			updatedAt: saved.updatedAt.toISOString(),
			updatedBy: { id: user.id, name: accountFullName(user) },
		};
	}

	async readState(): Promise<WorkflowRulesState> {
		return await this.snapshot.read();
	}

	effectiveRulesFor(
		state: WorkflowRulesState,
		projectId: string | null,
		overrides: { instance?: RuleSet; project?: RuleSet } = {},
	): EffectiveRule[] {
		const instance = overrides.instance ?? state.instance.ruleSet;
		const project =
			overrides.project ?? (projectId ? state.projects.get(projectId)?.ruleSet : undefined);
		return resolveEffectiveRules(instance, project);
	}

	/** Evaluates one workflow against the stored rules of its project. */
	async evaluate(workflow: RuleWorkflow, projectId: string | null): Promise<RuleEvaluation> {
		const state = await this.readState();
		const exempted = workflow.id ? state.exemptions.get(workflow.id) : undefined;
		return evaluateWorkflowRules(
			workflow,
			this.effectiveRulesFor(state, projectId),
			this.context.evaluateOptions(exempted),
		);
	}

	policyVersions(state: WorkflowRulesState, projectId: string | null) {
		const project = projectId ? state.projects.get(projectId) : undefined;
		return [
			{ scope: 'instance', version: state.instance.version },
			...(project ? [{ scope: 'project', version: project.version }] : []),
		];
	}

	async getEffective(
		projectId: string,
		workflowId: string | undefined,
	): Promise<EffectiveWorkflowRulesResponse> {
		const state = await this.readState();
		const exemptions = workflowId ? await this.listExemptions({ workflowId }) : [];
		return {
			instance: state.instance.ruleSet,
			project: state.projects.get(projectId)?.ruleSet ?? null,
			defaults: this.context.defaults(),
			exemptions,
		};
	}

	/**
	 * Checks workflow JSON against the stored rules without saving anything. CI calls this.
	 * A workflow without `projectId` uses its own project when this instance knows its id.
	 */
	async checkWorkflows(request: CheckWorkflowRulesDto): Promise<WorkflowRulesCheckResponse> {
		const state = await this.readState();
		const knownIds = request.workflows
			.filter((item) => !item.projectId && item.workflow.id)
			.map((item) => item.workflow.id ?? '');
		const owners =
			knownIds.length > 0
				? await this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(knownIds)
				: new Map();

		const results = request.workflows.map(({ workflow, projectId, source }) => {
			const workflowId = workflow.id ?? null;
			const resolvedProjectId =
				projectId ?? (workflowId ? (owners.get(workflowId)?.id ?? null) : null);
			const exempted = workflowId ? state.exemptions.get(workflowId) : undefined;
			const { findings } = evaluateWorkflowRules(
				workflow,
				this.effectiveRulesFor(state, resolvedProjectId),
				this.context.evaluateOptions(exempted),
			);
			const active = findings.filter((finding) => !finding.exempted);
			const blocking = active.filter((finding) => finding.severity === 'block').length;
			return {
				source: source ?? null,
				workflowId,
				workflowName: workflow.name,
				projectId: resolvedProjectId,
				findings,
				blocking,
				warnings: active.length - blocking,
			};
		});

		const blocking = results.reduce((sum, result) => sum + result.blocking, 0);
		return {
			results,
			summary: {
				workflows: results.length,
				blocking,
				warnings: results.reduce((sum, result) => sum + result.warnings, 0),
				passed: blocking === 0,
			},
		};
	}

	async exportBundle(): Promise<RulesExportBundle> {
		const state = await this.readState();
		const projectIds = [...state.projects.keys()];
		const names = new Map(
			(await this.projectRepository.findTeamProjectInfoByIds(projectIds)).map((project) => [
				project.id,
				project.name,
			]),
		);
		return {
			version: 1,
			exportedAt: new Date().toISOString(),
			defaults: this.context.defaults(),
			instance: state.instance.ruleSet,
			projects: projectIds.map((projectId) => ({
				projectId,
				projectName: names.get(projectId),
				ruleSet: state.projects.get(projectId)?.ruleSet ?? EMPTY_RULE_SET,
			})),
			exemptions: [...state.exemptions.entries()].flatMap(([workflowId, ruleIds]) =>
				[...ruleIds].map((ruleId) => ({ workflowId, ruleId })),
			),
		};
	}

	async listExemptions(filter: {
		projectId?: string;
		workflowId?: string;
	}): Promise<WorkflowRuleExemptionResponse[]> {
		const all = await this.exemptionRepository.findAll({});
		const relevant = filter.workflowId
			? all.filter((exemption) => exemption.workflowId === filter.workflowId)
			: all;
		const described = await this.describeExemptions(relevant);
		return filter.projectId
			? described.filter((exemption) => exemption.projectId === filter.projectId)
			: described;
	}

	async createExemption(
		grant: ExemptionGrant,
		actor: ExemptionActor,
	): Promise<WorkflowRuleExemptionResponse> {
		const projectId = await this.assertCanChangeExemption(grant.workflowId, grant.ruleId, actor);
		const state = await this.readState();
		const rule = this.effectiveRulesFor(state, projectId).find(
			(candidate) => candidate.ruleId === grant.ruleId,
		);
		if (!rule) {
			throw new BadRequestError('This rule is not turned on for the workflow’s project.');
		}

		const created = await this.exemptionRepository.createUnlessExists(
			{ ...grant, createdById: actor.user.id },
			{},
		);
		if (!created) throw new ConflictError('The workflow is already exempt from this rule.');

		await this.snapshot.refreshAfterWrite();
		const [described] = await this.describeExemptions([created]);
		return described;
	}

	async deleteExemption(id: number, actor: ExemptionActor): Promise<void> {
		const exemption = await this.exemptionRepository.findById(id, {});
		if (!exemption) throw new NotFoundError('Exemption not found');
		await this.assertCanChangeExemption(exemption.workflowId, exemption.ruleId, actor);
		await this.exemptionRepository.deleteById(id, {});
		await this.snapshot.refreshAfterWrite();
	}

	/** Returns the workflow's project. Project admins may change only exemptions they could relax. */
	private async assertCanChangeExemption(
		workflowId: string,
		ruleId: string,
		actor: ExemptionActor,
	): Promise<string | null> {
		const owners = await this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds([workflowId]);
		const project = owners.get(workflowId);
		if (!project) throw new NotFoundError('Workflow not found');
		if (actor.kind === 'instance') return project.id;

		if (project.id !== actor.projectId) throw new NotFoundError('Workflow not found');
		const state = await this.readState();
		const rule = this.effectiveRulesFor(state, project.id).find(
			(candidate) => candidate.ruleId === ruleId,
		);
		if (rule && rule.scope === 'instance' && !rule.adjustable) {
			throw new BadRequestError(
				'Only an instance admin can exempt a workflow from this rule, because projects may not relax it.',
			);
		}
		return project.id;
	}

	private async describeExemptions(
		exemptions: WorkflowRuleExemptionEntity[],
	): Promise<WorkflowRuleExemptionResponse[]> {
		if (exemptions.length === 0) return [];
		const workflowIds = [...new Set(exemptions.map((exemption) => exemption.workflowId))];
		const [workflows, owners, users] = await Promise.all([
			this.workflowRepository.findByIds(workflowIds, { fields: ['name'] }),
			this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(workflowIds),
			this.userRepository.findManyByIds([
				...new Set(
					exemptions
						.map((exemption) => exemption.createdById)
						.filter((id): id is string => id !== null),
				),
			]),
		]);
		const workflowNames = new Map(workflows.map((workflow) => [workflow.id, workflow.name]));
		const usersById = new Map(users.map((user) => [user.id, user]));

		return exemptions.map((exemption) => {
			const project = owners.get(exemption.workflowId);
			const creator = exemption.createdById ? usersById.get(exemption.createdById) : undefined;
			return {
				id: exemption.id,
				workflowId: exemption.workflowId,
				workflowName: workflowNames.get(exemption.workflowId) ?? exemption.workflowId,
				projectId: project?.id ?? null,
				projectName: project?.name ?? null,
				ruleId: exemption.ruleId,
				reason: exemption.reason,
				createdAt: exemption.createdAt.toISOString(),
				createdBy: creator ? { id: creator.id, name: accountFullName(creator) } : null,
			};
		});
	}

	private async describeUser(userId: string | null): Promise<{ id: string; name: string } | null> {
		if (!userId) return null;
		const [user] = await this.userRepository.findManyByIds([userId]);
		return user ? { id: user.id, name: accountFullName(user) } : null;
	}
}
