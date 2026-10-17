import type { SelfHealingConfigurationDto } from '@n8n/api-types';

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
	lastActivity: null,
};

beforeEach(() => vi.resetAllMocks());

it('loads saved configurations and keeps project lists separate', async () => {
	vi.mocked(api.fetchConfigurations).mockResolvedValue([configuration]);
	vi.mocked(api.fetchConfigurationOptions).mockResolvedValue({ workflows: [], reviewers: [] });
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
