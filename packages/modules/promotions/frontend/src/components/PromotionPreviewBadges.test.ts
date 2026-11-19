import { VIEWS } from '@n8n/frontend-constants/views';
import {
	capabilities,
	capabilityRegistry,
	type EnvironmentsSettings,
	type ProjectContext,
} from '@n8n/frontend-module-sdk';
import { createComponentRenderer, mockedStore, waitAllPromises } from '@n8n/frontend-test-utils';
import { ProjectTypes, ResponseError, type IUser, type Project } from '@n8n/rest-api-client';
import { createTestingPinia } from '@pinia/testing';
import type { PromotionPreview } from '@n8n/api-types';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mock } from 'vitest-mock-extended';
import { waitFor } from '@testing-library/vue';
import { reactive } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { useUsersStore } from '@n8n/stores/users.store';

import { billingPreview } from '../__tests__/preview.fixtures';
import * as api from '../promotions.api';
import { PROMOTION_PREVIEW_VIEWS } from '../promotions.constants';
import { promotionEventBus } from '../promotions.eventBus';
import PromotionPreviewBadges from './PromotionPreviewBadges.vue';

vi.mock('../promotions.api');

const notConfigured = () =>
	new ResponseError('No promotion environment is configured', { httpStatusCode: 404 });

const router = createRouter({
	history: createWebHistory(),
	routes: [
		{ path: '/:projectId?', component: { template: '<div></div>' } },
		{ path: '/home/workflows', name: VIEWS.HOMEPAGE, component: { template: '<div></div>' } },
	],
});

const createTestProject = (data: Partial<Project>): Project => ({
	id: 'p1',
	name: 'Billing',
	icon: { type: 'icon', value: 'folder' },
	createdAt: '2026-01-01T00:00:00.000Z',
	updatedAt: '2026-01-01T00:00:00.000Z',
	type: ProjectTypes.Team,
	relations: [],
	scopes: [],
	rolesManaged: false,
	...data,
});

