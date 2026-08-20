import type { InstanceAiWorkflowOverviewResponse } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import {
	extractResultFacts,
	extractTriggerFacts,
	formatResultFactsContext,
	formatResultsPane,
	formatTriggersPane,
	resultPaneClauses,
	summarizeWorkflowStructure,
	summarizeWorkflowStructureCompact,
	triggerPaneClauses,
} from '@n8n/instance-ai';
import type { WorkflowAiOverview } from 'n8n-workflow';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { InstanceAiModelService } from './instance-ai-model.service';
import { InstanceAiNodeMetaAdapter } from './instance-ai-node-meta.adapter';
import { generateWorkflowOverviewTraced } from './workflow-overview-instrumentation';

/**
 * On-demand AI overviews for existing workflows (PoC): generates the
 * three-pane Triggers / Steps / Results abstraction from the workflow's saved
 * structure and stores it in the workflow's `meta.aiOverview` — no migration,
 * refreshed only when explicitly requested.
 */
@Service()
export class InstanceAiWorkflowOverviewService {
	constructor(
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly modelService: InstanceAiModelService,
		private readonly nodeMeta: InstanceAiNodeMetaAdapter,
		private readonly logger: Logger,
	) {}

	async getStoredOverview(
		user: User,
		workflowId: string,
	): Promise<InstanceAiWorkflowOverviewResponse> {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);
		if (!workflow) throw new NotFoundError(`Workflow ${workflowId} not found`);
		return toOverviewResponse(workflow.meta?.aiOverview, workflow.versionId);
	}

	/**
	 * Generate the overview from the workflow's current structure and persist
	 * it in workflow meta. Requires `workflow:update` since it writes to the
	 * workflow row. Returns `{ overview: null }` when generation fails or the
	 * structure is too sparse to describe — the previous stored overview (if
	 * any) is left untouched in that case.
	 */
	async generateAndStoreOverview(
		user: User,
		workflowId: string,
	): Promise<InstanceAiWorkflowOverviewResponse> {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:update',
		]);
		if (!workflow) throw new NotFoundError(`Workflow ${workflowId} not found`);

		const previous = workflow.meta?.aiOverview;

		// Overviews derive from structure alone, and `versionId` changes on
		// every workflow save (the meta-only overview write below does not
		// touch it) — an unchanged versionId means regeneration cannot produce
		// anything new, so the refresh is free.
		if (
			previous?.workflowVersionId &&
			workflow.versionId &&
			previous.workflowVersionId === workflow.versionId
		) {
			this.logger.debug('Workflow overview up to date; skipping generation', {
				workflowId,
				workflowVersionId: workflow.versionId,
			});
			return { ...toOverviewResponse(previous, workflow.versionId), cached: true };
		}

		// Spike: deterministic Triggers pane. When the graph yields trigger facts
		// the pane is not generated at all — the generator receives it as known
		// context (so Steps/Results stay consistent with it) and produces only
		// the other two panes. No facts → the LLM generates all three as before.
		const triggerFacts = extractTriggerFacts(workflow.nodes, this.nodeMeta);
		const deterministicTriggers = formatTriggersPane(triggerFacts);

		// Spike: deterministic Results pane, gated on full node classification.
		// Complete → the pane is known ('' = known-empty) and not generated.
		// Gate tripped → the LLM generates it, grounded with the partial facts.
		const resultExtraction = extractResultFacts(workflow.nodes, this.nodeMeta);
		const deterministicResults = formatResultsPane(resultExtraction);
		const resultFactsContext =
			deterministicResults === null ? formatResultFactsContext(resultExtraction) : null;

		const modelId = await this.modelService.resolveOverviewModelConfig(user);
		// With both panes known the model only writes the Steps sentence — the
		// bare node/edge digest carries enough signal for that at roughly half
		// the input tokens of the SDK-code rendering.
		const structure =
			deterministicTriggers !== null && deterministicResults !== null
				? summarizeWorkflowStructureCompact(workflow.nodes, workflow.connections)
				: await summarizeWorkflowStructure(workflow.name, workflow.nodes, workflow.connections);

		let failureReason: string | undefined;
		const overview = await generateWorkflowOverviewTraced(
			{
				// No thread exists for on-demand generations — group traces by workflow.
				conversationKey: `workflow-overview:${workflowId}`,
				userId: user.id,
				modelId,
				source: 'on-demand',
				logger: this.logger,
			},
			{
				subject: 'workflow',
				conversation: [],
				builtWorkflowSummary: `Workflow "${workflow.name}" (id: ${workflow.id}):\n${structure}`,
				...(deterministicTriggers !== null ? { knownTriggers: deterministicTriggers } : {}),
				...(deterministicResults !== null ? { knownResults: deterministicResults } : {}),
				...(resultFactsContext !== null ? { resultFactsContext } : {}),
				previousOverview: previous
					? { triggers: previous.triggers, steps: previous.steps, results: previous.results }
					: null,
			},
			{
				onFailure: (reason, detail) => {
					failureReason = detail ? `${reason}: ${detail}` : reason;
				},
			},
		);

		if (!overview) {
			this.logger.warn('Workflow overview generation produced no result', {
				workflowId,
				failureReason,
			});
			return { ...toOverviewResponse(previous, workflow.versionId), failureReason };
		}

		const finalOverview = {
			...overview,
			// Clause lists feed the UI's stacked any-of / all-of rendering.
			...(deterministicTriggers !== null
				? { triggers: deterministicTriggers, triggerClauses: triggerPaneClauses(triggerFacts) }
				: {}),
			...(deterministicResults !== null
				? { results: deterministicResults, resultClauses: resultPaneClauses(resultExtraction) }
				: {}),
		};

		const aiOverview: WorkflowAiOverview = {
			...finalOverview,
			...(workflow.versionId ? { workflowVersionId: workflow.versionId } : {}),
			updatedAt: new Date().toISOString(),
		};
		// Meta-only update that pins the entity's `updatedAt`: a generated
		// overview is bookkeeping, not a user edit — bumping the timestamp made
		// the editor's save-conflict modal appear on the next manual save.
		await this.workflowRepository.updateWorkflowMetaSilently(workflowId, {
			...(workflow.meta ?? {}),
			aiOverview,
		});

		return toOverviewResponse(aiOverview, workflow.versionId);
	}
}

function toOverviewResponse(
	stored: WorkflowAiOverview | undefined,
	currentWorkflowVersionId?: string,
): InstanceAiWorkflowOverviewResponse {
	if (!stored) return { overview: null, updatedAt: null };
	return {
		overview: {
			triggers: stored.triggers,
			...(stored.triggerClauses && stored.triggerClauses.length > 0
				? { triggerClauses: stored.triggerClauses }
				: {}),
			steps: stored.steps,
			results: stored.results,
			...(stored.resultClauses && stored.resultClauses.length > 0
				? { resultClauses: stored.resultClauses }
				: {}),
		},
		updatedAt: stored.updatedAt,
		// Same predicate as the generation gate: an unchanged versionId means a
		// regenerate would return this exact overview.
		upToDate: Boolean(
			stored.workflowVersionId &&
				currentWorkflowVersionId &&
				stored.workflowVersionId === currentWorkflowVersionId,
		),
	};
}
