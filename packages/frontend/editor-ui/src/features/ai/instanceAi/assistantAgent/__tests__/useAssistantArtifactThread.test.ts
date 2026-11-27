import { createTestingPinia } from '@pinia/testing';
import { flushPromises } from '@vue/test-utils';
import { setActivePinia } from 'pinia';

import { fetchAssistantAgentSetupCredentials } from '../assistantAgentTabs.api';
import { useAssistantArtifactThread } from '../useAssistantArtifactThread';

vi.mock('../assistantAgentTabs.api', () => ({
	fetchAssistantAgentSetupCredentials: vi.fn(),
	saveAssistantAgentSetupCredentials: vi.fn(),
}));

describe('useAssistantArtifactThread', () => {
	beforeEach(() => {
		setActivePinia(createTestingPinia());
	});

	it('loads the stored setup credential choices once, and keeps the choices saved meanwhile', async () => {
		const stored = { 'instanceAiSetupCredentialSelection:wf-1:credential:slackApi': { id: 's' } };
		const local = { 'instanceAiSetupCredentialSelection:wf-1:credential:notionApi': { id: 'n' } };
		vi.mocked(fetchAssistantAgentSetupCredentials).mockResolvedValue({ metadata: stored });
		const { setupMetadataStore } = useAssistantArtifactThread({
			threadId: 'thread-1',
			projectId: 'project-1',
			messages: () => [],
			isStreaming: () => false,
			isLoadingHistory: () => false,
			sendMessage: () => {},
		});

		expect(setupMetadataStore?.getThreadMetadata()).toBeUndefined();
		setupMetadataStore?.setThreadMetadata(local);
		setupMetadataStore?.getThreadMetadata();
		await flushPromises();

		expect(setupMetadataStore?.getThreadMetadata()).toEqual({ ...stored, ...local });
		expect(fetchAssistantAgentSetupCredentials).toHaveBeenCalledExactlyOnceWith(
			expect.anything(),
			'thread-1',
		);
	});
});
