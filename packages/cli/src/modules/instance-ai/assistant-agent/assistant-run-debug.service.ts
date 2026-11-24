import { InstanceAiConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';
import {
	buildRunDebugLabel,
	createRunDebugStepHooks,
	RunDebugBuffer,
	type InstanceAiContext,
	type RunDebugRecord,
} from '@n8n/instance-ai';

import { SystemAgentThreadMetadataService } from '@/modules/agents/system-agents/system-agent-thread-metadata.service';

import { ASSISTANT_AGENT_ID } from './assistant-turn-options';

/**
 * In-memory per-step run debug buffer for Assistant agent turns.
 * Captures step prompts, tool calls and outputs when `N8N_INSTANCE_AI_RUN_DEBUG_ENABLED` is on.
 */
@Service()
export class AssistantRunDebugService {
	private readonly buffer = new RunDebugBuffer();

	constructor(
		private readonly instanceAiConfig: InstanceAiConfig,
		private readonly threadMetadata: SystemAgentThreadMetadataService,
	) {}

	isEnabled(): boolean {
		return this.instanceAiConfig.runDebugEnabled;
	}

	/** Create step hooks for a turn when run debug is enabled; returns `undefined` otherwise. */
	stepHooksForTurn(params: {
		runId: string;
		threadId: string;
		message?: string;
		resumeReason?: string;
	}) {
		if (!this.instanceAiConfig.runDebugEnabled) return undefined;
		this.buffer.ensure(
			params.runId,
			params.threadId,
			buildRunDebugLabel({ message: params.message, resumeReason: params.resumeReason }),
		);
		return createRunDebugStepHooks(this.buffer, {
			runId: params.runId,
			threadId: params.threadId,
		});
	}

	/** Create a workflow-code snapshot recorder for a turn when run debug is enabled; returns `undefined` otherwise. */
	workflowCodeRecorderForTurn(params: {
		runId: string;
		threadId: string;
	}): InstanceAiContext['recordWorkflowCodeSnapshot'] {
		if (!this.instanceAiConfig.runDebugEnabled) return undefined;
		return (snapshot) => {
			this.buffer.ensure(params.runId, params.threadId);
			this.buffer.recordWorkflowCode(params.runId, snapshot);
		};
	}

	async getRunDebug(user: User, runId: string): Promise<RunDebugRecord> {
		this.requireEnabled();
		const record = this.buffer.get(runId);
		if (!record) {
			throw new NotFoundError('Run debug record not found');
		}
		await this.threadMetadata.readThread(ASSISTANT_AGENT_ID, user, record.threadId);
		return record;
	}

	async listThreadDebugRuns(user: User, threadId: string) {
		this.requireEnabled();
		await this.threadMetadata.readThread(ASSISTANT_AGENT_ID, user, threadId);
		return this.buffer.listByThread(threadId).map((record: RunDebugRecord) => ({
			runId: record.runId,
			threadId: record.threadId,
			startedAt: record.startedAt,
			stepCount: record.steps.length,
			workflowCodeCount: record.workflowCode.length,
			label: record.label,
		}));
	}

	private requireEnabled(): void {
		if (!this.instanceAiConfig.runDebugEnabled) {
			throw new NotFoundError('Run debug is not enabled');
		}
	}
}
