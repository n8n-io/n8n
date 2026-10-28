import type { SelfHealingConfigurationDto, SelfHealingConfigurationOptions } from '@n8n/api-types';

import * as api from './self-healing.api';
import { useSelfHealingStore } from './self-healing.store';

vi.mock('./self-healing.api');

const configuration: SelfHealingConfigurationDto = {
	id: 1,
	projectId: 'project',
	scope: 'all',
	enabled: false,
	enabledById: null,
	workflowIds: [],
	reviewerIds: ['reviewer'],
	includeAllProjectMembers: false,
	lastActivity: null,
};

const options: SelfHealingConfigurationOptions = {
	project: { name: 'Acme project', icon: null },
	workflows: [],
	reviewers: [],
};

beforeEach(() => vi.resetAllMocks());

it('loads saved configurations and keeps project lists separate', async () => {
	vi.mocked(api.fetchConfigurations).mockResolvedValue([configuration]);
	vi.mocked(api.fetchConfigurationOptions).mockResolvedValue(options);
	const store = useSelfHealingStore();
	await store.load('project');
	expect(store.configurations.project).toEqual([configuration]);
	expect(store.configurations.other).toBeUndefined();
});

it('changes enabled state only after the server accepts it', async () => {
	const store = useSelfHealingStore();
	store.configurations.project = [configuration];
	vi.mocked(api.setConfigurationEnabled).mockRejectedValueOnce(new Error('No access'));
	await expect(store.setEnabled('project', 1, true)).rejects.toThrow('No access');
	expect(store.configurations.project[0].enabled).toBe(false);
	vi.mocked(api.setConfigurationEnabled).mockResolvedValue({
		...configuration,
		enabled: true,
		enabledById: 'actor',
	});
	await store.setEnabled('project', 1, true);
	expect(store.configurations.project[0]).toMatchObject({ enabled: true, enabledById: 'actor' });
});

it('removes a configuration from the list after the server removes it', async () => {
	const store = useSelfHealingStore();
	store.configurations.project = [configuration];
	vi.mocked(api.removeConfiguration).mockResolvedValue();
	await store.remove('project', 1);
	expect(store.configurations.project).toEqual([]);
});

it.each(['save', 'setEnabled', 'remove'] as const)(
	'ignores an older list response after %s succeeds',
	async (action) => {
		const store = useSelfHealingStore();
		store.configurations.project = [configuration];
		const pending = Promise.withResolvers<SelfHealingConfigurationDto[]>();
		vi.mocked(api.fetchConfigurations).mockReturnValue(pending.promise);
		vi.mocked(api.fetchConfigurationOptions).mockResolvedValue(options);
		const load = store.load('project');
		const updated = { ...configuration, enabled: true, enabledById: 'actor' };

		if (action === 'save') {
			vi.mocked(api.saveConfiguration).mockResolvedValue(updated);
			await store.save('project', updated, configuration.id);
		} else if (action === 'setEnabled') {
			vi.mocked(api.setConfigurationEnabled).mockResolvedValue(updated);
			await store.setEnabled('project', configuration.id, true);
		} else {
			vi.mocked(api.removeConfiguration).mockResolvedValue();
			await store.remove('project', configuration.id);
		}

		pending.resolve([configuration]);
		await load;

		expect(store.configurations.project).toEqual(action === 'remove' ? [] : [updated]);
	},
);

it('keeps the latest list when requests finish out of order', async () => {
	const store = useSelfHealingStore();
	const pending = Promise.withResolvers<SelfHealingConfigurationDto[]>();
	const updated = { ...configuration, enabled: true, enabledById: 'actor' };
	vi.mocked(api.fetchConfigurations)
		.mockReturnValueOnce(pending.promise)
		.mockResolvedValueOnce([updated]);
	vi.mocked(api.fetchConfigurationOptions).mockResolvedValue(options);

	const firstLoad = store.load('project');
	await store.load('project');
	pending.resolve([configuration]);
	await firstLoad;

	expect(store.configurations.project).toEqual([updated]);
});

it.each(['save', 'setEnabled'] as const)(
	'keeps row order after %s updates an existing configuration',
	async (action) => {
		const store = useSelfHealingStore();
		const second = { ...configuration, id: 2 };
		const third = { ...configuration, id: 3 };
		store.configurations.project = [configuration, second, third];
		const updated = { ...configuration, enabled: true, enabledById: 'actor' };

		if (action === 'save') {
			vi.mocked(api.saveConfiguration).mockResolvedValue(updated);
			await store.save('project', updated, configuration.id);
		} else {
			vi.mocked(api.setConfigurationEnabled).mockResolvedValue(updated);
			await store.setEnabled('project', configuration.id, true);
		}

		expect(store.configurations.project).toEqual([updated, second, third]);
	},
);

it('appends new configurations after existing rows', async () => {
	const store = useSelfHealingStore();
	const second = { ...configuration, id: 2 };
	const created = { ...configuration, id: 3 };
	store.configurations.project = [configuration, second];
	vi.mocked(api.saveConfiguration).mockResolvedValue(created);

	await store.save('project', created);

	expect(store.configurations.project).toEqual([configuration, second, created]);
});
