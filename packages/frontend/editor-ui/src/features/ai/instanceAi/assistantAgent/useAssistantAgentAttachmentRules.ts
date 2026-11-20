import { AGENT_SANDBOX_FILES_FLAG, MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES } from '@n8n/api-types';
import { computed } from 'vue';

import { usePostHog } from '@/app/stores/posthog.store';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { ASSISTANT_AGENT_ACCEPTED_MIME_TYPES } from './assistantAgentThreads';

/** Every file type, as an `accept` string. */
export const ANY_FILE_ACCEPT = '*/*';

/**
 * The files that a user can attach in the Assistant agent chat. With sandbox
 * files, the agent copies any file into its sandbox and reads it there, so the
 * chat takes any type, up to the import cap of the sandbox. Without sandbox
 * files, it takes only the types that the model or `parse-file` reads.
 */
export function useAssistantAgentAttachmentRules() {
	const posthog = usePostHog();
	const settingsStore = useSettingsStore();

	const sandboxFilesEnabled = computed(() => posthog.isFeatureEnabled(AGENT_SANDBOX_FILES_FLAG));

	const acceptedMimeTypes = computed(() =>
		sandboxFilesEnabled.value ? ANY_FILE_ACCEPT : ASSISTANT_AGENT_ACCEPTED_MIME_TYPES,
	);

	const maxAttachmentBytes = computed(() => {
		const maxImportBytes = settingsStore.moduleSettings.agents?.maxImportBytes;
		if (!sandboxFilesEnabled.value || !maxImportBytes) return MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES;
		return Math.max(maxImportBytes, MAX_AGENT_CHAT_ATTACHMENT_SIZE_BYTES);
	});

	return { acceptedMimeTypes, maxAttachmentBytes };
}
