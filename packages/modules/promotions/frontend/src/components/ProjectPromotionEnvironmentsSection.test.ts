import type { ProjectPromotionEnvironmentsResponse } from '@n8n/api-types';
import {
	capabilities,
	capabilityRegistry,
	type EnvironmentsSettings,
} from '@n8n/frontend-module-sdk';
import { createComponentRenderer, waitAllPromises } from '@n8n/frontend-test-utils';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { createTestingPinia } from '@pinia/testing';
import { screen, waitFor } from '@testing-library/vue';
import { mock } from 'vitest-mock-extended';

import type * as PromotionsApi from '../promotions.api';
import ProjectPromotionEnvironmentsSection from './ProjectPromotionEnvironmentsSection.vue';

const api = vi.hoisted(() => ({
	getProjectPromotionEnvironments: vi.fn<typeof PromotionsApi.getProjectPromotionEnvironments>(),
}));
vi.mock('../promotions.api', () => api);

const renderSection = createComponentRenderer(ProjectPromotionEnvironmentsSection, {
	props: { projectId: 'p1' },
});

const answer = (
	environments: Partial<Extract<ProjectPromotionEnvironmentsResponse, { enabled: true }>> = {},
): ProjectPromotionEnvironmentsResponse => ({
	enabled: true,
	promote: { state: 'default', name: 'Production', providerType: 'gitlab' },
	apply: { state: 'default', name: 'Staging', providerType: 'git' },
	...environments,
});

const provideEnvironmentsSettings = (promotionsEnabled: boolean) =>
	capabilityRegistry.provide(
		capabilities.environmentsSettings,
		mock<EnvironmentsSettings>({ isPromotionsEnabled: () => promotionsEnabled }),
	);

beforeEach(() => {
	vi.resetAllMocks();
	createTestingPinia();
	provideEnvironmentsSettings(true);
	api.getProjectPromotionEnvironments.mockResolvedValue(answer());
});

afterEach(() => {
	capabilityRegistry.clear();
});

it('shows the default environment of each direction without edit controls', async () => {
	renderSection();

	expect(await screen.findByTestId('project-promotion-environment-promote')).toHaveTextContent(
		/Promote changes to.*Production · GitLab/,
	);
	expect(screen.getByTestId('project-promotion-environment-apply')).toHaveTextContent(
		/Apply changes from.*Staging · Generic Git/,
	);
	const section = screen.getByTestId('project-promotion-environments-section');
	expect(
		section.querySelectorAll('button, a, input, select, textarea, [role="button"]'),
	).toHaveLength(0);
});

it('says that no environment is set up for a direction without one', async () => {
	api.getProjectPromotionEnvironments.mockResolvedValue(answer({ apply: { state: 'none' } }));
	renderSection();

	expect(await screen.findByTestId('project-promotion-environment-apply')).toHaveTextContent(
		'No environment set up',
	);
});

it('says that the project uses its own environment for a direction', async () => {
	api.getProjectPromotionEnvironments.mockResolvedValue(answer({ promote: { state: 'own' } }));
	renderSection();

	expect(await screen.findByTestId('project-promotion-environment-promote')).toHaveTextContent(
		'This project uses its own environment',
	);
});

it('shows nothing when project environments are off', async () => {
	api.getProjectPromotionEnvironments.mockResolvedValue({ enabled: false });
	renderSection();

	await waitFor(() => expect(api.getProjectPromotionEnvironments).toHaveBeenCalled());
	expect(screen.queryByTestId('project-promotion-environments-section')).not.toBeInTheDocument();
});

it('sends no request and shows nothing when environments are not available', () => {
	capabilityRegistry.clear();
	provideEnvironmentsSettings(false);
	renderSection();

	expect(api.getProjectPromotionEnvironments).not.toHaveBeenCalled();
	expect(screen.queryByTestId('project-promotion-environments-section')).not.toBeInTheDocument();
});

it('shows nothing when the environments cannot load', async () => {
	api.getProjectPromotionEnvironments.mockRejectedValue(new Error('Request failed'));
	renderSection();

	await waitFor(() => expect(api.getProjectPromotionEnvironments).toHaveBeenCalled());
	expect(screen.queryByTestId('project-promotion-environments-section')).not.toBeInTheDocument();
});

it('shows the environments of the new project after a project switch', async () => {
	const late = createDeferredPromise<ProjectPromotionEnvironmentsResponse>();
	api.getProjectPromotionEnvironments.mockImplementation(async (_context, projectId) =>
		projectId === 'p1'
			? await late.promise
			: answer({ promote: { state: 'default', name: 'Other', providerType: 'git' } }),
	);
	const { rerender } = renderSection();

	await rerender({ projectId: 'p2' });
	const promote = await screen.findByTestId('project-promotion-environment-promote');
	late.resolve(answer());
	await waitAllPromises();

	expect(promote).toHaveTextContent('Other · Generic Git');
});
