import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { ref } from 'vue';
import { fireEvent } from '@testing-library/vue';
import CommunityPackageRow from './CommunityPackageRow.vue';
import { createComponentRenderer } from '@/__tests__/render';
import type { CommunityPackageRowData } from '../communityNodes.types';
import type { INodeTypeDescription } from 'n8n-workflow';
import { NPM_PACKAGE_DOCS_BASE_URL } from '@/app/constants';

const mockInstallNode = vi.fn().mockResolvedValue({ success: true });
const mockLoading = ref(false);
const mockTrack = vi.fn();

vi.mock('../composables/useInstallNode', () => ({
	useInstallNode: vi.fn(() => ({
		installNode: mockInstallNode,
		loading: mockLoading,
	})),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({ track: mockTrack })),
}));

vi.mock('@/app/components/NodeIcon.vue', () => ({
	default: { template: '<div data-test-id="node-icon" />' },
}));

vi.mock('@n8n/design-system', async () => {
	const actual = await vi.importActual<typeof import('@n8n/design-system')>('@n8n/design-system');
	return {
		...actual,
		N8nActionToggle: {
			props: ['actions'],
			emits: ['action'],
			template: `
				<button data-test-id="mock-action-toggle" @click="$emit('action', actions[0]?.value)">
					menu
				</button>
			`,
		},
	};
});

const renderComponent = createComponentRenderer(CommunityPackageRow);

