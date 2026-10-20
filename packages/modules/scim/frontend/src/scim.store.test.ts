import type { ScimConfigResponse } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createPinia, setActivePinia } from 'pinia';

import { useScimStore } from './scim.store';

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' } }),
}));

type ApiMock = (...args: unknown[]) => Promise<unknown>;

const getScimConfigMock = vi.fn<ApiMock>();
const updateScimConfigMock = vi.fn<ApiMock>();
const generateScimTokenMock = vi.fn<ApiMock>();
const revokeScimTokenMock = vi.fn<ApiMock>();
const fetchScimTransferTargetsMock = vi.fn<ApiMock>();

vi.mock('./scim.api', () => ({
	getScimConfig: async (...args: unknown[]) => await getScimConfigMock(...args),
	updateScimConfig: async (...args: unknown[]) => await updateScimConfigMock(...args),
	generateScimToken: async (...args: unknown[]) => await generateScimTokenMock(...args),
	revokeScimToken: async (...args: unknown[]) => await revokeScimTokenMock(...args),
	fetchScimTransferTargets: async (...args: unknown[]) =>
		await fetchScimTransferTargetsMock(...args),
}));

export const makeConfig = (overrides: Partial<ScimConfigResponse> = {}): ScimConfigResponse => ({
	enabled: false,
	hasToken: false,
	tokenHint: null,
	baseUrl: 'https://n8n.example.com/scim/v2',
	token: null,
	lastAuthFailure: null,
	status: 'waiting',
	provisionedCount: 0,
	deactivatedCount: 0,
	onDelete: 'disable',
	dataAction: 'transfer',
	transferTarget: null,
	...overrides,
});

const withToken = (overrides: Partial<ScimConfigResponse> = {}) =>
	makeConfig({
		enabled: true,
		hasToken: true,
		tokenHint: '3f2a',
		token: {
			createdAt: '2026-06-12T10:00:00.000Z',
			createdBy: { id: 'u1', firstName: 'Jan', lastName: 'Kowalski' },
			lastUsedAt: null,
		},
		...overrides,
	});

function setSso(options: { saml?: boolean; oidc?: boolean }) {
	const settingsStore = useSettingsStore();
	settingsStore.settings.sso = {
		managedByEnv: false,
		saml: { loginLabel: '', loginEnabled: options.saml ?? false },
		oidc: { loginEnabled: options.oidc ?? false, loginUrl: '', callbackUrl: '' },
		ldap: { loginLabel: '', loginEnabled: false },
	};
	return settingsStore;
}

