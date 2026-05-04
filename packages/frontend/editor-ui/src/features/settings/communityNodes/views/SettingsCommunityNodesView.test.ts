import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { fireEvent, waitFor } from '@testing-library/vue';
import { computed, defineComponent, onMounted, type PropType } from 'vue';
import type { PublicInstalledPackage } from 'n8n-workflow';

import { createComponentRenderer } from '@/__tests__/render';
import type { BaseFilters } from '@/Interface';
import { useCommunityNodesStore } from '../communityNodes.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useExternalHooks } from '@/app/composables/useExternalHooks';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useToast } from '@/app/composables/useToast';
import type { CommunityPackageRowData, CommunityPackageSummary } from '../communityNodes.types';
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
	default: defineComponent({
		props: {
			resources: {
				type: Array as PropType<CommunityPackageRowData[]>,
				default: () => [],
			},
			filters: {
				type: Object as PropType<BaseFilters>,
				default: () => ({ search: '', homeProject: '' }),
			},
			loading: Boolean,
			additionalFiltersHandler: Function as PropType<
				(resource: CommunityPackageRowData, filters: BaseFilters, matches: boolean) => boolean
			>,
			displayName: Function as PropType<(resource: CommunityPackageRowData) => string>,
			initialize: Function as PropType<() => Promise<void>>,
			resourceKey: String,
			uiConfig: Object as PropType<{ sortEnabled?: boolean }>,
		},
		emits: ['update:filters'],
		setup(props, { emit }) {
			onMounted(() => {
				void props.initialize?.();
			});

			const hasAppliedFilters = computed(() =>
				Object.keys(props.filters).some((key) => {
					if (key === 'search') return false;

					const value = props.filters[key];
					if (typeof value === 'boolean') return value;
					if (Array.isArray(value)) return value.length > 0;

					return value !== '';
				}),
			);

			const filteredResources = computed(() =>
				props.resources.filter((resource) => {
					let matches = true;
					if (props.filters.search) {
						const displayName = props.displayName?.(resource) ?? resource.name ?? '';
						matches = displayName.toLowerCase().includes(props.filters.search.toLowerCase());
					}

					return props.additionalFiltersHandler?.(resource, props.filters, matches) ?? matches;
				}),
			);

			const setKeyValue = (key: string, value: unknown) => {
				emit('update:filters', { ...props.filters, [key]: value });
			};

			return { filteredResources, hasAppliedFilters, setKeyValue };
		},
		template: `
			<div data-test-id="resources-list-layout" :data-resource-key="resourceKey">
				<slot name="header" />
				<slot name="filters" :setKeyValue="setKeyValue" />
				<span data-test-id="display-name-provided">{{ displayName ? 'yes' : 'no' }}</span>
				<span data-test-id="sort-enabled">{{ String(uiConfig?.sortEnabled) }}</span>
				<span
					data-test-id="active-filters"
					:data-active="String(hasAppliedFilters)"
					:data-type="filters.type"
					:data-installed-only="String(filters.installedOnly)"
				/>
				<button data-test-id="filter-official" @click="setKeyValue('type', 'official')" />
				<button data-test-id="filter-community" @click="setKeyValue('type', 'community')" />
				<button data-test-id="filter-all" @click="setKeyValue('type', 'all')" />
				<button data-test-id="filter-installed-only" @click="setKeyValue('installedOnly', true)" />
				<button data-test-id="reset-like-filters" @click="$emit('update:filters', { ...filters, type: '', installedOnly: '' })" />
				<button data-test-id="search-author" @click="setKeyValue('search', 'trusted author')" />
				<button data-test-id="search-description" @click="setKeyValue('search', 'useful webhook tools')" />
				<slot v-for="r in filteredResources" :data="r" :key="r.id" />
				<slot name="empty" v-if="!resources.length" />
			</div>
		`,
	}),
}));

