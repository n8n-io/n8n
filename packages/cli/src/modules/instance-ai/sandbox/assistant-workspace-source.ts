import { getPromptWorkspaceRoot } from '@n8n/agents/sandbox';
import type { User } from '@n8n/db';
import type { InstanceAiContext, SandboxConfig } from '@n8n/instance-ai';

import type {
	SystemAgentTurnOutcome,
	SystemAgentWorkspaceScope,
	SystemAgentWorkspaceSource,
} from '../../agents/system-agents/system-agent.types';
import type { InstanceAiSandboxService, RuntimeSandboxEntry } from './instance-ai-sandbox.service';

/**
 * The Assistant sandbox of one turn. Getting the lease makes no remote calls:
 * the sandbox is created or reattached on the first getter call.
 */
export interface AssistantSandboxLease {
	/** The sandbox root that the system prompt names. */
	workspaceRoot: string;
	/** The thread sandbox and workspace, without the Assistant workspace setup. */
	getEntry(): Promise<RuntimeSandboxEntry | undefined>;
	/** The thread sandbox and workspace, after the one-time Assistant workspace setup. */
	getSetupEntry(context: InstanceAiContext): Promise<RuntimeSandboxEntry | undefined>;
}

/**
 * Supplies the Assistant's own sandbox to the Agents runtime. The sandbox keeps
 * the Assistant lifecycle: one sandbox per thread with a name derived from the
 * thread id, started from the builder snapshot, stopped by the provider soon
 * after use, and reattached by name on a later turn on any main.
 */
export class AssistantSandboxWorkspaceSource
	implements SystemAgentWorkspaceSource<AssistantSandboxLease>
{
	constructor(
		private readonly sandboxService: InstanceAiSandboxService,
		private readonly options: {
			/** Whether the instance can run the sandboxed workflow builder. */
			isAvailable: () => boolean;
			resolveConfig: (user: User, threadId: string) => Promise<SandboxConfig>;
		},
	) {}

	async acquire({
		threadId,
		user,
	}: SystemAgentWorkspaceScope): Promise<AssistantSandboxLease | undefined> {
		if (!this.options.isAvailable()) return undefined;
		const config = await this.options.resolveConfig(user, threadId);
		if (!config.enabled) return undefined;

		let entryPromise: Promise<RuntimeSandboxEntry | undefined> | undefined;
		return {
			workspaceRoot: getPromptWorkspaceRoot(config.provider),
			getEntry: async () => {
				entryPromise ??= this.sandboxService
					.getOrCreateWorkspaceEntry(threadId, user)
					.catch((error: unknown) => {
						entryPromise = undefined;
						throw error;
					});
				return await entryPromise;
			},
			getSetupEntry: async (context) =>
				await this.sandboxService.getOrCreateWorkspace(threadId, user, context),
		};
	}

	async release(
		{ threadId }: SystemAgentWorkspaceScope,
		_lease: AssistantSandboxLease,
		outcome: SystemAgentTurnOutcome,
	): Promise<void> {
		// A suspended turn can wait a long time for the user. The provider stops or
		// deletes an idle sandbox, so the cached handle can go stale. Drop it: the
		// resume reattaches by name, or creates a new sandbox.
		if (outcome.status === 'suspended') {
			this.sandboxService.forgetSandbox(threadId, 'turn_suspended');
		}
	}

	async destroy({ threadId, userId }: { threadId: string; userId?: string }): Promise<void> {
		await this.sandboxService.destroySandbox(threadId, 'thread_cleanup', userId);
	}
}
