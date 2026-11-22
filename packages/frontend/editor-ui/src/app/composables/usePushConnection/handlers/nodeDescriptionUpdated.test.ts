import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { nodeDescriptionUpdated } from './nodeDescriptionUpdated';

const customNodesStore = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('@n8n/frontend-module-custom-nodes', async (importOriginal) => ({
	...(await importOriginal<object>()),
	useCustomNodesStore: () => customNodesStore,
}));

const event = { type: 'nodeDescriptionUpdated' as const, data: {} };

describe('nodeDescriptionUpdated', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
		customNodesStore.refresh.mockReset().mockResolvedValue(undefined);
	});

	it('reloads the node types and the credential types', async () => {
		await nodeDescriptionUpdated(event);

		expect(useNodeTypesStore().getNodeTypes).toHaveBeenCalled();
		expect(useCredentialsStore().fetchCredentialTypes).toHaveBeenCalledWith(true);
	});

	it('reloads the custom actions when the custom nodes module is active', async () => {
		vi.mocked(useSettingsStore().isModuleActive).mockImplementation(
			(name: string) => name === 'custom-nodes',
		);

		await nodeDescriptionUpdated(event);

		expect(customNodesStore.refresh).toHaveBeenCalledTimes(1);
	});

	it('does not reload the custom actions when the module is off', async () => {
		vi.mocked(useSettingsStore().isModuleActive).mockReturnValue(false);

		await nodeDescriptionUpdated(event);

		expect(customNodesStore.refresh).not.toHaveBeenCalled();
	});
});
