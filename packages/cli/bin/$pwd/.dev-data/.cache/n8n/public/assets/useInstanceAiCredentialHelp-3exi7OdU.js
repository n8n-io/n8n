import { Jf as toValue, Nf as init_reactivity_esm_bundler } from "./vendor-Hx42-oQF.js";
import { It as useInstanceAiHandoff, ad as useInstanceAiAvailable, gt as buildInstanceAiCredentialQuestion, ht as buildInstanceAiCredentialHandoffContext, vm as useProjectsStore } from "./app-D5flEmb-.js";
import { t as useAgentAssistantCredentialHelp } from "./useAgentAssistantCredentialHelp-RmZi0Ada.js";
//#region src/features/ai/instanceAi/composables/useInstanceAiCredentialHelp.ts
init_reactivity_esm_bundler();
/**
* Credential setup-help handler for surfaces with no workflow-editor context
* (credentials list, its new-credential dialog, the setup cards' modal): opens
* Instance AI in a new tab and keeps the credential modal open. Returns a
* factory so the project resolves at click time; undefined when Instance AI
* is unavailable, which keeps the help button hidden.
*/
function useInstanceAiCredentialHelp(options = {}) {
	const projectsStore = useProjectsStore();
	const instanceAiAvailable = useInstanceAiAvailable();
	const { startThread } = useInstanceAiHandoff();
	const { isAgentUi, getCredentialHelp } = useAgentAssistantCredentialHelp();
	return () => {
		if (isAgentUi.value) {
			const agentHelp = getCredentialHelp();
			if (!agentHelp) return void 0;
			return async (credential) => {
				const serviceName = toValue(options.serviceName);
				return await agentHelp(serviceName ? {
					...credential,
					displayName: serviceName
				} : credential);
			};
		}
		if (!instanceAiAvailable.value) return void 0;
		return async (credential) => {
			const serviceName = toValue(options.serviceName);
			const subject = serviceName ? {
				...credential,
				displayName: serviceName
			} : credential;
			const projectId = toValue(options.projectId) ?? projectsStore.currentProject?.id ?? projectsStore.personalProject?.id;
			if (!projectId) return false;
			await startThread(projectId, buildInstanceAiCredentialQuestion(subject), {
				kind: "prefill",
				prefillType: "handoff_credential_setup"
			}, {
				source: options.source ?? "credentials_list",
				origin: "internal"
			}, void 0, void 0, {
				newTab: true,
				context: buildInstanceAiCredentialHandoffContext(subject)
			});
			return false;
		};
	};
}
//#endregion
export { useInstanceAiCredentialHelp as t };
