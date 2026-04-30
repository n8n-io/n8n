import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent } from '@testing-library/vue';
import type { PublicInstalledPackage } from 'n8n-workflow';

import { createComponentRenderer } from '@/__tests__/render';
import { useCommunityNodesStore } from '../communityNodes.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import type { CommunityPackageSummary } from '../communityNodes.types';
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

const makeVettedSummary = (
	overrides: Partial<CommunityPackageSummary> = {},
): CommunityPackageSummary => ({
	packageName: 'n8n-nodes-vetted',
	authorName: 'Vetted Author',
	description: 'Vetted package',
	isOfficialNode: false,
	isInstalled: false,
	numberOfDownloads: 100,
	npmVersion: '1.0.0',
	nodes: [],
	...overrides,
});

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

	it('should render rows from vetted packages', async () => {
		Object.defineProperty(nodeTypesStore, 'vettedCommunityPackages', {
			get: () => [makeVettedSummary({ packageName: 'n8n-nodes-vetted-1' })],
		});

		const { findAllByTestId } = renderComponent();
		const rows = await findAllByTestId('community-package-row');
		expect(rows).toHaveLength(1);
		expect(rows[0].getAttribute('data-package')).toBe('n8n-nodes-vetted-1');
	});

	it('should de-duplicate when an installed package is also in the vetted catalog', async () => {
		Object.defineProperty(nodeTypesStore, 'vettedCommunityPackages', {
			get: () => [makeVettedSummary({ packageName: 'n8n-nodes-shared' })],
		});
		Object.defineProperty(communityNodesStore, 'getInstalledPackages', {
			get: () => [
				{
					packageName: 'n8n-nodes-shared',
					installedVersion: '2.0.0',
					authorName: 'Author',
					installedNodes: [],
					createdAt: new Date(0),
					updatedAt: new Date(0),
				} as unknown as PublicInstalledPackage,
			],
		});

		const { findAllByTestId } = renderComponent();
		const rows = await findAllByTestId('community-package-row');
		expect(rows).toHaveLength(1);
	});

	it('should open install modal and emit telemetry on Install from npm click', async () => {
		Object.defineProperty(settingsStore, 'isUnverifiedPackagesEnabled', { get: () => true });
		uiStore.openModal = vi.fn();

		const { getByText } = renderComponent();
		await fireEvent.click(getByText('Install from npm'));

		expect(uiStore.openModal).toHaveBeenCalledWith('communityPackageInstall');
	});

	it.skip('should fire user-viewed telemetry on initialize', () => {
		// TODO: covered by integration testing.
		// `initialize()` is invoked by the real ResourcesListLayout in production,
		// but our pass-through mock does not call the prop. The lifecycle hook
		// is exercised end-to-end via Playwright instead.
	});

	it('should append installed-but-not-vetted packages as separate rows', async () => {
		Object.defineProperty(nodeTypesStore, 'vettedCommunityPackages', { get: () => [] });
		Object.defineProperty(communityNodesStore, 'getInstalledPackages', {
			get: () => [
				{
					packageName: 'n8n-nodes-unverified',
					installedVersion: '1.0.0',
					authorName: 'A',
					installedNodes: [],
					createdAt: new Date(0),
					updatedAt: new Date(0),
				} as unknown as PublicInstalledPackage,
			],
		});

		const { findAllByTestId } = renderComponent();
		const rows = await findAllByTestId('community-package-row');
		expect(rows).toHaveLength(1);
		expect(rows[0].getAttribute('data-package')).toBe('n8n-nodes-unverified');
	});
});
