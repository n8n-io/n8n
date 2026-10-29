import type { SelfHealingConfigurationDto } from '@n8n/api-types';
import { SELF_HEALING_CONFIGURATION_VIEW } from '@n8n/frontend-constants/self-healing';
import { fireEvent, render, waitFor } from '@testing-library/vue';
import { createMemoryHistory, createRouter } from 'vue-router';

import { useSelfHealingStore } from '../self-healing.store';
import ProjectSelfHealingSection from './ProjectSelfHealingSection.vue';

const { confirm } = vi.hoisted(() => ({ confirm: vi.fn() }));
vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/design-system')>()),
	useMessage: () => ({ confirm }),
}));

const configuration: SelfHealingConfigurationDto = {
	id: 1,
	projectId: 'project',
	scope: 'all',
	workflowIds: [],
	reviewerIds: ['reviewer'],
	enabled: false,
	enabledById: null,
	lastActivity: null,
};

async function renderSection() {
	const store = useSelfHealingStore();
	store.configurations.project = [{ ...configuration }];
	store.options.project = {
		workflows: [],
		reviewers: [
			{ id: 'reviewer', firstName: 'Test', lastName: 'Reviewer', email: 'reviewer@example.com' },
		],
	};
	vi.spyOn(store, 'load').mockResolvedValue();
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/projects/:projectId/settings', component: { render: () => null } },
			{
				path: '/projects/:projectId/settings/self-healing/:configurationId',
				name: SELF_HEALING_CONFIGURATION_VIEW,
				component: { render: () => null },
			},
		],
	});
	await router.push('/projects/project/settings');
	const view = render(ProjectSelfHealingSection, {
		props: { projectId: 'project' },
		global: { plugins: [router] },
	});
	await view.findByText('All workflows');
	return { view, store, router };
}

beforeEach(() => vi.clearAllMocks());

it('keeps the active switch unchanged when saving fails and allows another attempt', async () => {
	const { view, store } = await renderSection();
	const pending = Promise.withResolvers<undefined>();
	const setEnabled = vi.spyOn(store, 'setEnabled').mockReturnValueOnce(pending.promise);
	const toggle = view.getByRole('switch', { name: 'Enable self-healing' });
	await fireEvent.click(toggle);
	expect(toggle).toBeDisabled();
	expect(setEnabled).toHaveBeenCalledWith('project', 1, true);
	pending.reject(new Error('Could not save'));
	await waitFor(() => expect(toggle).toBeEnabled());
	expect(toggle).not.toBeChecked();

	setEnabled.mockImplementationOnce(async () => {
		store.configurations.project[0].enabled = true;
	});
	await fireEvent.click(toggle);
	await waitFor(() => expect(toggle).toBeChecked());
});

it('opens the configuration from the action menu', async () => {
	const { view, router } = await renderSection();
	await fireEvent.click(view.getByRole('button', { name: 'Actions' }));
	await fireEvent.click(await view.findByRole('menuitem', { name: 'Edit' }));
	await waitFor(() =>
		expect(router.currentRoute.value).toMatchObject({
			name: SELF_HEALING_CONFIGURATION_VIEW,
			params: { projectId: 'project', configurationId: '1' },
		}),
	);
});

it('removes a configuration from the action menu only after confirmation', async () => {
	const { view, store } = await renderSection();
	const remove = vi.spyOn(store, 'remove').mockResolvedValue();
	for (const answer of ['cancel', 'confirm']) {
		confirm.mockResolvedValueOnce(answer);
		await fireEvent.click(view.getByRole('button', { name: 'Actions' }));
		await fireEvent.click(await view.findByRole('menuitem', { name: 'Delete' }));
		await waitFor(() => expect(confirm).toHaveBeenCalled());
		if (answer === 'cancel') expect(remove).not.toHaveBeenCalled();
	}
	await waitFor(() => expect(remove).toHaveBeenCalledWith('project', 1));
});

it('shows relative last activity and the prototype empty label', async () => {
	const { view, store } = await renderSection();
	expect(view.getByText('No failures yet')).toBeVisible();
	store.configurations.project[0].lastActivity = new Date(Date.now() - 5 * 60_000).toISOString();
	expect(await view.findByText('5 minutes ago')).toBeVisible();
	expect(view.queryByText('No failures yet')).not.toBeInTheDocument();
});

it('opens a new configuration in the current project', async () => {
	const { view, router } = await renderSection();
	await fireEvent.click(view.getByTestId('self-healing-create'));
	await waitFor(() =>
		expect(router.currentRoute.value).toMatchObject({
			name: SELF_HEALING_CONFIGURATION_VIEW,
			params: { projectId: 'project', configurationId: 'new' },
		}),
	);
});
