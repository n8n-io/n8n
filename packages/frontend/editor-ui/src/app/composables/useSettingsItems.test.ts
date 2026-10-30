import { computed, ref } from 'vue';
import type { SettingsSectionId } from '@n8n/frontend-module-sdk';

import { PROMOTIONS_SETTINGS_VIEW } from '@/features/integrations/promotions.ee/promotions.constants';
import { useSettingsItems } from './useSettingsItems';
import { VIEWS } from '../constants';
import { hasPermission } from '../utils/rbac/permissions';

const isAiGatewayCloudUbbEnabled = ref(false);
const isAiGatewayEnabled = ref(true);
const isAiAssistantEnabled = ref(false);
const isPublicApiEnabled = ref(false);
const isQueueModeEnabled = ref(false);
const balance = ref<number>();
const moduleSettings = ref<Record<string, unknown>>({});
// `ui.store` stamps `available: true` onto every module item before exposing it.
const settingsSidebarItems = ref<
	Array<{ id: string; available: boolean; order?: number; section?: SettingsSectionId }>
>([]);
const activeModules = ref<string[]>([]);
const promotionsFlag = ref('false');
const environmentsVersion = ref<'v1' | 'v2'>();
const canUserAccessRouteByName = vi.hoisted(() => vi.fn<(name: string) => boolean>(() => true));
const contextEnabled = vi.hoisted(() => ({ value: true }));
const openTopUpMock = vi.hoisted(() => vi.fn());

vi.mock('vue-router', () => ({ useRouter: vi.fn(() => ({})) }));
vi.mock('./useUserHelpers', () => ({
	useUserHelpers: vi.fn(() => ({ canUserAccessRouteByName })),
}));
vi.mock('@/features/settings/context/context.utils', () => ({
	isContextEnabled: () => contextEnabled.value,
}));
vi.mock('./useAiGateway', () => ({
	useAiGateway: vi.fn(() => ({ balance: computed(() => balance.value) })),
}));
vi.mock('./useAiGatewayTopUp', () => ({
	useAiGatewayTopUp: vi.fn(() => ({ openTopUp: openTopUpMock })),
}));
vi.mock('@n8n/i18n', () => ({ useI18n: vi.fn(() => ({ baseText: (key: string) => key })) }));
vi.mock('../stores/ui.store', () => ({
	useUIStore: vi.fn(() => ({
		get settingsSidebarItems() {
			return settingsSidebarItems.value;
		},
	})),
}));
vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({
		get isAiAssistantEnabled() {
			return isAiAssistantEnabled.value;
		},
		get isAiGatewayEnabled() {
			return isAiGatewayEnabled.value;
		},
		get isAiGatewayCloudUbbEnabled() {
			return isAiGatewayCloudUbbEnabled.value;
		},
		get isPublicApiEnabled() {
			return isPublicApiEnabled.value;
		},
		get isQueueModeEnabled() {
			return isQueueModeEnabled.value;
		},
		isModuleActive: (name: string) => activeModules.value.includes(name),
		get settings() {
			return { envFeatureFlags: { N8N_ENV_FEAT_PROMOTIONS: promotionsFlag.value } };
		},
		get moduleSettings() {
			return moduleSettings.value;
		},
	})),
}));
vi.mock('@/features/integrations/sourceControl.ee/sourceControl.store', () => ({
	useSourceControlStore: vi.fn(() => ({
		get preferences() {
			return { environmentsVersion: environmentsVersion.value };
		},
	})),
}));
vi.mock('../utils/rbac/permissions', () => ({ hasPermission: vi.fn(() => false) }));

