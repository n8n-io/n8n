import { computed, effectScope, reactive, watch } from 'vue';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import {
	CREDENTIAL_RULES,
	NODE_RULES,
	seedAccess,
} from '@/features/projectSettingsPrototype/data/access';
import { SEED_AUDIT_EVENTS } from '@/features/projectSettingsPrototype/data/audit';
import { credentialTypeById, nodeTypeById } from '@/features/projectSettingsPrototype/data/catalog';
import {
	CREDENTIAL_RESOLVERS,
	DEFAULT_QUEUE,
	INSTANCE_LIMITS,
	INSTANCE_RESOLVER_ID,
	INSTANCE_SPAN_ATTRIBUTES,
	INSTANCE_VAULTS,
	SELF_HEALING_ENABLED,
	TRACING,
	seedProjectLimits,
	seedProjectVaults,
	seedResolver,
	seedSelfHealing,
	seedSpanAttributes,
	seedUsage,
	seedWorkerPool,
	workerPoolById,
} from '@/features/projectSettingsPrototype/data/instance';
import { seedMembers } from '@/features/projectSettingsPrototype/data/projects';
import { formatNumber } from '@/features/projectSettingsPrototype/data/time';
import type {
	AuditCategory,
	AuditEvent,
	InstanceLimits,
	InstanceRule,
	Member,
	Project,
	ProjectAccess,
	ProjectIcon,
	ProjectLimits,
	ProjectRole,
	ProjectUsage,
	SelfHealingConfig,
	SpanAttribute,
	TracingConfig,
	Vault,
	VaultScope,
} from '@/features/projectSettingsPrototype/data/types';
import {
	CURRENT_USER_ID,
	fullName,
	roleLabel,
	userById,
} from '@/features/projectSettingsPrototype/data/users';
import { protoParams } from '@/features/projectSettingsPrototype/params';
import type { AccessAction } from './resolve';
import { currentMembership } from './session';

/** A setting that exists at both levels and that a project can set for itself. */
export type ScalingKey = 'access' | 'vaults' | 'resolver' | 'workerPool' | 'spanAttributes';

export const SCALING_KEYS: ScalingKey[] = [
	'access',
	'vaults',
	'resolver',
	'workerPool',
	'spanAttributes',
];

export type AccessKind = 'node' | 'credential';

export interface InstanceState {
	nodeRules: Record<string, InstanceRule>;
	credentialRules: Record<string, InstanceRule>;
	limits: InstanceLimits;
	vaults: Vault[];
	resolverId: string;
	/** The Assistant's workflow suggestions, which self-healing depends on. */
	selfHealingEnabled: boolean;
	tracing: TracingConfig;
	spanAttributes: SpanAttribute[];
	/** Whether projects may set each scaling setting for themselves. */
	allowProjects: Record<ScalingKey, boolean>;
}

export interface ProjectState {
	/** Without the current user, whose membership comes from `viewingAs`. */
	members: Member[];
	access: ProjectAccess;
	/** Set by instance admins. The project only reads them. */
	limits: ProjectLimits;
	usage: ProjectUsage;
	vaults: Vault[];
	resolverId: string | undefined;
	workerPoolId: string | undefined;
	spanAttributes: SpanAttribute[];
	selfHealing: SelfHealingConfig[];
}

const cloneVault = (vault: Vault): Vault => ({
	...vault,
	projectIds: [...vault.projectIds],
	secrets: vault.secrets.map((secret) => ({ ...secret })),
});

function seedInstance(): InstanceState {
	return {
		nodeRules: { ...NODE_RULES },
		credentialRules: { ...CREDENTIAL_RULES },
		limits: { ...INSTANCE_LIMITS },
		vaults: INSTANCE_VAULTS.map(cloneVault),
		resolverId: INSTANCE_RESOLVER_ID,
		selfHealingEnabled: SELF_HEALING_ENABLED,
		tracing: { ...TRACING },
		spanAttributes: INSTANCE_SPAN_ATTRIBUTES.map((attribute) => ({ ...attribute })),
		allowProjects: {
			access: true,
			vaults: true,
			resolver: true,
			workerPool: true,
			spanAttributes: true,
		},
	};
}

