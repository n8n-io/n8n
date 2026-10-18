import { render, fireEvent, waitFor } from '@testing-library/vue';
import type { SelfHealingConfigurationDto } from '@n8n/api-types';

import { useSelfHealingStore } from '../self-healing.store';
import SelfHealingConfigView from './SelfHealingConfigView.vue';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('vue-router', async (importOriginal) => ({
	...(await importOriginal<typeof import('vue-router')>()),
	useRouter: () => ({ push }),
	onBeforeRouteLeave: vi.fn(),
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

beforeEach(() => {
	vi.clearAllMocks();
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
	const view = render(SelfHealingConfigView, {
		props: { projectId: 'project', configurationId: 'new' },
	});
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
	expect(push).toHaveBeenCalledWith({ path: '/projects/project/settings', hash: '#self-healing' });
});

it('requires a workflow selection when an all-workflows configuration already exists', async () => {
	const store = useSelfHealingStore();
	store.configurations.project = [configuration];
	const view = render(SelfHealingConfigView, {
		props: { projectId: 'project', configurationId: 'new' },
	});
	expect(await view.findByRole('button', { name: 'Save configuration' })).toBeDisabled();
	expect(view.getByTestId('self-healing-workflows')).toBeVisible();
});

it('loads an existing configuration without offering to save unchanged values', async () => {
	const store = useSelfHealingStore();
	store.configurations.project = [{ ...configuration, enabled: true, enabledById: 'creator' }];
	const view = render(SelfHealingConfigView, {
		props: { projectId: 'project', configurationId: '1' },
	});
	expect(await view.findByRole('button', { name: 'Save configuration' })).toBeDisabled();
	expect(view.getByRole('switch', { name: 'Enable self-healing' })).toBeChecked();
});

it('prevents edits while a configuration is being saved', async () => {
	const store = useSelfHealingStore();
	const selected = { ...configuration, scope: 'selected' as const, workflowIds: ['workflow'] };
	store.configurations.project = [selected];
	const pending = Promise.withResolvers<SelfHealingConfigurationDto>();
	const save = vi.spyOn(store, 'save').mockReturnValue(pending.promise);
	const view = render(SelfHealingConfigView, {
		props: { projectId: 'project', configurationId: '1' },
	});
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
	expect(push).not.toHaveBeenCalled();

	pending.resolve({ ...selected, enabled: true, enabledById: 'creator' });
	await waitFor(() => expect(push).toHaveBeenCalled());
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
