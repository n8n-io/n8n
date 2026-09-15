import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useI18n } from '@n8n/i18n';
import { SCHEDULE_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import { useUsersStore } from '@n8n/stores/users.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { usePrivateCredentials } from '@/features/resolvers/composables/usePrivateCredentials';
import { useRunAsHolderName } from '@/features/resolvers/composables/useRunAsHolderName';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';

/**
 * Whether a canvas node shows the run-as badge: a Schedule Trigger in a workflow
 * whose `settings.runAsUserId` is set. The badge tells everyone on the canvas who
 * scheduled executions run as, before they open the trigger.
 */
export function useNodeRunAsBadge(nodeName: MaybeRefOrGetter<string>) {
	const i18n = useI18n();
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const usersStore = useUsersStore();
	const envFeatureFlag = useEnvFeatureFlag();
	const { isEnabled: isPrivateCredentialsEnabled } = usePrivateCredentials();

	const node = computed(() => workflowDocumentStore.value.getNodeByName(toValue(nodeName)));
	const runAsUserId = computed(() => workflowDocumentStore.value.settings?.runAsUserId);
	const { holderName } = useRunAsHolderName(runAsUserId);

	const showRunAsBadge = computed(
		() =>
			envFeatureFlag.check.value('DYNAMIC_CREDENTIALS_RUN_AS') &&
			isPrivateCredentialsEnabled.value &&
			node.value?.type === SCHEDULE_TRIGGER_NODE_TYPE &&
			!!runAsUserId.value,
	);

	const tooltipText = computed(() =>
		runAsUserId.value === usersStore.currentUser?.id
			? i18n.baseText('runAs.badge.you')
			: i18n.baseText('runAs.badge.other', { interpolate: { name: holderName.value } }),
	);

	return { showRunAsBadge, tooltipText };
}
