import type { PermissionMode, ToolGroup } from './config';
import { isProtectedSettingsPath, TOOL_GROUP_DEFINITIONS } from './config';
import type { SettingsStore } from './settings-store';

/**
 * Holds all session-scoped state for a single gateway connection.
 *
 * Tool group permission modes and the working directory are mutable at connect
 * time (via the confirmConnect prompt) but are never written back to the
 * settings file. Only alwaysAllow / alwaysDeny resource rules persist across
 * sessions, via delegation to SettingsStore.
 */
export class GatewaySession {
	private _dir: string;
	private _permissions: Record<ToolGroup, PermissionMode>;
	private readonly sessionAllows: Map<ToolGroup, Set<string>> = new Map();

	constructor(
		defaults: { permissions: Record<ToolGroup, PermissionMode>; dir: string },
		private readonly settingsStore: SettingsStore,
	) {
		this._permissions = { ...defaults.permissions };
		this._dir = defaults.dir;
	}

	// ---------------------------------------------------------------------------
	// Mutable session settings
	// ---------------------------------------------------------------------------

	setPermissions(p: Record<ToolGroup, PermissionMode>): void {
		this._permissions = { ...p };
	}

	setDir(dir: string): void {
		this._dir = dir;
	}

	// ---------------------------------------------------------------------------
	// Read session settings
	// ---------------------------------------------------------------------------

	get dir(): string {
		return this._dir;
	}

	/** Return a snapshot of the current session permission modes. */
	getAllPermissions(): Record<ToolGroup, PermissionMode> {
		return { ...this._permissions };
	}

	/**
	 * Return the effective permission mode for a tool group.
	 * Enforces the spec constraint: filesystemRead=deny forces filesystemWrite=deny.
	 */
	getGroupMode(toolGroup: ToolGroup): PermissionMode {
		if (toolGroup === 'filesystemWrite' && this._permissions['filesystemRead'] === 'deny') {
			return 'deny';
		}
		return this._permissions[toolGroup] ?? 'ask';
	}

	// ---------------------------------------------------------------------------
	// Permission check
	// ---------------------------------------------------------------------------

	/**
	 * Check the effective permission for a resource.
	 * Evaluation order:
	 *  1. Persistent deny list  → 'deny'  (takes absolute priority even in Allow mode)
	 *  2. Persistent allow list → 'allow'
	 *  3. Session allow set     → 'allow'
	 *  4. Group mode            → via getGroupMode() (includes cross-group constraints)
	 */
	check(toolGroup: ToolGroup, resource: string): PermissionMode {
		// Self-protection: prevent tools from accessing the gateway settings directory
		if (
			(toolGroup === 'filesystemWrite' || toolGroup === 'filesystemRead') &&
			isProtectedSettingsPath(resource)
		) {
			return 'deny';
		}

		const rp = this.settingsStore.getResourcePermissions(toolGroup);
		if (rp.deny.includes(resource)) return 'deny';
		if (rp.allow.includes(resource)) return 'allow';
		if (this.hasSessionAllow(toolGroup, resource)) return 'allow';
		return this.getGroupMode(toolGroup);
	}

	// ---------------------------------------------------------------------------
	// Session-scoped allow rules
	// ---------------------------------------------------------------------------

	allowForSession(toolGroup: ToolGroup, resource: string): void {
		let set = this.sessionAllows.get(toolGroup);
		if (!set) {
			set = new Set();
			this.sessionAllows.set(toolGroup, set);
		}
		set.add(resource);
	}

	clearSessionRules(): void {
		this.sessionAllows.clear();
	}

	// ---------------------------------------------------------------------------
	// Persistent rules — delegate to SettingsStore
	// ---------------------------------------------------------------------------

	alwaysAllow(toolGroup: ToolGroup, resource: string): void {
		this.settingsStore.alwaysAllow(toolGroup, resource);
	}

	alwaysDeny(toolGroup: ToolGroup, resource: string): void {
		this.settingsStore.alwaysDeny(toolGroup, resource);
	}

	// ---------------------------------------------------------------------------
	// Shutdown
	// ---------------------------------------------------------------------------

	/** Flush pending persistent writes — must be called on shutdown. */
	async flush(): Promise<void> {
		return await this.settingsStore.flush();
	}

	// ---------------------------------------------------------------------------
	// Private helpers
	// ---------------------------------------------------------------------------

	private hasSessionAllow(toolGroup: ToolGroup, resource: string): boolean {
		return this.sessionAllows.get(toolGroup)?.has(resource) ?? false;
	}
}

/**
 * Build a full permissions record from TOOL_GROUP_DEFINITIONS defaults,
 * merged with the provided partial overrides.
 */
export function buildDefaultPermissions(
	overrides: Partial<Record<ToolGroup, PermissionMode>>,
): Record<ToolGroup, PermissionMode> {
	return Object.fromEntries(
		(Object.keys(TOOL_GROUP_DEFINITIONS) as ToolGroup[]).map((g) => [
			g,
			overrides[g] ?? TOOL_GROUP_DEFINITIONS[g].default,
		]),
	) as Record<ToolGroup, PermissionMode>;
}
