import type { GymManifest, LlmBackendConfig, MonitorEvent, Tenant } from '@n8n/ai-gym';
import type { IRun, IWorkflowBase, IWorkflowExecuteAdditionalData, INodeTypes } from 'n8n-workflow';

export interface UnsupportedNodeInfo {
	nodeName: string;
	nodeType: string;
	reason: string;
}

export interface WorkflowSupportCheckResult {
	supported: boolean;
	unsupportedNodes: UnsupportedNodeInfo[];
	/** Distinct ai-gym vendor slugs needed by nodes in this workflow. */
	requiredVendors: string[];
}

export interface SimulateWorkflowOptions {
	workflowData: IWorkflowBase;
	/** Optional trigger / start node name. */
	startNode?: string;
	/** Optional destination node name for partial execution. */
	destinationNode?: string;
	/** Optional pinData overrides (e.g. trigger payloads). */
	pinData?: IWorkflowBase['pinData'];
	/** Optional vendor state seeds keyed by ai-gym vendor slug. */
	seeds?: Record<string, Record<string, unknown>>;
	/** Optional fault flags keyed by fault name (e.g. `slack.rate_limit`) -> count (`-1` = always). */
	faults?: Record<string, number>;
	/** Optional LLM backend override for this simulation tenant. */
	llmBackend?: LlmBackendConfig;
	/** Optional pushRef for live canvas streaming of the ephemeral run. */
	pushRef?: string;
	/** Optional user id for building execution additionalData. */
	userId?: string;
	/** Optional timeout in milliseconds. */
	timeoutMs?: number;
	/** Optional seed for deterministic PRNG. */
	seed?: number | bigint;
}

export interface SimulationResult {
	status: 'success' | 'error' | 'crashed';
	runData: IRun;
	/** Structured monitor events recorded by ai-gym during the run. */
	events: MonitorEvent[];
	/** Final simulated vendor state snapshots keyed by vendor slug. */
	vendorStates: Record<string, Record<string, unknown>>;
	/** Vendor slugs exercised by this workflow. */
	vendorsUsed: string[];
	/** Duration of the simulated run in milliseconds. */
	durationMs: number;
	/** Error message if the workflow errored. */
	error?: string;
}

/**
 * Runtime port supplied by the host (`packages/cli`) so the `ai-gym` module can execute
 * ephemeral workflows without depending on `packages/cli` internals.
 */
export abstract class AiGymExecutionHostPort {
	abstract getNodeTypes(): INodeTypes;

	abstract getBaseAdditionalData(params: {
		workflowData: IWorkflowBase;
		userId?: string;
		pushRef?: string;
	}): Promise<IWorkflowExecuteAdditionalData>;

	abstract loadWorkflowForUser(params: {
		workflowId: string;
		userId: string;
	}): Promise<IWorkflowBase | undefined>;
}

export interface AiGymSession {
	readonly tenant: Tenant;
	readonly manifest: GymManifest;
	close(): Promise<void>;
}
