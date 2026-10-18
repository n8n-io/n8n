import { render, fireEvent, waitFor } from '@testing-library/vue';
import type { SelfHealingConfigurationDto } from '@n8n/api-types';
import { createMemoryHistory, createRouter, RouterView, type Router } from 'vue-router';

import { useSelfHealingStore } from '../self-healing.store';
import SelfHealingConfigView from './SelfHealingConfigView.vue';

const { confirm } = vi.hoisted(() => ({ confirm: vi.fn() }));
vi.mock('@n8n/design-system', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/design-system')>()),
	useMessage: () => ({ confirm }),
}));
vi.mock('@n8n/stores/users.store', () => ({
	useUsersStore: () => ({ currentUser: { id: 'creator' } }),
}));

const configuration: SelfHealingConfigurationDto = {
	id: 1,
	projectId: 'project',
	scope: 'all',
	workflowIds: [],
	reviewerIds: ['creator'],
	enabled: false,
	enabledById: null,
	lastActivity: null,
};

let router: Router;

async function renderView(configurationId: string) {
	await router.push(`/projects/project/settings/self-healing/${configurationId}`);
	return render(RouterView, { global: { plugins: [router] } });
}

beforeEach(() => {
	vi.clearAllMocks();
	router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{
				path: '/projects/:projectId/settings/self-healing/:configurationId',
				component: SelfHealingConfigView,
				props: true,
			},
			{ path: '/projects/:projectId/settings', component: { render: () => null } },
		],
	});
	const store = useSelfHealingStore();
	store.configurations.project = [];
	store.options.project = {
		workflows: [{ id: 'workflow', name: 'Production workflow' }],
		reviewers: [
			{ id: 'creator', email: 'creator@example.com', firstName: 'Test', lastName: 'Reviewer' },
		],
	};
	vi.spyOn(store, 'load').mockResolvedValue();
});

it('creates a disabled configuration with the creator as reviewer', async () => {
	const store = useSelfHealingStore();
	const save = vi.spyOn(store, 'save').mockResolvedValue(configuration);
	const view = await renderView('new');
	const button = await view.findByRole('button', { name: 'Save configuration' });
	expect(button).toBeEnabled();
	expect(view.getByRole('switch', { name: 'Enable self-healing' })).not.toBeChecked();
	await fireEvent.click(button);
	await waitFor(() =>
		expect(save).toHaveBeenCalledWith(
			'project',
			{ scope: 'all', workflowIds: [], reviewerIds: ['creator'], enabled: false },
			undefined,
		),
	);
	await waitFor(() =>
		expect(router.currentRoute.value.fullPath).toBe('/projects/project/settings#self-healing'),
	);
});

it('requires a workflow selection when an all-workflows configuration already exists', async () => {
	const store = useSelfHealingStore();
	store.configurations.project = [configuration];
	const view = await renderView('new');
	expect(await view.findByRole('button', { name: 'Save configuration' })).toBeDisabled();
	expect(view.getByTestId('self-healing-workflows')).toBeVisible();
});

it('loads an existing configuration without offering to save unchanged values', async () => {
	const store = useSelfHealingStore();
	store.configurations.project = [{ ...configuration, enabled: true, enabledById: 'creator' }];
	const view = await renderView('1');
	expect(await view.findByRole('button', { name: 'Save configuration' })).toBeDisabled();
	expect(view.getByRole('switch', { name: 'Enable self-healing' })).toBeChecked();
});

it('prevents edits while a configuration is being saved', async () => {
	const store = useSelfHealingStore();
	const selected = { ...configuration, scope: 'selected' as const, workflowIds: ['workflow'] };
	store.configurations.project = [selected];
	const pending = Promise.withResolvers<SelfHealingConfigurationDto>();
	const save = vi.spyOn(store, 'save').mockReturnValue(pending.promise);
	const view = await renderView('1');
	const button = await view.findByRole('button', { name: 'Save configuration' });
	const enabled = view.getByRole('switch', { name: 'Enable self-healing' });
	await fireEvent.click(enabled);
	await fireEvent.click(button);

	expect(enabled).toBeDisabled();
	for (const select of view.getAllByRole('combobox')) {
		expect(select).toBeDisabled();
	}
	await fireEvent.click(enabled);
	expect(enabled).toBeChecked();
	expect(router.currentRoute.value.params.configurationId).toBe('1');

	pending.resolve({ ...selected, enabled: true, enabledById: 'creator' });
	await waitFor(() => expect(router.currentRoute.value.path).toBe('/projects/project/settings'));
	expect(save).toHaveBeenCalledWith(
		'project',
		{
			scope: 'selected',
			workflowIds: ['workflow'],
			reviewerIds: ['creator'],
			enabled: true,
		},
		1,
	);
});

it.each([
	'/projects/project/settings',
	'/projects/project/settings/self-healing/2',
	'/projects/other/settings/self-healing/1',
])('asks before discarding edits when navigating to %s', async (destination) => {
	const store = useSelfHealingStore();
	store.configurations.project = [
		configuration,
		{ ...configuration, id: 2, scope: 'selected', workflowIds: ['workflow'] },
	];
	store.configurations.other = [{ ...configuration, projectId: 'other' }];
	store.options.other = store.options.project;
	const view = await renderView('1');
	const enabled = await view.findByRole('switch', { name: 'Enable self-healing' });
	await fireEvent.click(enabled);

	confirm.mockResolvedValueOnce('cancel');
	await router.push(destination);

	expect(confirm).toHaveBeenCalledOnce();
	expect(router.currentRoute.value.path).toBe('/projects/project/settings/self-healing/1');
	expect(enabled).toBeChecked();

	confirm.mockResolvedValueOnce('confirm');
	await router.push(destination);

	expect(confirm).toHaveBeenCalledTimes(2);
	expect(router.currentRoute.value.path).toBe(destination);
});
