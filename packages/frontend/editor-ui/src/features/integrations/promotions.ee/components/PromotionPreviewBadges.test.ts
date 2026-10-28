import { createTestingPinia } from '@pinia/testing';
import { mock } from 'vitest-mock-extended';
import { waitFor } from '@testing-library/vue';
import { createRouter, createWebHistory } from 'vue-router';
import type { IUser } from '@n8n/rest-api-client';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUsersStore } from '@n8n/stores/users.store';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore, waitAllPromises } from '@/__tests__/utils';
import { VIEWS } from '@/app/constants';
import { ProjectTypes } from '@/features/collaboration/projects/projects.types';
import { createTestProject } from '@/features/collaboration/projects/__tests__/utils';
import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';

import { billingPreview } from '../__tests__/preview.fixtures';
import { invalidateInstancePromotionConnection } from '../composables/useInstancePromotionConnection';
import * as api from '../promotions.api';
import { PROMOTION_PREVIEW_VIEWS } from '../promotions.constants';
import { promotionEventBus } from '../promotions.eventBus';
import * as settingsApi from '../promotionsSettings.api';
import PromotionPreviewBadges from './PromotionPreviewBadges.vue';

vi.mock('../promotions.api');
vi.mock('../promotionsSettings.api');

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{ path: '/:projectId?', component: { template: '<div></div>' } },
		{ path: '/home/workflows', name: VIEWS.HOMEPAGE, component: { template: '<div></div>' } },
	],
});

// The stub shows where the badge links to.
const renderComponent = createComponentRenderer(PromotionPreviewBadges, {
	global: {
		plugins: [router],
		stubs: {
			RouterLink: {
				props: ['to'],
				template: '<a :data-route="to.name + \':\' + to.params.projectId"><slot /></a>',
			},
		},
	},
});

