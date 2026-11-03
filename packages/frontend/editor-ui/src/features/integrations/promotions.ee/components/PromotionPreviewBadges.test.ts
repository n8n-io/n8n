import { createTestingPinia } from '@pinia/testing';
import type { PromotionPreview } from '@n8n/api-types';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
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
			{ id: 'environment-1', scope: 'instance', direction: 'promote', name: 'Production' },
			{ id: 'environment-2', scope: 'instance', direction: 'apply', name: 'Development' },
		] as unknown as settingsApi.PromotionEnvironmentSummary[]);
	});

	it.each([
		{ name: 'Production', count: 2, label: 'Promote 2 changes to Production' },
		{ name: 'Staging', count: 1, label: 'Promote 1 change to Staging' },
	])('should link to the preview with the tooltip "$label"', async ({ name, count, label }) => {
		vi.mocked(settingsApi.fetchPromotionEnvironments).mockResolvedValue([
			{ id: 'environment-2', scope: 'instance', direction: 'apply', name: 'Development' },
			{
				id: 'environment-1',
				scope: 'instance',
				direction: 'promote',
				name,
			},
		] as unknown as settingsApi.PromotionEnvironmentSummary[]);
		const preview = billingPreview();
		vi.mocked(api.getPromotionPreview).mockResolvedValue({
			...preview,
			resources: preview.resources
				.filter(({ key }) => ['workflow:w1', 'workflow:w3'].includes(key))
				.slice(0, count),
			dependencies: [],
		});
		const { getByTestId, findByText } = renderComponent();
		await waitAllPromises();
		const badge = getByTestId('promotion-preview-badge-promote');

		expect(badge).toHaveTextContent(String(count));
		expect(badge).toHaveAttribute('data-route', `${PROMOTION_PREVIEW_VIEWS.promote}:p1`);
		expect(badge).not.toHaveAttribute('aria-disabled');
		expect(badge).toHaveAttribute('aria-label', label);
		badge.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse' }));
		expect(await findByText(label)).toBeVisible();
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
		const { getByTestId, findByText } = renderComponent();
		await waitAllPromises();
		const promote = getByTestId('promotion-preview-badge-promote');
		const label = "A review is open. You can't promote until it's merged or closed.";

		expect(promote).not.toHaveAttribute('data-route');
		expect(promote).toHaveAttribute('aria-disabled', 'true');
		expect(promote).toHaveAttribute('tabindex', '0');
		expect(promote.querySelector('.n8n-badge')).toBeDisabled();
		expect(promote).toHaveAttribute('aria-label', label);
		expect(promote).toHaveTextContent(/^$/);
		expect(promote.querySelector('.n8n-text')).toBeNull();
		promote.focus();
		expect(await findByText(label)).toBeVisible();
		expect(getByTestId('promotion-preview-badge-apply')).toHaveTextContent('0');
	});

	it.each(['promote', 'apply'] as const)(
		'should show a non-interactive zero %s badge with an explanatory tooltip',
		async (direction) => {
			vi.mocked(api.getPromotionPreview).mockResolvedValue(billingPreview({ resources: [] }));
			const { getByTestId, findByText } = renderComponent();
			await waitAllPromises();
			const badge = getByTestId(`promotion-preview-badge-${direction}`);

			expect(badge).toHaveTextContent('0');
			expect(badge).toHaveAttribute('aria-disabled', 'true');
			expect(badge.tagName).toBe('SPAN');
			expect(badge).not.toHaveAttribute('tabindex');
			badge.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse' }));
			expect(await findByText(`No changes to ${direction}`)).toBeVisible();
		},
	);

	it.each(['promote', 'apply'] as const)(
		'should keep the %s arrow and show an unknown count when the check fails',
		async (direction) => {
			vi.mocked(api.getPromotionPreview).mockRejectedValue(new Error('offline'));

			const { getByTestId, findByText } = renderComponent();
			await waitAllPromises();
			const badge = getByTestId(`promotion-preview-badge-${direction}`);
			const label =
				direction === 'promote'
					? "Couldn't check for changes to promote. Reload the page to try again."
					: "Couldn't check for incoming changes. Reload the page to try again.";

			expect(badge).toHaveTextContent(/^\?$/);
			expect(badge.querySelector('[data-icon]')).toHaveAttribute(
				'data-icon',
				direction === 'promote' ? 'arrow-up' : 'arrow-down',
			);
			expect(badge).toHaveAttribute('data-route', `${PROMOTION_PREVIEW_VIEWS[direction]}:p1`);
			expect(badge).not.toHaveAttribute('aria-disabled');
			expect(badge).toHaveAttribute('aria-label', label);
			badge.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse' }));
			expect(await findByText(label)).toBeVisible();
		},
	);

	it.each(['feature', 'export', 'list', 'read', 'personal'] as const)(
		'should not load changes without the %s requirement',
		async (requirement) => {
			const projects = mockedStore(useProjectsStore);
			const users = mockedStore(useUsersStore);
			if (requirement === 'feature') {
				mockedStore(useSettingsStore).isModuleActive.mockReturnValue(false);
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
		'should show a spinner only for the configured %s direction until its count loads',
		async (direction) => {
			const connection = createDeferredPromise<settingsApi.PromotionEnvironmentSummary[]>();
			const changes = createDeferredPromise<PromotionPreview>();
			vi.mocked(settingsApi.fetchPromotionEnvironments).mockReturnValue(connection.promise);
			vi.mocked(api.getPromotionPreview).mockReturnValue(changes.promise);
			const { getByTestId, queryByTestId } = renderComponent();
			expect(queryByTestId('promotion-preview-badges')).not.toBeInTheDocument();
			expect(api.getPromotionPreview).not.toHaveBeenCalled();

			connection.resolve([
				{
					id: 'environment-1',
					scope: 'instance',
					direction,
				} as unknown as settingsApi.PromotionEnvironmentSummary,
			]);
			await waitAllPromises();
			const badge = getByTestId(`promotion-preview-badge-${direction}`);
			expect(badge).toHaveAttribute('aria-busy', 'true');
			expect(badge).toHaveAttribute('role', 'status');
			expect(badge).toHaveAttribute('aria-disabled', 'true');
			expect(badge).not.toHaveAttribute('data-route');
			expect(badge).not.toHaveTextContent('0');
			expect(badge.querySelector('[data-icon="loader-circle"]')).toBeInTheDocument();
			expect(badge.querySelector('[data-icon]')).toHaveAttribute(
				'data-icon',
				direction === 'promote' ? 'arrow-up' : 'arrow-down',
			);
			expect(badge).toHaveAttribute(
				'aria-label',
				direction === 'promote'
					? 'Checking for changes to promote…'
					: 'Checking for incoming changes…',
			);
			expect(
				queryByTestId(`promotion-preview-badge-${direction === 'promote' ? 'apply' : 'promote'}`),
			).not.toBeInTheDocument();
			expect(api.getPromotionPreview).toHaveBeenCalledTimes(1);
			expect(api.getPromotionPreview).toHaveBeenCalledWith(expect.anything(), 'p1', direction);

			badge.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse' }));
			await waitAllPromises();
			expect(queryByTestId('tooltip-content')).not.toBeInTheDocument();

			changes.resolve(billingPreview());
			await waitAllPromises();
			const loadedBadge = getByTestId(`promotion-preview-badge-${direction}`);
			expect(loadedBadge).toHaveTextContent('5');
			expect(loadedBadge).not.toHaveAttribute('aria-busy');
			expect(loadedBadge).toHaveAttribute('data-route', `${PROMOTION_PREVIEW_VIEWS[direction]}:p1`);

			mockedStore(useUsersStore).currentUser = mock<IUser>({
				globalScopes: ['promotions:list', 'promotions:read'],
			});
			await waitFor(() =>
				expect(queryByTestId('promotion-preview-badges')).not.toBeInTheDocument(),
			);
		},
	);

	it('should refresh only outgoing changes after promotion and stop listening on unmount', async () => {
		const { unmount } = renderComponent();
		await waitAllPromises();
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

	it('should update the project and replace failed counts after Apply', async () => {
		vi.mocked(api.getPromotionPreview).mockRejectedValue(new Error('offline'));
		const { getByTestId } = renderComponent();
		await waitAllPromises();
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
		for (const direction of ['promote', 'apply']) {
			const badge = getByTestId(`promotion-preview-badge-${direction}`);
			expect(badge).toHaveTextContent('0');
			expect(badge).toHaveAttribute('aria-disabled', 'true');
		}
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
		const { queryByTestId, getByTestId } = renderComponent();
		await waitAllPromises();
		expect(queryByTestId('promotion-preview-badges')).not.toBeInTheDocument();
		mockedStore(useProjectsStore).currentProject = createTestProject({
			id: 'p2',
			scopes: ['project:export'],
		});
		await waitAllPromises();
		expect(getByTestId('promotion-preview-badge-apply')).toHaveAttribute(
			'data-route',
			`${PROMOTION_PREVIEW_VIEWS.apply}:p2`,
		);
		expect(settingsApi.fetchPromotionEnvironments).toHaveBeenCalledTimes(2);
	});
});
