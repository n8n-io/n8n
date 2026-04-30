import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';

import { createComponentRenderer } from '@/__tests__/render';
import { useCommunityNodesStore } from '../communityNodes.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import SettingsCommunityNodesView from './SettingsCommunityNodesView.vue';

vi.mock('@/app/composables/usePushConnection', () => ({
	usePushConnection: vi.fn(() => ({ initialize: vi.fn(), terminate: vi.fn() })),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({ track: vi.fn() })),
}));

vi.mock('@/app/composables/useExternalHooks', () => ({
	useExternalHooks: vi.fn(() => ({ run: vi.fn() })),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn(() => ({ showError: vi.fn() })),
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: vi.fn(() => ({ set: vi.fn() })),
}));

vi.mock('@/app/components/layouts/ResourcesListLayout.vue', () => ({
	default: {
		props: ['resources', 'filters', 'loading', 'additionalFiltersHandler'],
		template: `
			<div data-test-id="resources-list-layout">
				<slot name="header" />
				<slot name="filters" :setKeyValue="(k, v) => null" />
				<slot v-for="r in resources" :data="r" :key="r.id" />
				<slot name="empty" v-if="!resources.length" />
			</div>
		`,
	},
}));

vi.mock('../components/CommunityPackageRow.vue', () => ({
	default: {
		props: ['row', 'loading'],
		template: '<div data-test-id="community-package-row" :data-package="row?.packageName" />',
	},
}));

const renderComponent = createComponentRenderer(SettingsCommunityNodesView);

describe('SettingsCommunityNodesView', () => {
	let communityNodesStore: ReturnType<typeof useCommunityNodesStore>;
	let nodeTypesStore: ReturnType<typeof useNodeTypesStore>;
	let settingsStore: ReturnType<typeof useSettingsStore>;
	let uiStore: ReturnType<typeof useUIStore>;

	beforeEach(() => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);
		communityNodesStore = useCommunityNodesStore();
		nodeTypesStore = useNodeTypesStore();
		settingsStore = useSettingsStore();
		uiStore = useUIStore();

		Object.defineProperty(communityNodesStore, 'getInstalledPackages', { get: () => [] });
		Object.defineProperty(nodeTypesStore, 'vettedCommunityPackages', { get: () => [] });
		Object.defineProperty(settingsStore, 'isCommunityNodesFeatureEnabled', { get: () => true });
		Object.defineProperty(settingsStore, 'isUnverifiedPackagesEnabled', { get: () => false });
		nodeTypesStore.getNodeType = vi.fn(() => null);
		nodeTypesStore.fetchCommunityNodePreviews = vi.fn().mockResolvedValue(undefined);
		communityNodesStore.fetchInstalledPackages = vi.fn().mockResolvedValue(undefined);
		communityNodesStore.fetchAvailableCommunityPackageCount = vi.fn().mockResolvedValue(undefined);
	});

	it('should render the page heading', () => {
		const { getByText } = renderComponent();
		expect(getByText('Community nodes')).toBeInTheDocument();
	});

	it('should render verified-only subheader when isUnverifiedPackagesEnabled is false', () => {
		const { getByText, queryByText } = renderComponent();
		expect(getByText(/verified by n8n/i)).toBeInTheDocument();
		expect(queryByText(/install an unverified package/i)).not.toBeInTheDocument();
	});

	it('should render withNpm subheader when isUnverifiedPackagesEnabled is true', () => {
		Object.defineProperty(settingsStore, 'isUnverifiedPackagesEnabled', { get: () => true });
		const { getByText } = renderComponent();
		expect(getByText(/install an unverified package by npm name/i)).toBeInTheDocument();
	});

	it('should render Install from npm button when isUnverifiedPackagesEnabled is true', () => {
		Object.defineProperty(settingsStore, 'isUnverifiedPackagesEnabled', { get: () => true });
		const { getByText } = renderComponent();
		expect(getByText('Install from npm')).toBeInTheDocument();
	});

	it('should not render Install from npm button when isUnverifiedPackagesEnabled is false', () => {
		const { queryByText } = renderComponent();
		expect(queryByText('Install from npm')).not.toBeInTheDocument();
	});
});
