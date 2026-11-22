import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';
import type { INode, IRun, IWorkflowBase } from 'n8n-workflow';

export interface UnsupportedNodeInfo {
	nodeName: string;
	nodeType: string;
	reason: string;
}

export interface MissingCredentialInfo {
	nodeName: string;
	nodeType: string;
	credentialType: string;
	credentialDisplayName: string;
	reason: 'missing' | 'not-configured';
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

export interface AvailableVendorInfo {
	slug: string;
	hosts: string[];
	faultFlags: string[];
	seedSchema?: SimulationSeedSchema;
}

export interface WorkflowSimulationSupportResponse {
	supported: boolean;
	unsupportedNodes: UnsupportedNodeInfo[];
	missingCredentials: MissingCredentialInfo[];
	requiredVendors: string[];
	availableVendors: AvailableVendorInfo[];
}

export interface SimulationMonitorEvent {
	seq?: number;
	ts?: string;
	vendor?: string;
	event?: string;
	method?: string;
	path?: string;
	status?: number;
	[key: string]: unknown;
}

export interface WorkflowSimulationResponse {
	status: 'success' | 'error' | 'crashed';
	runData: IRun;
	events: SimulationMonitorEvent[];
	vendorStates: Record<string, Record<string, unknown>>;
	vendorsUsed: string[];
	durationMs: number;
	error?: string;
}

export interface SimulateWorkflowRequestPayload {
	startNode?: string;
	destinationNode?: string;
	pinData?: IWorkflowBase['pinData'];
	seeds?: Record<string, Record<string, unknown> | Array<Record<string, unknown>>>;
	faults?: Record<string, number>;
	timeoutMs?: number;
	workflowData?: Pick<
		IWorkflowBase,
		'nodes' | 'connections' | 'pinData' | 'settings' | 'staticData'
	>;
}

export async function checkWorkflowSimulationSupport(
	context: IRestApiContext,
	workflowId: string,
	nodes: INode[],
): Promise<WorkflowSimulationSupportResponse> {
	return await makeRestApiRequest<WorkflowSimulationSupportResponse>(
		context,
		'POST',
		`/workflows/${workflowId}/simulate/support`,
		{ nodes },
	);
}

export async function runWorkflowSimulation(
	context: IRestApiContext,
	workflowId: string,
	payload: SimulateWorkflowRequestPayload,
): Promise<WorkflowSimulationResponse> {
	return await makeRestApiRequest<WorkflowSimulationResponse>(
		context,
		'POST',
		`/workflows/${workflowId}/simulate`,
		payload,
	);
}