describe('useSettingsItems', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		isAiGatewayEnabled.value = true;
		isAiGatewayCloudUbbEnabled.value = false;
		isAiAssistantEnabled.value = false;
		isPublicApiEnabled.value = false;
		isQueueModeEnabled.value = false;
		balance.value = undefined;
		moduleSettings.value = {};
		settingsSidebarItems.value = [];
		activeModules.value = [];
		promotionsFlag.value = 'false';
		environmentsVersion.value = undefined;
		canUserAccessRouteByName.mockReturnValue(true);
		contextEnabled.value = true;
	});

	// Module items in registration order, with the orders and sections the real modules set.
	const realModuleItems = () => [
		{ id: 'settings-log-streaming', available: true, order: 40, section: 'operations' as const },
		{ id: 'settings-mcp', available: true, order: 10, section: 'ai' as const },
		{ id: 'settings-chat-hub', available: true, order: 70, section: 'ai' as const },
		{ id: 'settings-instance-ai', available: true, order: 20, section: 'ai' as const },
		{ id: 'settings-agents', available: true, order: 30, section: 'ai' as const },
		{ id: 'settings-opentelemetry', available: true, order: 50, section: 'operations' as const },
	];

	const makeEverythingAvailable = () => {
		isAiAssistantEnabled.value = true;
		isPublicApiEnabled.value = true;
		isQueueModeEnabled.value = true;
		moduleSettings.value = { 'encryption-key-manager': { rotationEnabled: true } };
		activeModules.value = ['promotions', 'instance-ai'];
		promotionsFlag.value = 'true';
		environmentsVersion.value = 'v2';
		vi.mocked(hasPermission).mockReturnValue(true);
		settingsSidebarItems.value = realModuleItems();
	};

	describe('sidebar order', () => {
		it('lists every link in the established order when all are available', () => {
			makeEverythingAvailable();

			const ids = useSettingsItems().settingsItems.value.map(({ id }) => id);

			expect(ids).toEqual([
				'settings-personal',
				'settings-users',
				'settings-roles',
				'settings-authentication',
				'settings-mcp',
				'settings-instance-ai',
				'settings-agents',
				'settings-context',
				'settings-chat-hub',
				'settings-api',
				'settings-community-nodes',
				'settings-security',
				'settings-external-secrets',
				'settings-credential-resolvers',
				'settings-encryption-keys',
				'settings-promotions',
				'settings-workersview',
				'settings-log-streaming',
				'settings-opentelemetry',
				'settings-migration-report',
				'settings-n8n-connect',
				'settings-usage-and-plan',
			]);
		});
	});

	describe('sections', () => {
		const sectionsOf = () =>
			useSettingsItems().settingsSections.value.map(({ id, title, items }) => ({
				id,
				title,
				items: items.map((item) => item.id),
			}));

		it('groups every link under its heading, in the established order', () => {
			makeEverythingAvailable();

			expect(sectionsOf()).toEqual([
				{
					id: 'personal',
					title: 'settings.sections.personal',
					items: ['settings-personal'],
				},
				{
					id: 'people',
					title: 'settings.sections.people',
					items: ['settings-users', 'settings-roles', 'settings-authentication'],
				},
				{
					id: 'ai',
					title: 'settings.sections.ai',
					items: [
						'settings-mcp',
						'settings-instance-ai',
						'settings-agents',
						'settings-context',
						'settings-chat-hub',
					],
				},
				{
					id: 'integrations',
					title: 'settings.sections.integrations',
					items: ['settings-api', 'settings-community-nodes'],
				},
				{
					id: 'security',
					title: 'settings.sections.security',
					items: [
						'settings-security',
						'settings-external-secrets',
						'settings-credential-resolvers',
						'settings-encryption-keys',
					],
				},
				{
					id: 'operations',
					title: 'settings.sections.operations',
					items: [
						'settings-promotions',
						'settings-workersview',
						'settings-log-streaming',
						'settings-opentelemetry',
						'settings-migration-report',
					],
				},
				{
					id: 'billing',
					title: 'settings.sections.billing',
					items: ['settings-n8n-connect', 'settings-usage-and-plan'],
				},
			]);
		});

		it('leaves out a section with no visible link', () => {
			isPublicApiEnabled.value = false;
			canUserAccessRouteByName.mockImplementation((name) => name !== VIEWS.COMMUNITY_NODES);

			expect(sectionsOf().map(({ id }) => id)).not.toContain('integrations');
		});

		it('keeps the headings of the pages a member without admin pages can open', () => {
			canUserAccessRouteByName.mockImplementation(
				(name) => name === VIEWS.USAGE || name === VIEWS.PERSONAL_SETTINGS,
			);
			isAiGatewayEnabled.value = false;

			expect(sectionsOf()).toEqual([
				{
					id: 'personal',
					title: 'settings.sections.personal',
					items: ['settings-personal'],
				},
				{
					id: 'billing',
					title: 'settings.sections.billing',
					items: ['settings-usage-and-plan'],
				},
			]);
		});
	});

	describe('module item order', () => {
		const idsOf = () => useSettingsItems().settingsItems.value.map(({ id }) => id);

		it('places a module item between the shell items with the nearest orders in its section', () => {
			settingsSidebarItems.value = [
				{ id: 'settings-module', available: true, order: 15, section: 'security' },
			];

			const ids = idsOf();

			expect(ids.indexOf('settings-module')).toBe(ids.indexOf('settings-security') + 1);
			expect(ids.indexOf('settings-module')).toBe(ids.indexOf('settings-external-secrets') - 1);
		});

		it('places a module item without order last in its section', () => {
			settingsSidebarItems.value = [
				{ id: 'settings-module', available: true, section: 'security' },
			];

			const ids = idsOf();

			expect(ids.indexOf('settings-module')).toBe(ids.indexOf('settings-credential-resolvers') + 1);
			expect(ids.indexOf('settings-module')).toBe(ids.indexOf('settings-source-control') - 1);
		});

		it('places a module item without section before the first heading', () => {
			settingsSidebarItems.value = [{ id: 'settings-module', available: true }];

			const ids = idsOf();
			const sections = useSettingsItems().settingsSections.value;

			expect(ids.indexOf('settings-module')).toBe(0);
			expect(sections[0]).toMatchObject({ id: 'general', title: undefined });
			expect(sections[0].items.map(({ id }) => id)).toEqual(['settings-module']);
			expect(sections[1]).toMatchObject({ id: 'personal' });
		});

		it('keeps registration order for equal orders', () => {
			settingsSidebarItems.value = [
				{ id: 'settings-first', available: true, order: 25 },
				{ id: 'settings-second', available: true, order: 25 },
				{ id: 'settings-third', available: true },
				{ id: 'settings-fourth', available: true },
			];

			const ids = idsOf();

			expect(ids.indexOf('settings-second')).toBe(ids.indexOf('settings-first') + 1);
			expect(ids.indexOf('settings-fourth')).toBe(ids.indexOf('settings-third') + 1);
		});
	});

	describe('the AI usage item', () => {
		const idsOf = () => useSettingsItems().settingsItems.value.map(({ id }) => id);

		it('is listed while the instance-ai module is disabled and the AI assistant is on', () => {
			isAiAssistantEnabled.value = true;
			activeModules.value = [];

			expect(idsOf()).toContain('settings-ai');
		});

		it('gives way to the Assistant page while the instance-ai module runs', () => {
			isAiAssistantEnabled.value = true;
			activeModules.value = ['instance-ai'];

			expect(idsOf()).not.toContain('settings-ai');
		});

		it('is hidden when the module runs, even if its sidebar item is unavailable', () => {
			isAiAssistantEnabled.value = true;
			activeModules.value = ['instance-ai'];
			settingsSidebarItems.value = [
				{ id: 'settings-instance-ai', available: false, order: 20, section: 'ai' },
			];

			expect(idsOf()).not.toContain('settings-ai');
		});

		it('is hidden when the AI assistant is off, whatever the module does', () => {
			isAiAssistantEnabled.value = false;
			activeModules.value = [];

			expect(idsOf()).not.toContain('settings-ai');
		});

		it('sits second last in AI, directly before Chat', () => {
			isAiAssistantEnabled.value = true;
			activeModules.value = [];
			settingsSidebarItems.value = [
				{ id: 'settings-mcp', available: true, order: 10, section: 'ai' },
				{ id: 'settings-agents', available: true, order: 30, section: 'ai' },
				{ id: 'settings-chat-hub', available: true, order: 70, section: 'ai' },
			];

			const ids = idsOf();

			expect(ids.indexOf('settings-ai')).toBe(ids.indexOf('settings-context') + 1);
			expect(ids.indexOf('settings-chat-hub')).toBe(ids.indexOf('settings-ai') + 1);
		});
	});

	describe('the Context item', () => {
		const idsOf = () => useSettingsItems().settingsItems.value.map(({ id }) => id);

		it('follows Agents and precedes AI usage; Chat stays the last AI link', () => {
			isAiAssistantEnabled.value = true;
			settingsSidebarItems.value = [
				{ id: 'settings-mcp', available: true, order: 10, section: 'ai' },
				{ id: 'settings-agents', available: true, order: 30, section: 'ai' },
				{ id: 'settings-chat-hub', available: true, order: 70, section: 'ai' },
			];

			const ids = idsOf();

			expect(ids.indexOf('settings-context')).toBe(ids.indexOf('settings-agents') + 1);
			expect(ids.indexOf('settings-context')).toBe(ids.indexOf('settings-ai') - 1);
			expect(ids.indexOf('settings-chat-hub')).toBe(ids.indexOf('settings-ai') + 1);
			expect(ids.indexOf('settings-chat-hub')).toBe(ids.indexOf('settings-community-nodes') - 1);
		});

		it('is hidden when the flag is off, because the route guard does not run here', () => {
			contextEnabled.value = false;

			expect(idsOf()).not.toContain('settings-context');
		});
	});

	describe('Environments v2', () => {
		const idsOf = () => useSettingsItems().settingsItems.value.map(({ id }) => id);

		beforeEach(() => {
			activeModules.value = ['promotions'];
			promotionsFlag.value = 'true';
			environmentsVersion.value = 'v2';
		});

		it('leaves the slot to Environments while the instance uses v1', () => {
			environmentsVersion.value = 'v1';

			const operations = useSettingsItems().settingsSections.value.find(
				({ id }) => id === 'operations',
			);

			expect(operations?.items[0]?.id).toBe('settings-source-control');
			expect(idsOf()).not.toContain('settings-promotions');
		});

		it('is hidden when the feature flag is off', () => {
			promotionsFlag.value = 'false';

			expect(useSettingsItems().settingsItems.value.map(({ id }) => id)).not.toContain(
				'settings-promotions',
			);
		});

		it('is hidden when the promotions module is inactive', () => {
			activeModules.value = ['source-control'];

			expect(useSettingsItems().settingsItems.value.map(({ id }) => id)).not.toContain(
				'settings-promotions',
			);
		});

		it('is hidden when route access is denied', () => {
			canUserAccessRouteByName.mockImplementation((name) => name !== PROMOTIONS_SETTINGS_VIEW);

			expect(useSettingsItems().settingsItems.value.map(({ id }) => id)).not.toContain(
				'settings-promotions',
			);
		});
	});

	it('hides the encryption keys item while rotation is disabled', () => {
		const item = useSettingsItems().settingsItems.value.find(
			({ id }) => id === 'settings-encryption-keys',
		);

		expect(item).toBeUndefined();
	});

	it('shows the encryption keys item when the module reports rotation as enabled', () => {
		moduleSettings.value = { 'encryption-key-manager': { rotationEnabled: true } };

		const item = useSettingsItems().settingsItems.value.find(
			({ id }) => id === 'settings-encryption-keys',
		);

		expect(item?.available).toBe(true);
	});

	it('lists Gateway credits first under Billing', () => {
		const billing = useSettingsItems().settingsSections.value.find(({ id }) => id === 'billing');

		expect(billing?.items.map(({ id }) => id)).toEqual([
			'settings-n8n-connect',
			'settings-usage-and-plan',
		]);
	});

	it('links to the n8n Connect settings page for the legacy cohort', () => {
		const item = useSettingsItems().settingsItems.value.find(
			({ id }) => id === 'settings-n8n-connect',
		);

		expect(item).toMatchObject({
			label: 'settings.n8nConnect',
			route: { to: { name: VIEWS.AI_GATEWAY_SETTINGS } },
		});
	});

	it('shows n8n credits with the balance and no internal route for Cloud UBB', () => {
		isAiGatewayCloudUbbEnabled.value = true;
		balance.value = 1.23;

		const item = useSettingsItems().settingsItems.value.find(
			({ id }) => id === 'settings-n8n-connect',
		);

		expect(item).toMatchObject({
			label: 'settings.n8nCredits',
			creditsTag: 'aiGateway.wallet.balanceRemaining',
		});
		expect(item?.route).toBeUndefined();
	});

	it('hides n8n credits when AI Gateway is disabled', () => {
		isAiGatewayEnabled.value = false;
		isAiGatewayCloudUbbEnabled.value = true;

		const item = useSettingsItems().settingsItems.value.find(
			({ id }) => id === 'settings-n8n-connect',
		);

		expect(item).toBeUndefined();
	});

	it('opens the top-up flow only for the Cloud UBB credits item', async () => {
		const { handleSettingsItemSelect } = useSettingsItems();

		await handleSettingsItemSelect('settings-n8n-connect');
		expect(openTopUpMock).not.toHaveBeenCalled();

		isAiGatewayCloudUbbEnabled.value = true;
		await handleSettingsItemSelect('settings-users');
		expect(openTopUpMock).not.toHaveBeenCalled();

		await handleSettingsItemSelect('settings-n8n-connect');
		expect(openTopUpMock).toHaveBeenCalledWith({ source: 'settings_page' });
	});
});
