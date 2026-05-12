import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import z from 'zod';

import type { GatewayConfig, PermissionMode, ToolGroup } from './config';
import {
	getSettingsFilePath,
	logLevelSchema,
	permissionModeSchema,
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
	// Write queue state
	private writeTimer: ReturnType<typeof setTimeout> | null = null;
	private inFlightPromise: Promise<void> | null = null;
	private writePending = false;
	private maxStaleTimer: ReturnType<typeof setTimeout> | null = null;

	private constructor(
		private persistent: PersistentSettings,
		private readonly filePath: string,
	) {}

	// ---------------------------------------------------------------------------
	// Factory
	// ---------------------------------------------------------------------------

	static async create(): Promise<SettingsStore> {
		const filePath = getSettingsFilePath();
		const persistent = await loadFromFile(filePath);
		return new SettingsStore(persistent, filePath);
	}

	// ---------------------------------------------------------------------------
	// Session defaults
	// ---------------------------------------------------------------------------

	/**
	 * Merge file permissions with CLI/ENV overrides to produce the defaults
	 * for a new GatewaySession.
	 *
	 * Priority: CLI/ENV overrides > persistent file permissions > TOOL_GROUP_DEFINITIONS defaults
	 * Dir: config.filesystem.dir (if explicitly set) > persistent filesystemDir > process.cwd()
	 */
	getDefaults(config: GatewayConfig): {
		permissions: Record<ToolGroup, PermissionMode>;
		dir: string;
	} {
		const permissions = Object.fromEntries(
			(Object.keys(TOOL_GROUP_DEFINITIONS) as ToolGroup[]).map((g) => [
				g,
				config.permissions[g] ??
					this.persistent.permissions[g] ??
					TOOL_GROUP_DEFINITIONS[g].default,
			]),
		) as Record<ToolGroup, PermissionMode>;

		const configDirIsDefault = config.filesystem.dir === process.cwd();
		const storedDir = this.persistent.filesystemDir;
		const dir =
			(!configDirIsDefault ? config.filesystem.dir : null) ??
			(storedDir !== '' ? storedDir : null) ??
			process.cwd();

		return { permissions, dir };
	}

	// ---------------------------------------------------------------------------
	// Resource permissions
	// ---------------------------------------------------------------------------

	/** Read persistent resource rules for a tool group — used by GatewaySession.check(). */
	getResourcePermissions(toolGroup: ToolGroup): { allow: string[]; deny: string[] } {
		const rp = this.persistent.resourcePermissions[toolGroup];
		return { allow: rp?.allow ?? [], deny: rp?.deny ?? [] };
	}

	// ---------------------------------------------------------------------------
	// Mutation methods
	// ---------------------------------------------------------------------------

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

	/** Force immediate write — must be called on shutdown. */
	async flush(): Promise<void> {
		this.cancelDebounce();
		if (this.inFlightPromise) await this.inFlightPromise;
		await this.persist();
	}

	// ---------------------------------------------------------------------------
	// Private helpers
	// ---------------------------------------------------------------------------

	private getOrInitResourcePermissions(toolGroup: ToolGroup): ResourcePermissions {
		const existing = this.persistent.resourcePermissions[toolGroup];
		if (existing) {
			// Normalise: zod schema marks allow/deny as optional; ensure they exist.
			existing.allow ??= [];
			existing.deny ??= [];
			return existing as ResourcePermissions;
		}
		const fresh: ResourcePermissions = { allow: [], deny: [] };
		this.persistent.resourcePermissions[toolGroup] = fresh;
		return fresh;
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

	async persist(): Promise<void> {
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