function seedProject(projectId: string): ProjectState {
	return {
		members: seedMembers(projectId),
		access: seedAccess(projectId),
		limits: seedProjectLimits(projectId),
		usage: seedUsage(projectId),
		vaults: seedProjectVaults(projectId),
		resolverId: seedResolver(projectId),
		workerPoolId: seedWorkerPool(projectId),
		spanAttributes: seedSpanAttributes(projectId),
		selfHealing: seedSelfHealing(projectId),
	};
}

/* ── Persistence ──────────────────────────────────────────────────────── */

const STATE_KEY = 'n8n-prototype.project-settings.state.v1';

interface SavedState {
	instance?: InstanceState;
	projects?: Record<string, ProjectState>;
	/** Only the events made in a session. Seeded events are rebuilt on load. */
	audit?: AuditEvent[];
}

function readSaved(): SavedState {
	try {
		const parsed: unknown = JSON.parse(window.localStorage.getItem(STATE_KEY) ?? '{}');
		return parsed && typeof parsed === 'object' ? (parsed as SavedState) : {};
	} catch {
		return {};
	}
}

const saved = typeof window === 'undefined' ? {} : readSaved();

const isSessionEvent = (event: AuditEvent) => event.id.startsWith('evt-new-');

export const store = reactive({
	instance: saved.instance ? { ...seedInstance(), ...saved.instance } : seedInstance(),
	/** Newest first. */
	audit: [...(saved.audit ?? []), ...SEED_AUDIT_EVENTS] as AuditEvent[],
});

/**
 * One reactive state per project, made the first time something reads it.
 * The map itself isn't reactive, so reading a project inside a computed
 * never writes to reactive state.
 */
const projectStates = new Map<string, ProjectState>();

let saveTimer: ReturnType<typeof setTimeout> | undefined;

function save() {
	try {
		const state: SavedState = {
			instance: store.instance,
			projects: Object.fromEntries(projectStates),
			audit: store.audit.filter(isSessionEvent),
		};
		window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
	} catch {
		// Storage can be full or blocked. The settings still work for the session.
	}
}

function scheduleSave() {
	clearTimeout(saveTimer);
	saveTimer = setTimeout(save, 150);
}

/** Detached, so a watcher made while a component renders outlives that component. */
const persistence = effectScope(true);

function persist(source: object) {
	persistence.run(() => watch(source, scheduleSave, { deep: true }));
}

persist(store);

const slug = (name: string) =>
	name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

/**
 * Fixtures are keyed by a slug of the project's name, so a project called
 * "Marketing" gets Marketing's seeded settings on any instance.
 */
export function seedKey(projectId: string): string {
	const name = useProjectsStore().myProjects.find((project) => project.id === projectId)?.name;
	return (name && slug(name)) || projectId;
}

export function projectState(projectId: string): ProjectState {
	let state = projectStates.get(projectId);
	if (!state) {
		state = reactive(saved.projects?.[projectId] ?? seedProject(seedKey(projectId)));
		projectStates.set(projectId, state);
		persist(state);
	}
	return state;
}

/** Back to the seeded settings: every project and the instance. */
export function resetStore() {
	clearTimeout(saveTimer);
	saved.projects = {};
	for (const [projectId, state] of projectStates) {
		Object.assign(state, seedProject(seedKey(projectId)));
	}
	store.instance = seedInstance();
	store.audit = [...SEED_AUDIT_EVENTS];
	try {
		window.localStorage.removeItem(STATE_KEY);
	} catch {
		// Nothing was stored.
	}
}

/* ── Projects ─────────────────────────────────────────────────────────── */

const FALLBACK_ICON: ProjectIcon = { type: 'icon', value: 'layers' };

/** The instance's real team projects, as many as the parameter allows. */
export const projects = computed<Project[]>(() =>
	useProjectsStore()
		.myProjects.filter((project) => project.type === 'team')
		.slice(0, Number(protoParams.projectCount))
		.map((project) => ({
			id: project.id,
			name: project.name ?? '',
			description: project.description ?? '',
			icon: (project.icon as ProjectIcon | null) ?? FALLBACK_ICON,
		})),
);

const projectsById = computed(
	() => new Map(projects.value.map((project) => [project.id, project])),
);

export function projectById(projectId: string): Project | undefined {
	return projectsById.value.get(projectId);
}

/** Every member, the current user first. */
export function membersOf(projectId: string): Member[] {
	return [currentMembership.value, ...projectState(projectId).members];
}

/* ── Audit log ────────────────────────────────────────────────────────── */

