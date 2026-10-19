import { createTestingPinia } from '@pinia/testing';
import { mock } from 'vitest-mock-extended';
import type { IUser } from '@n8n/rest-api-client';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';
import { createTestProject } from '@/features/collaboration/projects/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import { billingPreview } from '../__tests__/preview.fixtures';
import { invalidateInstancePromotionConnection } from '../composables/useInstancePromotionConnection';
import * as api from '../promotions.api';
import { PROMOTION_PREVIEW_VIEWS } from '../promotions.constants';
import * as settingsApi from '../promotionsSettings.api';
import PromotionPreviewBadges from './PromotionPreviewBadges.vue';

vi.mock('../promotions.api');
vi.mock('../promotionsSettings.api');

// The stub shows where the badge links to.
const renderComponent = createComponentRenderer(PromotionPreviewBadges, {
	global: {
		stubs: {
			RouterLink: {
				props: ['to'],
				template: '<a :data-route="to.name + \':\' + to.params.projectId"><slot /></a>',
			},
		},
	},
});

describe('PromotionPreviewBadges', () => {
	beforeEach(() => {
		createTestingPinia();
		invalidateInstancePromotionConnection();
		const settingsStore = mockedStore(useSettingsStore);
		settingsStore.isModuleActive.mockReturnValue(true);
		settingsStore.settings = {
			...settingsStore.settings,
			envFeatureFlags: { N8N_ENV_FEAT_PROMOTIONS: 'true' },
		};
		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.currentProject = createTestProject({ id: 'p1', scopes: ['project:export'] });
		mockedStore(useUsersStore).currentUser = mock<IUser>({
			globalScopes: ['gitConnection:list', 'gitConnection:push', 'gitConnection:pull'],
		});
		vi.mocked(settingsApi.fetchPromotionConnections).mockResolvedValue([
			{
				id: 'connection-1',
				scope: 'instance',
				configs: { promote: { id: 'config-1' }, apply: { id: 'config-2' } },
			} as unknown as settingsApi.PromotionConnection,
		]);
	});

	it('should link each direction with changes to its preview page and hide a direction without changes', async () => {
		vi.mocked(api.getPromotionPreview).mockImplementation(
			async (_context, _projectId, direction) =>
				direction === 'promote' ? billingPreview() : billingPreview({ resources: [] }),
		);

		const { findByTestId, getByTestId } = renderComponent();

		const promote = await findByTestId('promotion-preview-badge-promote');
		// All selected workflows bring the folder rename, the changed table and the new variable.
		expect(promote).toHaveTextContent('5');
		expect(promote).toHaveAttribute('data-route', `${PROMOTION_PREVIEW_VIEWS.promote}:p1`);
		expect(promote).toHaveAttribute('aria-label', '5 changes to promote');
		expect(getByTestId('promotion-preview-badges').children).toHaveLength(1);
	});

	it('should show that the check failed instead of a count', async () => {
		vi.mocked(api.getPromotionPreview).mockRejectedValue(new Error('offline'));

		const { findByTestId } = renderComponent();

		expect(await findByTestId('promotion-preview-badge-apply')).toHaveAttribute(
			'aria-label',
			"Couldn't check for incoming changes. Reload the page to try again.",
		);
	});
});
