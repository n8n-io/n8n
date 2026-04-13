import * as config from './config';
import type { ToolGroup } from './config';
import { GatewaySession, buildDefaultPermissions } from './gateway-session';
import type { SettingsStore } from './settings-store';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStore(
	overrides: Partial<{
		allow: Record<string, string[]>;
		deny: Record<string, string[]>;
	}> = {},
): jest.Mocked<
	Pick<SettingsStore, 'getResourcePermissions' | 'alwaysAllow' | 'alwaysDeny' | 'flush'>
> {
	return {
		getResourcePermissions: jest.fn((toolGroup: ToolGroup) => ({
			allow: overrides.allow?.[toolGroup] ?? [],
			deny: overrides.deny?.[toolGroup] ?? [],
		})),
		alwaysAllow: jest.fn(),
		alwaysDeny: jest.fn(),
		flush: jest.fn().mockResolvedValue(undefined),
	};
}

const FULL_ALLOW_PERMISSIONS = buildDefaultPermissions({
	filesystemRead: 'allow',
	filesystemWrite: 'allow',
	shell: 'allow',
	computer: 'allow',
	browser: 'allow',
});

const FULL_ASK_PERMISSIONS = buildDefaultPermissions({
	filesystemRead: 'ask',
	filesystemWrite: 'ask',
	shell: 'ask',
	computer: 'ask',
	browser: 'ask',
});

// ---------------------------------------------------------------------------
// buildDefaultPermissions
// ---------------------------------------------------------------------------

describe('buildDefaultPermissions', () => {
	it('fills missing groups with TOOL_GROUP_DEFINITIONS defaults', () => {
		const result = buildDefaultPermissions({});
		expect(result).toEqual({
			filesystemRead: 'allow',
			filesystemWrite: 'ask',
			shell: 'deny',
			computer: 'deny',
			browser: 'ask',
		});
	});

	it('applies provided overrides', () => {
		const result = buildDefaultPermissions({ shell: 'allow', computer: 'allow' });
		expect(result.shell).toBe('allow');
		expect(result.computer).toBe('allow');
		// others still default
		expect(result.filesystemRead).toBe('allow');
	});
});

// ---------------------------------------------------------------------------
// GatewaySession — construction and setters
// ---------------------------------------------------------------------------

