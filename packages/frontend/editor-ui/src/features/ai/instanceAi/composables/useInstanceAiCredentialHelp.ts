import { toValue, type MaybeRefOrGetter } from 'vue';
import type { InstanceAiThreadSource } from '@n8n/api-types';

import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { InstanceAiCredentialHelpHandler } from '@/app/composables/useInstanceAiEditorCapability';
import { useInstanceAiAvailable } from './useInstanceAiAvailability';
import {
	buildInstanceAiCredentialHandoffContext,
	buildInstanceAiCredentialQuestion,
	useInstanceAiHandoff,
} from './useInstanceAiHandoff';

/**
 * Credential setup-help handler for surfaces with no workflow-editor context
 * (credentials list, its new-credential dialog, the setup cards' modal): opens
 * Instance AI in a new tab and keeps the credential modal open. Returns a
 * factory so the project resolves at click time; undefined when Instance AI
 * is unavailable, which keeps the help button hidden.
 */
export function useInstanceAiCredentialHelp(
	options: {
		/** Thread-launch source; defaults to the credentials list. */
		source?: InstanceAiThreadSource;
		/** Project to open the help thread in; defaults to the active project. */
		projectId?: MaybeRefOrGetter<string | undefined>;
		/** Names the service the help thread asks about, replacing the modal's
		 *  type-derived display name — a recipe-created credential would otherwise
		 *  ask about "Simplified Custom Auth" instead of the actual service. */
		serviceName?: MaybeRefOrGetter<string | undefined>;
	} = {},
): () => InstanceAiCredentialHelpHandler | undefined {
	const projectsStore = useProjectsStore();
	const instanceAiAvailable = useInstanceAiAvailable();
	const { startThread } = useInstanceAiHandoff();

	return () => {
		if (!instanceAiAvailable.value) return undefined;
		return async (credential) => {
			const projectId =
				toValue(options.projectId) ??
				projectsStore.currentProject?.id ??
				projectsStore.personalProject?.id;
			if (!projectId) return false;
			const serviceName = toValue(options.serviceName);
			const subject = serviceName ? { ...credential, displayName: serviceName } : credential;
			await startThread(
				projectId,
				buildInstanceAiCredentialQuestion(subject),
				{ source: options.source ?? 'credentials_list', origin: 'internal' },
				undefined,
				undefined,
				{ newTab: true, context: buildInstanceAiCredentialHandoffContext(subject) },
			);
			// New tab → keep the credential modal open so the user can finish the form.
			return false;
		};
	};
}
