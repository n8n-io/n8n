import { createComponentRenderer } from '@/__tests__/render';
import { useInstalledCommunityPackage } from '../../composables/useInstalledCommunityPackage';
import type { ExtendedPublicInstalledPackage } from '../../communityNodes.utils';
import { type TestingPinia, createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { setActivePinia } from 'pinia';
import { type ComputedRef, ref } from 'vue';
import type { CommunityNodeDetails } from '@/components/Node/NodeCreator/composables/useViewStacks';
import CommunityNodeInfo from './CommunityNodeInfo.vue';

vi.mock('./utils', () => ({
	fetchInstalledPackageInfo: vi.fn(),
}));

// const mockInstalledPackage = ref<ExtendedPublicInstalledPackage | undefined>(undefined);
// const isUpdateCheckAvailable = ref(false);

const defaultUseInstalledCommunityPackage = {
	installedPackage: ref({
		installedVersion: '1.0.0',
		packageName: 'n8n-nodes-test',
		unverifiedUpdate: false,
	}) as ComputedRef<ExtendedPublicInstalledPackage>,
	isUpdateCheckAvailable: ref(false),
	isCommunityNode: ref(true),
	initInstalledPackage: vi.fn(),
} as unknown as ReturnType<typeof useInstalledCommunityPackage>;

vi.mock('../../composables/useInstalledCommunityPackage', () => ({
	useInstalledCommunityPackage: vi.fn(() => defaultUseInstalledCommunityPackage),
}));

const getCommunityNodeAttributes = vi.fn();

vi.mock('@/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		getCommunityNodeAttributes,
	})),
}));

vi.mock('@/features/settings/users/users.store', () => ({
	useUsersStore: vi.fn(() => ({
		isInstanceOwner: true,
	})),
}));

vi.mock('@/components/Node/NodeCreator/composables/useViewStacks', () => ({
	useViewStacks: vi.fn(),
}));

