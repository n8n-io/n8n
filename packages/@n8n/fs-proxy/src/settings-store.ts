import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import z from 'zod';

import type { GatewayConfig, PermissionMode, ToolGroup } from './config';
import {
	getSettingsFilePath,
	logLevelSchema,
	permissionModeSchema,
	portSchema,
	TOOL_GROUP_DEFINITIONS,
} from './config';
import { logger } from './logger';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEBOUNCE_DELAY_MS = 500;
export const MAX_SETTINGS_STALE_MS = 3_000;

// ---------------------------------------------------------------------------
// Persistent settings schema
// ---------------------------------------------------------------------------

interface ResourcePermissions {
	allow: string[];
	deny: string[];
}

const persistentSettingsSchema = z.object({
	logLevel: logLevelSchema.optional(),
	port: portSchema.optional(),
	permissions: z
		.object(
			Object.fromEntries(
				Object.keys(TOOL_GROUP_DEFINITIONS).map((key) => [key, permissionModeSchema]),
			),
		)
		.partial(), //Partial<Record<ToolGroup, PermissionMode>>,
	filesystemDir: z.string().optional(),
	resourcePermissions: z
		.object(
			Object.fromEntries(
				Object.keys(TOOL_GROUP_DEFINITIONS).map((key) => [
					key,
					z.object({
						allow: z.array(z.string()),
						deny: z.array(z.string()),
					}),
				]),
			),
		)
		.partial(), // Partial<Record<ToolGroup, ResourcePermissions>>,
});

type PersistentSettings = z.infer<typeof persistentSettingsSchema>;

function isValidPersistentSettings(raw: unknown): raw is PersistentSettings {
	return persistentSettingsSchema.safeParse(raw).success;
}

function emptySettings(): PersistentSettings {
	return { permissions: {}, resourcePermissions: {} };
}

// ---------------------------------------------------------------------------
// SettingsStore
// ---------------------------------------------------------------------------

export class SettingsStore {
	/** Permissions merged from persistent settings + startup overrides — single source of truth. */
	private effectivePermissions: Partial<Record<ToolGroup, PermissionMode>>;

	/** Session-level allow rules: cleared on disconnect. */
	private sessionAllows: Map<ToolGroup, Set<string>> = new Map();

	// Write queue state
	private writeTimer: ReturnType<typeof setTimeout> | null = null;
	private inFlightPromise: Promise<void> | null = null;
	private writePending = false;
	private maxStaleTimer: ReturnType<typeof setTimeout> | null = null;

	private constructor(
		private persistent: PersistentSettings,
		startupOverrides: Partial<Record<ToolGroup, PermissionMode>>,
		private readonly filePath: string,
	) {
		// Merge once at init — startup overrides shadow persistent permissions.
		this.effectivePermissions = { ...persistent.permissions, ...startupOverrides };
	}

	// ---------------------------------------------------------------------------
	// Factory
	// ---------------------------------------------------------------------------

	static async create(config: GatewayConfig): Promise<SettingsStore> {
		const filePath = getSettingsFilePath();
		const persistent = await loadFromFile(filePath);
		const store = new SettingsStore(persistent, config.permissions, filePath);
		store.validateHasActiveGroup();
		return store;
	}

	// ---------------------------------------------------------------------------
	// Permission check
	// ---------------------------------------------------------------------------

	/**
	 * Return the effective permission mode for a tool group.
	 * Enforces the spec constraint: filesystemRead=deny forces filesystemWrite=deny.
	 */
	getGroupMode(toolGroup: ToolGroup): PermissionMode {
		if (
			toolGroup === 'filesystemWrite' &&
			(this.effectivePermissions['filesystemRead'] ?? 'ask') === 'deny'
		) {
			return 'deny';
		}
		return this.effectivePermissions[toolGroup] ?? 'ask';
	}

	/**
	 * Check the effective permission for a resource.
	 * Evaluation order:
	 *  1. Persistent deny list  → 'deny'  (takes absolute priority even in Allow mode)
	 *  2. Persistent allow list → 'allow'
	 *  3. Session allow set     → 'allow'
	 *  4. Effective group mode  → via getGroupMode() (includes cross-group constraints)
	 */
	check(toolGroup: ToolGroup, resource: string): PermissionMode {
		const rp = this.persistent.resourcePermissions[toolGroup];
		if (rp?.deny.includes(resource)) return 'deny';
		if (rp?.allow.includes(resource)) return 'allow';
		if (this.hasSessionAllow(toolGroup, resource)) return 'allow';
		return this.getGroupMode(toolGroup);
	}

