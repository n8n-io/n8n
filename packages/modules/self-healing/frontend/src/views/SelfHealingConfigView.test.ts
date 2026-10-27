import { render, fireEvent, waitFor, within } from '@testing-library/vue';
import type { SelfHealingConfigurationDto } from '@n8n/api-types';
import { waitAllPromises } from '@n8n/frontend-test-utils';
import {
	PERSONAL_SELF_HEALING_CONFIGURATION_VIEW,
	PERSONAL_SELF_HEALING_VIEW,
} from '@n8n/frontend-constants/self-healing';
import { VIEWS } from '@n8n/frontend-constants/views';
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
	includeAllProjectMembers: false,
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
			{
				path: '/projects/:projectId/settings',
				name: VIEWS.PROJECT_SETTINGS,
				component: { render: () => null },
			},
			{
				path: '/projects/:projectId/self-healing',
				name: PERSONAL_SELF_HEALING_VIEW,
				component: { render: () => null },
			},
			{
				path: '/projects/:projectId/self-healing/:configurationId',
				name: PERSONAL_SELF_HEALING_CONFIGURATION_VIEW,
				component: SelfHealingConfigView,
				props: true,
			},
		],
	});
	const store = useSelfHealingStore();
	store.configurations.project = [];
	store.options.project = {
		project: { name: 'Acme project', icon: { type: 'icon', value: 'rocket' } },
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
	const reviewer = within(view.getByTestId('self-healing-selected-reviewer'));
	expect(reviewer.getByText('Test Reviewer (you)')).toBeVisible();
	expect(reviewer.getAllByText(/\(you\)/)).toHaveLength(1);
	expect(reviewer.getByText('creator@example.com')).toBeVisible();
	await fireEvent.click(button);
	await waitFor(() =>
		expect(save).toHaveBeenCalledWith(
			'project',
			{
				scope: 'all',
				workflowIds: [],
				reviewerIds: ['creator'],
				includeAllProjectMembers: false,
				enabled: true,
			},
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

		expect(view.getByTestId('self-healing-config-loading')).toBeVisible();
		expect(view.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();
		expect(showError).not.toHaveBeenCalled();
		current.resolve(undefined);
		expect(await view.findByRole('button', { name: 'Save changes' })).toBeDisabled();
		expect(view.queryByTestId('self-healing-config-loading')).not.toBeInTheDocument();
	},
);

it.each([false, true])(
	'omits enabled=%s when saving edits and blocks changes during save',
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
			{ scope: 'all', workflowIds: [], reviewerIds: ['creator'], includeAllProjectMembers: false },
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
			includeAllProjectMembers: false,
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
	await view.findByRole('button', { name: 'Remove workflow' });
	for (let edit = 0; edit < 2; edit++) {
		await fireEvent.click(view.getByRole('button', { name: 'Remove workflow' }));
		await fireEvent.click(view.getByRole('button', { name: 'Remove reviewer' }));
		expect(view.queryByTestId('self-healing-selected-workflow')).not.toBeInTheDocument();
		await fireEvent.click(view.getByRole('radio', { name: 'All' }));
		await fireEvent.click(view.getByRole('button', { name: 'Discard changes' }));
		expect(await view.findByTestId('self-healing-selected-workflow')).toHaveTextContent(
			'Production workflow',
		);
		expect(view.getByTestId('self-healing-selected-reviewer')).toHaveTextContent('Test Reviewer');
		expect(view.getByRole('button', { name: 'Save changes' })).toBeDisabled();
		expect(view.getByRole('button', { name: 'Discard changes' })).toBeDisabled();
	}
	expect(router.currentRoute.value.params.configurationId).toBe('1');
	expect(save).not.toHaveBeenCalled();
	expect(store.load).toHaveBeenCalledOnce();
});

it('keeps draft workflow picks when switching from selected to all and back', async () => {
	const view = await renderView('new');
	await fireEvent.click(await view.findByRole('radio', { name: 'Select manually' }));
	await fireEvent.click(view.getAllByRole('button', { name: 'Show popup' })[0]);
	await fireEvent.click(await view.findByRole('option', { name: 'Production workflow' }));
	await fireEvent.click(view.getByRole('radio', { name: 'All' }));
	await fireEvent.click(view.getByRole('radio', { name: 'Select manually' }));

	expect(view.getByTestId('self-healing-selected-workflow')).toHaveTextContent(
		'Production workflow',
	);
	expect(view.getByRole('button', { name: 'Create configuration' })).toBeEnabled();
});

it('saves all scope with no workflow IDs and uses it as the discard baseline', async () => {
	const store = useSelfHealingStore();
	store.configurations.project = [
		{ ...configuration, scope: 'selected', workflowIds: ['workflow'] },
	];
	const save = vi.spyOn(store, 'save').mockResolvedValue(configuration);
	const view = await renderView('1');
	await fireEvent.click(await view.findByRole('radio', { name: 'All' }));
	await fireEvent.click(view.getByRole('button', { name: 'Save changes' }));
	await waitFor(() => expect(showMessage).toHaveBeenCalledOnce());

	expect(save).toHaveBeenCalledWith(
		'project',
		expect.objectContaining({ scope: 'all', workflowIds: [] }),
		1,
	);
	expect(view.getByRole('button', { name: 'Save changes' })).toBeDisabled();
	expect(view.getByRole('button', { name: 'Discard changes' })).toBeDisabled();
	await fireEvent.click(view.getByRole('radio', { name: 'Select manually' }));
	expect(view.queryByTestId('self-healing-selected-workflow')).not.toBeInTheDocument();
	await fireEvent.click(view.getAllByRole('button', { name: 'Show popup' })[0]);
	await fireEvent.click(await view.findByRole('option', { name: 'Production workflow' }));
	await fireEvent.click(view.getByRole('button', { name: 'Discard changes' }));
	expect(view.getByRole('radio', { name: 'All' })).toBeChecked();
	expect(view.getByRole('button', { name: 'Save changes' })).toBeDisabled();
	await fireEvent.click(view.getByRole('radio', { name: 'Select manually' }));
	expect(view.queryByTestId('self-healing-selected-workflow')).not.toBeInTheDocument();
	expect(store.load).toHaveBeenCalledOnce();
});

it('keeps draft workflow picks and the saved baseline when saving all scope fails', async () => {
	const store = useSelfHealingStore();
	store.configurations.project = [configuration];
	const error = new Error('Could not save the configuration');
	const save = vi.spyOn(store, 'save').mockRejectedValue(error);
	const view = await renderView('1');
	await fireEvent.click(await view.findByRole('radio', { name: 'Select manually' }));
	await fireEvent.click(view.getAllByRole('button', { name: 'Show popup' })[0]);
	await fireEvent.click(await view.findByRole('option', { name: 'Production workflow' }));
	await fireEvent.click(view.getByRole('radio', { name: 'All' }));
	await fireEvent.click(view.getByRole('button', { name: 'Save changes' }));
	await waitFor(() => expect(showError).toHaveBeenCalledWith(error, expect.any(String)));

	expect(save).toHaveBeenCalledWith(
		'project',
		expect.objectContaining({ scope: 'all', workflowIds: [] }),
		1,
	);
	await fireEvent.click(view.getByRole('radio', { name: 'Select manually' }));
	expect(view.getByTestId('self-healing-selected-workflow')).toHaveTextContent(
		'Production workflow',
	);
	expect(view.getByRole('button', { name: 'Save changes' })).toBeEnabled();
	await fireEvent.click(view.getByRole('button', { name: 'Discard changes' }));
	expect(view.getByRole('radio', { name: 'All' })).toBeChecked();
	expect(view.getByRole('button', { name: 'Discard changes' })).toBeDisabled();
	await fireEvent.click(view.getByRole('radio', { name: 'Select manually' }));
	expect(view.queryByTestId('self-healing-selected-workflow')).not.toBeInTheDocument();
	expect(store.load).toHaveBeenCalledOnce();
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

it('returns to project settings at the self-healing section', async () => {
	const store = useSelfHealingStore();
	store.configurations.project = [configuration];
	const view = await renderView('1');
	await view.findByRole('button', { name: 'Save changes' });
	await fireEvent.click(view.getByRole('button', { name: 'Project settings' }));

	await waitFor(() =>
		expect(router.currentRoute.value).toMatchObject({
			name: VIEWS.PROJECT_SETTINGS,
			params: { projectId: 'project' },
			hash: '#self-healing',
		}),
	);
});

it('returns to the self-healing tab of a personal project', async () => {
	const store = useSelfHealingStore();
	store.configurations.project = [configuration];
	await router.push('/projects/project/self-healing/1');
	const view = render(RouterView, { global: { plugins: [router] } });
	await view.findByRole('button', { name: 'Save changes' });
	await fireEvent.click(view.getByRole('button', { name: 'Self-healing' }));

	await waitFor(() =>
		expect(router.currentRoute.value).toMatchObject({
			name: PERSONAL_SELF_HEALING_VIEW,
			params: { projectId: 'project' },
		}),
	);
});

describe('personal project', () => {
	it('creates a personal configuration with the project member group and no reviewer section', async () => {
		const store = useSelfHealingStore();
		const save = vi.spyOn(store, 'save').mockResolvedValue(configuration);
		await router.push('/projects/project/self-healing/new');
		const view = render(RouterView, { global: { plugins: [router] } });
		const button = await view.findByRole('button', { name: 'Create configuration' });

		expect(view.queryByText('Reviewers')).not.toBeInTheDocument();
		expect(view.queryByTestId('self-healing-reviewers')).not.toBeInTheDocument();
		expect(view.queryByText(/who hears about it/)).not.toBeInTheDocument();
		await fireEvent.click(button);
		await waitFor(() =>
			expect(save).toHaveBeenCalledWith(
				'project',
				expect.objectContaining({ reviewerIds: [], includeAllProjectMembers: true }),
				undefined,
			),
		);
	});

	it('reports a missing configuration without pointing to project settings', async () => {
		await router.push('/projects/project/self-healing/1');
		render(RouterView, { global: { plugins: [router] } });

		await waitFor(() =>
			expect(showError).toHaveBeenCalledWith(
				new Error('This configuration is no longer available.'),
				expect.any(String),
			),
		);
	});

	it('uses the project member group when it saves an existing personal configuration', async () => {
		const store = useSelfHealingStore();
		store.configurations.project = [configuration];
		const save = vi.spyOn(store, 'save').mockResolvedValue(configuration);
		store.options.project.workflows.push({ id: 'other', name: 'Other workflow' });
		await router.push('/projects/project/self-healing/1');
		const view = render(RouterView, { global: { plugins: [router] } });
		await view.findByRole('button', { name: 'Save changes' });

		await fireEvent.click(view.getByRole('radio', { name: 'Select manually' }));
		await fireEvent.click(view.getAllByRole('button', { name: 'Show popup' })[0]);
		await fireEvent.click(await view.findByRole('option', { name: /Other workflow/ }));
		await fireEvent.click(view.getByRole('button', { name: 'Save changes' }));

		await waitFor(() =>
			expect(save).toHaveBeenCalledWith(
				'project',
				expect.objectContaining({ reviewerIds: [], includeAllProjectMembers: true }),
				1,
			),
		);
	});
});

it('shows an email-only reviewer once and allows removal', async () => {
	const store = useSelfHealingStore();
	store.options.project.reviewers = [
		{ id: 'creator', email: 'creator@example.com', firstName: null, lastName: null },
	];
	const view = await renderView('new');
	const reviewer = within(await view.findByTestId('self-healing-selected-reviewer'));

	expect(reviewer.getAllByText(/creator@example\.com/)).toHaveLength(1);
	expect(reviewer.getAllByText(/\(you\)/)).toHaveLength(1);
	await fireEvent.click(reviewer.getByRole('button', { name: 'Remove reviewer' }));
	expect(view.queryByTestId('self-healing-selected-reviewer')).not.toBeInTheDocument();
});

it('keeps a saved unavailable reviewer visible and removable', async () => {
	const store = useSelfHealingStore();
	store.configurations.project = [{ ...configuration, reviewerIds: ['creator', 'unavailable'] }];
	const view = await renderView('1');
	await view.findByRole('button', { name: 'Save changes' });
	const rows = view.getAllByTestId('self-healing-selected-reviewer');
	expect(rows).toHaveLength(2);
	const reviewer = within(rows[1]);
	expect(reviewer.getByText('Reviewer no longer available')).toBeVisible();

	await fireEvent.click(reviewer.getByRole('button', { name: 'Remove reviewer' }));
	expect(view.getAllByTestId('self-healing-selected-reviewer')).toHaveLength(1);
	expect(view.getByText('Test Reviewer (you)')).toBeVisible();
	expect(view.getByRole('button', { name: 'Save changes' })).toBeEnabled();
});

describe('project members', () => {
	it('adds project members from the picker and saves them without individual reviewers', async () => {
		const store = useSelfHealingStore();
		const save = vi.spyOn(store, 'save').mockResolvedValue({
			...configuration,
			reviewerIds: [],
			includeAllProjectMembers: true,
		});
		const view = await renderView('new');
		await view.findByRole('button', { name: 'Create configuration' });
		expect(view.queryByTestId('self-healing-project-members')).not.toBeInTheDocument();

		await fireEvent.click(view.getByRole('button', { name: 'Show popup' }));
		const option = await view.findByRole('option', { name: 'People from Acme project' });
		expect(within(option).getByTestId('project-members-icon')).toBeInTheDocument();
		await fireEvent.click(option);

		const group = view.getByTestId('self-healing-project-members');
		expect(group).toHaveTextContent('People from Acme project');
		expect(within(group).getByTestId('project-members-icon')).toBeInTheDocument();
		expect(view.getByTestId('self-healing-selected-reviewer')).toHaveTextContent('Test Reviewer');
		expect(view.getByRole('combobox', { name: 'Reviewers' })).toBeDisabled();
		expect(view.getByText('All eligible project members are included.')).toBeVisible();

		await fireEvent.click(view.getByRole('button', { name: 'Remove reviewer' }));
		expect(view.queryByText('No reviewers yet.')).not.toBeInTheDocument();
		await fireEvent.click(view.getByRole('button', { name: 'Create configuration' }));

		expect(save).toHaveBeenCalledWith(
			'project',
			{
				scope: 'all',
				workflowIds: [],
				reviewerIds: [],
				includeAllProjectMembers: true,
				enabled: true,
			},
			undefined,
		);
	});

	it('keeps individual reviewers while the project group is selected and after its removal', async () => {
		const store = useSelfHealingStore();
		store.options.project.reviewers.push({
			id: 'maya',
			email: 'maya@example.com',
			firstName: 'Maya',
			lastName: 'Editor',
		});
		const save = vi.spyOn(store, 'save').mockResolvedValue(configuration);
		const view = await renderView('new');
		await view.findByRole('button', { name: 'Create configuration' });
		await fireEvent.click(view.getByRole('button', { name: 'Show popup' }));
		await fireEvent.click(await view.findByRole('option', { name: /Maya Editor/ }));
		await fireEvent.click(view.getByRole('button', { name: 'Show popup' }));
		await fireEvent.click(await view.findByRole('option', { name: 'People from Acme project' }));

		expect(view.getByRole('combobox', { name: 'Reviewers' })).toBeDisabled();
		expect(view.getByText('All eligible project members are included.')).toBeVisible();
		expect(view.getAllByTestId('self-healing-selected-reviewer')).toHaveLength(2);

		await fireEvent.click(
			view.getByRole('button', { name: 'Remove project members from reviewers' }),
		);
		expect(view.getByRole('combobox', { name: 'Reviewers' })).toBeEnabled();
		expect(view.queryByText('All eligible project members are included.')).not.toBeInTheDocument();
		expect(view.getAllByTestId('self-healing-selected-reviewer')).toHaveLength(2);
		await fireEvent.click(view.getByRole('button', { name: 'Create configuration' }));

		expect(save).toHaveBeenCalledWith(
			'project',
			{
				scope: 'all',
				workflowIds: [],
				reviewerIds: ['creator', 'maya'],
				includeAllProjectMembers: false,
				enabled: true,
			},
			undefined,
		);
	});

	it('does not preselect a creator who cannot review in the project', async () => {
		const store = useSelfHealingStore();
		store.options.project.reviewers = [
			{ id: 'maya', email: 'maya@example.com', firstName: 'Maya', lastName: 'Editor' },
		];
		const view = await renderView('new');
		expect(await view.findByRole('button', { name: 'Create configuration' })).toBeDisabled();
		expect(view.queryByTestId('self-healing-selected-reviewer')).not.toBeInTheDocument();
		expect(view.getByText('No reviewers yet.')).toBeVisible();

		await fireEvent.click(view.getByRole('button', { name: 'Show popup' }));
		await fireEvent.click(await view.findByRole('option', { name: 'People from Acme project' }));
		expect(view.getByRole('button', { name: 'Create configuration' })).toBeEnabled();
	});

	it('removes saved project members and requires another reviewer', async () => {
		const store = useSelfHealingStore();
		store.configurations.project = [
			{ ...configuration, reviewerIds: [], includeAllProjectMembers: true },
		];
		const save = vi.spyOn(store, 'save').mockResolvedValue(configuration);
		const view = await renderView('1');
		expect(await view.findByTestId('self-healing-project-members')).toHaveTextContent(
			'People from Acme project',
		);
		expect(view.queryByTestId('self-healing-selected-reviewer')).not.toBeInTheDocument();

		await fireEvent.click(
			view.getByRole('button', { name: 'Remove project members from reviewers' }),
		);
		expect(view.queryByTestId('self-healing-project-members')).not.toBeInTheDocument();
		expect(view.getByText('No reviewers yet.')).toBeVisible();
		expect(view.getByRole('button', { name: 'Save changes' })).toBeDisabled();

		await fireEvent.click(view.getByRole('button', { name: 'Show popup' }));
		await fireEvent.click(await view.findByRole('option', { name: /Test Reviewer/ }));
		await fireEvent.click(view.getByRole('button', { name: 'Save changes' }));
		expect(save).toHaveBeenCalledWith(
			'project',
			{ scope: 'all', workflowIds: [], reviewerIds: ['creator'], includeAllProjectMembers: false },
			1,
		);
	});

	it('keeps project members with individual reviewers when saving edits', async () => {
		const store = useSelfHealingStore();
		store.configurations.project = [{ ...configuration, includeAllProjectMembers: true }];
		const save = vi.spyOn(store, 'save').mockResolvedValue(configuration);
		const view = await renderView('1');
		await view.findByTestId('self-healing-project-members');
		await fireEvent.click(view.getByRole('button', { name: 'Remove reviewer' }));
		await fireEvent.click(view.getByRole('button', { name: 'Save changes' }));

		expect(save).toHaveBeenCalledWith(
			'project',
			{ scope: 'all', workflowIds: [], reviewerIds: [], includeAllProjectMembers: true },
			1,
		);
	});
});