// What the shell shows. The capability stubs read it.
const shell = reactive({
	promotionsEnabled: true,
	currentProject: null as Project | null,
	currentProjectId: undefined as string | undefined,
});
let projectContext: ProjectContext;

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
		shell.promotionsEnabled = true;
		shell.currentProject = createTestProject({ id: 'p1', scopes: ['project:export'] });
		shell.currentProjectId = 'p1';
		projectContext = mock<ProjectContext>({
			currentProject: () => shell.currentProject,
			currentProjectId: () => shell.currentProjectId,
		});
		capabilityRegistry.provide(capabilities.projectContext, projectContext);
		capabilityRegistry.provide(
			capabilities.environmentsSettings,
			mock<EnvironmentsSettings>({ isPromotionsEnabled: () => shell.promotionsEnabled }),
		);
		vi.mocked(api.getPromotionPreview).mockResolvedValue(billingPreview());
		mockedStore(useUsersStore).currentUser = mock<IUser>({
			globalScopes: ['promotions:promote', 'promotions:apply'],
		});
	});

	afterEach(() => {
		capabilityRegistry.clear();
	});
	it.each([
		{ name: 'Production', count: 2, label: 'Promote 2 changes to Production' },
		{ name: 'Staging', count: 1, label: 'Promote 1 change to Staging' },
	])('should link to the preview with the tooltip "$label"', async ({ name, count, label }) => {
		const preview = billingPreview();
		vi.mocked(api.getPromotionPreview).mockResolvedValue({
			...preview,
			environment: { ...preview.environment, name },
			resources: preview.resources
				.filter(({ key }) => ['workflow:w1', 'workflow:w3'].includes(key))
				.slice(0, count),
			dependencies: [],
		});
		const { getByTestId, findByTestId } = renderComponent();
		await waitAllPromises();
		const badge = getByTestId('promotion-preview-badge-promote');

		expect(badge).toHaveTextContent(String(count));
		expect(badge).toHaveAttribute('data-route', `${PROMOTION_PREVIEW_VIEWS.promote}:p1`);
		expect(badge).not.toHaveAttribute('aria-disabled');
		expect(badge).toHaveAttribute('aria-label', label);
		badge.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse' }));
		expect(await findByTestId('tooltip-content')).toHaveTextContent(label);
	});

	it('should show an arrow that does not link when an open review holds the promote changes', async () => {
		vi.mocked(api.getPromotionPreview).mockImplementation(
			async (_context, _projectId, direction) =>
				direction === 'promote'
					? billingPreview({
							resources: [],
							blocker: { code: 'reviewOpen', reviewId: 'review-1' },
						})
					: billingPreview({ resources: [] }),
		);
		const { getByTestId, findByTestId } = renderComponent();
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
		expect(await findByTestId('tooltip-content')).toHaveTextContent(label);
		expect(getByTestId('promotion-preview-badge-apply')).toHaveTextContent('0');
	});

	it.each(['promote', 'apply'] as const)(
		'should show a non-interactive zero %s badge with an explanatory tooltip',
		async (direction) => {
			vi.mocked(api.getPromotionPreview).mockResolvedValue(billingPreview({ resources: [] }));
			const { getByTestId, findByTestId } = renderComponent();
			await waitAllPromises();
			const badge = getByTestId(`promotion-preview-badge-${direction}`);

			expect(badge).toHaveTextContent('0');
			expect(badge).toHaveAttribute('aria-disabled', 'true');
			expect(badge.tagName).toBe('SPAN');
			expect(badge).not.toHaveAttribute('tabindex');
			badge.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse' }));
			expect(await findByTestId('tooltip-content')).toHaveTextContent(`No changes to ${direction}`);
		},
	);

	it.each(['promote', 'apply'] as const)(
		'should keep the %s arrow and show an unknown count when the check fails',
		async (direction) => {
			vi.mocked(api.getPromotionPreview).mockRejectedValue(new Error('offline'));

			const { getByTestId, findByTestId } = renderComponent();
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
			expect(await findByTestId('tooltip-content')).toHaveTextContent(label);
		},
	);

	it.each(['feature', 'export', 'direction', 'personal'] as const)(
		'should not load changes without the %s requirement',
		async (requirement) => {
			if (requirement === 'feature') {
				shell.promotionsEnabled = false;
			} else if (requirement === 'export') {
				shell.currentProject = createTestProject({ id: 'p1', scopes: [] });
			} else if (requirement === 'direction') {
				mockedStore(useUsersStore).currentUser = mock<IUser>({ globalScopes: [] });
			} else {
				shell.currentProject = createTestProject({
					id: 'p1',
					type: ProjectTypes.Personal,
					scopes: ['project:export'],
				});
			}
			const { queryByTestId } = renderComponent();
			await waitAllPromises();
			expect(api.getPromotionPreview).not.toHaveBeenCalled();
			expect(queryByTestId('promotion-preview-badges')).not.toBeInTheDocument();
		},
	);

	it.each(['promote', 'apply'] as const)(
		'should show a spinner only for the %s direction, which has an environment, while its count loads slowly',
		async (direction) => {
			const other = direction === 'promote' ? 'apply' : 'promote';
			let changes = createDeferredPromise<PromotionPreview>();
			vi.mocked(api.getPromotionPreview).mockImplementation(
				async (_context, _projectId, requested) =>
					requested === direction ? await changes.promise : await Promise.reject(notConfigured()),
			);
			const { getByTestId, queryByTestId } = renderComponent();
			await waitAllPromises();
			// The direction without an environment answers before the spinner delay, so it does not show.
			expect(queryByTestId('promotion-preview-badges')).not.toBeInTheDocument();

			const badge = await waitFor(() => getByTestId(`promotion-preview-badge-${direction}`));
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
			expect(queryByTestId(`promotion-preview-badge-${other}`)).not.toBeInTheDocument();

			badge.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse' }));
			await waitAllPromises();
			expect(queryByTestId('tooltip-content')).not.toBeInTheDocument();

			changes.resolve(billingPreview());
			await waitAllPromises();
			const loadedBadge = getByTestId(`promotion-preview-badge-${direction}`);
			expect(loadedBadge).toHaveTextContent('5');
			expect(loadedBadge).not.toHaveAttribute('aria-busy');
			expect(loadedBadge).toHaveAttribute('data-route', `${PROMOTION_PREVIEW_VIEWS[direction]}:p1`);

			// A badge that already shows keeps its place and shows the spinner at once on a new check.
			changes = createDeferredPromise<PromotionPreview>();
			promotionEventBus.emit('applied', { projectId: 'p1' });
			await waitAllPromises();
			expect(getByTestId(`promotion-preview-badge-${direction}`)).toHaveAttribute(
				'aria-busy',
				'true',
			);
			changes.resolve(billingPreview());
			await waitAllPromises();

			mockedStore(useUsersStore).currentUser = mock<IUser>({ globalScopes: [] });
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
		expect(projectContext.setCurrentProject).toHaveBeenCalledWith(project);
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
		shell.currentProjectId = 'p2';
		promotionEventBus.emit('applied', {
			projectId: 'p1',
			project: createTestProject({ id: 'p1', name: 'Renamed' }),
		});
		promotionEventBus.emit('projectRemoved', { projectId: 'p1' });
		await waitAllPromises();
		expect(projectContext.setCurrentProject).not.toHaveBeenCalled();
		expect(router.currentRoute.value.params.projectId).toBe('p2');
	});

	it('should check again when the project changes, because a project can have its own environment', async () => {
		vi.mocked(api.getPromotionPreview).mockImplementation(async (_context, projectId, direction) =>
			direction === 'apply' && projectId === 'p1'
				? await Promise.reject(notConfigured())
				: billingPreview(),
		);
		const { queryByTestId, getByTestId } = renderComponent();
		await waitAllPromises();
		expect(queryByTestId('promotion-preview-badge-apply')).not.toBeInTheDocument();
		shell.currentProject = createTestProject({
			id: 'p2',
			scopes: ['project:export'],
		});
		await waitAllPromises();
		expect(getByTestId('promotion-preview-badge-apply')).toHaveAttribute(
			'data-route',
			`${PROMOTION_PREVIEW_VIEWS.apply}:p2`,
		);
	});
});
