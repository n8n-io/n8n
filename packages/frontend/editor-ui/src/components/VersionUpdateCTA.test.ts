import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { waitFor } from '@testing-library/vue';
import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, type MockedStore } from '@/__tests__/utils';
import { useUIStore } from '@/stores/ui.store';
import { WHATS_NEW_MODAL_KEY, VERSIONS_MODAL_KEY } from '@/constants';
import { useVersionsStore } from '@/stores/versions.store';
import type { Version } from '@n8n/rest-api-client/api/versions';

import VersionUpdateCTA from './VersionUpdateCTA.vue';
import { useTelemetry } from '@/composables/useTelemetry';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';

vi.mock('@/composables/usePageRedirectionHelper', () => {
	const goToVersions = vi.fn();
	return {
		usePageRedirectionHelper: vi.fn().mockReturnValue({
			goToVersions,
		}),
	};
});

vi.mock('@/composables/useTelemetry', () => {
	const track = vi.fn();
	return {
		useTelemetry: () => {
			return {
				track,
			};
		},
	};
});

const renderComponent = createComponentRenderer(VersionUpdateCTA, {
	props: {},
});

let uiStore: MockedStore<typeof useUIStore>;
let versionsStore: MockedStore<typeof useVersionsStore>;

const telemetry = useTelemetry();
const pageRedirectionHelper = usePageRedirectionHelper();

const version: Version = {
	name: '1.100.0',
	nodes: [],
	createdAt: '2025-06-24T00:00:00Z',
	description: 'Latest version description',
	documentationUrl: 'https://docs.n8n.io',
	hasBreakingChange: false,
	hasSecurityFix: false,
	hasSecurityIssue: false,
	securityIssueFixVersion: '',
};

describe('VersionUpdateCTA', () => {
	beforeEach(() => {
		createTestingPinia();
		uiStore = mockedStore(useUIStore);
		uiStore.modalsById = {
			[WHATS_NEW_MODAL_KEY]: {
				open: true,
			},
		};

		versionsStore = mockedStore(useVersionsStore);
		versionsStore.nextVersions = [version];
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should render', async () => {
		const { getByTestId } = renderComponent({
			props: {
				data: {
					articleId: 1,
				},
			},
		});

		await waitFor(() => expect(getByTestId('version-update-cta-button')).toBeInTheDocument());
	});

	it('should take user to update page when Update is clicked', async () => {
		versionsStore.hasVersionUpdates = true;

		const { getByTestId } = renderComponent({
			props: {
				data: {
					articleId: 1,
				},
			},
		});

		await waitFor(() => expect(getByTestId('version-update-cta-button')).toBeInTheDocument());

		await userEvent.click(getByTestId('version-update-cta-button'));

		expect(pageRedirectionHelper.goToVersions).toHaveBeenCalled();
		expect(telemetry.track).toHaveBeenCalledWith('User clicked on update button', {
			source: 'main-sidebar',
		});
	});

	it('should open the next versions drawer when clicking on the next versions link', async () => {
		versionsStore.hasVersionUpdates = true;

		const { getByTestId } = renderComponent({
			props: {
				data: {
					articleId: 1,
				},
			},
		});

		await waitFor(() =>
			expect(getByTestId('version-update-next-versions-link')).toBeInTheDocument(),
		);

		await userEvent.click(getByTestId('version-update-next-versions-link'));

		expect(uiStore.openModal).toHaveBeenCalledWith(VERSIONS_MODAL_KEY);
	});
});
