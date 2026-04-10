import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import CommunityPackageBrowseCard from './CommunityPackageBrowseCard.vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { CommunityNodeType } from '@n8n/api-types';
import type { INodeTypeDescription } from 'n8n-workflow';
import { ref } from 'vue';

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

const renderComponent = createComponentRenderer(CommunityPackageBrowseCard);

const makePkg = (overrides: Record<string, unknown> = {}) => ({
	packageName: 'n8n-nodes-example',
	authorName: 'Test Author',
	description: 'A test community node package',
	isOfficialNode: false,
	isInstalled: false,
	numberOfDownloads: 1234,
	npmVersion: '1.0.0',
	nodes: [
		{
			name: 'n8n-nodes-example.exampleNode',
			displayName: 'Example Node',
			packageName: 'n8n-nodes-example',
			authorName: 'Test Author',
			description: 'A test node',
			isOfficialNode: false,
			isInstalled: false,
			numberOfDownloads: 1234,
			numberOfStars: 10,
			npmVersion: '1.0.0',
			checksum: 'abc',
			id: 1,
			createdAt: '2024-01-01',
			updatedAt: '2024-01-01',
			authorGithubUrl: 'https://github.com/test',
			nodeDescription: {
				displayName: 'Example Node',
				name: 'n8n-nodes-example.exampleNode',
				icon: 'file:example.svg',
			} as unknown as INodeTypeDescription,
		} as CommunityNodeType,
	],
	...overrides,
});

describe('CommunityPackageBrowseCard', () => {
	beforeEach(() => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);
	});

	it('should render package name and author', () => {
		const { getByText } = renderComponent({
			props: { pkg: makePkg() },
		});

		expect(getByText('n8n-nodes-example')).toBeInTheDocument();
		expect(getByText(/Test Author/)).toBeInTheDocument();
	});

	it('should render description', () => {
		const { getByText } = renderComponent({
			props: { pkg: makePkg() },
		});

		expect(getByText('A test community node package')).toBeInTheDocument();
	});

	it('should render node count', () => {
		const { getByText } = renderComponent({
			props: { pkg: makePkg() },
		});

		expect(getByText(/1 node/)).toBeInTheDocument();
	});

	it('should render formatted download count', () => {
		const { getByText } = renderComponent({
			props: { pkg: makePkg() },
		});

		expect(getByText(/1\.2k/)).toBeInTheDocument();
	});

	it('should show official icon when isOfficialNode is true', () => {
		const { container } = renderComponent({
			props: { pkg: makePkg({ isOfficialNode: true }) },
		});

		expect(container.querySelector('.officialIcon')).toBeInTheDocument();
	});

	it('should not show official icon when isOfficialNode is false', () => {
		const { container } = renderComponent({
			props: { pkg: makePkg() },
		});

		expect(container.querySelector('.officialIcon')).not.toBeInTheDocument();
	});

	it('should show Install button when not installed', () => {
		const { getByText } = renderComponent({
			props: { pkg: makePkg() },
		});

		expect(getByText('Install')).toBeInTheDocument();
	});

	it('should show Installed badge when already installed', () => {
		const { getByText } = renderComponent({
			props: { pkg: makePkg({ isInstalled: true }) },
		});

		expect(getByText('Installed')).toBeInTheDocument();
	});
});
