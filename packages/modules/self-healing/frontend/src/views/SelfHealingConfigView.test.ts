import { render, fireEvent, waitFor } from '@testing-library/vue';
import type { SelfHealingConfigurationDto } from '@n8n/api-types';
import { waitAllPromises } from '@n8n/frontend-test-utils';
import { createMemoryHistory, createRouter, RouterView, type Router } from 'vue-router';

import { useSelfHealingStore } from '../self-healing.store';
import SelfHealingConfigView from './SelfHealingConfigView.vue';

const { confirm, showError, showMessage } = vi.hoisted(() => ({
	confirm: vi.fn(),
	showError: vi.fn(),
	showMessage: vi.fn(),
}));
vi.mock('@n8n/composables/useToast', () => ({
	useToast: () => ({ showError, showMessage }),
}));
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

it('creates an enabled configuration with the creator as reviewer', async () => {
	const store = useSelfHealingStore();
	const save = vi.spyOn(store, 'save').mockResolvedValue({
		...configuration,
		enabled: true,
		enabledById: 'creator',
	});
	const view = await renderView('new');
	const button = await view.findByRole('button', { name: 'Create configuration' });
	expect(button).toBeEnabled();
	expect(view.queryByRole('switch')).not.toBeInTheDocument();
	expect(view.getByText('Test Reviewer (you)')).toBeVisible();
	await fireEvent.click(button);
	await waitFor(() =>
		expect(save).toHaveBeenCalledWith(
			'project',
			{ scope: 'all', workflowIds: [], reviewerIds: ['creator'], enabled: true },
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
	expect(await view.findByRole('button', { name: 'Create configuration' })).toBeDisabled();
	expect(view.getByTestId('self-healing-workflows')).toBeVisible();
});

it('loads an existing configuration without offering to save unchanged values', async () => {
	const store = useSelfHealingStore();
	store.configurations.project = [{ ...configuration, enabled: true, enabledById: 'creator' }];
	const view = await renderView('1');
	expect(await view.findByRole('button', { name: 'Save changes' })).toBeDisabled();
});

it.each(['resolves', 'rejects'])(
	'keeps newer form edits when an obsolete load %s',
	async (outcome) => {
		const store = useSelfHealingStore();
		store.configurations.project = [
			configuration,
			{ ...configuration, id: 2, scope: 'selected', workflowIds: ['workflow'] },
		];
		const pending = Promise.withResolvers<undefined>();
		vi.mocked(store.load).mockReturnValueOnce(pending.promise).mockResolvedValueOnce();
		const view = await renderView('1');
		await router.push('/projects/project/settings/self-healing/2');
		await fireEvent.click(await view.findByRole('button', { name: 'Remove reviewer' }));

		if (outcome === 'rejects') {
			pending.reject(new Error('Could not load the previous configuration'));
		} else {
			pending.resolve(undefined);
		}
		await waitAllPromises();

		expect(view.queryByTestId('self-healing-selected-reviewer')).not.toBeInTheDocument();
		expect(view.getByRole('button', { name: 'Discard changes' })).toBeEnabled();
		expect(view.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
		expect(showError).not.toHaveBeenCalled();
		confirm.mockResolvedValueOnce('cancel');
		await router.push('/projects/project/settings');
		expect(confirm).toHaveBeenCalledOnce();
		expect(router.currentRoute.value.params.configurationId).toBe('2');
	},
);

it.each(['resolves', 'rejects'])(
	'keeps loading the current configuration when an obsolete load %s',
	async (outcome) => {
		const store = useSelfHealingStore();
		store.configurations.project = [configuration, { ...configuration, id: 2 }];
		const previous = Promise.withResolvers<undefined>();
		const current = Promise.withResolvers<undefined>();
		vi.mocked(store.load)
			.mockReturnValueOnce(previous.promise)
			.mockReturnValueOnce(current.promise);
		const view = await renderView('1');
		await router.push('/projects/project/settings/self-healing/2');

		if (outcome === 'rejects') {
			previous.reject(new Error('Could not load the previous configuration'));
		} else {
			previous.resolve(undefined);
		}
		await waitAllPromises();

		expect(view.getByText('Loading configurations…')).toBeVisible();
		expect(view.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
		expect(showError).not.toHaveBeenCalled();
		current.resolve(undefined);
		expect(await view.findByRole('button', { name: 'Save changes' })).toBeDisabled();
	},
);

it.each([false, true])(
	'preserves enabled=%s when saving edits and blocks changes during save',
	async (enabled) => {
		const store = useSelfHealingStore();
		const selected = {
			...configuration,
			enabled,
			enabledById: enabled ? 'creator' : null,
			scope: 'selected' as const,
			workflowIds: ['workflow'],
		};
		store.configurations.project = [selected];
		const pending = Promise.withResolvers<SelfHealingConfigurationDto>();
		const save = vi.spyOn(store, 'save').mockReturnValue(pending.promise);
		const view = await renderView('1');
		const button = await view.findByRole('button', { name: 'Save changes' });
		await fireEvent.click(view.getByRole('radio', { name: 'All' }));
		await fireEvent.click(button);

		for (const select of view.getAllByRole('combobox')) {
			expect(select).toBeDisabled();
		}
		expect(view.getByRole('radio', { name: 'Select manually' })).toBeDisabled();
		expect(view.getByRole('button', { name: 'Remove reviewer' })).toBeDisabled();
		pending.resolve({ ...selected, scope: 'all', workflowIds: [] });
		await waitFor(() => expect(button).toBeDisabled());
		expect(router.currentRoute.value.path).toBe('/projects/project/settings/self-healing/1');
		expect(save).toHaveBeenCalledWith(
			'project',
			{ scope: 'all', workflowIds: [], reviewerIds: ['creator'], enabled },
			1,
		);
	},
);

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
	const selected = await view.findByRole('radio', { name: 'Select manually' });
	await fireEvent.click(selected);

	confirm.mockResolvedValueOnce('cancel');
	await router.push(destination);

	expect(confirm).toHaveBeenCalledOnce();
	expect(router.currentRoute.value.path).toBe('/projects/project/settings/self-healing/1');
	expect(selected).toBeChecked();

	confirm.mockResolvedValueOnce('confirm');
	await router.push(destination);

	expect(confirm).toHaveBeenCalledTimes(2);
	expect(router.currentRoute.value.path).toBe(destination);
});

it('selects workflow rows and reviewers before saving', async () => {
	const store = useSelfHealingStore();
	const save = vi.spyOn(store, 'save').mockResolvedValue({
		...configuration,
		scope: 'selected',
		workflowIds: ['workflow'],
		enabled: true,
		enabledById: 'creator',
	});
	const view = await renderView('new');
	await view.findByRole('button', { name: 'Create configuration' });
	await fireEvent.click(view.getByRole('radio', { name: 'Select manually' }));
	expect(view.getByRole('button', { name: 'Create configuration' })).toBeDisabled();
	await fireEvent.click(view.getAllByRole('button', { name: 'Show popup' })[0]);
	await fireEvent.click(await view.findByRole('option', { name: 'Production workflow' }));
	expect(view.getByTestId('self-healing-selected-workflow')).toHaveTextContent(
		'Production workflow',
	);
	await fireEvent.click(view.getByRole('button', { name: 'Remove reviewer' }));
	expect(view.getByRole('button', { name: 'Create configuration' })).toBeDisabled();
	await fireEvent.click(view.getAllByRole('button', { name: 'Show popup' })[1]);
	await fireEvent.click(await view.findByRole('option', { name: /Test Reviewer/ }));
	await fireEvent.click(view.getByRole('button', { name: 'Create configuration' }));

	expect(save).toHaveBeenCalledWith(
		'project',
		{
			scope: 'selected',
			workflowIds: ['workflow'],
			reviewerIds: ['creator'],
			enabled: true,
		},
		undefined,
	);
});

it('discards edits in place without changing the saved configuration', async () => {
	const store = useSelfHealingStore();
	store.configurations.project = [
		{ ...configuration, scope: 'selected', workflowIds: ['workflow'] },
	];
	const save = vi.spyOn(store, 'save');
	const view = await renderView('1');
	await fireEvent.click(await view.findByRole('button', { name: 'Remove workflow' }));
	expect(view.queryByTestId('self-healing-selected-workflow')).not.toBeInTheDocument();
	await fireEvent.click(view.getByRole('button', { name: 'Discard changes' }));
	expect(await view.findByTestId('self-healing-selected-workflow')).toHaveTextContent(
		'Production workflow',
	);
	expect(router.currentRoute.value.params.configurationId).toBe('1');
	expect(save).not.toHaveBeenCalled();
	expect(view.getByRole('button', { name: 'Save changes' })).toBeDisabled();
});

it('keeps workflows reserved by other configurations unavailable in the picker', async () => {
	const store = useSelfHealingStore();
	store.configurations.project = [
		{ ...configuration, scope: 'selected', workflowIds: ['workflow'] },
	];
	const view = await renderView('new');
	await view.findByRole('button', { name: 'Create configuration' });
	await fireEvent.click(view.getByRole('radio', { name: 'Select manually' }));
	await fireEvent.click(view.getAllByRole('button', { name: 'Show popup' })[0]);

	expect(await view.findByRole('option', { name: /Production workflow/ })).toHaveAttribute(
		'data-disabled',
	);
});
