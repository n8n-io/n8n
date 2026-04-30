import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { ref } from 'vue';
import { fireEvent } from '@testing-library/vue';
import CommunityPackageRow from './CommunityPackageRow.vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { CommunityPackageRowData } from '../communityNodes.types';
import type { INodeTypeDescription } from 'n8n-workflow';

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

const renderComponent = createComponentRenderer(CommunityPackageRow);

const flushPromises = async () => await new Promise(setImmediate);

const makeRow = (overrides: Partial<CommunityPackageRowData> = {}): CommunityPackageRowData => ({
	packageName: 'n8n-nodes-example',
	authorName: 'Test Author',
	description: 'A test community node package',
	isOfficialNode: false,
	isVerified: true,
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

describe('CommunityPackageRow', () => {
	let nodeTypesStore: ReturnType<typeof useNodeTypesStore>;

	beforeEach(() => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);
		nodeTypesStore = useNodeTypesStore();
		mockInstallNode.mockClear();
		mockLoading.value = false;
	});

	it('should render package name and author byline', () => {
		const { getByText } = renderComponent({ props: { row: makeRow() } });
		expect(getByText('n8n-nodes-example')).toBeInTheDocument();
		expect(getByText(/Test Author/)).toBeInTheDocument();
	});

	it('should render description in byline', () => {
		const { getByText } = renderComponent({ props: { row: makeRow() } });
		expect(getByText(/A test community node package/)).toBeInTheDocument();
	});

	it('should render Install button when not installed', () => {
		const { getByTestId } = renderComponent({ props: { row: makeRow() } });
		expect(getByTestId('community-package-row__install')).toBeInTheDocument();
	});
});
