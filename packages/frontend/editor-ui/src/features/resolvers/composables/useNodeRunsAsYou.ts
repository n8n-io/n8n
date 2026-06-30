import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import { usePrivateCredentials } from '@/features/resolvers/composables/usePrivateCredentials';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

/**
 * Whether a canvas node "runs as you" — i.e. it resolves credentials at runtime
 * based on whoever runs the workflow (a private/resolvable credential or a
 * context-establishment webhook). Drives the private-credential icon (and its
 * tooltip) shown on the node.
 */
export function useNodeRunsAsYou(nodeName: MaybeRefOrGetter<string>) {
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
		const contextEstablishment = node.value?.parameters?.contextEstablishmentHooks;
		if (
			typeof contextEstablishment !== 'object' ||
			contextEstablishment === null ||
			!('hooks' in contextEstablishment)
		) {
			return false;
		}
		const hooks = contextEstablishment.hooks;
		return Array.isArray(hooks) && hooks.length > 0;
	});

	const runsAsYou = computed(
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

	return { runsAsYou, tooltipText };
}