const flushPromises = async () => await new Promise(setImmediate);
const createDeferred = <T>() => {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((resolvePromise) => {
		resolve = resolvePromise;
	});

	return { promise, resolve };
};

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
		mockTrack.mockClear();
		mockLoading.value = false;
	});

	it('should render package name and author byline', () => {
		const { getByText } = renderComponent({ props: { row: makeRow() } });
		expect(getByText('n8n-nodes-example')).toBeInTheDocument();
		expect(getByText(/Test Author/)).toBeInTheDocument();
	});

	it('should render node icon when nodeDescription is present', () => {
		const { getByTestId } = renderComponent({ props: { row: makeRow() } });

		expect(getByTestId('node-icon')).toBeInTheDocument();
	});

	it('should link package name to npm', () => {
		const { getByText } = renderComponent({ props: { row: makeRow() } });

		expect(getByText('n8n-nodes-example').closest('a')).toHaveAttribute(
			'href',
			`${NPM_PACKAGE_DOCS_BASE_URL}n8n-nodes-example`,
		);
	});

	it('should render description in byline', () => {
		const { getByText } = renderComponent({ props: { row: makeRow() } });
		expect(getByText(/A test community node package/)).toBeInTheDocument();
	});

	it('should render Install button when not installed', () => {
		const { getByTestId } = renderComponent({ props: { row: makeRow() } });
		expect(getByTestId('community-package-row__install')).toBeInTheDocument();
	});

	it('should render node count', () => {
		const { getByLabelText, getByText } = renderComponent({
			props: { row: makeRow({ nodeCount: 3, numberOfDownloads: 0 }) },
		});
		expect(getByText('3')).toBeInTheDocument();
		expect(getByLabelText('3 nodes')).toBeInTheDocument();
	});

	it('should render formatted downloads with translated accessibility label', () => {
		const { getByLabelText, getByText } = renderComponent({
			props: { row: makeRow({ numberOfDownloads: 1234 }) },
		});
		expect(getByText(/1\.2k/)).toBeInTheDocument();
		expect(getByLabelText('1.2k downloads')).toBeInTheDocument();
	});

	it('should render formatted downloads (M)', () => {
		const { getByText } = renderComponent({
			props: { row: makeRow({ numberOfDownloads: 2_500_000 }) },
		});
		expect(getByText(/2\.5M/)).toBeInTheDocument();
	});

	it('should hide downloads when zero', () => {
		const { queryByText } = renderComponent({
			props: { row: makeRow({ numberOfDownloads: 0 }) },
		});
		expect(queryByText(/[0-9]+(\.[0-9]+)?k|[0-9]+(\.[0-9]+)?M/)).not.toBeInTheDocument();
	});

	it('should render verified icon when isVerified is true', () => {
		const { container, getByLabelText } = renderComponent({
			props: { row: makeRow({ isVerified: true }) },
		});
		expect(
			container.querySelector('[data-test-id="community-package-row__verified"]'),
		).toBeInTheDocument();
		expect(getByLabelText('Verified by n8n')).toBeInTheDocument();
	});

	it('should not render verified icon when isVerified is false', () => {
		const { container } = renderComponent({ props: { row: makeRow({ isVerified: false }) } });
		expect(
			container.querySelector('[data-test-id="community-package-row__verified"]'),
		).not.toBeInTheDocument();
	});

	it('should show Installed badge with version when installed and no update', () => {
		const { getByText, queryByTestId } = renderComponent({
			props: {
				row: makeRow({ isInstalled: true, installedVersion: '2.0.0' }),
			},
		});

		expect(getByText(/v2\.0\.0/)).toBeInTheDocument();
		expect(queryByTestId('community-package-row__install')).not.toBeInTheDocument();
	});

	it('should render uninstall action toggle when installed', () => {
		const { container } = renderComponent({
			props: {
				row: makeRow({ isInstalled: true, installedVersion: '2.0.0' }),
			},
		});

		expect(
			container.querySelector('[data-test-id="community-package-row__menu"]'),
		).toBeInTheDocument();
	});

	it('should call openCommunityPackageUninstallConfirmModal when uninstall action fires', async () => {
		const uninstallSpy = vi.fn();
		const uiStoreInstance = useUIStore();
		uiStoreInstance.openCommunityPackageUninstallConfirmModal = uninstallSpy;

		const { getByTestId } = renderComponent({
			props: { row: makeRow({ isInstalled: true, installedVersion: '2.0.0' }) },
		});

		await fireEvent.click(getByTestId('community-package-row__menu'));

		expect(uninstallSpy).toHaveBeenCalledWith('n8n-nodes-example');
	});

	it('should show Update available badge when legacy updateAvailable is set and unverified packages enabled', () => {
		Object.defineProperty(useSettingsStore(), 'isUnverifiedPackagesEnabled', { get: () => true });
		Object.defineProperty(useSettingsStore(), 'isCommunityNodesFeatureEnabled', {
			get: () => false,
		});

		const { getByText } = renderComponent({
			props: {
				row: makeRow({
					isInstalled: true,
					installedVersion: '1.0.0',
					updateAvailable: '2.0.0',
				}),
			},
		});

		expect(getByText(/Update available/i)).toBeInTheDocument();
	});

	it('should show Update available when verified path detects newer npmVersion', async () => {
		Object.defineProperty(useSettingsStore(), 'isUnverifiedPackagesEnabled', { get: () => false });
		Object.defineProperty(useSettingsStore(), 'isCommunityNodesFeatureEnabled', {
			get: () => true,
		});
		Object.defineProperty(nodeTypesStore, 'visibleNodeTypes', {
			get: () => [
				{ name: 'n8n-nodes-example-overlap.wrongNode' },
				{ name: 'n8n-nodes-example.visibleNode' },
			],
		});
		nodeTypesStore.loadNodeTypesIfNotLoaded = vi.fn().mockResolvedValue(undefined);
		nodeTypesStore.getCommunityNodeAttributes = vi.fn().mockResolvedValue({ npmVersion: '2.0.0' });

		const { findByText } = renderComponent({
			props: {
				row: makeRow({
					isInstalled: true,
					installedVersion: '1.0.0',
					nodeDescription: {
						displayName: 'Example Node',
						name: 'n8n-nodes-example.exactNode',
						icon: 'file:example.svg',
					} as unknown as INodeTypeDescription,
				}),
			},
		});

		expect(await findByText(/Update available/i)).toBeInTheDocument();
		expect(nodeTypesStore.getCommunityNodeAttributes).toHaveBeenCalledWith(
			'n8n-nodes-example.exactNode',
		);
	});

	it('should reset local installed state when row package changes', async () => {
		const { getByTestId, queryByTestId, rerender } = renderComponent({
			props: { row: makeRow() },
		});

		await fireEvent.click(getByTestId('community-package-row__install'));
		await flushPromises();

		expect(queryByTestId('community-package-row__install')).not.toBeInTheDocument();

		await rerender({
			row: makeRow({
				packageName: 'n8n-nodes-other',
				installNodeName: 'n8n-nodes-other.otherNode',
				nodeDescription: {
					displayName: 'Other Node',
					name: 'n8n-nodes-other.otherNode',
					icon: 'file:other.svg',
				} as unknown as INodeTypeDescription,
			}),
		});

		expect(getByTestId('community-package-row__install')).toBeInTheDocument();
	});

	it('should clear latest verified version when row package changes', async () => {
		Object.defineProperty(useSettingsStore(), 'isUnverifiedPackagesEnabled', { get: () => false });
		Object.defineProperty(useSettingsStore(), 'isCommunityNodesFeatureEnabled', {
			get: () => true,
		});
		nodeTypesStore.loadNodeTypesIfNotLoaded = vi.fn().mockResolvedValue(undefined);
		nodeTypesStore.getCommunityNodeAttributes = vi
			.fn()
			.mockResolvedValueOnce({ npmVersion: '2.0.0' })
			.mockResolvedValueOnce(null);

		const { findByTestId, queryByTestId, rerender } = renderComponent({
			props: { row: makeRow({ isInstalled: true, installedVersion: '1.0.0' }) },
		});

		expect(await findByTestId('community-package-row__update')).toBeInTheDocument();

		await rerender({
			row: makeRow({
				packageName: 'n8n-nodes-other',
				isInstalled: true,
				installedVersion: '1.0.0',
				installNodeName: 'n8n-nodes-other.otherNode',
				nodeDescription: {
					displayName: 'Other Node',
					name: 'n8n-nodes-other.otherNode',
					icon: 'file:other.svg',
				} as unknown as INodeTypeDescription,
			}),
		});

		expect(queryByTestId('community-package-row__update')).not.toBeInTheDocument();
	});

	it('should ignore stale verified version responses after row package changes', async () => {
		Object.defineProperty(useSettingsStore(), 'isUnverifiedPackagesEnabled', { get: () => false });
		Object.defineProperty(useSettingsStore(), 'isCommunityNodesFeatureEnabled', {
			get: () => true,
		});
		const firstAttributes = createDeferred<{ npmVersion: string }>();
		nodeTypesStore.loadNodeTypesIfNotLoaded = vi.fn().mockResolvedValue(undefined);
		nodeTypesStore.getCommunityNodeAttributes = vi
			.fn()
			.mockReturnValueOnce(firstAttributes.promise)
			.mockResolvedValueOnce(null);

		const { queryByTestId, rerender } = renderComponent({
			props: { row: makeRow({ isInstalled: true, installedVersion: '1.0.0' }) },
		});
		await flushPromises();

		await rerender({
			row: makeRow({
				packageName: 'n8n-nodes-other',
				isInstalled: true,
				installedVersion: '1.0.0',
				installNodeName: 'n8n-nodes-other.otherNode',
				nodeDescription: {
					displayName: 'Other Node',
					name: 'n8n-nodes-other.otherNode',
					icon: 'file:other.svg',
				} as unknown as INodeTypeDescription,
			}),
		});

		firstAttributes.resolve({ npmVersion: '2.0.0' });
		await flushPromises();

		expect(queryByTestId('community-package-row__update')).not.toBeInTheDocument();
	});

	it('should call openCommunityPackageUpdateConfirmModal on Update click', async () => {
		const openCommunityPackageUpdateConfirmModal = vi.fn();
		const uiStoreMock = useUIStore();
		uiStoreMock.openCommunityPackageUpdateConfirmModal = openCommunityPackageUpdateConfirmModal;
		Object.defineProperty(useSettingsStore(), 'isUnverifiedPackagesEnabled', { get: () => true });

		const { getByTestId } = renderComponent({
			props: {
				row: makeRow({
					isInstalled: true,
					installedVersion: '1.0.0',
					updateAvailable: '2.0.0',
				}),
			},
		});

		await fireEvent.click(getByTestId('community-package-row__update'));

		expect(openCommunityPackageUpdateConfirmModal).toHaveBeenCalledWith(
			'n8n-nodes-example',
			'instance settings',
		);
	});

	it('should call useInstallNode with verified type when Install clicked', async () => {
		const { getByTestId } = renderComponent({ props: { row: makeRow() } });

		await fireEvent.click(getByTestId('community-package-row__install'));

		expect(mockInstallNode).toHaveBeenCalledWith(
			expect.objectContaining({
				type: 'verified',
				packageName: 'n8n-nodes-example',
				nodeType: 'n8n-nodes-example.exampleNode',
				telemetry: expect.objectContaining({
					hasQuickConnect: false,
					source: 'cnr settings browse',
				}),
			}),
		);
	});

	it('should track telemetry when Install is clicked', async () => {
		const { getByTestId } = renderComponent({ props: { row: makeRow() } });

		await fireEvent.click(getByTestId('community-package-row__install'));

		expect(mockTrack).toHaveBeenCalledWith('user clicked cnr install button', {
			package_name: 'n8n-nodes-example',
			source: 'cnr settings browse',
		});
	});

	it('should show installing label while install is loading', () => {
		mockLoading.value = true;

		const { getByTestId, getByText } = renderComponent({ props: { row: makeRow() } });

		expect(getByTestId('community-package-row__install')).toBeInTheDocument();
		expect(getByText('Installing...')).toBeInTheDocument();
	});

	it('should emit installed and flip to installed state after successful install', async () => {
		const { getByTestId, emitted, queryByTestId } = renderComponent({
			props: { row: makeRow() },
		});

		await fireEvent.click(getByTestId('community-package-row__install'));
		await flushPromises();

		expect(emitted().installed).toBeTruthy();
		expect(queryByTestId('community-package-row__install')).not.toBeInTheDocument();
	});

	it('should render Installed badge without version after a local install flip', async () => {
		const { getByText, getByTestId } = renderComponent({ props: { row: makeRow() } });

		await fireEvent.click(getByTestId('community-package-row__install'));
		await flushPromises();

		const badge = getByText('Installed');
		expect(badge).toBeInTheDocument();
		expect(badge.textContent?.trim()).toBe('Installed');
	});

	it('should not flip state if install fails', async () => {
		mockInstallNode.mockResolvedValueOnce({ success: false });
		const { getByTestId } = renderComponent({ props: { row: makeRow() } });

		await fireEvent.click(getByTestId('community-package-row__install'));
		await flushPromises();

		expect(getByTestId('community-package-row__install')).toBeInTheDocument();
	});

	it('should show failed-loading alert when failedLoading', () => {
		const { getByLabelText } = renderComponent({
			props: {
				row: makeRow({ isInstalled: true, installedVersion: '1.0.0', failedLoading: true }),
			},
		});

		expect(getByLabelText(/problem with this package/i)).toBeInTheDocument();
	});

	it('should render failed-loading state instead of install/update buttons', () => {
		Object.defineProperty(useSettingsStore(), 'isUnverifiedPackagesEnabled', { get: () => true });

		const { getByLabelText, queryByTestId } = renderComponent({
			props: {
				row: makeRow({
					isInstalled: true,
					failedLoading: true,
					installedVersion: '1.0.0',
					updateAvailable: '2.0.0',
				}),
			},
		});

		expect(queryByTestId('community-package-row__install')).not.toBeInTheDocument();
		expect(queryByTestId('community-package-row__update')).not.toBeInTheDocument();
		expect(getByLabelText(/problem with this package/i)).toBeInTheDocument();
	});

	it('should render skeleton when loading is true', () => {
		const { container, queryByTestId } = renderComponent({ props: { loading: true } });

		expect(container.querySelector('[class*="skeleton"]')).toBeInTheDocument();
		expect(queryByTestId('community-package-row__install')).not.toBeInTheDocument();
	});
});
