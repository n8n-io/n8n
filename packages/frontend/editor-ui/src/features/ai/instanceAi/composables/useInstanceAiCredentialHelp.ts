import { useProjectsStore } from '@/features/collaboration/projects/projects.store';
import type { InstanceAiCredentialHelpHandler } from '@/app/composables/useInstanceAiEditorCapability';
import { useInstanceAiAvailable } from './useInstanceAiAvailability';
import { buildInstanceAiCredentialQuestion, useInstanceAiHandoff } from './useInstanceAiHandoff';

/**
 * Credential setup-help handler for surfaces with no workflow context — the
 * credentials list and its new-credential dialog (where there's nothing to carry
 * as an artifact). Opens Instance AI in a new tab asking about the credential
 * alone and keeps the credential modal open. Returns a factory so the active
 * project is resolved at click time; the factory returns undefined when Instance
 * AI isn't available, which keeps the help button hidden.
 */
export function useInstanceAiCredentialHelp(): () => InstanceAiCredentialHelpHandler | undefined {
	const projectsStore = useProjectsStore();
	const instanceAiAvailable = useInstanceAiAvailable();
	const { startThread } = useInstanceAiHandoff();

	return () => {
		if (!instanceAiAvailable.value) return undefined;
		return async (credential) => {
			const projectId = projectsStore.currentProject?.id ?? projectsStore.personalProject?.id;
			if (!projectId) return false;
			await startThread(
				projectId,
				buildInstanceAiCredentialQuestion(credential),
				undefined,
				undefined,
				{ newTab: true },
			);
			// New tab → keep the credential modal open so the user can finish the form.
			return false;
		};
	};
}
