import type {
	CommandResult,
	SandboxProvider,
	WorkspaceFilesystem,
	WorkspaceSandbox,
} from '@n8n/agents/sandbox';

import type { KnowledgeConsumerScope } from './knowledge-consumer-scope';

/**
 * A sandbox the module mirrors knowledge files into: the subset of the agents
 * sandbox runtime handle that the module uses, so the agents module can return
 * its own handle as-is.
 */
export type KnowledgeSandboxHandle = {
	/** The mirror paths depend on the provider's home directory. */
	provider: SandboxProvider;
	/** Passed back to `executeCommand`. */
	sandbox: WorkspaceSandbox;
	/** The upload path: the mirror stages file writes, then finalizes them with a command. */
	filesystem: Pick<WorkspaceFilesystem, 'mkdir' | 'writeFile' | 'rmdir'>;
	/** Serializes mirror syncs per sandbox. */
	cacheKey: string;
};

/**
 * What the knowledge module needs from a consumer: a sandbox to mirror knowledge
 * files into, a way to run commands in it, and its warm-up and teardown. The
 * agents module implements it over its sandbox runtime, which keeps ownership of
 * sandbox ids and lifecycle settings.
 */
export interface KnowledgeSandboxProvider {
	/** Throws when the sandbox is off or the scope cannot form a storage path. */
	assertConfiguration(scope: KnowledgeConsumerScope): void;

	/** Starts or resumes the consumer's knowledge sandbox. Concurrent calls for one scope share one acquisition. */
	acquire(scope: KnowledgeConsumerScope): Promise<KnowledgeSandboxHandle>;

	/** Runs a shell command in an acquired sandbox. */
	executeCommand(
		sandbox: WorkspaceSandbox,
		command: string,
		timeoutMs: number,
	): Promise<CommandResult>;

	/** Boots the sandbox ahead of use, for example when the builder opens an agent. */
	warm(scope: KnowledgeConsumerScope): Promise<void>;

	/** Deletes the sandbox on the provider. Best effort; never throws. */
	destroy(scope: KnowledgeConsumerScope): Promise<void>;
}
