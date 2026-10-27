import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { InstanceAiContext, SandboxConfig } from '@n8n/instance-ai';
import type { Workspace } from '@n8n/agents';
import { ErrorReporter } from 'n8n-core';

import type {
	SystemAgentWorkspaceDestroyScope,
	SystemAgentWorkspaceScope,
	SystemAgentWorkspaceSource,
} from '@/modules/agents/system-agents/system-agent.types';
import { AiService } from '@/services/ai.service';

import { InstanceAiSettingsService } from '../instance-ai-settings.service';
import { InstanceAiSandboxService } from '../sandbox';

/**
 * The Assistant sandbox of one turn. Getting the lease does not start the
 * sandbox, but with the AI proxy it fetches the sandbox config from the AI service.
 */
export interface AssistantSandboxLease {
	config: SandboxConfig;
	threadId: string;
	user: User;
}

/**
 * Supplies the Assistant sandbox to the Agents runtime. Each thread gets one
 * sandbox with a name derived from the thread id. The sandbox starts on first
 * use, and a later turn on any main reattaches it by name.
 */
@Service()
export class AssistantSandboxWorkspaceSource
	implements SystemAgentWorkspaceSource<AssistantSandboxLease>
{
	private readonly sandboxService: InstanceAiSandboxService;

	/**
	 * Threads with a turn on this main. The sandbox cache keeps their entries
	 * while the turn runs. The remote sandbox does not depend on it.
	 */
	private readonly activeThreads = new Set<string>();

	constructor(
		logger: Logger,
		globalConfig: GlobalConfig,
		errorReporter: ErrorReporter,
		aiService: AiService,
		private readonly settingsService: InstanceAiSettingsService,
	) {
		this.sandboxService = new InstanceAiSandboxService({
			config: globalConfig.instanceAi,
			logger: logger.scoped('instance-ai'),
			errorReporter,
			runState: {
				getActiveRunId: (threadId) => (this.activeThreads.has(threadId) ? threadId : undefined),
				hasSuspendedRun: () => false,
			},
			backgroundTasks: { getRunningTasks: () => [] },
			settingsService,
			aiService,
		});
	}

	async acquire({
		threadId,
		user,
	}: SystemAgentWorkspaceScope): Promise<AssistantSandboxLease | undefined> {
		if (!this.settingsService.getSandboxStatus().workflowBuilderAvailable) return undefined;
		const config = await this.sandboxService.resolveSandboxConfig(user);
		if (!config.enabled) return undefined;
		this.activeThreads.add(threadId);
		return { config, threadId, user };
	}

	async release({ threadId }: SystemAgentWorkspaceScope): Promise<void> {
		this.activeThreads.delete(threadId);
	}

	async destroy({ threadId, userId }: SystemAgentWorkspaceDestroyScope): Promise<void> {
		await this.sandboxService.destroySandbox(threadId, 'thread_cleanup', userId);
	}

	/** The sandbox workspace of the lease, after the one-time Assistant workspace setup. */
	async getWorkspace(
		lease: AssistantSandboxLease,
		context: InstanceAiContext,
	): Promise<Workspace | undefined> {
		const entry = await this.sandboxService.getOrCreateWorkspace(
			lease.threadId,
			lease.user,
			context,
		);
		return entry?.workspace;
	}
}