let nextId = 1;
const sessionId = Date.now().toString(36);
const newId = (prefix: string) => `${prefix}-new-${sessionId}-${nextId++}`;

function logEvent(category: AuditCategory, action: string, target: string, projectId?: string) {
	store.audit.unshift({
		id: newId('evt'),
		at: Date.now(),
		actorId: CURRENT_USER_ID,
		category,
		action,
		target,
		projectId,
	});
}

/** Seeded events name the fixture project, session events the real one. */
export function auditEventsFor(projectId: string): AuditEvent[] {
	const key = seedKey(projectId);
	return store.audit.filter((event) => event.projectId === projectId || event.projectId === key);
}

/* ── General ──────────────────────────────────────────────────────────── */

/**
 * The project itself is real: its name, icon, and description are saved by
 * n8n. The prototype only adds the change to the audit log.
 */
export function logProjectChange(
	projectId: string,
	before: Pick<Project, 'name' | 'description' | 'icon'>,
	after: Pick<Project, 'name' | 'description' | 'icon'>,
) {
	if (after.name !== before.name) logEvent('project', 'Renamed the project', after.name, projectId);
	if (after.description !== before.description) {
		logEvent('project', 'Changed the project description', after.name, projectId);
	}
	if (after.icon.type !== before.icon.type || after.icon.value !== before.icon.value) {
		logEvent('project', 'Changed the project icon', after.name, projectId);
	}
}

/** The project is gone, so the event belongs to the instance's log. */
export function logProjectDeleted(name: string) {
	logEvent('project', 'Deleted the project', name);
}

/* ── Members ──────────────────────────────────────────────────────────── */

const personName = (userId: string) => fullName(userById(userId));

export function addMembers(projectId: string, userIds: string[], role: ProjectRole) {
	const { members } = projectState(projectId);
	for (const userId of userIds) {
		if (members.some((member) => member.userId === userId)) continue;
		members.push({ userId, role });
		logEvent('members', 'Added a member', `${personName(userId)} as ${roleLabel(role)}`, projectId);
	}
}

export function setMemberRole(projectId: string, userId: string, role: ProjectRole) {
	const member = projectState(projectId).members.find((entry) => entry.userId === userId);
	if (!member || member.role === role) return;
	member.role = role;
	logEvent(
		'members',
		"Changed a member's role",
		`${personName(userId)} to ${roleLabel(role)}`,
		projectId,
	);
}

export function removeMember(projectId: string, userId: string) {
	const { members } = projectState(projectId);
	const index = members.findIndex((entry) => entry.userId === userId);
	if (index === -1) return;
	members.splice(index, 1);
	logEvent('members', 'Removed a member', personName(userId), projectId);
}

/* ── Node and credential access ───────────────────────────────────────── */

const typeName = (kind: AccessKind, typeId: string) =>
	(kind === 'node' ? nodeTypeById(typeId) : credentialTypeById(typeId))?.name ?? typeId;

export function instanceRule(kind: AccessKind, typeId: string): InstanceRule {
	const rules = kind === 'node' ? store.instance.nodeRules : store.instance.credentialRules;
	return rules[typeId] ?? 'allowed';
}

/** What the project itself said about a type, before the instance rule is applied. */
export function projectAccessFlags(projectId: string, kind: AccessKind, typeId: string) {
	const { access } = projectState(projectId);
	const restricted = kind === 'node' ? access.restrictedNodes : access.restrictedCredentials;
	const enabled = kind === 'node' ? access.enabledNodes : access.enabledCredentials;
	return { restricted: restricted.includes(typeId), enabled: enabled.includes(typeId) };
}

const ACCESS_EVENTS: Record<AccessAction, (kind: AccessKind) => string> = {
	restrict: (kind) => `Restricted a ${kind}`,
	'allow-again': (kind) => `Allowed a ${kind} again`,
	enable: (kind) => `Enabled a ${kind}`,
	disable: (kind) => `Disabled a ${kind}`,
};

const without = (list: string[], id: string) => {
	const index = list.indexOf(id);
	if (index !== -1) list.splice(index, 1);
};

const withId = (list: string[], id: string) => {
	if (!list.includes(id)) list.push(id);
};

