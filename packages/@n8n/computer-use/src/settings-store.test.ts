import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

jest.mock('node:os', () => {
	const actual = jest.requireActual<typeof os>('node:os');
	return { ...actual, homedir: jest.fn(() => actual.homedir()) };
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

const BASE_CONFIG: GatewayConfig = {
	logLevel: 'info',
	allowedOrigins: [],
	filesystem: { dir: process.cwd() },
	computer: { shell: { timeout: 30_000 } },
	browser: { defaultBrowser: 'chrome' },
	permissions: {},
	permissionConfirmation: 'instance',
};

async function createStore(
	tmpDir: string,
	initial?: Record<string, unknown>,
): Promise<SettingsStore> {
	(os.homedir as jest.Mock).mockReturnValue(tmpDir);
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
	jest.restoreAllMocks();
	await fs.rm(tmpDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// SettingsStore.create
// ---------------------------------------------------------------------------

describe('SettingsStore.create', () => {
	it('creates a store when no file exists', async () => {
		const store = await createStore(tmpDir);
		// Should not throw; resource permissions are empty
		expect(store.getResourcePermissions('shell')).toEqual({ allow: [], deny: [] });
	});

	it('loads permissions and resource rules from file', async () => {
		const store = await createStore(tmpDir, {
			permissions: { shell: 'allow' },
			resourcePermissions: { shell: { allow: ['npm'], deny: [] } },
		});
		expect(store.getResourcePermissions('shell')).toEqual({ allow: ['npm'], deny: [] });
	});

	it('tolerates a malformed file and starts with empty state', async () => {
		(os.homedir as jest.Mock).mockReturnValue(tmpDir);
		const filePath = path.join(tmpDir, '.n8n-gateway', 'settings.json');
		await fs.mkdir(path.dirname(filePath), { recursive: true });
		await fs.writeFile(filePath, 'not-json', 'utf-8');
		const store = await SettingsStore.create();
		expect(store.getResourcePermissions('shell')).toEqual({ allow: [], deny: [] });
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
		expect(store.getResourcePermissions('shell')).toEqual({ allow: [], deny: [] });
	});

	it('reflects alwaysAllow additions', async () => {
		const store = await createStore(tmpDir);
		store.alwaysAllow('shell', 'npm');
		expect(store.getResourcePermissions('shell').allow).toContain('npm');
	});

	it('reflects alwaysDeny additions', async () => {
		const store = await createStore(tmpDir);
		store.alwaysDeny('shell', 'rm -rf /');
		expect(store.getResourcePermissions('shell').deny).toContain('rm -rf /');
	});
});

// ---------------------------------------------------------------------------
// alwaysAllow / alwaysDeny deduplication
// ---------------------------------------------------------------------------

describe('alwaysAllow / alwaysDeny deduplication', () => {
	it('does not add a duplicate allow entry', async () => {
		const store = await createStore(tmpDir);
		store.alwaysAllow('shell', 'npm');
		store.alwaysAllow('shell', 'npm');
		expect(store.getResourcePermissions('shell').allow.filter((r) => r === 'npm')).toHaveLength(1);
	});

	it('does not add a duplicate deny entry', async () => {
		const store = await createStore(tmpDir);
		store.alwaysDeny('shell', 'rm');
		store.alwaysDeny('shell', 'rm');
		expect(store.getResourcePermissions('shell').deny.filter((r) => r === 'rm')).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// flush — writes pending changes immediately
// ---------------------------------------------------------------------------

describe('flush', () => {
	it('writes alwaysAllow changes to disk', async () => {
		const store = await createStore(tmpDir);
		store.alwaysAllow('shell', 'npm');
		await store.flush();

		const raw = await fs.readFile(path.join(tmpDir, '.n8n-gateway', 'settings.json'), 'utf-8');
		const parsed = parseJson<{ resourcePermissions: { shell: { allow: string[] } } }>(raw);
		expect(parsed.resourcePermissions.shell.allow).toContain('npm');
	});
});