describe('useScimStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		setSso({ saml: true });
		useSettingsStore().settings.activeModules = ['scim'];
		useSettingsStore().moduleSettings = {
			scim: { scimEnabled: false, hasToken: false, available: true, optInSource: 'config' },
		};
	});

	describe('status and page state', () => {
		it('is disabled and off while the config says enabled: false', async () => {
			getScimConfigMock.mockResolvedValue(makeConfig());
			const store = useScimStore();

			await store.fetchConfig();

			expect(store.status).toBe('disabled');
			expect(store.pageState).toBe('off');
		});

		it('is no-token while SCIM is enabled without a token', async () => {
			getScimConfigMock.mockResolvedValue(makeConfig({ enabled: true, hasToken: false }));
			const store = useScimStore();

			await store.fetchConfig();

			expect(store.status).toBe('no-token');
			expect(store.pageState).toBe('no_token');
		});

		it('takes the backend status once a token exists', async () => {
			getScimConfigMock.mockResolvedValue(withToken({ status: 'waiting' }));
			const store = useScimStore();

			await store.fetchConfig();

			expect(store.status).toBe('waiting');
			expect(store.pageState).toBe('waiting');
		});

		it('is needs_sso before anything else while SAML and OIDC login are off', async () => {
			setSso({});
			getScimConfigMock.mockResolvedValue(withToken({ status: 'connected' }));
			const store = useScimStore();

			await store.fetchConfig();

			expect(store.isSsoEnabled).toBe(false);
			expect(store.pageState).toBe('needs_sso');
		});

		it('counts OIDC login as single sign-on', () => {
			setSso({ oidc: true });

			expect(useScimStore().isSsoEnabled).toBe(true);
		});

		it('reads the UI gate from the module settings, never from a user flag', () => {
			const store = useScimStore();
			expect(store.isScimUiEnabled).toBe(true);
			expect(store.optInSource).toBe('config');

			useSettingsStore().moduleSettings.scim!.available = false;

			expect(store.isScimUiEnabled).toBe(false);
		});
	});

	describe('enable', () => {
		it('turns SCIM on and generates a token when none is kept', async () => {
			getScimConfigMock
				.mockResolvedValueOnce(makeConfig())
				.mockResolvedValueOnce(withToken({ status: 'waiting' }));
			updateScimConfigMock.mockResolvedValue({ enabled: true });
			generateScimTokenMock.mockResolvedValue({ token: 'secret-token', baseUrl: '' });
			const store = useScimStore();
			await store.fetchConfig();

			await store.enable();

			expect(updateScimConfigMock).toHaveBeenCalledWith(expect.anything(), { enabled: true });
			expect(generateScimTokenMock).toHaveBeenCalledTimes(1);
			expect(store.revealedToken).toBe('secret-token');
			expect(store.pageState).toBe('waiting');
		});

		it('reuses a kept token instead of minting a new one', async () => {
			getScimConfigMock
				.mockResolvedValueOnce(makeConfig({ hasToken: true, tokenHint: '3f2a' }))
				.mockResolvedValueOnce(withToken());
			updateScimConfigMock.mockResolvedValue({ enabled: true });
			const store = useScimStore();
			await store.fetchConfig();

			await store.enable();

			expect(generateScimTokenMock).not.toHaveBeenCalled();
			expect(store.config?.tokenHint).toBe('3f2a');
		});

		it('keeps the off state when the enable request fails', async () => {
			getScimConfigMock.mockResolvedValue(makeConfig());
			updateScimConfigMock.mockRejectedValue(new Error('sso off'));
			const store = useScimStore();
			await store.fetchConfig();

			await expect(store.enable()).rejects.toThrow('sso off');

			expect(generateScimTokenMock).not.toHaveBeenCalled();
			expect(store.pageState).toBe('off');
		});
	});

	describe('disable', () => {
		it('sends only enabled: false, forgets the token value and the connected callout', async () => {
			getScimConfigMock
				.mockResolvedValueOnce(withToken({ status: 'connected' }))
				.mockResolvedValueOnce(makeConfig({ hasToken: true, tokenHint: '3f2a' }));
			updateScimConfigMock.mockResolvedValue({ enabled: false });
			const store = useScimStore();
			await store.fetchConfig();
			store.revealedToken = 'secret';
			store.connectedCallout = true;

			await store.disable();

			expect(updateScimConfigMock).toHaveBeenCalledWith(expect.anything(), { enabled: false });
			expect(store.revealedToken).toBeNull();
			expect(store.connectedCallout).toBe(false);
			expect(store.pageState).toBe('off');
			expect(store.config?.hasToken).toBe(true);
		});
	});

	describe('tokens', () => {
		it('keeps the generated token in memory only and reloads the config', async () => {
			getScimConfigMock.mockResolvedValue(withToken({ tokenHint: '9c1d' }));
			generateScimTokenMock.mockResolvedValue({ token: 'new-token', baseUrl: '' });
			const store = useScimStore();

			await store.generateToken();

			expect(store.revealedToken).toBe('new-token');
			expect(store.config?.tokenHint).toBe('9c1d');
			expect(JSON.stringify(window.localStorage)).not.toContain('new-token');
			expect(JSON.stringify(window.sessionStorage)).not.toContain('new-token');

			store.clearRevealedToken();

			expect(store.revealedToken).toBeNull();
		});

		it('revokes the token and leaves SCIM enabled', async () => {
			getScimConfigMock
				.mockResolvedValueOnce(withToken())
				.mockResolvedValueOnce(makeConfig({ enabled: true, hasToken: false }));
			revokeScimTokenMock.mockResolvedValue({ success: true });
			const store = useScimStore();
			await store.fetchConfig();

			await store.revokeToken();

			expect(revokeScimTokenMock).toHaveBeenCalledTimes(1);
			expect(store.pageState).toBe('no_token');
		});
	});

	describe('connected callout', () => {
		it('shows after the status goes from waiting to connected in this session', async () => {
			getScimConfigMock
				.mockResolvedValueOnce(withToken({ status: 'waiting' }))
				.mockResolvedValueOnce(withToken({ status: 'connected' }));
			const store = useScimStore();

			await store.fetchConfig();
			expect(store.connectedCallout).toBe(false);

			await store.fetchConfig();
			expect(store.connectedCallout).toBe(true);

			store.dismissConnectedCallout();
			expect(store.connectedCallout).toBe(false);
		});

		it('never shows for an instance that was connected before this session', async () => {
			getScimConfigMock.mockResolvedValue(withToken({ status: 'connected' }));
			const store = useScimStore();

			await store.fetchConfig();
			await store.fetchConfig();

			expect(store.connectedCallout).toBe(false);
		});
	});

	describe('module settings mirror', () => {
		it('updates the fields the SSO page reads after each config load', async () => {
			getScimConfigMock.mockResolvedValue(withToken());

			await useScimStore().fetchConfig();

			expect(useSettingsStore().moduleSettings.scim).toMatchObject({
				scimEnabled: true,
				hasToken: true,
				available: true,
			});
		});
	});

	describe('deprovisioning and transfer targets', () => {
		it('patches only the given fields and returns the reloaded config', async () => {
			getScimConfigMock.mockResolvedValue(withToken({ onDelete: 'delete' }));
			updateScimConfigMock.mockResolvedValue({});
			const store = useScimStore();

			const next = await store.setDeprovisioning({ onDelete: 'delete' });

			expect(updateScimConfigMock).toHaveBeenCalledWith(expect.anything(), {
				onDelete: 'delete',
			});
			expect(next.onDelete).toBe('delete');
		});

		it('sends only the defined query fields to the search endpoint', async () => {
			fetchScimTransferTargetsMock.mockResolvedValue({});
			const store = useScimStore();

			await store.searchTransferTargets({ search: 'an', take: 20 });
			await store.searchTransferTargets({});

			expect(fetchScimTransferTargetsMock).toHaveBeenNthCalledWith(1, expect.anything(), {
				search: 'an',
				take: 20,
			});
			expect(fetchScimTransferTargetsMock).toHaveBeenNthCalledWith(2, expect.anything(), {});
		});
	});
});