describe('PromotionPreviewBadges', () => {
	beforeEach(async () => {
		await router.push('/p1');
		await router.isReady();
		createTestingPinia();
		invalidateInstancePromotionConnection();
		const settingsStore = mockedStore(useSettingsStore);
		settingsStore.isModuleActive.mockReturnValue(true);
		settingsStore.settings = {
			...settingsStore.settings,
			envFeatureFlags: { N8N_ENV_FEAT_PROMOTIONS: 'true' },
		};
		mockedStore(useSourceControlStore).preferences.environmentsVersion = 'v2';
		const projectsStore = mockedStore(useProjectsStore);
		projectsStore.currentProject = createTestProject({ id: 'p1', scopes: ['project:export'] });
		projectsStore.currentProjectId = 'p1';
		vi.mocked(api.getPromotionPreview).mockResolvedValue(billingPreview());
		mockedStore(useUsersStore).currentUser = mock<IUser>({
			globalScopes: [
				'promotions:list',
				'promotions:read',
				'promotions:promote',
				'promotions:apply',
			],
		});
		vi.mocked(settingsApi.fetchPromotionEnvironments).mockResolvedValue([
			{ id: 'environment-1', scope: 'instance', direction: 'promote' },
			{ id: 'environment-2', scope: 'instance', direction: 'apply' },
		] as unknown as settingsApi.PromotionEnvironmentSummary[]);
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
		// Wait for the apply preview too, so the check covers its loaded state.
		await waitAllPromises();
		expect(getByTestId('promotion-preview-badges').children).toHaveLength(1);
	});

	it('should show an arrow that does not link when an open review holds the promote changes', async () => {
		vi.mocked(api.getPromotionPreview).mockImplementation(
			async (_context, _projectId, direction) =>
				direction === 'promote'
					? billingPreview({
							resources: [],
							changes: [],
							blocker: { code: 'reviewOpen', reviewId: 'review-1' },
						})
					: billingPreview({ resources: [] }),
		);

		const { findByTestId, getByTestId } = renderComponent();

		const promote = await findByTestId('promotion-preview-badge-promote');
		// The badge informs only. The preview page still opens by URL and explains the review.
		expect(promote).not.toHaveAttribute('data-route');
		expect(promote).toHaveAttribute('aria-disabled', 'true');
		// The span takes focus, so keyboard users reach the tooltip. The badge inside is disabled.
		expect(promote).toHaveAttribute('tabindex', '0');
		expect(promote.querySelector('.n8n-badge')).toBeDisabled();
		expect(promote).toHaveAttribute(
			'aria-label',
			"A review is open. You can't promote until it's merged or closed.",
		);
		expect(promote).toHaveTextContent('');
		// An empty label would add a gap next to the icon.
		expect(promote.querySelector('.n8n-badge')?.querySelector('.n8n-text')).toBeNull();
		await waitAllPromises();
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

	it.each(['feature', 'export', 'list', 'read', 'personal'] as const)(
		'should not load changes without the %s requirement',
		async (requirement) => {
			const projects = mockedStore(useProjectsStore);
			const users = mockedStore(useUsersStore);
			if (requirement === 'feature') {
				const settings = mockedStore(useSettingsStore);
				settings.settings = { ...settings.settings, envFeatureFlags: {} };
			} else if (requirement === 'export') {
				projects.currentProject = createTestProject({ id: 'p1', scopes: [] });
			} else if (requirement === 'personal') {
				projects.currentProject = createTestProject({
					id: 'p1',
					type: ProjectTypes.Personal,
					scopes: ['project:export'],
				});
			} else {
				users.currentUser = mock<IUser>({
					globalScopes: users.currentUser?.globalScopes?.filter(
						(scope) => scope !== `promotions:${requirement}`,
					),
				});
			}
			const { queryByTestId } = renderComponent();
			await waitAllPromises();
			expect(settingsApi.fetchPromotionEnvironments).not.toHaveBeenCalled();
			expect(api.getPromotionPreview).not.toHaveBeenCalled();
			expect(queryByTestId('promotion-preview-badges')).not.toBeInTheDocument();
		},
	);

	it.each(['promote', 'apply'] as const)(
		'should load only the configured %s direction with its permission',
		async (direction) => {
			vi.mocked(settingsApi.fetchPromotionEnvironments).mockResolvedValue([
				{
					id: 'environment-1',
					scope: 'instance',
					direction,
				} as unknown as settingsApi.PromotionEnvironmentSummary,
			]);
			const { findByTestId, queryByTestId } = renderComponent();
			await findByTestId(`promotion-preview-badge-${direction}`);
			expect(api.getPromotionPreview).toHaveBeenCalledTimes(1);
			expect(api.getPromotionPreview).toHaveBeenCalledWith(expect.anything(), 'p1', direction);

			mockedStore(useUsersStore).currentUser = mock<IUser>({
				globalScopes: ['promotions:list', 'promotions:read'],
			});
			await waitFor(() =>
				expect(queryByTestId('promotion-preview-badges')).not.toBeInTheDocument(),
			);
		},
	);

	it('should refresh only outgoing changes after promotion and stop listening on unmount', async () => {
		const { findByTestId, unmount } = renderComponent();
		await findByTestId('promotion-preview-badge-promote');
		await findByTestId('promotion-preview-badge-apply');
		vi.mocked(api.getPromotionPreview).mockClear();
		promotionEventBus.emit('promoted', { projectId: 'p1' });
		await waitAllPromises();
		expect(api.getPromotionPreview).toHaveBeenCalledTimes(1);
		expect(api.getPromotionPreview).toHaveBeenCalledWith(expect.anything(), 'p1', 'promote');

		unmount();
		const replace = vi.spyOn(router, 'replace');
		vi.mocked(api.getPromotionPreview).mockClear();
		promotionEventBus.emit('promoted', { projectId: 'p1' });
		promotionEventBus.emit('applied', { projectId: 'p1' });
		promotionEventBus.emit('projectRemoved', { projectId: 'p1' });
		await waitAllPromises();
		expect(api.getPromotionPreview).not.toHaveBeenCalled();
		expect(replace).not.toHaveBeenCalled();
	});

	it('should update the project and both counts after Apply', async () => {
		const { findByTestId, queryByTestId } = renderComponent();
		await findByTestId('promotion-preview-badge-promote');
		await findByTestId('promotion-preview-badge-apply');
		vi.mocked(api.getPromotionPreview)
			.mockClear()
			.mockResolvedValue(billingPreview({ resources: [] }));
		const project = createTestProject({ id: 'p1', name: 'Renamed' });
		promotionEventBus.emit('applied', { projectId: 'p1', project });
		await waitAllPromises();
		expect(mockedStore(useProjectsStore).setCurrentProject).toHaveBeenCalledWith(project);
		expect(api.getPromotionPreview).toHaveBeenCalledTimes(2);
		expect(api.getPromotionPreview).toHaveBeenCalledWith(expect.anything(), 'p1', 'promote');
		expect(api.getPromotionPreview).toHaveBeenCalledWith(expect.anything(), 'p1', 'apply');
		expect(queryByTestId('promotion-preview-badges')).not.toBeInTheDocument();
	});

	it('should leave a removed project', async () => {
		const { findByTestId } = renderComponent();
		await findByTestId('promotion-preview-badge-apply');
		promotionEventBus.emit('projectRemoved', { projectId: 'p1' });
		await waitFor(() => expect(router.currentRoute.value.name).toBe(VIEWS.HOMEPAGE));
	});

	it('should ignore project updates after navigation', async () => {
		const { findByTestId } = renderComponent();
		await findByTestId('promotion-preview-badge-apply');
		await router.push('/p2');
		mockedStore(useProjectsStore).currentProjectId = 'p2';
		promotionEventBus.emit('applied', {
			projectId: 'p1',
			project: createTestProject({ id: 'p1', name: 'Renamed' }),
		});
		promotionEventBus.emit('projectRemoved', { projectId: 'p1' });
		await waitAllPromises();
		expect(mockedStore(useProjectsStore).setCurrentProject).not.toHaveBeenCalled();
		expect(router.currentRoute.value.params.projectId).toBe('p2');
	});

	it('should retry a failed connection lookup when the project changes', async () => {
		vi.mocked(settingsApi.fetchPromotionEnvironments).mockRejectedValueOnce(new Error('offline'));
		const { findByTestId, queryByTestId } = renderComponent();
		await waitAllPromises();
		expect(queryByTestId('promotion-preview-badges')).not.toBeInTheDocument();
		mockedStore(useProjectsStore).currentProject = createTestProject({
			id: 'p2',
			scopes: ['project:export'],
		});
		expect(await findByTestId('promotion-preview-badge-apply')).toHaveAttribute(
			'data-route',
			`${PROMOTION_PREVIEW_VIEWS.apply}:p2`,
		);
		expect(settingsApi.fetchPromotionEnvironments).toHaveBeenCalledTimes(2);
	});
});
