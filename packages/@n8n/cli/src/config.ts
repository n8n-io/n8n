import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const CONFIG_DIR = path.join(os.homedir(), '.n8n-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface ContextConfig {
	url?: string;
	apiKey?: string;
	accessToken?: string;
	refreshToken?: string;
	tokenExpiresAt?: number; // Unix timestamp in seconds
}

export interface MultiConfig {
	currentContext?: string;
	contexts: Record<string, ContextConfig>;
}

/** @deprecated Use ContextConfig instead. Kept for auto-migration detection. */
export interface CliConfig {
	url?: string;
	apiKey?: string;
	accessToken?: string;
	refreshToken?: string;
	tokenExpiresAt?: number;
}

function ensureConfigDir(): void {
	if (!fs.existsSync(CONFIG_DIR)) {
		fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
	}
}

/** Detect old flat config format (has url/apiKey/accessToken but no contexts). */
function isLegacyConfig(raw: unknown): raw is CliConfig {
	if (typeof raw !== 'object' || raw === null) return false;
	const obj = raw as Record<string, unknown>;
	return !('contexts' in obj) && ('url' in obj || 'apiKey' in obj || 'accessToken' in obj);
}

/** Read config with auto-migration from flat format to multi-context. */
export function readMultiConfig(): MultiConfig {
	try {
		const raw = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')) as unknown;

		if (isLegacyConfig(raw)) {
			const migrated: MultiConfig = {
				currentContext: 'default',
				contexts: { default: { ...raw } },
			};
			writeMultiConfig(migrated);
			return migrated;
		}

		return raw as MultiConfig;
	} catch {
		return { contexts: {} };
	}
}

export function writeMultiConfig(config: MultiConfig): void {
	ensureConfigDir();
	fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n', {
		mode: 0o600,
	});
}

/** Get the current context config. Returns undefined if no current context. */
export function getCurrentContext(): { name: string; config: ContextConfig } | undefined {
	const multi = readMultiConfig();
	if (!multi.currentContext || !multi.contexts[multi.currentContext]) return undefined;
	return { name: multi.currentContext, config: multi.contexts[multi.currentContext] };
}

/** Set or create a named context. */
export function setContext(name: string, config: ContextConfig): void {
	const multi = readMultiConfig();
	multi.contexts[name] = config;
	writeMultiConfig(multi);
}

/** Set the current active context. */
export function setCurrentContext(name: string): void {
	const multi = readMultiConfig();
	if (!multi.contexts[name]) {
		throw new Error(`Context "${name}" does not exist.`);
	}
	multi.currentContext = name;
	writeMultiConfig(multi);
}

/** Delete a context. Returns the deleted config (for token revocation). */
export function deleteContext(name: string): ContextConfig | undefined {
	const multi = readMultiConfig();
	const config = multi.contexts[name];
	if (!config) return undefined;

	delete multi.contexts[name];

	if (multi.currentContext === name) {
		const remaining = Object.keys(multi.contexts);
		multi.currentContext = remaining.length > 0 ? remaining[0] : undefined;
	}

	writeMultiConfig(multi);
	return config;
}

/** List all contexts with their configs. */
export function listContexts(): Array<{ name: string; config: ContextConfig; current: boolean }> {
	const multi = readMultiConfig();
	return Object.entries(multi.contexts).map(([name, config]) => ({
		name,
		config,
		current: name === multi.currentContext,
	}));
}

/** Rename a context. */
export function renameContext(oldName: string, newName: string): void {
	const multi = readMultiConfig();
	if (!multi.contexts[oldName]) {
		throw new Error(`Context "${oldName}" does not exist.`);
	}
	if (multi.contexts[newName]) {
		throw new Error(`Context "${newName}" already exists.`);
	}

	multi.contexts[newName] = multi.contexts[oldName];
	delete multi.contexts[oldName];

	if (multi.currentContext === oldName) {
		multi.currentContext = newName;
	}

	writeMultiConfig(multi);
}

/** Delete all contexts. Returns all deleted configs (for token revocation). */
export function deleteAllContexts(): ContextConfig[] {
	const multi = readMultiConfig();
	const configs = Object.values(multi.contexts);
	writeMultiConfig({ contexts: {} });
	return configs;
}

/** Generate a context name from a URL hostname. */
export function contextNameFromUrl(url: string): string {
	const hostname = new URL(url).hostname;
	return hostname.replace(/\./g, '-');
}

/** Generate a unique context name, appending -2, -3, etc. if needed. */
export function uniqueContextName(baseName: string, existing: string[]): string {
	if (!existing.includes(baseName)) return baseName;
	let i = 2;
	while (existing.includes(`${baseName}-${i}`)) i++;
	return `${baseName}-${i}`;
}

// --- Backwards-compatible API (delegates to multi-config) ---

/** @deprecated Use readMultiConfig() + getCurrentContext() instead. */
export function readConfig(): CliConfig {
	const ctx = getCurrentContext();
	return ctx?.config ?? {};
}

/** @deprecated Use setContext() + setCurrentContext() instead. */
export function writeConfig(config: CliConfig): void {
	const multi = readMultiConfig();
	const name = multi.currentContext ?? 'default';
	multi.contexts[name] = config;
	multi.currentContext = name;
	writeMultiConfig(multi);
}

/** @deprecated Use deleteContext() or deleteAllContexts() instead. */
export function deleteConfig(): void {
	try {
		fs.unlinkSync(CONFIG_FILE);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
			throw error;
		}
	}
}

/** Resolve URL and API key from flags > env > current context config */
export function resolveConnection(flags: {
	url?: string;
	apiKey?: string;
}): {
	url?: string;
	apiKey?: string;
	accessToken?: string;
	refreshToken?: string;
	tokenExpiresAt?: number;
} {
	const config = flags.url && flags.apiKey ? {} : (getCurrentContext()?.config ?? {});
	return {
		url: flags.url ?? process.env.N8N_URL ?? config.url,
		apiKey: flags.apiKey ?? process.env.N8N_API_KEY ?? config.apiKey,
		accessToken: config.accessToken,
		refreshToken: config.refreshToken,
		tokenExpiresAt: config.tokenExpiresAt,
	};
}
