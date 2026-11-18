import { createPinia, setActivePinia } from 'pinia';

import { getRuntimeCredentialRules, updateRuntimeCredentialRules } from './runtime-credentials.api';
import { useRuntimeCredentialsStore } from './runtime-credentials.store';

vi.mock('./runtime-credentials.api', () => ({
	getRuntimeCredentialRules: vi.fn(),
	updateRuntimeCredentialRules: vi.fn(),
}));

const getModuleSettings = vi.fn(async () => {});
vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: () => ({ getModuleSettings }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost', pushRef: '' } }),
}));

const envRule = {
	alias: 'env_key',
	nodeType: '*',
	path: 'headers.authorization',
	source: 'env',
} as const;
const savedRule = {
	alias: 'tenant_key',
	nodeType: 'n8n-nodes-base.webhook',
	path: 'headers.x-tenant-key',
	description: 'Tenant key',
	source: 'settings',
} as const;

describe('useRuntimeCredentialsStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.mocked(getRuntimeCredentialRules).mockResolvedValue({ rules: [envRule, savedRule] });
		vi.mocked(updateRuntimeCredentialRules).mockImplementation(async (_context, rules) => ({
			rules: [envRule, ...rules.map((rule) => ({ ...rule, source: 'settings' as const }))],
		}));
	});

	it('splits env rules from saved rules', async () => {
		const store = useRuntimeCredentialsStore();

		await store.fetchRules();

		expect(store.envRules).toEqual([envRule]);
		expect(store.savedRules).toEqual([savedRule]);
	});

	it('sends only the saved rules, without their source, when it adds a rule', async () => {
		const store = useRuntimeCredentialsStore();
		await store.fetchRules();

		await store.upsertRule({ alias: 'form_pw', nodeType: '*', path: 'body.password' });

		expect(updateRuntimeCredentialRules).toHaveBeenCalledWith(expect.anything(), [
			{
				alias: 'tenant_key',
				nodeType: 'n8n-nodes-base.webhook',
				path: 'headers.x-tenant-key',
				description: 'Tenant key',
			},
			{ alias: 'form_pw', nodeType: '*', path: 'body.password' },
		]);
	});

	it('replaces the rule it edits, even when the alias changes', async () => {
		const store = useRuntimeCredentialsStore();
		await store.fetchRules();

		await store.upsertRule({ alias: 'renamed', nodeType: '*', path: 'body.key' }, 'tenant_key');

		expect(updateRuntimeCredentialRules).toHaveBeenCalledWith(expect.anything(), [
			{ alias: 'renamed', nodeType: '*', path: 'body.key' },
		]);
	});

	it('refuses to save before the rules load, so a save cannot drop unloaded rules', async () => {
		const store = useRuntimeCredentialsStore();

		await expect(
			store.upsertRule({ alias: 'new_key', nodeType: '*', path: 'body.key' }),
		).rejects.toThrow('not loaded');
		expect(updateRuntimeCredentialRules).not.toHaveBeenCalled();
	});

	it('refreshes the module settings after a save, so the editor sees the new aliases', async () => {
		const store = useRuntimeCredentialsStore();
		await store.fetchRules();

		await store.removeRule('tenant_key');

		expect(getModuleSettings).toHaveBeenCalled();
	});

	it('removes a saved rule', async () => {
		const store = useRuntimeCredentialsStore();
		await store.fetchRules();

		await store.removeRule('tenant_key');

		expect(updateRuntimeCredentialRules).toHaveBeenCalledWith(expect.anything(), []);
		expect(store.savedRules).toEqual([]);
	});
});
