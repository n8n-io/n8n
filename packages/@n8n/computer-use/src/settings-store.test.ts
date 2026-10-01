import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type { Mock } from 'vitest';

vi.mock('node:os', async () => {
	const actual = await vi.importActual<typeof os>('node:os');
	return { ...actual, homedir: vi.fn(() => actual.homedir()) };
});

import type { GatewayConfig } from './config';
import { SettingsStore } from './settings-store';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseJson<T>(raw: string): T {
	try {
		return JSON.parse(raw) as T;
	} catch {
		throw new Error(`Failed to parse JSON: ${raw}`);
	}
}

const ORIGIN = 'https://a.app.n8n.cloud';
const OTHER_ORIGIN = 'https://b.app.n8n.cloud';

const BASE_CONFIG: GatewayConfig = {
	logLevel: 'info',
	allowedOrigins: [],
	filesystem: { dir: process.cwd() },
	computer: { shell: { timeout: 30_000, dangerouslyDisableSandbox: false } },
	browser: { defaultBrowser: 'chrome' },
	permissions: {},
	permissionConfirmation: 'instance',
};

async function createStore(
	tmpDir: string,
	initial?: Record<string, unknown>,
): Promise<SettingsStore> {
	(os.homedir as Mock).mockReturnValue(tmpDir);
	if (initial !== undefined) {
		const dir = path.join(tmpDir, '.n8n-gateway');
		await fs.mkdir(dir, { recursive: true });
		await fs.writeFile(path.join(dir, 'settings.json'), JSON.stringify(initial), 'utf-8');
	}
	return await SettingsStore.create();
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(async () => {
	tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'settings-store-test-'));
});