	// ---------------------------------------------------------------------------
	// Mutation methods
	// ---------------------------------------------------------------------------

	allowForSession(toolGroup: ToolGroup, resource: string): void {
		let set = this.sessionAllows.get(toolGroup);
		if (!set) {
			set = new Set();
			this.sessionAllows.set(toolGroup, set);
		}
		set.add(resource);
	}

	alwaysAllow(toolGroup: ToolGroup, resource: string): void {
		const rp = this.getOrInitResourcePermissions(toolGroup);
		if (!rp.allow.includes(resource)) {
			rp.allow.push(resource);
			this.scheduleWrite();
		}
	}

	alwaysDeny(toolGroup: ToolGroup, resource: string): void {
		const rp = this.getOrInitResourcePermissions(toolGroup);
		if (!rp.deny.includes(resource)) {
			rp.deny.push(resource);
			this.scheduleWrite();
		}
	}

	clearSessionRules(): void {
		this.sessionAllows.clear();
	}

	/** Force immediate write — must be called on daemon shutdown. */
	async flush(): Promise<void> {
		this.cancelDebounce();
		if (this.inFlightPromise) await this.inFlightPromise;
		await this.persist();
	}

	// ---------------------------------------------------------------------------
	// Private helpers
	// ---------------------------------------------------------------------------

	/** Throws if every tool group is set to Deny — at least one must be Ask or Allow to start. */
	private validateHasActiveGroup(): void {
		const allDeny = (Object.keys(TOOL_GROUP_DEFINITIONS) as ToolGroup[]).every(
			(g) => this.getGroupMode(g) === 'deny',
		);
		if (allDeny) {
			throw new Error(
				'All tool groups are set to Deny — at least one must be Ask or Allow to start the gateway',
			);
		}
	}

	private hasSessionAllow(toolGroup: ToolGroup, resource: string): boolean {
		return this.sessionAllows.get(toolGroup)?.has(resource) ?? false;
	}

	private getOrInitResourcePermissions(toolGroup: ToolGroup): ResourcePermissions {
		let rp = this.persistent.resourcePermissions[toolGroup];
		if (!rp) {
			rp = { allow: [], deny: [] };
			this.persistent.resourcePermissions[toolGroup] = rp;
		}
		return rp;
	}

	private scheduleWrite(): void {
		// If a debounce timer is already running it will capture the latest state — do nothing.
		if (this.writeTimer !== null) return;
		// If a write is in-flight, queue one more write for when it finishes.
		if (this.inFlightPromise !== null) {
			this.writePending = true;
			return;
		}

		// Set max-stale timer: if not already set, flush after MAX_SETTINGS_STALE_MS regardless.
		this.maxStaleTimer ??= setTimeout(() => {
			this.maxStaleTimer = null;
			this.cancelDebounce();
			this.executeWrite();
		}, MAX_SETTINGS_STALE_MS);

		this.writeTimer = setTimeout(() => {
			this.writeTimer = null;
			this.executeWrite();
		}, DEBOUNCE_DELAY_MS);
	}

	private executeWrite(): void {
		this.cancelMaxStale();
		this.inFlightPromise = this.persist()
			.catch((error: unknown) => {
				logger.error('Failed to write settings file', {
					error: error instanceof Error ? error.message : String(error),
				});
			})
			.finally(() => {
				this.inFlightPromise = null;
				if (this.writePending) {
					this.writePending = false;
					this.scheduleWrite();
				}
			});
	}

	private cancelDebounce(): void {
		if (this.writeTimer !== null) {
			clearTimeout(this.writeTimer);
			this.writeTimer = null;
		}
		this.cancelMaxStale();
	}

	private cancelMaxStale(): void {
		if (this.maxStaleTimer !== null) {
			clearTimeout(this.maxStaleTimer);
			this.maxStaleTimer = null;
		}
	}

	private async persist(): Promise<void> {
		const dir = path.dirname(this.filePath);
		await fs.mkdir(dir, { recursive: true, mode: 0o700 });
		await fs.writeFile(this.filePath, JSON.stringify(this.persistent, null, 2), {
			encoding: 'utf-8',
			mode: 0o600,
		});
	}
}

// ---------------------------------------------------------------------------
// File I/O
// ---------------------------------------------------------------------------

async function loadFromFile(filePath: string): Promise<PersistentSettings> {
	try {
		const raw = await fs.readFile(filePath, 'utf-8');
		const parsed: unknown = JSON.parse(raw);
		if (!isValidPersistentSettings(parsed)) return emptySettings();
		return {
			...emptySettings(),
			...parsed,
		};
	} catch {
		// File absent or malformed — start fresh
		return emptySettings();
	}
}