vi.mock('../components/CommunityPackageRow.vue', () => ({
	default: {
		props: ['row', 'loading'],
		template: `
			<div
				data-test-id="community-package-row"
				:data-package="row?.packageName"
				:data-installed="String(row?.isInstalled)"
				:data-version="row?.installedVersion"
				:data-verified="String(row?.isVerified)"
			/>
		`,
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

const makeInstalledPackage = (
	overrides: Partial<PublicInstalledPackage> = {},
): PublicInstalledPackage =>
	({
		packageName: 'n8n-nodes-installed',
		installedVersion: '1.0.0',
		authorName: 'Installed Author',
		installedNodes: [],
		createdAt: new Date(0),
		updatedAt: new Date(0),
		...overrides,
	}) as unknown as PublicInstalledPackage;

describe('SettingsCommunityNodesView', () => {
	let communityNodesStore: ReturnType<typeof useCommunityNodesStore>;
	let nodeTypesStore: ReturnType<typeof useNodeTypesStore>;
	let settingsStore: ReturnType<typeof useSettingsStore>;
	let uiStore: ReturnType<typeof useUIStore>;

	beforeEach(() => {
		vi.clearAllMocks();
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
		Object.defineProperty(nodeTypesStore, 'getNodeType', {
			value: vi.fn(() => null),
			configurable: true,
		});
		nodeTypesStore.fetchCommunityNodePreviews = vi.fn().mockResolvedValue(undefined);
		communityNodesStore.fetchInstalledPackages = vi.fn().mockResolvedValue(undefined);
		communityNodesStore.fetchAvailableCommunityPackageCount = vi.fn().mockResolvedValue(undefined);
	});

	it('should render the page heading', () => {
		const { getByTestId, getByText } = renderComponent();
		expect(getByText('Community nodes')).toBeInTheDocument();
		expect(getByTestId('resources-list-layout')).toHaveAttribute(
			'data-resource-key',
			'communityNodes',
		);
		expect(getByTestId('sort-enabled')).toHaveTextContent('false');
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

	it('should render Install from npm button when isUnverifiedPackagesEnabled is true', async () => {
		Object.defineProperty(settingsStore, 'isUnverifiedPackagesEnabled', { get: () => true });
		const { findByText } = renderComponent();
		expect(await findByText('Install from npm')).toBeInTheDocument();
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
		expect(rows[0]).toHaveAttribute('data-installed', 'true');
		expect(rows[0]).toHaveAttribute('data-version', '2.0.0');
		expect(rows[0]).toHaveAttribute('data-verified', 'true');
	});

	it('should open install modal and emit telemetry on Install from npm click', async () => {
		Object.defineProperty(settingsStore, 'isUnverifiedPackagesEnabled', { get: () => true });
		uiStore.openModal = vi.fn();

		const { findByText } = renderComponent();
		await fireEvent.click(await findByText('Install from npm'));

		expect(uiStore.openModal).toHaveBeenCalledWith('communityPackageInstall');
		expect(vi.mocked(useTelemetry).mock.results.at(-1)?.value.track).toHaveBeenCalledWith(
			'user clicked cnr install button',
			{ is_empty_state: true },
		);
		expect(vi.mocked(useExternalHooks).mock.results.at(-1)?.value.run).toHaveBeenCalledWith(
			'settingsCommunityNodesView.openInstallModal',
			{ is_empty_state: true },
		);
	});

	it('should load community node data and fire user-viewed telemetry on initialize', async () => {
		Object.defineProperty(communityNodesStore, 'getInstalledPackages', {
			get: () => [
				makeInstalledPackage({
					packageName: 'n8n-nodes-installed',
					installedVersion: '1.0.0',
					updateAvailable: '1.1.0',
					installedNodes: [
						{
							name: 'Installed Node',
							type: 'n8n-nodes-installed.installedNode',
							latestVersion: 2,
							package: makeInstalledPackage(),
						},
					],
				}),
			],
		});

		renderComponent();

		await waitFor(() => {
			expect(communityNodesStore.fetchInstalledPackages).toHaveBeenCalled();
			expect(communityNodesStore.fetchAvailableCommunityPackageCount).toHaveBeenCalled();
			expect(nodeTypesStore.fetchCommunityNodePreviews).toHaveBeenCalled();
			expect(vi.mocked(useTelemetry).mock.results.at(-1)?.value.track).toHaveBeenCalledWith(
				'user viewed cnr settings page',
				{
					num_of_packages_installed: 1,
					installed_packages: [
						{
							package_name: 'n8n-nodes-installed',
							package_version: '1.0.0',
							package_nodes: ['Installed Node-v2'],
							is_update_available: true,
						},
					],
					packages_to_update: [
						{
							package_name: 'n8n-nodes-installed',
							package_version_current: '1.0.0',
							package_version_available: '1.1.0',
						},
					],
					number_of_updates_available: 1,
				},
			);
		});
	});

	it('should fire user-viewed telemetry when community package previews fail', async () => {
		Object.defineProperty(communityNodesStore, 'getInstalledPackages', {
			get: () => [
				makeInstalledPackage({
					packageName: 'n8n-nodes-installed',
					installedVersion: '1.0.0',
				}),
			],
		});
		nodeTypesStore.fetchCommunityNodePreviews = vi
			.fn()
			.mockRejectedValue(new Error('Preview failed'));

		renderComponent();

		await waitFor(() => {
			expect(communityNodesStore.fetchInstalledPackages).toHaveBeenCalled();
			expect(nodeTypesStore.fetchCommunityNodePreviews).toHaveBeenCalled();
			expect(vi.mocked(useTelemetry).mock.results.at(-1)?.value.track).toHaveBeenCalledWith(
				'user viewed cnr settings page',
				expect.objectContaining({
					num_of_packages_installed: 1,
				}),
			);
		});
		expect(vi.mocked(useToast).mock.results.at(-1)?.value.showError).not.toHaveBeenCalled();
	});

	it('should append installed-but-not-vetted packages as separate rows', async () => {
		Object.defineProperty(nodeTypesStore, 'vettedCommunityPackages', { get: () => [] });
		Object.defineProperty(communityNodesStore, 'getInstalledPackages', {
			get: () => [
				makeInstalledPackage({
					packageName: 'n8n-nodes-unverified',
					authorName: 'A',
				}),
			],
		});

		const { findAllByTestId } = renderComponent();
		const rows = await findAllByTestId('community-package-row');
		expect(rows).toHaveLength(1);
		expect(rows[0].getAttribute('data-package')).toBe('n8n-nodes-unverified');
	});

	it('should provide searchable text to ResourcesListLayout', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('display-name-provided')).toHaveTextContent('yes');
	});

	it('should filter package rows by type', async () => {
		Object.defineProperty(nodeTypesStore, 'vettedCommunityPackages', {
			get: () => [
				makeVettedSummary({ packageName: 'n8n-nodes-official', isOfficialNode: true }),
				makeVettedSummary({ packageName: 'n8n-nodes-community', isOfficialNode: false }),
			],
		});

		const { findByTestId, getAllByTestId } = renderComponent();
		await fireEvent.click(await findByTestId('filter-official'));

		await waitFor(() => {
			const rows = getAllByTestId('community-package-row');
			expect(rows).toHaveLength(1);
			expect(rows[0].getAttribute('data-package')).toBe('n8n-nodes-official');
		});
	});

	it('should treat the all type filter as no active type filter', async () => {
		Object.defineProperty(nodeTypesStore, 'vettedCommunityPackages', {
			get: () => [
				makeVettedSummary({ packageName: 'n8n-nodes-official', isOfficialNode: true }),
				makeVettedSummary({ packageName: 'n8n-nodes-community', isOfficialNode: false }),
			],
		});

		const { findByTestId, getAllByTestId, getByTestId } = renderComponent();
		await fireEvent.click(await findByTestId('filter-official'));

		await waitFor(() => {
			expect(getAllByTestId('community-package-row')).toHaveLength(1);
			expect(getByTestId('active-filters')).toHaveAttribute('data-active', 'true');
		});

		await fireEvent.click(await findByTestId('filter-all'));

		await waitFor(() => {
			expect(getAllByTestId('community-package-row')).toHaveLength(2);
			expect(getByTestId('active-filters')).toHaveAttribute('data-active', 'false');
			expect(getByTestId('active-filters')).toHaveAttribute('data-type', '');
		});
	});

	it('should filter package rows to installed packages only', async () => {
		Object.defineProperty(nodeTypesStore, 'vettedCommunityPackages', {
			get: () => [makeVettedSummary({ packageName: 'n8n-nodes-available' })],
		});
		Object.defineProperty(communityNodesStore, 'getInstalledPackages', {
			get: () => [makeInstalledPackage({ packageName: 'n8n-nodes-installed' })],
		});

		const { findByTestId, getAllByTestId } = renderComponent();
		await fireEvent.click(await findByTestId('filter-installed-only'));

		await waitFor(() => {
			const rows = getAllByTestId('community-package-row');
			expect(rows).toHaveLength(1);
			expect(rows[0].getAttribute('data-package')).toBe('n8n-nodes-installed');
		});
	});

	it('should treat reset-like filter values as inactive', async () => {
		Object.defineProperty(nodeTypesStore, 'vettedCommunityPackages', {
			get: () => [makeVettedSummary({ packageName: 'n8n-nodes-available' })],
		});
		Object.defineProperty(communityNodesStore, 'getInstalledPackages', {
			get: () => [makeInstalledPackage({ packageName: 'n8n-nodes-installed' })],
		});

		const { findByTestId, getAllByTestId, getByTestId } = renderComponent();
		await fireEvent.click(await findByTestId('filter-installed-only'));

		await waitFor(() => {
			expect(getAllByTestId('community-package-row')).toHaveLength(1);
			expect(getByTestId('active-filters')).toHaveAttribute('data-active', 'true');
		});

		await fireEvent.click(await findByTestId('reset-like-filters'));

		await waitFor(() => {
			expect(getAllByTestId('community-package-row')).toHaveLength(2);
			expect(getByTestId('active-filters')).toHaveAttribute('data-active', 'false');
			expect(getByTestId('active-filters')).toHaveAttribute('data-installed-only', 'false');
		});
	});

	it('should search package rows by author and description', async () => {
		Object.defineProperty(nodeTypesStore, 'vettedCommunityPackages', {
			get: () => [
				makeVettedSummary({
					packageName: 'n8n-nodes-author-match',
					authorName: 'Trusted Author',
					description: 'Other package',
				}),
				makeVettedSummary({
					packageName: 'n8n-nodes-description-match',
					authorName: 'Another Author',
					description: 'Useful webhook tools',
				}),
				makeVettedSummary({
					packageName: 'n8n-nodes-unmatched',
					authorName: 'Different Author',
					description: 'No match',
				}),
			],
		});

		const { findByTestId, getAllByTestId } = renderComponent();
		await fireEvent.click(await findByTestId('search-author'));

		await waitFor(() => {
			const rows = getAllByTestId('community-package-row');
			expect(rows).toHaveLength(1);
			expect(rows[0].getAttribute('data-package')).toBe('n8n-nodes-author-match');
		});

		await fireEvent.click(await findByTestId('search-description'));

		await waitFor(() => {
			const rows = getAllByTestId('community-package-row');
			expect(rows).toHaveLength(1);
			expect(rows[0].getAttribute('data-package')).toBe('n8n-nodes-description-match');
		});
	});
});