describe('GatewaySession', () => {
	describe('construction', () => {
		it('copies permissions and dir from defaults', () => {
			const store = makeStore();
			const session = new GatewaySession(
				{ permissions: FULL_ALLOW_PERMISSIONS, dir: '/home/user' },
				store as unknown as SettingsStore,
			);
			expect(session.dir).toBe('/home/user');
			expect(session.getAllPermissions()).toEqual(FULL_ALLOW_PERMISSIONS);
		});

		it('does not share the permissions object with the caller', () => {
			const store = makeStore();
			const defaults = { ...FULL_ALLOW_PERMISSIONS };
			const session = new GatewaySession(
				{ permissions: defaults, dir: '/' },
				store as unknown as SettingsStore,
			);
			defaults.shell = 'deny';
			expect(session.getAllPermissions().shell).toBe('allow');
		});
	});

	describe('setPermissions / setDir', () => {
		it('updates permissions for the session', () => {
			const store = makeStore();
			const session = new GatewaySession(
				{ permissions: FULL_ALLOW_PERMISSIONS, dir: '/' },
				store as unknown as SettingsStore,
			);
			session.setPermissions({ ...FULL_ALLOW_PERMISSIONS, shell: 'deny' });
			expect(session.getAllPermissions().shell).toBe('deny');
		});

		it('updates dir for the session', () => {
			const store = makeStore();
			const session = new GatewaySession(
				{ permissions: FULL_ALLOW_PERMISSIONS, dir: '/old' },
				store as unknown as SettingsStore,
			);
			session.setDir('/new');
			expect(session.dir).toBe('/new');
		});
	});

	// ---------------------------------------------------------------------------
	// getGroupMode
	// ---------------------------------------------------------------------------

	describe('getGroupMode', () => {
		it('returns the configured mode for each group', () => {
			const store = makeStore();
			const session = new GatewaySession(
				{ permissions: FULL_ASK_PERMISSIONS, dir: '/' },
				store as unknown as SettingsStore,
			);
			expect(session.getGroupMode('filesystemRead')).toBe('ask');
			expect(session.getGroupMode('shell')).toBe('ask');
		});

		it('forces filesystemWrite to deny when filesystemRead is deny', () => {
			const store = makeStore();
			const session = new GatewaySession(
				{
					permissions: buildDefaultPermissions({
						filesystemRead: 'deny',
						filesystemWrite: 'allow',
					}),
					dir: '/',
				},
				store as unknown as SettingsStore,
			);
			expect(session.getGroupMode('filesystemWrite')).toBe('deny');
		});

		it('does not force filesystemWrite when filesystemRead is ask or allow', () => {
			const store = makeStore();
			const session = new GatewaySession(
				{
					permissions: buildDefaultPermissions({ filesystemRead: 'ask', filesystemWrite: 'allow' }),
					dir: '/',
				},
				store as unknown as SettingsStore,
			);
			expect(session.getGroupMode('filesystemWrite')).toBe('allow');
		});
	});

	// ---------------------------------------------------------------------------
	// check — permission evaluation order
	// ---------------------------------------------------------------------------

	describe('check', () => {
		it('returns deny when resource is in the persistent deny list (overrides group mode)', () => {
			const store = makeStore({ deny: { shell: ['rm -rf /'] } });
			const session = new GatewaySession(
				{ permissions: FULL_ALLOW_PERMISSIONS, dir: '/' },
				store as unknown as SettingsStore,
			);
			expect(session.check('shell', 'rm -rf /')).toBe('deny');
		});

		it('returns allow when resource is in the persistent allow list', () => {
			const store = makeStore({ allow: { browser: ['example.com'] } });
			const session = new GatewaySession(
				{
					permissions: buildDefaultPermissions({ browser: 'ask' }),
					dir: '/',
				},
				store as unknown as SettingsStore,
			);
			expect(session.check('browser', 'example.com')).toBe('allow');
		});

		it('persistent deny takes priority over persistent allow', () => {
			const store = makeStore({
				allow: { shell: ['npm'] },
				deny: { shell: ['npm'] },
			});
			const session = new GatewaySession(
				{ permissions: FULL_ALLOW_PERMISSIONS, dir: '/' },
				store as unknown as SettingsStore,
			);
			expect(session.check('shell', 'npm')).toBe('deny');
		});

		it('returns allow for a session-allowed resource', () => {
			const store = makeStore();
			const session = new GatewaySession(
				{ permissions: buildDefaultPermissions({ shell: 'ask' }), dir: '/' },
				store as unknown as SettingsStore,
			);
			session.allowForSession('shell', 'npm');
			expect(session.check('shell', 'npm')).toBe('allow');
		});

		it('falls through to group mode when no rules match', () => {
			const store = makeStore();
			const session = new GatewaySession(
				{ permissions: buildDefaultPermissions({ shell: 'ask' }), dir: '/' },
				store as unknown as SettingsStore,
			);
			expect(session.check('shell', 'npm')).toBe('ask');
		});

		describe('settings self-protection', () => {
			const settingsFile = config.getSettingsFilePath();
			const settingsDir = config.getSettingsDir();

			it('denies filesystemWrite to the settings file', () => {
				const store = makeStore();
				const session = new GatewaySession(
					{ permissions: FULL_ALLOW_PERMISSIONS, dir: '/' },
					store as unknown as SettingsStore,
				);
				expect(session.check('filesystemWrite', settingsFile)).toBe('deny');
			});

			it('denies filesystemWrite to the settings directory', () => {
				const store = makeStore();
				const session = new GatewaySession(
					{ permissions: FULL_ALLOW_PERMISSIONS, dir: '/' },
					store as unknown as SettingsStore,
				);
				expect(session.check('filesystemWrite', settingsDir)).toBe('deny');
			});

			it('denies filesystemRead to the settings file', () => {
				const store = makeStore();
				const session = new GatewaySession(
					{ permissions: FULL_ALLOW_PERMISSIONS, dir: '/' },
					store as unknown as SettingsStore,
				);
				expect(session.check('filesystemRead', settingsFile)).toBe('deny');
			});

			it('denies access even when group mode is allow', () => {
				const store = makeStore({ allow: { filesystemWrite: [settingsFile] } });
				const session = new GatewaySession(
					{ permissions: FULL_ALLOW_PERMISSIONS, dir: '/' },
					store as unknown as SettingsStore,
				);
				expect(session.check('filesystemWrite', settingsFile)).toBe('deny');
			});

			it('does not deny filesystemWrite to unrelated paths', () => {
				const store = makeStore();
				const session = new GatewaySession(
					{ permissions: FULL_ALLOW_PERMISSIONS, dir: '/' },
					store as unknown as SettingsStore,
				);
				expect(session.check('filesystemWrite', '/tmp/unrelated.json')).toBe('allow');
			});

			it('does not deny shell group for settings-like resource strings', () => {
				const store = makeStore();
				const session = new GatewaySession(
					{ permissions: FULL_ALLOW_PERMISSIONS, dir: '/' },
					store as unknown as SettingsStore,
				);
				expect(session.check('shell', settingsFile)).toBe('allow');
			});
		});
	});

	// ---------------------------------------------------------------------------
	// Session-level allow rules
	// ---------------------------------------------------------------------------

	describe('allowForSession / clearSessionRules', () => {
		it('allow for session is cleared after clearSessionRules', () => {
			const store = makeStore();
			const session = new GatewaySession(
				{ permissions: buildDefaultPermissions({ shell: 'ask' }), dir: '/' },
				store as unknown as SettingsStore,
			);
			session.allowForSession('shell', 'npm');
			expect(session.check('shell', 'npm')).toBe('allow');
			session.clearSessionRules();
			expect(session.check('shell', 'npm')).toBe('ask');
		});

		it('session allow for one group does not affect another', () => {
			const store = makeStore();
			const session = new GatewaySession(
				{ permissions: buildDefaultPermissions({ shell: 'ask', browser: 'ask' }), dir: '/' },
				store as unknown as SettingsStore,
			);
			session.allowForSession('shell', 'npm');
			expect(session.check('browser', 'npm')).toBe('ask');
		});
	});

	// ---------------------------------------------------------------------------
	// Persistent rule delegation
	// ---------------------------------------------------------------------------

	describe('alwaysAllow / alwaysDeny delegation', () => {
		it('delegates alwaysAllow to the settings store', () => {
			const store = makeStore();
			const session = new GatewaySession(
				{ permissions: FULL_ALLOW_PERMISSIONS, dir: '/' },
				store as unknown as SettingsStore,
			);
			session.alwaysAllow('shell', 'npm');
			expect(store.alwaysAllow).toHaveBeenCalledWith('shell', 'npm');
		});

		it('delegates alwaysDeny to the settings store', () => {
			const store = makeStore();
			const session = new GatewaySession(
				{ permissions: FULL_ALLOW_PERMISSIONS, dir: '/' },
				store as unknown as SettingsStore,
			);
			session.alwaysDeny('shell', 'rm -rf /');
			expect(store.alwaysDeny).toHaveBeenCalledWith('shell', 'rm -rf /');
		});

		it('delegates flush to the settings store', async () => {
			const store = makeStore();
			const session = new GatewaySession(
				{ permissions: FULL_ALLOW_PERMISSIONS, dir: '/' },
				store as unknown as SettingsStore,
			);
			await session.flush();
			expect(store.flush).toHaveBeenCalled();
		});
	});
});
