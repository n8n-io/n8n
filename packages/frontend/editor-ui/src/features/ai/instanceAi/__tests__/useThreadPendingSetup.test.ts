import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { computed, effectScope, reactive, ref } from 'vue';
import { flushPromises } from '@vue/test-utils';
import { mock } from 'vitest-mock-extended';
import type { InstanceAiMessage, InstanceAiSetupItem } from '@n8n/api-types';
import { createTestNode, createTestWorkflow, mockNodeTypeDescription } from '@/__tests__/mocks';
import { mockedStore } from '@/__tests__/utils';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import * as credentialsApi from '@/features/credentials/credentials.api';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import type { ICredentialsResponse } from '@/features/credentials/credentials.types';
import {
	getNodeCredentialTypes,
	getNodeParametersIssues,
} from '@/features/setupPanel/setupPanel.utils';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { useThreadPendingSetup } from '../composables/useThreadPendingSetup';

vi.mock('@/features/setupPanel/setupPanel.utils', () => ({
	getNodeCredentialTypes: vi.fn(),
	getNodeParametersIssues: vi.fn(),
}));

it('retains pending requirements when another workflow replaces the credential slice', async () => {
	setActivePinia(createTestingPinia({ stubActions: false }));
	const settings = mockedStore(useInstanceAiSettingsStore);
	settings.isInstanceAiSetupPanelEnabled = true;
	const nodeTypes = mockedStore(useNodeTypesStore);
	nodeTypes.allNodeTypes = [mockNodeTypeDescription()];
	nodeTypes.loadNodeTypesIfNotLoaded.mockResolvedValue(undefined);
	const first = reactive(
		createTestWorkflow({
			id: 'workflow-1',
			nodes: [
				createTestNode({
					id: 'pending',
					name: 'Pending',
					parameters: { url: '' },
					credentials: { slackApi: { id: 'private', name: 'Private account' } },
				}),
			],
		}),
	);
	const second = createTestWorkflow({ id: 'workflow-2', nodes: [] });
	const workflows = mockedStore(useWorkflowsListStore);
	workflows.fetchWorkflow.mockImplementation(async (id) => (id === first.id ? first : second));
	vi.mocked(getNodeCredentialTypes).mockReturnValue(['slackApi']);
	vi.mocked(getNodeParametersIssues).mockImplementation(
		(_store, node): Record<string, string[]> => (node.parameters.url ? {} : { url: ['Required'] }),
	);
	let connected = false;
	const fetchCredentials = vi
		.spyOn(credentialsApi, 'getUsableCredentials')
		.mockImplementation(async (_context, scope) =>
			'workflowId' in scope && scope.workflowId === first.id
				? [
						mock<ICredentialsResponse>({
							id: 'private',
							isResolvable: true,
							connectedByMe: connected,
						}),
					]
				: [],
		);
	const credentials = useCredentialsStore();
	const items = ref<Record<string, InstanceAiSetupItem[]>>({ [first.id]: [] });
	const scope = effectScope();
	try {
		const pending = scope.run(() =>
			useThreadPendingSetup(
				computed(() => items.value),
				ref<InstanceAiMessage[]>([]),
			),
		)!;
		await flushPromises();
		expect(pending.value).toBe(true);
		items.value[second.id] = [];
		await flushPromises();
		expect(credentials.hasUsableCredentialsForScope({ workflowId: first.id })).toBe(false);
		expect(pending.value).toBe(true);
		first.nodes[0].parameters.url = 'https://example.test';
		await flushPromises();
		expect(pending.value).toBe(true);
		connected = true;
		await credentials.fetchUsableCredentials({ workflowId: first.id });
		await flushPromises();
		expect(pending.value).toBe(false);
	} finally {
		scope.stop();
		fetchCredentials.mockRestore();
	}
});
