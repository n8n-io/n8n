import type { ObservationLogObserverMemory, Workspace } from '@n8n/agents';
import type {
	InstanceAiBuildMode,
	InstanceAiPromptConfiguration,
	InstanceAiSetupItem,
} from '@n8n/api-types';
import type {
	CreateInstanceAgentOptions,
	DomainAccessTracker,
	InstanceAiContext,
	InstanceAiEventBus,
	ManagedBackgroundTask,
	OrchestrationContext,
	SandboxConfig,
} from '@n8n/instance-ai';

import type { TypeORMAgentMemory } from '../storage/typeorm-agent-memory';

/** The thread memory reads that the turn setup needs. */
export type AssistantTurnMemory = ObservationLogObserverMemory &
	Pick<TypeORMAgentMemory, 'getThread' | 'getThreadProjectId'>;

/** Turn settings that the runtime keeps for one thread between turns. */
export interface AssistantTurnState {
	getBuildMode(): InstanceAiBuildMode | undefined;
	setBuildMode(mode: InstanceAiBuildMode): void;
	getPromptVersion(): string | undefined;
	setPromptConfiguration(configuration: InstanceAiPromptConfiguration): void;
	setSetupPanelEnabled(enabled: boolean): void;
	/** Whether the client renders the Browser Use entry. */
	getBrowserUseAvailable(): boolean | undefined;
	/** The observer threshold that the thread sets, if any. */
	getObserverThresholdTokens(): number | undefined;
}

/**
 * What the shared turn setup needs from the runtime that runs the turn. The
 * runtime builds one for each run, bound to its thread and run.
 *
 * Exists while the current Assistant runtime and Assistant v2 run side by
 * side. Inline it into the v2 provider when the current runtime is removed.
 */
export interface AssistantTurnRuntime
	extends Pick<
			OrchestrationContext,
			'touchRun' | 'cancelBackgroundTask' | 'sendCorrectionToTask' | 'touchBackgroundTask'
		>,
		Pick<
			InstanceAiContext,
			| 'browserCredentialSetup'
			| 'onArtifactChanged'
			| 'recordWorkflowCodeSnapshot'
			| 'markWorkflowSetupHandled'
		>,
		Pick<CreateInstanceAgentOptions, 'checkpointStore' | 'onMemoryTaskEvent'> {
	memory: AssistantTurnMemory;
	/** The memory resource that owns the thread. */
	resourceId: string;
	eventBus: InstanceAiEventBus;
	turnState: AssistantTurnState;
	/** Per-user "always allow" grants on the thread. */
	sessionGrants: {
		load(): Promise<Set<string>>;
		grant(key: string): Promise<void>;
		revoke(key: string): Promise<void>;
	};
	/** Receives the domain-access tracker that the setup creates for this run. */
	onDomainAccessTracker(tracker: DomainAccessTracker): void;
	/** The thread's persisted setup-panel snapshots, oldest first. */
	readSetupItemsSnapshots(): Promise<Array<{ workflowId: string; items: InstanceAiSetupItem[] }>>;
	/**
	 * Shows the thread's workflow tasks again after the workflow loop changed.
	 * Without it, the workflow loop state is stored but the checklist is not updated.
	 */
	syncWorkflowTasks?(): Promise<void>;
	sandbox: {
		resolveConfig(): Promise<SandboxConfig>;
		getOrCreateWorkspace(context: InstanceAiContext): Promise<Workspace | undefined>;
	};
	/** Detached background tasks of the thread that still run. */
	getRunningBackgroundTasks?(): ManagedBackgroundTask[];
}
