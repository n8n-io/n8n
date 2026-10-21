import type { Scope } from '@n8n/permissions';
import type { IUser } from '@n8n/rest-api-client';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { createTestingPinia } from '@pinia/testing';
import { mock } from 'vitest-mock-extended';
import { effectScope } from 'vue';

import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import { createTestProject } from '@/features/collaboration/projects/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';

import { billingPreview } from '../__tests__/preview.fixtures';
import * as api from '../promotions.api';
import * as settingsApi from '../promotionsSettings.api';
import { invalidateInstancePromotionConnection } from './useInstancePromotionConnection';
import { usePromotionEntryPoints } from './usePromotionEntryPoints';

vi.mock('../promotions.api');
vi.mock('../promotionsSettings.api');

const environment = (direction: 'promote' | 'apply') =>
	({
		id: `environment-${direction}`,
		scope: 'instance',
		direction,
	}) as settingsApi.PromotionEnvironmentSummary;

describe('usePromotionEntryPoints', () => {
	beforeEach(() => {
		createTestingPinia();
		const settingsStore = mockedStore(useSettingsStore);
		settingsStore.isModuleActive.mockReturnValue(true);
		settingsStore.settings = {
			...settingsStore.settings,
			envFeatureFlags: { N8N_ENV_FEAT_PROMOTIONS: 'true' },
		};
		mockedStore(useProjectsStore).currentProject = createTestProject({
			id: 'project-1',
			scopes: ['project:export'],
		});
		invalidateInstancePromotionConnection();
		vi.mocked(settingsApi.fetchPromotionEnvironments).mockResolvedValue([
			environment('promote'),
			environment('apply'),
		]);
		vi.mocked(api.getPromotionPreview).mockResolvedValue(billingPreview());
	});

	it.each<{ name: string; scopes: Scope[]; offered: boolean }>([
		{
			name: 'offer both directions to a user who can read, push and pull',
			scopes: [
				'gitConnection:list',
				'gitConnection:read',
				'gitConnection:push',
				'gitConnection:pull',
			],
			offered: true,
		},
		{
			// The preview needs `read`. Without it, the check for changes would only fail.
			name: 'offer neither direction without the read scope',
			scopes: ['gitConnection:list', 'gitConnection:push', 'gitConnection:pull'],
			offered: false,
		},
	])('should $name', async ({ scopes, offered }) => {
		mockedStore(useUsersStore).currentUser = mock<IUser>({ globalScopes: scopes });
		// The composable is shared. Its own scope disposes it, so the cases do not share state.
		const scope = effectScope();
		const entryPoints = scope.run(() => usePromotionEntryPoints());
		await waitAllPromises();

		expect({
			promote: entryPoints?.showPromote.value,
			apply: entryPoints?.showApply.value,
		}).toEqual({ promote: offered, apply: offered });
		scope.stop();
	});
});
