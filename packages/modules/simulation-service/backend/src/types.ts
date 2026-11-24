import type { GymManifest, LlmBackendConfig, MonitorEvent, Tenant } from '@n8n/ai-gym';
import type { IRun, IWorkflowBase, IWorkflowExecuteAdditionalData, INodeTypes } from 'n8n-workflow';

export interface UnsupportedNodeInfo {
	nodeName: string;
	nodeType: string;
	reason: string;
}

export interface MissingCredentialIssue {
	nodeName: string;
	nodeType: string;
	credentialType: string;
	credentialDisplayName: string;
	reason: 'missing' | 'not-configured';
}

export interface WorkflowSupportCheckResult {
	supported: boolean;
	unsupportedNodes: UnsupportedNodeInfo[];
	/** Enabled nodes missing a required credential (or referencing an unconfigured one). */
	missingCredentials: MissingCredentialIssue[];
	/** Distinct simulation-service vendor slugs needed by nodes in this workflow. */
	requiredVendors: string[];
}

export interface SimulationServiceSeedPayload {
	[key: string]: unknown;
}

export type SeedFieldType = 'string' | 'text' | 'boolean' | 'number' | 'select';

export interface SeedFieldOption {
	value: string;
	label: string;
}

export interface SimulationSeedField {
	key: string;
	label: string;
	type: SeedFieldType;
	required?: boolean;
	defaultValue?: string | number | boolean;
	placeholder?: string;
	options?: SeedFieldOption[];
}

export interface SimulationSeedCollection {
	key: string;
	label: string;
	singularLabel: string;
	description?: string;
	applyMode: 'seed-array' | 'seed-each' | 'seed-nested-array' | 'api-action';
	seedArrayKey?: string;
	seedWrapKey?: string;
	seedNestedPath?: string[];
	actionId?: string;
	fields: SimulationSeedField[];
}

export interface SimulationSeedSchema {
	description: string;
	settings: SimulationSeedField[];
	collections: SimulationSeedCollection[];
}

export interface SimulationVendorCapabilities {
	slug: string;
	hosts: string[];
	faultFlags: string[];
	seedSchema: SimulationSeedSchema;
}

export interface SimulateWorkflowOptions {
	workflowData: IWorkflowBase;
	/** Optional trigger / start node name. */
	startNode?: string;
	/** Optional destination node name for partial execution. */
	destinationNode?: string;
	/** Optional pinData overrides (e.g. trigger payloads). */
	pinData?: IWorkflowBase['pinData'];
	/**
	 * Optional vendor state seeds keyed by simulation-service vendor slug.
	 * Accepts either a single seed object or an array of seed payloads applied in order.
	 */
	seeds?: Record<string, SimulationServiceSeedPayload | SimulationServiceSeedPayload[]>;
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
	/** Structured monitor events recorded by the simulation service during the run. */
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
 * Runtime port supplied by the host (`packages/cli`) so the `simulation-service` module can execute
 * ephemeral workflows without depending on `packages/cli` internals.
 */
export abstract class SimulationServiceExecutionHostPort {
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

export interface SimulationServiceSession {
	readonly tenant: Tenant;
	readonly manifest: GymManifest;
	close(): Promise<void>;
}
