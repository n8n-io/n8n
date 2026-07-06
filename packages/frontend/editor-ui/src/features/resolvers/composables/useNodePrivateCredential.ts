import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useI18n } from '@n8n/i18n';
import { toExecutionContextEstablishmentHookParameter } from 'n8n-workflow';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { usePrivateCredentials } from '@/features/resolvers/composables/usePrivateCredentials';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

/**
 * Whether a canvas node uses a private credential — i.e. it resolves credentials
 * at runtime based on whoever runs the workflow (a private/resolvable credential
 * or a context-establishment webhook). Drives the private-credential icon (and
 * its tooltip) shown on the node.
 */
export function useNodePrivateCredential(nodeName: MaybeRefOrGetter<string>) {
	const i18n = useI18n();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const credentialsStore = useCredentialsStore();
	const { isEnabled: isPrivateCredentialsEnabled } = usePrivateCredentials();

	const node = computed(() => workflowDocumentStore.value.getNodeByName(toValue(nodeName)));

	const hasResolvableCredential = computed(() => {
		const nodeCredentials = node.value?.credentials;
		if (!nodeCredentials) return false;

		return Object.values(nodeCredentials).some((cred) => {
			if (!cred?.id) return false;
			return credentialsStore.getCredentialById(cred.id)?.isResolvable === true;
		});
	});

	const hasContextEstablishmentHooks = computed(() => {
		// Validate with the shared parser so the badge matches what the runtime will
		// actually establish (the parser checks the version + hook shape, not just a
		// `hooks` array — guards against stale/malformed imported parameters).
		const result = toExecutionContextEstablishmentHookParameter(node.value?.parameters);
		if (!result?.success) return false;
		return result.data.contextEstablishmentHooks.hooks.length > 0;
	});

	const hasPrivateCredential = computed(
		() =>
			isPrivateCredentialsEnabled.value &&
			(hasResolvableCredential.value || hasContextEstablishmentHooks.value),
	);

	const tooltipText = computed(() =>
		i18n.baseText(
			hasContextEstablishmentHooks.value
				? 'node.settings.contextEstablishmentHooks'
				: 'node.settings.dynamicCredentials',
		),
	);

	return { hasPrivateCredential, tooltipText };
}