export function applyAccessAction(
	projectId: string,
	kind: AccessKind,
	typeId: string,
	action: AccessAction,
) {
	const { access } = projectState(projectId);
	const restricted = kind === 'node' ? access.restrictedNodes : access.restrictedCredentials;
	const enabled = kind === 'node' ? access.enabledNodes : access.enabledCredentials;

	if (action === 'restrict') withId(restricted, typeId);
	if (action === 'allow-again') without(restricted, typeId);
	if (action === 'enable') withId(enabled, typeId);
	if (action === 'disable') without(enabled, typeId);
	logEvent('access', ACCESS_EVENTS[action](kind), typeName(kind, typeId), projectId);
}

const RULE_EVENTS: Record<InstanceRule, (kind: AccessKind) => string> = {
	allowed: (kind) => `Allowed a ${kind} in every project`,
	restricted: (kind) => `Restricted a ${kind} in every project`,
	'opt-in': (kind) => `Left a ${kind} for projects to enable`,
};

export function setInstanceRule(kind: AccessKind, typeId: string, rule: InstanceRule) {
	if (instanceRule(kind, typeId) === rule) return;
	const rules = kind === 'node' ? store.instance.nodeRules : store.instance.credentialRules;
	if (rule === 'allowed') delete rules[typeId];
	else rules[typeId] = rule;
	logEvent('access', RULE_EVENTS[rule](kind), typeName(kind, typeId));
}

/* ── Execution limits ─────────────────────────────────────────────────── */

const monthly = (value: number | null) =>
	value === null ? 'No limit' : `${formatNumber(value)} per month`;
const atOnce = (value: number | null) =>
	value === null ? 'No limit' : `${formatNumber(value)} at once`;

export function setInstanceLimits(next: InstanceLimits) {
	const current = store.instance.limits;
	if (next.monthlyExecutions !== current.monthlyExecutions) {
		logEvent('limits', 'Changed the instance execution limit', monthly(next.monthlyExecutions));
	}
	if (next.concurrency !== current.concurrency) {
		logEvent('limits', 'Changed the instance concurrency limit', atOnce(next.concurrency));
	}
	if (next.alertAtPercent !== current.alertAtPercent) {
		logEvent(
			'limits',
			'Changed the limit alert',
			next.alertAtPercent === null ? 'No alert' : `At ${next.alertAtPercent}%`,
		);
	}
	store.instance.limits = { ...next };
}

export function setProjectLimits(projectId: string, next: ProjectLimits) {
	const state = projectState(projectId);
	if (next.monthlyExecutions !== state.limits.monthlyExecutions) {
		logEvent(
			'limits',
			next.monthlyExecutions === null
				? 'Removed the execution limit'
				: 'Changed the execution limit',
			monthly(next.monthlyExecutions),
			projectId,
		);
	}
	if (next.concurrency !== state.limits.concurrency) {
		logEvent(
			'limits',
			next.concurrency === null ? 'Removed the concurrency limit' : 'Changed the concurrency limit',
			atOnce(next.concurrency),
			projectId,
		);
	}
	state.limits = { ...next };
}

/* ── External secrets ─────────────────────────────────────────────────── */

/** The instance's vaults this project can read, then the project's own. */
export function vaultsFor(projectId: string): Vault[] {
	const key = seedKey(projectId);
	const shared = store.instance.vaults.filter(
		(vault) =>
			vault.scope === 'everyone' ||
			vault.projectIds.includes(projectId) ||
			vault.projectIds.includes(key),
	);
	return [...shared, ...projectState(projectId).vaults];
}

export function addProjectVault(projectId: string, vault: { name: string; provider: string }) {
	projectState(projectId).vaults.push({
		id: newId('vault'),
		name: vault.name,
		provider: vault.provider,
		scope: 'project',
		projectIds: [projectId],
		secrets: [],
	});
	logEvent('secrets', 'Added a secrets vault', vault.name, projectId);
}

export function removeProjectVault(projectId: string, vaultId: string) {
	const { vaults } = projectState(projectId);
	const index = vaults.findIndex((vault) => vault.id === vaultId);
	if (index === -1) return;
	const [removed] = vaults.splice(index, 1);
	logEvent('secrets', 'Removed a secrets vault', removed.name, projectId);
}

export function setVaultSharing(vaultId: string, scope: VaultScope, projectIds: string[]) {
	const vault = store.instance.vaults.find((entry) => entry.id === vaultId);
	if (!vault) return;
	vault.scope = scope;
	vault.projectIds = scope === 'everyone' ? [] : [...projectIds];
	logEvent(
		'secrets',
		scope === 'everyone'
			? 'Shared a secrets vault with every project'
			: 'Changed which projects share a secrets vault',
		vault.name,
	);
}

