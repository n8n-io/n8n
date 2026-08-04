import { ref } from 'vue';
import { createTestingPinia } from '@pinia/testing';

import { mockedStore } from '@/__tests__/utils';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';

import { useWorkflowSetupBootstrap } from './useWorkflowSetupBootstrap';

describe('useWorkflowSetupBootstrap', () => {
	let credentialsStore: ReturnType<typeof mockedStore<typeof useCredentialsStore>>;
	let nodeTypesStore: ReturnType<typeof mockedStore<typeof useNodeTypesStore>>;

	beforeEach(() => {
		createTestingPinia();
		credentialsStore = mockedStore(useCredentialsStore);
		nodeTypesStore = mockedStore(useNodeTypesStore);

		credentialsStore.fetchAllCredentialsForWorkflow = vi.fn().mockResolvedValue([]);
		credentialsStore.fetchCredentialTypes = vi.fn().mockResolvedValue(undefined);
		nodeTypesStore.loadNodeTypesIfNotLoaded = vi.fn().mockResolvedValue(undefined);
	});

	it('throws when workflowId is missing', async () => {
		const { bootstrap } = useWorkflowSetupBootstrap(ref(undefined));

		await expect(bootstrap()).rejects.toThrow('useWorkflowSetupBootstrap: workflowId is required');
		expect(credentialsStore.fetchAllCredentialsForWorkflow).not.toHaveBeenCalled();
	});

	it('fetches workflow-scoped credentials and flips isReady after success', async () => {
		const { isReady, bootstrap } = useWorkflowSetupBootstrap(ref('workflow-1'));

		expect(isReady.value).toBe(false);

		await bootstrap();

		expect(credentialsStore.fetchAllCredentialsForWorkflow).toHaveBeenCalledWith({
			workflowId: 'workflow-1',
		});
		expect(credentialsStore.fetchCredentialTypes).toHaveBeenCalled();
		expect(nodeTypesStore.loadNodeTypesIfNotLoaded).toHaveBeenCalled();
		expect(isReady.value).toBe(true);
	});

	it('flips isReady to true even when one of the parallel calls fails', async () => {
		credentialsStore.fetchAllCredentialsForWorkflow = vi
			.fn()
			.mockRejectedValue(new Error('network'));
		const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		const { isReady, bootstrap } = useWorkflowSetupBootstrap(ref('workflow-1'));

		await bootstrap();

		expect(isReady.value).toBe(true);
		expect(warnSpy).toHaveBeenCalled();

		warnSpy.mockRestore();
	});

	it('uses the latest projectId from the ref at the time bootstrap is called', async () => {
		const workflowId = ref<string | undefined>('workflow-1');
		const { bootstrap } = useWorkflowSetupBootstrap(workflowId);

		workflowId.value = 'workflow-2';
		await bootstrap();

		expect(credentialsStore.fetchAllCredentialsForWorkflow).toHaveBeenCalledWith({
			workflowId: 'workflow-2',
		});
	});
});
