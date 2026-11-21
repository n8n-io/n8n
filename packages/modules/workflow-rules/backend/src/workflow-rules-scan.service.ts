import type { WorkflowRulesScanResponse, WorkflowRulesScanWorkflow } from '@n8n/api-types';
import { SharedWorkflowRepository, WorkflowRepository, type WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { evaluateWorkflowRules, type EffectiveRule, type RuleSet } from '@n8n/workflow-rules';

import { WorkflowRulesContext } from './workflow-rules-context';
import { WorkflowRulesService } from './workflow-rules.service';

const PAGE_SIZE = 100;

export interface ScanRequest {
	/** Scan only this project's workflows, and apply `ruleSet` as its project rule set. */
	projectId?: string;
	/** A draft to preview. Without it, the stored rules apply. */
	ruleSet?: RuleSet;
	limit: number;
}

/**
 * Runs the rules over existing workflows, for the impact preview before a save and for the
 * report after it. It reads the draft of each workflow, which is what the next publish sends.
 */
@Service()
export class WorkflowRulesScanService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly rulesService: WorkflowRulesService,
		private readonly context: WorkflowRulesContext,
	) {}

	async scan({ projectId, ruleSet, limit }: ScanRequest): Promise<WorkflowRulesScanResponse> {
		const state = await this.rulesService.readState();
		const rulesByProject = new Map<string | null, EffectiveRule[]>();
		const rulesFor = (ownerProjectId: string | null) => {
			let rules = rulesByProject.get(ownerProjectId);
			if (!rules) {
				const overrides = ruleSet
					? projectId
						? ownerProjectId === projectId
							? { project: ruleSet }
							: {}
						: { instance: ruleSet }
					: {};
				rules = this.rulesService.effectiveRulesFor(state, ownerProjectId, overrides);
				rulesByProject.set(ownerProjectId, rules);
			}
			return rules;
		};

		const response: WorkflowRulesScanResponse = {
			totals: {
				workflows: 0,
				workflowsWithBlocking: 0,
				workflowsWithWarnings: 0,
				publishedWithBlocking: 0,
				blocking: 0,
				warnings: 0,
			},
			rules: [],
			workflows: [],
			truncated: false,
		};
		const perRule = new Map<string, { blocking: number; warnings: number; workflows: number }>();
		const withFindings: WorkflowRulesScanWorkflow[] = [];

		for await (const page of this.pages(projectId)) {
			const owners = await this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(
				page.map((workflow) => workflow.id),
			);
			for (const workflow of page) {
				const owner = owners.get(workflow.id);
				const ownerProjectId = owner?.id ?? null;
				const { findings } = evaluateWorkflowRules(
					workflow,
					rulesFor(ownerProjectId),
					this.context.evaluateOptions(state.exemptions.get(workflow.id)),
				);
				response.totals.workflows++;
				const active = findings.filter((finding) => !finding.exempted);
				if (active.length === 0) continue;

				const blocking = active.filter((finding) => finding.severity === 'block').length;
				const warnings = active.length - blocking;
				const isPublished = workflow.activeVersionId !== null;
				response.totals.blocking += blocking;
				response.totals.warnings += warnings;
				if (blocking > 0) response.totals.workflowsWithBlocking++;
				if (warnings > 0) response.totals.workflowsWithWarnings++;
				if (blocking > 0 && isPublished) response.totals.publishedWithBlocking++;

				for (const ruleId of new Set(active.map((finding) => finding.ruleId))) {
					const counts = perRule.get(ruleId) ?? { blocking: 0, warnings: 0, workflows: 0 };
					counts.workflows++;
					for (const finding of active) {
						if (finding.ruleId !== ruleId) continue;
						if (finding.severity === 'block') counts.blocking++;
						else counts.warnings++;
					}
					perRule.set(ruleId, counts);
				}

				withFindings.push({
					id: workflow.id,
					name: workflow.name,
					projectId: ownerProjectId,
					projectName: owner?.name ?? null,
					isPublished,
					findings,
				});
			}
		}

		// Published workflows with blocking findings first: they are the ones that cannot be republished.
		const rank = (workflow: WorkflowRulesScanWorkflow) =>
			workflow.findings.some((finding) => finding.severity === 'block' && !finding.exempted)
				? workflow.isPublished
					? 0
					: 1
				: 2;
		withFindings.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));

		response.workflows = withFindings.slice(0, limit);
		response.truncated = withFindings.length > limit;
		response.rules = [...perRule.entries()]
			.map(([ruleId, counts]) => ({ ruleId, ...counts }))
			.sort((a, b) => b.blocking - a.blocking || b.warnings - a.warnings);
		return response;
	}

	private async *pages(projectId: string | undefined): AsyncGenerator<WorkflowEntity[]> {
		if (projectId) {
			const ids = (await this.sharedWorkflowRepository.findOwnedWorkflowIdsByProjects([projectId]))
				.slice()
				.sort();
			for (let start = 0; start < ids.length; start += PAGE_SIZE) {
				const chunk = ids.slice(start, start + PAGE_SIZE);
				yield await this.workflowRepository.findWorkflowRulesScanPage(undefined, PAGE_SIZE, chunk);
			}
			return;
		}

		let afterId: string | undefined;
		while (true) {
			const page = await this.workflowRepository.findWorkflowRulesScanPage(afterId, PAGE_SIZE);
			if (page.length === 0) return;
			yield page;
			afterId = page[page.length - 1].id;
			if (page.length < PAGE_SIZE) return;
		}
	}
}
