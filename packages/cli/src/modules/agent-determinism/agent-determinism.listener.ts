import { Logger } from '@n8n/backend-common';
import { EventService, type EventMap } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { AGENT_LANGCHAIN_NODE_TYPE } from 'n8n-workflow';

import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import type { DeterminismSource } from './agent-determinism.contracts';
import { shouldAnalyze } from './analysis-trigger';
import { DeterminismSourceRepository } from './database/determinism-source.repository';
import { DeterminismAnalysisService } from './determinism-analysis.service';

const SKIPPED_WORKFLOW_MODES = new Set(['manual', 'evaluation']);

@Service()
export class AgentDeterminismListener {
	constructor(
		private readonly eventService: EventService,
		private readonly sourceRepository: DeterminismSourceRepository,
		private readonly agentRepository: AgentRepository,
		private readonly analysis: DeterminismAnalysisService,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
	) {
		this.logger = logger.scoped('agent-determinism');
	}

	init(): void {
		this.eventService.on('workflow-post-execute', async (event) => {
			await this.guard(async () => await this.onWorkflowRun(event));
		});
		this.eventService.on('agent-execution-finished', async (event) => {
			await this.guard(async () => await this.onAgentRun(event));
		});
	}

	private async onWorkflowRun({
		workflow,
		runData,
		projectId,
		userId,
	}: EventMap['workflow-post-execute']) {
		if (runData?.status !== 'success' || SKIPPED_WORKFLOW_MODES.has(runData.mode)) return;
		if (!projectId || !workflow.id || !workflow.versionId || workflow.meta?.generatedFrom) return;
		const agentNodes = workflow.nodes.filter((node) => node.type === AGENT_LANGCHAIN_NODE_TYPE);
		if (agentNodes.length !== 1) return;

		await this.countRun(
			{
				type: 'workflow',
				id: workflow.id,
				projectId,
				name: workflow.name,
				versionHash: workflow.versionId,
			},
			userId ?? null,
		);
	}

	private async onAgentRun({
		agentId,
		projectId,
		status,
		runType,
		userId,
	}: EventMap['agent-execution-finished']) {
		if (status !== 'success' || runType !== 'production') return;
		const agent = await this.agentRepository.findById(agentId);
		const versionHash = agent?.activeVersionId ?? agent?.versionId;
		if (!agent || !versionHash) return;

		await this.countRun(
			{ type: 'agent', id: agentId, projectId, name: agent.name, versionHash },
			userId,
		);
	}

	private async countRun(source: DeterminismSource, userId: string | null) {
		const count = await this.sourceRepository.recordSuccessfulRun(source);
		if (!this.instanceSettings.isLeader || !shouldAnalyze(count)) return;
		this.analysis.enqueue(source, userId);
	}

	private async guard(handler: () => Promise<void>) {
		try {
			await handler();
		} catch (error) {
			this.logger.warn('Counting a run for determinism analysis failed', {
				error: error instanceof Error ? error : String(error),
			});
		}
	}
}
