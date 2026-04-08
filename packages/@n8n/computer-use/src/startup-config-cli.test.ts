import * as fs from 'node:fs/promises';
import * as nodePath from 'node:path';
import * as os from 'node:os';

jest.mock('node:os', () => ({
	...jest.requireActual('node:os'),
	homedir: jest.fn(() => jest.requireActual<typeof os>('node:os').homedir()),
}));

import type { GatewayConfig } from './config';
import { ensureSettingsFile, isAllDeny } from './startup-config-cli';

const BASE_CONFIG: GatewayConfig = {
	logLevel: 'info',
	port: 7655,
	allowedOrigins: [],
	filesystem: { dir: '/tmp' },
	computer: { shell: { timeout: 30_000 } },
	browser: {
		defaultBrowser: 'chrome',
	},
	permissions: {},
	permissionConfirmation: 'instance',
};

// ---------------------------------------------------------------------------
// isAllDeny
// ---------------------------------------------------------------------------

describe('isAllDeny', () => {
	it('returns true when all groups are deny', () => {
		expect(
			isAllDeny({
				filesystemRead: 'deny',
				filesystemWrite: 'deny',
				shell: 'deny',
				computer: 'deny',
				browser: 'deny',
			}),
		).toBe(true);
	});

	it('returns false when at least one group is ask', () => {
		expect(
			isAllDeny({
				filesystemRead: 'ask',
				filesystemWrite: 'deny',
				shell: 'deny',
				computer: 'deny',
				browser: 'deny',
			}),
		).toBe(false);
	});

	it('returns false when at least one group is allow', () => {
		expect(
			isAllDeny({
				filesystemRead: 'allow',
				filesystemWrite: 'deny',
				shell: 'deny',
				computer: 'deny',
				browser: 'deny',
			}),
		).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// ensureSettingsFile
// ---------------------------------------------------------------------------

describe('ensureSettingsFile', () => {
	let tmpDir: string;
	let settingsPath: string;

	beforeEach(async () => {
		tmpDir = await fs.mkdtemp(nodePath.join(os.tmpdir(), 'gateway-test-'));
		settingsPath = nodePath.join(tmpDir, 'settings.json');
		// Point getSettingsFilePath() at our temp location by overriding homedir
		(os.homedir as jest.Mock).mockReturnValue(tmpDir);
	});

	afterEach(async () => {
		jest.restoreAllMocks();
		await fs.rm(tmpDir, { recursive: true, force: true });
	});

	it('creates the settings file with recommended defaults when absent', async () => {
		await ensureSettingsFile(BASE_CONFIG);

		const raw = await fs.readFile(nodePath.join(tmpDir, '.n8n-gateway', 'settings.json'), 'utf-8');
		const parsed = JSON.parse(raw) as Record<string, unknown>;

		expect(parsed.permissions).toMatchObject({
			filesystemRead: 'allow',
			filesystemWrite: 'ask',
			shell: 'deny',
			computer: 'deny',
			browser: 'ask',
		});
		expect(parsed.filesystemDir).toBe('');
		expect(parsed.resourcePermissions).toEqual({});
	});

	it('merges CLI/ENV permission overrides on top of the template', async () => {
		const config: GatewayConfig = {
			...BASE_CONFIG,
			permissions: { shell: 'allow' },
		};
		await ensureSettingsFile(config);

		const raw = await fs.readFile(nodePath.join(tmpDir, '.n8n-gateway', 'settings.json'), 'utf-8');
		const parsed = JSON.parse(raw) as { permissions: Record<string, string> };

		// CLI override wins
		expect(parsed.permissions.shell).toBe('allow');
		// Template defaults for the rest
		expect(parsed.permissions.filesystemRead).toBe('allow');
	});

	it('does not overwrite an existing settings file', async () => {
		const dir = nodePath.join(tmpDir, '.n8n-gateway');
		const file = nodePath.join(dir, 'settings.json');
		await fs.mkdir(dir, { recursive: true });
		const existing = JSON.stringify({ permissions: { shell: 'allow' }, filesystemDir: '/custom' });
		await fs.writeFile(file, existing, 'utf-8');

		await ensureSettingsFile(BASE_CONFIG);

		const raw = await fs.readFile(file, 'utf-8');
		expect(raw).toBe(existing);
	});

	it('is safe to call multiple times — only creates once', async () => {
		await ensureSettingsFile(BASE_CONFIG);
		await ensureSettingsFile(BASE_CONFIG);

		// Second call must not throw and must not alter the file
		const raw = await fs.readFile(nodePath.join(tmpDir, '.n8n-gateway', 'settings.json'), 'utf-8');
		const parsed = JSON.parse(raw) as Record<string, unknown>;
		expect(parsed.filesystemDir).toBe('');
	});
});