afterEach(async () => {
	vi.restoreAllMocks();
	await fs.rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// SettingsStore.create
// ---------------------------------------------------------------------------

describe('SettingsStore.create', () => {
	it('creates a store when no file exists', async () => {
		const store = await createStore(tmpDir);
		// Should not throw; resource permissions are empty
		expect(store.getResourcePermissions(ORIGIN, 'shell')).toEqual({ allow: [], deny: [] });
	});

	it('loads resource rules for an origin from file', async () => {
		const store = await createStore(tmpDir, {
			permissions: { shell: 'allow' },
			resourcePermissions: {},
			resourcePermissionsByOrigin: { [ORIGIN]: { shell: { allow: ['npm'], deny: [] } } },
		});
		expect(store.getResourcePermissions(ORIGIN, 'shell')).toEqual({ allow: ['npm'], deny: [] });
		expect(store.getResourcePermissions(OTHER_ORIGIN, 'shell')).toEqual({ allow: [], deny: [] });
	});

	it('gives unscoped resource rules to the first origin that claims them', async () => {
		const store = await createStore(tmpDir, {
			permissions: {},
			resourcePermissions: { shell: { allow: ['npm'], deny: ['rm'] } },
		});

		store.claimUnscopedRules(ORIGIN);
		store.claimUnscopedRules(OTHER_ORIGIN);

		expect(store.getResourcePermissions(ORIGIN, 'shell')).toEqual({ allow: ['npm'], deny: ['rm'] });
		expect(store.getResourcePermissions(OTHER_ORIGIN, 'shell')).toEqual({ allow: [], deny: [] });
	});

	it('merges unscoped resource rules into rules the origin already has', async () => {
		const store = await createStore(tmpDir, {
			permissions: {},
			resourcePermissions: { shell: { allow: ['npm', 'git'], deny: [] } },
			resourcePermissionsByOrigin: { [ORIGIN]: { shell: { allow: ['git'], deny: [] } } },
		});

		store.claimUnscopedRules(ORIGIN);

		expect(store.getResourcePermissions(ORIGIN, 'shell').allow).toEqual(['git', 'npm']);
	});

	it('does not apply unscoped resource rules before they are claimed', async () => {
		const store = await createStore(tmpDir, {
			permissions: {},
			resourcePermissions: { shell: { allow: ['npm'], deny: [] } },
		});

		store.alwaysAllow(ORIGIN, 'shell', 'git');

		expect(store.getResourcePermissions(ORIGIN, 'shell').allow).toEqual(['git']);
	});

	it('tolerates a malformed file and starts with empty state', async () => {
		(os.homedir as Mock).mockReturnValue(tmpDir);
		const filePath = path.join(tmpDir, '.n8n-gateway', 'settings.json');
		await fs.mkdir(path.dirname(filePath), { recursive: true });
		await fs.writeFile(filePath, 'not-json', 'utf-8');
		const store = await SettingsStore.create();
		expect(store.getResourcePermissions(ORIGIN, 'shell')).toEqual({ allow: [], deny: [] });
	});
});

// ---------------------------------------------------------------------------
// SettingsStore.ensureInitialized
// ---------------------------------------------------------------------------

describe('SettingsStore.ensureInitialized', () => {
	it('creates the settings file when absent', async () => {
		(os.homedir as Mock).mockReturnValue(tmpDir);
		await SettingsStore.ensureInitialized(BASE_CONFIG);

		const raw = await fs.readFile(path.join(tmpDir, '.n8n-gateway', 'settings.json'), 'utf-8');
		const parsed = parseJson<Record<string, unknown>>(raw);

		expect(parsed.permissions).toMatchObject({
			filesystemRead: 'allow',
			filesystemWrite: 'ask',
			shell: 'deny',
			computer: 'deny',
			browser: 'ask',
		});
		expect(parsed.filesystemDir).toBe('');
	});

	it('does not overwrite an existing settings file', async () => {
		(os.homedir as Mock).mockReturnValue(tmpDir);
		const dir = path.join(tmpDir, '.n8n-gateway');
		const file = path.join(dir, 'settings.json');
		await fs.mkdir(dir, { recursive: true });
		const existing = JSON.stringify({ permissions: { shell: 'allow' }, filesystemDir: '/custom' });
		await fs.writeFile(file, existing, 'utf-8');

		await SettingsStore.ensureInitialized(BASE_CONFIG);
		const raw = await fs.readFile(file, 'utf-8');
		expect(raw).toBe(existing);
	});
});

// ---------------------------------------------------------------------------
// getDefaults
// ---------------------------------------------------------------------------

describe('getDefaults', () => {
	it('returns TOOL_GROUP_DEFINITIONS defaults when no file and no overrides', async () => {
		const store = await createStore(tmpDir);
		const { permissions } = store.getDefaults(BASE_CONFIG);
		expect(permissions).toEqual({
			filesystemRead: 'allow',
			filesystemWrite: 'ask',
			shell: 'deny',
			computer: 'deny',
			browser: 'ask',
		});
	});

	it('CLI/ENV overrides take priority over file permissions', async () => {
		const store = await createStore(tmpDir, {
			permissions: { shell: 'ask' },
		});
		const config = { ...BASE_CONFIG, permissions: { shell: 'allow' as const } };
		const { permissions } = store.getDefaults(config);
		expect(permissions.shell).toBe('allow');
	});

	it('file permissions fill in groups not overridden by CLI/ENV', async () => {
		const store = await createStore(tmpDir, {
			permissions: { browser: 'deny' },
			resourcePermissions: {},
		});
		const { permissions } = store.getDefaults(BASE_CONFIG);
		expect(permissions.browser).toBe('deny');
		// others fall back to TOOL_GROUP_DEFINITIONS defaults
		expect(permissions.filesystemRead).toBe('allow');
	});

	it('uses an explicit --filesystem-dir CLI value over the stored dir', async () => {
		const store = await createStore(tmpDir, { filesystemDir: '/stored' });
		const config = { ...BASE_CONFIG, filesystem: { dir: '/explicit' } };
		const { dir } = store.getDefaults(config);
		expect(dir).toBe('/explicit');
	});

	it('falls back to stored filesystemDir when config dir equals cwd', async () => {
		const store = await createStore(tmpDir, {
			permissions: {},
			resourcePermissions: {},
			filesystemDir: '/stored',
		});
		const { dir } = store.getDefaults(BASE_CONFIG); // BASE_CONFIG.filesystem.dir = process.cwd()
		expect(dir).toBe('/stored');
	});

	it('falls back to process.cwd() when neither config dir nor stored dir is set', async () => {
		const store = await createStore(tmpDir, { filesystemDir: '' });
		const { dir } = store.getDefaults(BASE_CONFIG);
		expect(dir).toBe(process.cwd());
	});
});

// ---------------------------------------------------------------------------
// getResourcePermissions
// ---------------------------------------------------------------------------

describe('getResourcePermissions', () => {
	it('returns empty lists for unknown groups', async () => {
		const store = await createStore(tmpDir);
		expect(store.getResourcePermissions(ORIGIN, 'shell')).toEqual({ allow: [], deny: [] });
	});

	it('reflects alwaysAllow additions', async () => {
		const store = await createStore(tmpDir);
		store.alwaysAllow(ORIGIN, 'shell', 'npm');
		expect(store.getResourcePermissions(ORIGIN, 'shell').allow).toContain('npm');
	});

	it('keeps rules saved for one origin away from other origins', async () => {
		const store = await createStore(tmpDir);
		store.alwaysAllow(ORIGIN, 'shell', 'npm');
		store.alwaysDeny(ORIGIN, 'shell', 'rm');
		expect(store.getResourcePermissions(OTHER_ORIGIN, 'shell')).toEqual({ allow: [], deny: [] });
	});

	it('reflects alwaysDeny additions', async () => {
		const store = await createStore(tmpDir);
		store.alwaysDeny(ORIGIN, 'shell', 'rm -rf /');
		expect(store.getResourcePermissions(ORIGIN, 'shell').deny).toContain('rm -rf /');
	});
});

// ---------------------------------------------------------------------------
// alwaysAllow / alwaysDeny deduplication
// ---------------------------------------------------------------------------

describe('alwaysAllow / alwaysDeny deduplication', () => {
	it('does not add a duplicate allow entry', async () => {
		const store = await createStore(tmpDir);
		store.alwaysAllow(ORIGIN, 'shell', 'npm');
		store.alwaysAllow(ORIGIN, 'shell', 'npm');
		expect(
			store.getResourcePermissions(ORIGIN, 'shell').allow.filter((r) => r === 'npm'),
		).toHaveLength(1);
	});

	it('does not add a duplicate deny entry', async () => {
		const store = await createStore(tmpDir);
		store.alwaysDeny(ORIGIN, 'shell', 'rm');
		store.alwaysDeny(ORIGIN, 'shell', 'rm');
		expect(
			store.getResourcePermissions(ORIGIN, 'shell').deny.filter((r) => r === 'rm'),
		).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// flush — writes pending changes immediately
// ---------------------------------------------------------------------------

describe('flush', () => {
	it('writes alwaysAllow changes to disk', async () => {
		const store = await createStore(tmpDir);
		store.alwaysAllow(ORIGIN, 'shell', 'npm');
		await store.flush();

		const raw = await fs.readFile(path.join(tmpDir, '.n8n-gateway', 'settings.json'), 'utf-8');
		const parsed = parseJson<{
			resourcePermissions: object;
			resourcePermissionsByOrigin: Record<string, { shell: { allow: string[] } }>;
		}>(raw);
		expect(parsed.resourcePermissionsByOrigin[ORIGIN].shell.allow).toContain('npm');
		expect(parsed.resourcePermissions).toEqual({});
	});

	it('writes moved unscoped rules under the origin', async () => {
		const store = await createStore(tmpDir, {
			permissions: {},
			resourcePermissions: { shell: { allow: ['npm'], deny: [] } },
		});
		store.claimUnscopedRules(ORIGIN);
		await store.flush();

		const raw = await fs.readFile(path.join(tmpDir, '.n8n-gateway', 'settings.json'), 'utf-8');
		const parsed = parseJson<{
			resourcePermissions: object;
			resourcePermissionsByOrigin: Record<string, { shell: { allow: string[] } }>;
		}>(raw);
		expect(parsed.resourcePermissionsByOrigin[ORIGIN].shell.allow).toEqual(['npm']);
		expect(parsed.resourcePermissions).toEqual({});
	});
});
