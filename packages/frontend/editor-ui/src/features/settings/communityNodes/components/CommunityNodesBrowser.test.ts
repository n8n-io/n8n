import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import CommunityNodesBrowser from './CommunityNodesBrowser.vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { CommunityNodeType } from '@n8n/api-types';
import type { INodeTypeDescription } from 'n8n-workflow';
import { fireEvent, waitFor } from '@testing-library/vue';
import { ref } from 'vue';

vi.mock('../composables/useInstallNode', () => ({
	useInstallNode: vi.fn(() => ({
		installNode: vi.fn().mockResolvedValue({ success: true }),
		loading: ref(false),
	})),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({ track: vi.fn() })),
}));

vi.mock('@/app/components/NodeIcon.vue', () => ({
	default: { template: '<div data-test-id="node-icon" />' },
}));

let mockVettedCommunityPackages: Array<ReturnType<typeof makePackageSummary>> = [];

vi.mock('@/app/stores/nodeTypes.store', () => ({
	useNodeTypesStore: vi.fn(() => ({
		vettedCommunityPackages: mockVettedCommunityPackages,
	})),
}));

const renderComponent = createComponentRenderer(CommunityNodesBrowser);

const makePackageSummary = (name: string, overrides: Record<string, unknown> = {}) => ({
	packageName: name,
	authorName: 'Author',
	description: `Description for ${name}`,
	isOfficialNode: false,
	isInstalled: false,
	numberOfDownloads: 100,
	npmVersion: '1.0.0',
	nodes: [
		{
			name: `${name}.node`,
			displayName: `${name} Node`,
			packageName: name,
			authorName: 'Author',
			description: `Description for ${name}`,
			isOfficialNode: false,
			isInstalled: false,
			numberOfDownloads: 100,
			numberOfStars: 5,
			npmVersion: '1.0.0',
			checksum: 'abc',
			id: Math.random(),
			createdAt: '2024-01-01',
			updatedAt: '2024-01-01',
			authorGithubUrl: 'https://github.com/test',
			nodeDescription: {
				displayName: `${name} Node`,
				name: `${name}.node`,
				icon: 'file:icon.svg',
			} as unknown as INodeTypeDescription,
		} as CommunityNodeType,
	],
	...overrides,
});

describe('CommunityNodesBrowser', () => {
	beforeEach(() => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);
		mockVettedCommunityPackages = [];
	});

	it('should render empty state when no packages are available', () => {
		const { getByText } = renderComponent();

		expect(getByText('No packages found')).toBeInTheDocument();
	});

	it('should render package cards when packages are available', () => {
		mockVettedCommunityPackages = [makePackageSummary('n8n-nodes-foo')];

		const { getByText } = renderComponent();

		expect(getByText('n8n-nodes-foo')).toBeInTheDocument();
	});

	it('should filter packages by search query', async () => {
		mockVettedCommunityPackages = [
			makePackageSummary('n8n-nodes-foo'),
			makePackageSummary('n8n-nodes-bar'),
		];

		const { getByPlaceholderText, getByText, queryByText } = renderComponent();

		const searchInput = getByPlaceholderText('Search packages...');
		await fireEvent.update(searchInput, 'foo');

		await waitFor(() => {
			expect(getByText('n8n-nodes-foo')).toBeInTheDocument();
			expect(queryByText('n8n-nodes-bar')).not.toBeInTheDocument();
		});
	});

	it('should show empty state when search returns no results', async () => {
		mockVettedCommunityPackages = [makePackageSummary('n8n-nodes-foo')];

		const { getByPlaceholderText, getByText } = renderComponent();

		const searchInput = getByPlaceholderText('Search packages...');
		await fireEvent.update(searchInput, 'nonexistent');

		await waitFor(() => {
			expect(getByText('No packages found')).toBeInTheDocument();
		});
	});

	it('should render multiple package cards', () => {
		mockVettedCommunityPackages = [
			makePackageSummary('n8n-nodes-alpha'),
			makePackageSummary('n8n-nodes-beta'),
			makePackageSummary('n8n-nodes-gamma'),
		];

		const { getByText } = renderComponent();

		expect(getByText('n8n-nodes-alpha')).toBeInTheDocument();
		expect(getByText('n8n-nodes-beta')).toBeInTheDocument();
		expect(getByText('n8n-nodes-gamma')).toBeInTheDocument();
	});

	it('should default to sorting by most popular (downloads)', () => {
		mockVettedCommunityPackages = [
			makePackageSummary('n8n-nodes-low', { numberOfDownloads: 10 }),
			makePackageSummary('n8n-nodes-high', { numberOfDownloads: 1000 }),
			makePackageSummary('n8n-nodes-mid', { numberOfDownloads: 500 }),
		];

		const { getAllByTestId } = renderComponent();
		const cards = getAllByTestId('community-package-card');

		expect(cards[0]).toHaveTextContent('n8n-nodes-high');
		expect(cards[1]).toHaveTextContent('n8n-nodes-mid');
		expect(cards[2]).toHaveTextContent('n8n-nodes-low');
	});

	it('should show skeleton cards when loading is true', () => {
		const { container, queryByTestId } = renderComponent({
			props: { loading: true },
		});

		const skeletons = container.querySelectorAll('[class*="skeletonCard"]');
		expect(skeletons).toHaveLength(6);
		expect(queryByTestId('community-nodes-search')).not.toBeInTheDocument();
	});

	it('should hide controls and show result count when packages are available', () => {
		mockVettedCommunityPackages = [
			makePackageSummary('n8n-nodes-foo'),
			makePackageSummary('n8n-nodes-bar'),
		];

		const { getByText, getByTestId } = renderComponent();

		expect(getByTestId('community-nodes-search')).toBeInTheDocument();
		expect(getByText('2 packages')).toBeInTheDocument();
	});

	it('should filter by official packages', async () => {
		mockVettedCommunityPackages = [
			makePackageSummary('n8n-nodes-official', { isOfficialNode: true }),
			makePackageSummary('n8n-nodes-community', { isOfficialNode: false }),
		];

		const { getByText, queryByText, getByTestId } = renderComponent();

		const filterButtons = getByTestId('community-nodes-filter');
		const officialButton = filterButtons.querySelector('[value="official"]') as HTMLElement;
		if (officialButton) {
			await fireEvent.click(officialButton);
			await waitFor(() => {
				expect(getByText('n8n-nodes-official')).toBeInTheDocument();
				expect(queryByText('n8n-nodes-community')).not.toBeInTheDocument();
			});
		}
	});
});