describe('CommunityNodeInfo', () => {
	const renderComponent = createComponentRenderer(CommunityNodeInfo);
	let pinia: TestingPinia;
	let originalFetch: typeof global.fetch;

	const defaultViewStack = {
		communityNodeDetails: {
			description: 'Other node description',
			installed: false,
			key: 'n8n-nodes-preview-test.OtherNode',
			nodeIcon: undefined,
			packageName: 'n8n-nodes-test',
			title: 'Other Node',
		},
		hasSearch: false,
		items: [
			{
				key: 'n8n-nodes-preview-test.OtherNode',
				properties: {
					defaults: {
						name: 'OtherNode',
					},
					description: 'Other node description',
					displayName: 'Other Node',
					group: ['transform'],
					name: 'n8n-nodes-preview-test.OtherNode',
					outputs: ['main'],
				},
				subcategory: '*',
				type: 'node',
				uuid: 'n8n-nodes-preview-test.OtherNode-32f238f0-2b05-47ce-b43d-7fab6d7ba3cb',
			},
		],
		mode: 'community-node',
		rootView: undefined,
		subcategory: 'Other Node',
		title: 'Node details',
	};

	beforeEach(async () => {
		pinia = createTestingPinia();
		setActivePinia(pinia);

		originalFetch = global.fetch;
		global.fetch = vi.fn();

		const { useViewStacks } = await import(
			'@/components/Node/NodeCreator/composables/useViewStacks'
		);
		vi.mocked(useViewStacks).mockReturnValue({
			activeViewStack: defaultViewStack,
		} as ReturnType<typeof useViewStacks>);
	});

	afterEach(() => {
		global.fetch = originalFetch;
		vi.resetAllMocks();
	});

	it('should render correctly with communityNodeAttributes', async () => {
		getCommunityNodeAttributes.mockResolvedValue({
			npmVersion: '1.0.0',
			authorName: 'contributor',
			numberOfDownloads: 9999,
			nodeVersions: [{ npmVersion: '1.0.0' }],
		});

		vi.mocked(useInstalledCommunityPackage).mockReturnValue({
			...defaultUseInstalledCommunityPackage,
			installedPackage: ref({
				installedVersion: '1.0.0',
				packageName: 'n8n-nodes-test',
				unverifiedUpdate: false,
			}) as ComputedRef<ExtendedPublicInstalledPackage>,
		});

		const wrapper = renderComponent({ pinia });

		await waitFor(() => expect(wrapper.queryByTestId('number-of-downloads')).toBeInTheDocument());

		expect(wrapper.container.querySelector('.description')?.textContent).toEqual(
			'Other node description',
		);
		expect(wrapper.getByTestId('verified-tag').textContent).toEqual('Verified');
		expect(wrapper.getByTestId('number-of-downloads').textContent).toEqual('9,999 Downloads');
		expect(wrapper.getByTestId('publisher-name').textContent).toEqual('Published by contributor');
	});

	it('should display update notice, should show verified badge for older versions', async () => {
		const { useViewStacks } = await import(
			'@/components/Node/NodeCreator/composables/useViewStacks'
		);
		vi.mocked(useViewStacks).mockReturnValue({
			activeViewStack: {
				...defaultViewStack,
				communityNodeDetails: {
					...defaultViewStack.communityNodeDetails,
					installed: true,
				} as CommunityNodeDetails,
			},
		} as ReturnType<typeof useViewStacks>);

		getCommunityNodeAttributes.mockResolvedValue({
			npmVersion: '1.0.0',
			authorName: 'contributor',
			numberOfDownloads: 9999,
			nodeVersions: [{ npmVersion: '1.0.0' }, { npmVersion: '0.0.9' }],
		});
		vi.mocked(useInstalledCommunityPackage).mockReturnValue({
			...defaultUseInstalledCommunityPackage,
			isUpdateCheckAvailable: ref(true) as ComputedRef<boolean>,
			installedPackage: ref({
				installedVersion: '0.0.9',
				packageName: 'n8n-nodes-test',
				updateAvailable: '1.0.1',
				unverifiedUpdate: false,
			}) as ComputedRef<ExtendedPublicInstalledPackage>,
		});

		const wrapper = renderComponent({ pinia });

		await waitFor(() => expect(wrapper.queryByTestId('number-of-downloads')).toBeInTheDocument());

		expect(wrapper.container.querySelector('.description')?.textContent).toEqual(
			'Other node description',
		);
		expect(wrapper.getByTestId('verified-tag').textContent).toEqual('Verified');
		expect(wrapper.getByTestId('number-of-downloads').textContent).toEqual('9,999 Downloads');
		expect(wrapper.getByTestId('publisher-name').textContent).toEqual('Published by contributor');
		expect(
			wrapper.getByTestId('update-available').querySelector('.n8n-text')?.textContent?.trim(),
		).toEqual('A new node package version is available');
	});

	it('should NOT display update notice for unverified update', async () => {
		const { useViewStacks } = await import(
			'@/components/Node/NodeCreator/composables/useViewStacks'
		);
		vi.mocked(useViewStacks).mockReturnValue({
			activeViewStack: {
				...defaultViewStack,
				communityNodeDetails: {
					...defaultViewStack.communityNodeDetails,
					installed: true,
				} as CommunityNodeDetails,
			},
		} as ReturnType<typeof useViewStacks>);

		getCommunityNodeAttributes.mockResolvedValue({
			npmVersion: '1.0.0',
			authorName: 'contributor',
			numberOfDownloads: 9999,
			nodeVersions: [{ npmVersion: '1.0.0' }, { npmVersion: '0.0.9' }],
		});
		vi.mocked(useInstalledCommunityPackage).mockReturnValue({
			...defaultUseInstalledCommunityPackage,
			installedPackage: ref({
				installedVersion: '0.0.9',
				packageName: 'n8n-nodes-test',
				updateAvailable: '1.0.1',
				unverifiedUpdate: true,
			}) as ComputedRef<ExtendedPublicInstalledPackage>,
		});

		const wrapper = renderComponent({ pinia });

		await waitFor(() => expect(wrapper.queryByTestId('number-of-downloads')).toBeInTheDocument());

		expect(wrapper.queryByTestId('update-available')).not.toBeInTheDocument();
	});

	it('should render correctly with fetched info', async () => {
		const packageData = {
			maintainers: [{ name: 'testAuthor' }],
		};

		const downloadsData = {
			downloads: [
				{ downloads: 10, day: '2023-01-01' },
				{ downloads: 20, day: '2023-01-02' },
				{ downloads: 30, day: '2023-01-03' },
			],
		};

		// Set up the fetch mock to return different responses based on URL
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: RequestInfo | URL) => {
				if (typeof url === 'string' && url.includes('registry.npmjs.org')) {
					return {
						ok: true,
						json: async () => packageData,
					};
				}

				if (typeof url === 'string' && url.includes('api.npmjs.org/downloads')) {
					return {
						ok: true,
						json: async () => downloadsData,
					};
				}

				return {
					ok: false,
					json: async () => ({}),
				};
			}),
		);

		getCommunityNodeAttributes.mockResolvedValue(null);

		const wrapper = renderComponent({ pinia });

		await waitFor(() => expect(wrapper.queryByTestId('number-of-downloads')).toBeInTheDocument());

		expect(wrapper.container.querySelector('.description')?.textContent).toEqual(
			'Other node description',
		);

		expect(wrapper.getByTestId('number-of-downloads').textContent).toEqual('60 Downloads');
		expect(wrapper.getByTestId('publisher-name').textContent).toEqual('Published by testAuthor');
	});
});