const resolverName = (resolverId: string) =>
	CREDENTIAL_RESOLVERS.find((resolver) => resolver.id === resolverId)?.name ?? resolverId;

export function setProjectResolver(projectId: string, resolverId: string | undefined) {
	const state = projectState(projectId);
	if (state.resolverId === resolverId) return;
	state.resolverId = resolverId;
	if (resolverId === undefined) {
		logEvent(
			'secrets',
			'Reset the credential resolver to the instance',
			resolverName(store.instance.resolverId),
			projectId,
		);
	} else {
		logEvent('secrets', 'Set the credential resolver', resolverName(resolverId), projectId);
	}
}

export function setInstanceResolver(resolverId: string) {
	if (store.instance.resolverId === resolverId) return;
	store.instance.resolverId = resolverId;
	logEvent('secrets', 'Changed the default credential resolver', resolverName(resolverId));
}

/* ── Workers ──────────────────────────────────────────────────────────── */

export function setProjectWorkerPool(projectId: string, poolId: string | undefined) {
	const state = projectState(projectId);
	if (state.workerPoolId === poolId) return;
	state.workerPoolId = poolId;
	if (poolId === undefined) {
		logEvent('workers', 'Reset the worker pool to the instance', DEFAULT_QUEUE.name, projectId);
	} else {
		logEvent('workers', 'Set the worker pool', workerPoolById(poolId)?.name ?? poolId, projectId);
	}
}

/* ── OpenTelemetry ────────────────────────────────────────────────────── */

function logAttributeChanges(
	before: SpanAttribute[],
	after: SpanAttribute[],
	projectId: string | undefined,
) {
	const previous = new Map(before.map((attribute) => [attribute.id, attribute]));
	const kept = new Set(after.map((attribute) => attribute.id));
	for (const attribute of after) {
		const old = previous.get(attribute.id);
		if (!old) logEvent('tracing', 'Added a span attribute', attribute.key, projectId);
		else if (old.key !== attribute.key || old.value !== attribute.value) {
			logEvent('tracing', 'Changed a span attribute', attribute.key, projectId);
		}
	}
	for (const attribute of before) {
		if (!kept.has(attribute.id)) {
			logEvent('tracing', 'Removed a span attribute', attribute.key, projectId);
		}
	}
}

const cleanAttributes = (attributes: SpanAttribute[]): SpanAttribute[] =>
	attributes.map((attribute) => ({
		id: attribute.id,
		key: attribute.key.trim(),
		value: attribute.value.trim(),
	}));

export function setProjectSpanAttributes(projectId: string, attributes: SpanAttribute[]) {
	const state = projectState(projectId);
	const next = cleanAttributes(attributes);
	logAttributeChanges(state.spanAttributes, next, projectId);
	state.spanAttributes = next;
}

export function setInstanceSpanAttributes(attributes: SpanAttribute[]) {
	const next = cleanAttributes(attributes);
	logAttributeChanges(store.instance.spanAttributes, next, undefined);
	store.instance.spanAttributes = next;
}

export function newSpanAttribute(): SpanAttribute {
	return { id: newId('attr'), key: '', value: '' };
}

export function setTracing(next: TracingConfig) {
	store.instance.tracing = { ...next };
	logEvent('tracing', 'Changed the tracing configuration', next.serviceName);
}

/* ── Self-healing ─────────────────────────────────────────────────────── */

const scopeLabel = (config: Pick<SelfHealingConfig, 'scope' | 'workflowIds'>) => {
	if (config.scope === 'all') return 'All workflows';
	const count = config.workflowIds.length;
	return `${count} workflow${count === 1 ? '' : 's'}`;
};

export function setSelfHealingEnabled(enabled: boolean) {
	if (store.instance.selfHealingEnabled === enabled) return;
	store.instance.selfHealingEnabled = enabled;
	logEvent(
		'self-healing',
		enabled ? 'Turned on workflow suggestions' : 'Turned off workflow suggestions',
		'Assistant',
	);
}

