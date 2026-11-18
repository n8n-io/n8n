import { MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES } from '@n8n/api-types';
import { createTestingPinia } from '@pinia/testing';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { setActivePinia } from 'pinia';

import { usePostHog } from '@/app/stores/posthog.store';

import { ASSISTANT_AGENT_ACCEPTED_MIME_TYPES } from '../assistantAgentThreads';
import {
	ANY_FILE_ACCEPT,
	useAssistantAgentAttachmentRules,
} from '../useAssistantAgentAttachmentRules';

const MAX_IMPORT_BYTES = 200 * 1024 * 1024;

function setup({ sandboxFiles }: { sandboxFiles: boolean }) {
	setActivePinia(createTestingPinia({ stubActions: false }));
	vi.mocked(usePostHog().isFeatureEnabled).mockReturnValue(sandboxFiles);
	useSettingsStore().moduleSettings = {
		agents: {
			modules: [],
			knowledgeBaseEnabled: false,
			proxyEnabled: false,
			maxImportBytes: MAX_IMPORT_BYTES,
		},
	};
	return useAssistantAgentAttachmentRules();
}

describe('useAssistantAgentAttachmentRules', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('takes any file up to the import cap with sandbox files', () => {
		const { acceptedMimeTypes, maxAttachmentBytes } = setup({ sandboxFiles: true });

		expect(acceptedMimeTypes.value).toBe(ANY_FILE_ACCEPT);
		expect(maxAttachmentBytes.value).toBe(MAX_IMPORT_BYTES);
	});

	it('keeps the readable types and the base64 cap without sandbox files', () => {
		const { acceptedMimeTypes, maxAttachmentBytes } = setup({ sandboxFiles: false });

		expect(acceptedMimeTypes.value).toBe(ASSISTANT_AGENT_ACCEPTED_MIME_TYPES);
		expect(maxAttachmentBytes.value).toBe(MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES);
	});
});
