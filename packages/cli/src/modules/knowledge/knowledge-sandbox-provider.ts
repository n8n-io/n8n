import type {
	CommandResult,
	SandboxProvider,
	WorkspaceFilesystem,
	WorkspaceSandbox,
} from '@n8n/agents/sandbox';

import type { KnowledgeConsumerScope } from './knowledge-consumer-scope';

/**
 * A sandbox the module mirrors knowledge files into. This is the subset of the
 * agents runtime handle that the mirror uses, so the agents adapter returns its
 * own handle as-is.
 */
export interface KnowledgeSandboxHandle {
	/** The mirror paths depend on the provider's home directory. */
	provider: SandboxProvider;
	/** Passed back to `executeCommand`. */
	sandbox: WorkspaceSandbox;
	/** The upload path: the mirror stages file writes, then finalizes them with a command. */
	filesystem: Pick<WorkspaceFilesystem, 'mkdir' | 'writeFile' | 'rmdir'>;
	/** Serializes mirror syncs per sandbox. */
	cacheKey: string;
}

/**
 * What the knowledge module needs from a consumer: exactly the sandbox calls the
 * mirror service makes today, plus `warm` and `destroy`.
 * WIP Note: P1 sandbox inversion can shrink this interface to the scope type.
 *
 * The agents module implements it over its sandbox runtime. Sandbox ids and
 * lifecycle settings stay with that implementation, unchanged.
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