export function saveSelfHealingConfig(
	projectId: string,
	config: Omit<SelfHealingConfig, 'id' | 'lastActivityAt'> & { id?: string },
) {
	const { selfHealing } = projectState(projectId);
	const existing = config.id ? selfHealing.find((entry) => entry.id === config.id) : undefined;
	if (existing) {
		Object.assign(existing, {
			scope: config.scope,
			workflowIds: [...config.workflowIds],
			reviewerIds: [...config.reviewerIds],
			enabled: config.enabled,
		});
		logEvent('self-healing', 'Edited a self-healing configuration', scopeLabel(config), projectId);
		return;
	}
	selfHealing.push({
		id: newId('sh'),
		scope: config.scope,
		workflowIds: [...config.workflowIds],
		reviewerIds: [...config.reviewerIds],
		enabled: config.enabled,
	});
	logEvent('self-healing', 'Added a self-healing configuration', scopeLabel(config), projectId);
}

export function setSelfHealingConfigEnabled(projectId: string, configId: string, enabled: boolean) {
	const config = projectState(projectId).selfHealing.find((entry) => entry.id === configId);
	if (!config || config.enabled === enabled) return;
	config.enabled = enabled;
	logEvent(
		'self-healing',
		enabled ? 'Turned on a self-healing configuration' : 'Turned off a self-healing configuration',
		scopeLabel(config),
		projectId,
	);
}

export function removeSelfHealingConfig(projectId: string, configId: string) {
	const { selfHealing } = projectState(projectId);
	const index = selfHealing.findIndex((entry) => entry.id === configId);
	if (index === -1) return;
	const [removed] = selfHealing.splice(index, 1);
	logEvent('self-healing', 'Removed a self-healing configuration', scopeLabel(removed), projectId);
}

/* ── Overrides ────────────────────────────────────────────────────────── */

/** How the audit log and the instance pages name each scaling setting. */
export const SCALING_LABELS: Record<ScalingKey, string> = {
	access: 'Node and credential access',
	vaults: 'Secrets vaults',
	resolver: 'Credential resolver',
	workerPool: 'Worker pool',
	spanAttributes: 'Span attributes',
};

const SCALING_CATEGORIES: Record<ScalingKey, AuditCategory> = {
	access: 'access',
	vaults: 'secrets',
	resolver: 'secrets',
	workerPool: 'workers',
	spanAttributes: 'tracing',
};

/** Whether the project has set this for itself, whatever the instance allows. */
function hasOwn(projectId: string, key: ScalingKey): boolean {
	const state = projectState(projectId);
	switch (key) {
		case 'access':
			return (
				state.access.restrictedNodes.length +
					state.access.enabledNodes.length +
					state.access.restrictedCredentials.length +
					state.access.enabledCredentials.length >
				0
			);
		case 'vaults':
			return state.vaults.length > 0;
		case 'resolver':
			return state.resolverId !== undefined;
		case 'workerPool':
			return state.workerPoolId !== undefined;
		case 'spanAttributes':
			return state.spanAttributes.length > 0;
	}
}

/** The scaling settings this project sets for itself. */
export function projectOverrides(projectId: string): ScalingKey[] {
	return SCALING_KEYS.filter((key) => hasOwn(projectId, key));
}

export function overrideCount(projectId: string): number {
	return projectOverrides(projectId).length;
}

/** The projects that set this for themselves, in sidebar order. */
export function projectsOverriding(key: ScalingKey): Project[] {
	return projects.value.filter((project) => hasOwn(project.id, key));
}

function clearOwn(projectId: string, key: ScalingKey) {
	const state = projectState(projectId);
	switch (key) {
		case 'access':
			state.access = {
				restrictedNodes: [],
				enabledNodes: [],
				restrictedCredentials: [],
				enabledCredentials: [],
			};
			break;
		case 'vaults':
			state.vaults = [];
			break;
		case 'resolver':
			state.resolverId = undefined;
			break;
		case 'workerPool':
			state.workerPoolId = undefined;
			break;
		case 'spanAttributes':
			state.spanAttributes = [];
			break;
	}
}

/**
 * Lets projects set a scaling setting, or stops them. Stopping them returns
 * every project to the instance setting, which is why the switch confirms.
 */
export function setAllowProjects(key: ScalingKey, allow: boolean) {
	if (store.instance.allowProjects[key] === allow) return;
	store.instance.allowProjects[key] = allow;
	if (!allow) {
		for (const project of projectsOverriding(key)) clearOwn(project.id, key);
	}
	logEvent(
		SCALING_CATEGORIES[key],
		allow ? 'Let projects set their own' : 'Stopped projects from setting their own',
		SCALING_LABELS[key],
	);
}
