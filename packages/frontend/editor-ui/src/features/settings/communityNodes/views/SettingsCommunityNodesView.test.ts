import { describe, it, expect, vi, beforeEach } from 'vitest';
import { flushPromises } from '@vue/test-utils';
import { createComponentRenderer } from '@/__tests__/render';
import SettingsCommunityNodesView from './SettingsCommunityNodesView.vue';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { STORES } from '@n8n/stores';
import { useCommunityNodesStore } from '../communityNodes.store';
import { useUIStore } from '@/app/stores/ui.store';
import { COMMUNITY_PACKAGE_INSTALL_MODAL_KEY } from '../communityNodes.constants';
import type { PublicInstalledPackage, PublicInstalledNode } from 'n8n-workflow';

const mockPushInitialize = vi.fn();
const mockPushTerminate = vi.fn();

vi.mock('@/app/composables/usePushConnection/usePushConnection', () => ({
	usePushConnection: vi.fn(() => ({
		initialize: mockPushInitialize,
		terminate: mockPushTerminate,
	})),
}));

vi.mock('@/app/composables/useExternalHooks', () => ({
	useExternalHooks: vi.fn(() => ({
		run: vi.fn(),
	})),
}));

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(() => ({
		track: vi.fn(),
	})),
}));

vi.mock('@/app/composables/useDocumentTitle', () => ({
	useDocumentTitle: vi.fn(() => ({
		set: vi.fn(),
	})),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn(() => ({
		showError: vi.fn(),
	})),
}));

vi.mock('vue-router', async (importOriginal) => {
	const actual = (await importOriginal()) as object;
	return {
		...actual,
		useRouter: vi.fn(() => ({
			push: vi.fn(),
			replace: vi.fn(),
		})),
	};
});

vi.mock('@/app/stores/pushConnection.store', async (importOriginal) => {
	const actual = (await importOriginal()) as object;
	return {
		...actual,
		usePushConnectionStore: vi.fn(() => ({
			pushConnect: vi.fn(),
			pushDisconnect: vi.fn(),
		})),
	};
});

vi.mock('@/app/utils/rbac/checks', async (importOriginal) => {
	const actual = (await importOriginal()) as object;
	return { ...actual, isAuthenticated: vi.fn().mockReturnValue(true) };
});

vi.mock('@n8n/rest-api-client/api/communityNodes', () => ({
	getInstalledCommunityNodes: vi.fn().mockResolvedValue([]),
	getAvailableCommunityPackageCount: vi.fn().mockResolvedValue(-1),
	installNewPackage: vi.fn(),
	uninstallPackage: vi.fn(),
	updatePackage: vi.fn(),
}));

import {
	getInstalledCommunityNodes,
	getAvailableCommunityPackageCount,
} from '@n8n/rest-api-client/api/communityNodes';

const makePackage = (packageName: string): PublicInstalledPackage => ({
	packageName,
	installedVersion: '1.0.0',
	installedNodes: [{ name: `${packageName}.Node`, latestVersion: 1 } as PublicInstalledNode],
	createdAt: new Date(0),
	updatedAt: new Date(0),
});

const renderComponent = createComponentRenderer(SettingsCommunityNodesView, {
	global: {
		stubs: {
			CommunityPackageCard: {
				props: ['communityPackage', 'loading'],
				template:
					'<div data-test-id="community-package-card" :data-loading="loading" :data-package-name="communityPackage?.packageName"></div>',
			},
		},
	},
});

const setup = (
	overrides: {
		packages?: PublicInstalledPackage[];
		isUnverifiedPackagesEnabled?: boolean;
		availablePackageCount?: number;
		communityNodesManagedByEnv?: boolean;
	} = {},
) => {
	const {
		packages = [],
		isUnverifiedPackagesEnabled = true,
		availablePackageCount = -1,
		communityNodesManagedByEnv = false,
	} = overrides;

	vi.mocked(getInstalledCommunityNodes).mockResolvedValue(packages);
	vi.mocked(getAvailableCommunityPackageCount).mockResolvedValue(availablePackageCount);

	const pinia = createTestingPinia({
		stubActions: false,
		initialState: {
			[STORES.SETTINGS]: {
				settings: {
					unverifiedCommunityNodesEnabled: isUnverifiedPackagesEnabled,
					communityNodesManagedByEnv,
				},
			},
		},
	});
	setActivePinia(pinia);

	const communityNodesStore = useCommunityNodesStore();
	const uiStore = useUIStore();

	uiStore.openModal = vi.fn();

	return {
		...renderComponent({ pinia }),
		communityNodesStore,
		uiStore,
	};
};

