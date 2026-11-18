export type ProjectRole =
	| 'project:admin'
	| 'project:editor'
	| 'project:viewer'
	| `custom:${string}`;

export interface User {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	instanceRole: 'owner' | 'admin' | 'member';
}

export interface ProjectIcon {
	type: 'icon' | 'emoji';
	value: string;
}

export interface Project {
	id: string;
	name: string;
	description: string;
	icon: ProjectIcon;
}

export interface Member {
	userId: string;
	role: ProjectRole;
}

export interface RoleDef {
	id: ProjectRole;
	label: string;
	description: string;
	custom: boolean;
}

/** An icon file from the n8n catalog, or a design system glyph for types without one. */
export interface CatalogIcon {
	file?: string;
	darkFile?: string;
	glyph?: string;
}

export interface NodeType {
	id: string;
	name: string;
	icon: CatalogIcon;
	category: 'Apps' | 'Core' | 'AI' | 'Data' | 'Developer tools';
}

export interface CredentialType {
	id: string;
	name: string;
	icon: CatalogIcon;
}

export interface Workflow {
	id: string;
	projectId: string;
	name: string;
	active: boolean;
	updatedAt: number;
	createdAt: number;
	nodeTypeIds: string[];
}

export interface Credential {
	id: string;
	projectId: string;
	name: string;
	typeId: string;
	updatedAt: number;
	createdAt: number;
}

export type ExecutionStatus = 'success' | 'error' | 'running' | 'waiting' | 'canceled';

export interface Execution {
	id: string;
	projectId: string;
	workflowId: string;
	workflowName: string;
	status: ExecutionStatus;
	startedAt: number;
	runTimeMs: number;
}

export interface Variable {
	id: string;
	key: string;
	value: string;
}

export interface DataTable {
	id: string;
	name: string;
	rows: number;
	columns: number;
	updatedAt: number;
}

export interface VaultSecret {
	name: string;
	usedInCredentials: number;
}

/**
 * `everyone`: the instance shares it with every project.
 * `shared`: the instance shares it with the listed projects.
 * `project`: added inside one project.
 */
export type VaultScope = 'everyone' | 'shared' | 'project';

export interface VaultProvider {
	id: string;
	name: string;
	/** Path to n8n's own provider image. */
	image: string;
}

export interface Vault {
	id: string;
	name: string;
	/** A `VaultProvider` id. */
	provider: string;
	scope: VaultScope;
	projectIds: string[];
	secrets: VaultSecret[];
}

/**
 * What the instance says about a node or credential type.
 * `opt-in`: off until a project enables it.
 */
export type InstanceRule = 'allowed' | 'restricted' | 'opt-in';

/** What one project changed, on top of the instance rules. */
export interface ProjectAccess {
	restrictedNodes: string[];
	enabledNodes: string[];
	restrictedCredentials: string[];
	enabledCredentials: string[];
}

export interface WorkerPool {
	id: string;
	name: string;
	description: string;
	workersOnline: number;
	workersTotal: number;
	runningExecutions: number;
}

export interface CredentialResolverDef {
	id: string;
	name: string;
	type: string;
	updatedAt: number;
}

export interface SpanAttribute {
	id: string;
	key: string;
	value: string;
}

export interface SelfHealingConfig {
	id: string;
	scope: 'all' | 'selected';
	workflowIds: string[];
	reviewerIds: string[];
	lastActivityAt?: number;
	enabled: boolean;
}

/** The instance's tracing settings, as on master's OpenTelemetry page. */
export interface TracingConfig {
	enabled: boolean;
	protocol: 'http/protobuf' | 'grpc';
	endpoint: string;
	serviceName: string;
	/** From 0 to 1. */
	sampleRate: number;
	includeNodeSpans: boolean;
	productionOnly: boolean;
}

export interface InstanceLimits {
	/** Production executions every project together may run per calendar month. `null` is no limit. */
	monthlyExecutions: number | null;
	/** Production executions the instance runs at once. `null` is no limit. */
	concurrency: number | null;
	/** Instance admins get an email at this share of a monthly limit. `null` sends none. */
	alertAtPercent: number | null;
}

/** Set by instance admins for one project. A project can't change its own. */
export interface ProjectLimits {
	/** Executions allowed per calendar month. `null` follows the instance-wide limit. */
	monthlyExecutions: number | null;
	/** Production executions that may run at once. `null` follows the instance. */
	concurrency: number | null;
}

export interface ProjectUsage {
	executionsThisMonth: number;
	runningNow: number;
}

export type AuditCategory =
	| 'members'
	| 'access'
	| 'secrets'
	| 'workers'
	| 'tracing'
	| 'self-healing'
	| 'project'
	| 'limits';

export interface AuditEvent {
	id: string;
	at: number;
	actorId: string;
	category: AuditCategory;
	/** Past tense, sentence case: "Restricted a node". */
	action: string;
	/** What it was done to: "Discord". */
	target: string;
	/** Missing for instance-level events. */
	projectId?: string;
}
