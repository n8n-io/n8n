import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import CommunityPackageCard from './CommunityPackageCard.vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { CommunityPackageCardData } from '../communityNodes.types';
import type { INodeTypeDescription } from 'n8n-workflow';
import { ref } from 'vue';
import { fireEvent } from '@testing-library/vue';

const mockInstallNode = vi.fn().mockResolvedValue({ success: true });
const mockLoading = ref(false);

vi.mock('../composables/useInstallNode', () => ({
	useInstallNode: vi.fn(() => ({
		installNode: mockInstallNode,
		loading: mockLoading,
	})),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({ track: vi.fn() })),
}));

vi.mock('@/app/components/NodeIcon.vue', () => ({
	default: { template: '<div data-test-id="node-icon" />' },
}));

const renderComponent = createComponentRenderer(CommunityPackageCard);

const flushPromises = async () => await new Promise(setImmediate);

const makePkg = (overrides: Partial<CommunityPackageCardData> = {}): CommunityPackageCardData => ({
	packageName: 'n8n-nodes-example',
	authorName: 'Test Author',
	description: 'A test community node package',
	isOfficialNode: false,
	numberOfDownloads: 1234,
	nodeCount: 1,
	nodeDescription: {
		displayName: 'Example Node',
		name: 'n8n-nodes-example.exampleNode',
		icon: 'file:example.svg',
	} as unknown as INodeTypeDescription,
	installNodeName: 'n8n-nodes-example.exampleNode',
	isInstalled: false,
	...overrides,
});

describe('CommunityPackageCard', () => {
	let nodeTypesStore: ReturnType<typeof useNodeTypesStore>;

	beforeEach(() => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);
		nodeTypesStore = useNodeTypesStore();
	});

	it('should render package name and author', () => {
		const { getByText } = renderComponent({ props: { pkg: makePkg() } });

		expect(getByText('n8n-nodes-example')).toBeInTheDocument();
		expect(getByText(/Test Author/)).toBeInTheDocument();
	});

	it('should render description when provided', () => {
		const { getByText } = renderComponent({ props: { pkg: makePkg() } });

		expect(getByText('A test community node package')).toBeInTheDocument();
	});

	it('should not render description when empty', () => {
		const { queryByText } = renderComponent({
			props: { pkg: makePkg({ description: '' }) },
		});

		expect(queryByText('A test community node package')).not.toBeInTheDocument();
	});

	it('should render node count', () => {
		const { getByText } = renderComponent({ props: { pkg: makePkg() } });

		expect(getByText(/1 node/)).toBeInTheDocument();
	});

	it('should render formatted download count', () => {
		const { getByText } = renderComponent({ props: { pkg: makePkg() } });

		expect(getByText(/1\.2k/)).toBeInTheDocument();
	});

	it('should not render downloads when zero', () => {
		const { queryByText } = renderComponent({
			props: { pkg: makePkg({ numberOfDownloads: 0 }) },
		});

		expect(queryByText(/downloads/)).not.toBeInTheDocument();
	});

	it('should show official icon when isOfficialNode is true', () => {
		const { container } = renderComponent({
			props: { pkg: makePkg({ isOfficialNode: true }) },
		});

		expect(container.querySelector('.officialIcon')).toBeInTheDocument();
	});

	it('should not show official icon when isOfficialNode is false', () => {
		const { container } = renderComponent({ props: { pkg: makePkg() } });

		expect(container.querySelector('.officialIcon')).not.toBeInTheDocument();
	});

	it('should show Install button when not installed', () => {
		const { getByText } = renderComponent({ props: { pkg: makePkg() } });

		expect(getByText('Install')).toBeInTheDocument();
	});

	it('should show Installed badge when installed', () => {
		const { getByText } = renderComponent({
			props: { pkg: makePkg({ isInstalled: true }) },
		});

		expect(getByText('Installed')).toBeInTheDocument();
	});

	it('should show version when installedVersion is provided', () => {
		const { getByText } = renderComponent({
			props: { pkg: makePkg({ isInstalled: true, installedVersion: '2.0.0' }) },
		});

		expect(getByText('v2.0.0')).toBeInTheDocument();
	});

	it('should call nodeTypesStore methods for installed packages', async () => {
		Object.defineProperty(nodeTypesStore, 'visibleNodeTypes', {
			get: () => [{ name: 'n8n-nodes-example' }],
		});
		nodeTypesStore.loadNodeTypesIfNotLoaded = vi.fn().mockResolvedValue(undefined);
		nodeTypesStore.getCommunityNodeAttributes = vi.fn().mockResolvedValue({ npmVersion: '2.0.0' });

		renderComponent({
			props: { pkg: makePkg({ isInstalled: true, installedVersion: '1.0.0' }) },
		});

		await flushPromises();

		expect(nodeTypesStore.loadNodeTypesIfNotLoaded).toHaveBeenCalled();
		expect(nodeTypesStore.getCommunityNodeAttributes).toHaveBeenCalledWith('n8n-nodes-example');
	});

	it('should render skeleton when loading is true', () => {
		const { container, queryByText } = renderComponent({ props: { loading: true } });

		expect(container.querySelector('[class*="skeleton"]')).toBeInTheDocument();
		expect(queryByText('n8n-nodes-example')).not.toBeInTheDocument();
	});

	it('should format downloads in millions', () => {
		const { getByText } = renderComponent({
			props: { pkg: makePkg({ numberOfDownloads: 2_500_000 }) },
		});

		expect(getByText(/2\.5M/)).toBeInTheDocument();
	});

	it('should call installNode on Install click', async () => {
		const { getByText } = renderComponent({ props: { pkg: makePkg() } });

		await fireEvent.click(getByText('Install'));

		expect(mockInstallNode).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'verified',
				packageName: 'n8n-nodes-example',
				nodeType: 'n8n-nodes-example.exampleNode',
			}),
		);
	});

	it('should show Installed badge after successful install', async () => {
		const { getByText } = renderComponent({ props: { pkg: makePkg() } });

		await fireEvent.click(getByText('Install'));
		await flushPromises();

		expect(getByText('Installed')).toBeInTheDocument();
	});

	it('should show failed-loading icon when failedLoading is true', () => {
		const { container } = renderComponent({
			props: { pkg: makePkg({ isInstalled: true, failedLoading: true }) },
		});

		expect(container.querySelector('[class*="actions"]')).toBeInTheDocument();
	});
});