describe('SettingsCommunityNodesView', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('on mount', () => {
		it('fetches installed packages and available package count', async () => {
			setup();
			await flushPromises();

			expect(getInstalledCommunityNodes).toHaveBeenCalledOnce();
			expect(getAvailableCommunityPackageCount).toHaveBeenCalledOnce();
		});
	});

	describe('empty state', () => {
		it('shows the correct title and install button when unverified packages are enabled', async () => {
			const { getByText } = setup();
			await flushPromises();

			expect(getByText('Supercharge your workflows with community nodes')).toBeInTheDocument();
			expect(getByText('Install a community node')).toBeInTheDocument();
		});

		it('shows the verified-only title when unverified packages are disabled', async () => {
			const { getByText, queryByText } = setup({ isUnverifiedPackagesEnabled: false });
			await flushPromises();

			expect(
				getByText('Supercharge your workflows with verified community nodes'),
			).toBeInTheDocument();
			expect(queryByText('Install a community node')).not.toBeInTheDocument();
		});

		it('shows generic description when package count is below threshold', async () => {
			const { getByText } = setup({ availablePackageCount: 10 });
			await flushPromises();

			expect(getByText('Install node packages contributed by our community.')).toBeInTheDocument();
		});

		it('shows count-based description when package count is at or above threshold', async () => {
			const { getByText } = setup({ availablePackageCount: 310 });
			await flushPromises();

			expect(
				getByText('Install over 310 node packages contributed by our community.'),
			).toBeInTheDocument();
		});

		it('opens the install modal when the empty state button is clicked', async () => {
			const { getByText, uiStore } = setup();
			await flushPromises();

			getByText('Install a community node').click();

			expect(uiStore.openModal).toHaveBeenCalledWith(COMMUNITY_PACKAGE_INSTALL_MODAL_KEY);
		});

		it('hides the empty state install button when packages are managed by env', async () => {
			const { queryByText } = setup({ communityNodesManagedByEnv: true });
			await flushPromises();

			expect(queryByText('Install a community node')).not.toBeInTheDocument();
		});
	});

	describe('canInstall', () => {
		it('shows the managed-by-env notice when packages are managed by env', async () => {
			const { getByTestId } = setup({ communityNodesManagedByEnv: true });
			await flushPromises();

			expect(getByTestId('community-nodes-managed-by-env')).toBeInTheDocument();
		});

		it('does not show the managed-by-env notice when packages are not managed by env', async () => {
			const { queryByTestId } = setup({ communityNodesManagedByEnv: false });
			await flushPromises();

			expect(queryByTestId('community-nodes-managed-by-env')).not.toBeInTheDocument();
		});

		it('hides the header install button when packages are managed by env even if unverified packages are enabled', async () => {
			const pkg = makePackage('n8n-nodes-managed');
			const { queryByText } = setup({
				packages: [pkg],
				isUnverifiedPackagesEnabled: true,
				communityNodesManagedByEnv: true,
			});
			await flushPromises();

			expect(queryByText('Install')).not.toBeInTheDocument();
		});
	});

	describe('with installed packages', () => {
		const pkg1 = makePackage('n8n-nodes-first');
		const pkg2 = makePackage('n8n-nodes-second');

		it('renders a card per installed package', async () => {
			const { getAllByTestId } = setup({ packages: [pkg1, pkg2] });
			await flushPromises();

			const cards = getAllByTestId('community-package-card');
			expect(cards).toHaveLength(2);
			expect(cards[0]).toHaveAttribute('data-package-name', 'n8n-nodes-first');
			expect(cards[1]).toHaveAttribute('data-package-name', 'n8n-nodes-second');
		});

		it('shows the header install button when unverified packages are enabled', async () => {
			const { getByText } = setup({ packages: [pkg1] });
			await flushPromises();

			expect(getByText('Install')).toBeInTheDocument();
		});

		it('hides the header install button when unverified packages are disabled', async () => {
			const { queryByText } = setup({
				packages: [pkg1],
				isUnverifiedPackagesEnabled: false,
			});
			await flushPromises();

			expect(queryByText('Install')).not.toBeInTheDocument();
		});

		it('opens the install modal when the header install button is clicked', async () => {
			const { getByText, uiStore } = setup({ packages: [pkg1] });
			await flushPromises();

			getByText('Install').click();

			expect(uiStore.openModal).toHaveBeenCalledWith(COMMUNITY_PACKAGE_INSTALL_MODAL_KEY);
		});
	});
});
