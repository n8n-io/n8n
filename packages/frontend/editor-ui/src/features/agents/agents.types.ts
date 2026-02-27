export type AgentAvatar =
	| { type: 'emoji'; value: string }
	| { type: 'image'; value: string }
	| { type: 'initials'; value: string };

export interface AgentNode {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	role: string;
	avatar: AgentAvatar;
	status: 'idle' | 'active' | 'busy';
	position: { x: number; y: number };
	zoneId: string | null;
	agentAccessLevel: 'external' | 'internal' | 'closed' | null;
	workflowCount: number;
	tasksCompleted: number;
	lastActive: string;
	resourceUsage: number;
}

export interface ExternalAgentNode extends AgentNode {
	external: true;
	remoteUrl: string;
	remoteAgentId: string;
	apiKey: string;
	skills: Array<{ name: string; description?: string }>;
	remoteCapabilities: { streaming?: boolean; multiTurn?: boolean };
	requiredCredentials: Array<{ type: string; description: string }>;
	credentialMappings: Record<string, string>;
	registrationId?: string;
}

export function isExternalAgent(agent: AgentNode): agent is ExternalAgentNode {
	return 'external' in agent && (agent as ExternalAgentNode).external === true;
}

export interface UserResponse {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	type?: string;
	avatar?: string | null;
	description?: string | null;
	agentAccessLevel?: 'external' | 'internal' | 'closed' | null;
	apiKey?: string;
}

export interface ZoneLayout {
	projectId: string;
	name: string;
	icon: { type: 'icon'; value: string } | { type: 'emoji'; value: string } | null;
	memberCount: number;
	rect: { x: number; y: number; width: number; height: number };
	colorIndex: number;
}

export interface ConnectionLine {
	id: string;
	fromAgentId: string;
	toAgentId: string;
}

export interface AgentCapabilitiesResponse {
	agentId: string;
	agentName: string;
	description?: string | null;
	agentAccessLevel?: 'external' | 'internal' | 'closed' | null;
	llmConfigured: boolean;
	projects: Array<{ id: string; name: string }>;
	workflows: Array<{ id: string; name: string; active: boolean }>;
	credentials: Array<{ id: string; name: string; type: string }>;
}

export interface ExternalAgentRegistration {
	id: string;
	name: string;
	description: string | null;
	remoteUrl: string;
	remoteAgentId: string;
	credentialId: string | null;
	remoteCapabilities: { streaming?: boolean; multiTurn?: boolean } | null;
	skills: Array<{ name: string; description?: string }> | null;
	requiredCredentials: Array<{ type: string; description: string }> | null;
	credentialMappings: Record<string, string> | null;
	createdAt: string;
	updatedAt: string;
}

export interface AgentTaskDispatchResponse {
	status: 'dispatched' | 'completed' | 'error';
	summary?: string;
	steps?: Array<{ action: string; workflowName?: string; toAgent?: string; result?: string }>;
	message?: string;
}

// SSE streaming event types
export interface StreamStepEvent {
	type: 'step';
	action: string;
	workflowName?: string;
	toAgent?: string;
	external?: boolean;
}

export interface StreamObservationEvent {
	type: 'observation';
	result?: string;
	error?: string;
	toAgent?: string;
}

export interface StreamDoneEvent {
	type: 'done';
	summary: string;
}

export type StreamEvent = StreamStepEvent | StreamObservationEvent | StreamDoneEvent;

export interface LiveStep {
	action: string;
	workflowName?: string;
	toAgent?: string;
	external?: boolean;
	result?: string;
	error?: string;
	status: 'running' | 'success' | 'failed' | 'error';
}
