<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { N8nCallout, N8nButton, N8nText } from '@n8n/design-system';
import { ElSwitch } from 'element-plus';
import { getResourcePermissions } from '@n8n/permissions';
import { useUsersStore } from '@n8n/stores/users.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';
import { useRunAsHolderName } from '@/features/resolvers/composables/useRunAsHolderName';

interface Props {
	readOnly?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
	readOnly: false,
});

const i18n = useI18n();
const toast = useToast();
const usersStore = useUsersStore();
const settingsStore = useSettingsStore();
const workflowsStore = useWorkflowsStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const envFeatureFlag = useEnvFeatureFlag();

// Only turned on with the flag and the dynamic-credentials module, so a plain
// n8n instance never renders this callout.
const isEnabled = computed(
	() =>
		envFeatureFlag.check.value('DYNAMIC_CREDENTIALS_RUN_AS') &&
		settingsStore.isModuleActive('dynamic-credentials'),
);

const runAsUserId = computed(() => workflowDocumentStore.value.settings?.runAsUserId);

const canPublish = computed(
	() => getResourcePermissions(workflowDocumentStore.value.scopes).workflow.publish === true,
);

// `canPublish` only reflects RBAC scopes. The NDV's own read-only reasons (demo
// route, protected branch, missing workflow:update, archived, AI-builder
// streaming, an embedding host's override, …) are the caller's to know, so
// `readOnly` folds in here rather than being re-derived.
const canControl = computed(() => canPublish.value && !props.readOnly);

const state = computed<'off' | 'you' | 'other'>(() => {
	if (!runAsUserId.value) return 'off';
	return runAsUserId.value === usersStore.currentUser?.id ? 'you' : 'other';
});

const { holderName } = useRunAsHolderName(runAsUserId);

// The template calls this and drops the promise, so the switch shows the new
// position at once. A refusal from the backend (a credential probe on a
// published workflow, for example) must not be lost, so it becomes a toast and
// the store keeps the value it had.
async function setRunAs(on: boolean) {
	const value = on ? usersStore.currentUser?.id : undefined;
	try {
		await workflowsStore.updateWorkflowSetting(
			workflowDocumentStore.value.workflowId,
			'runAsUserId',
			value,
		);
	} catch (error) {
		toast.showError(error, i18n.baseText('runAs.callout.error.title'));
	}
}
</script>

<template>
	<N8nCallout v-if="isEnabled" theme="secondary" data-test-id="run-as-callout">
		<template v-if="state === 'off'">
			<N8nText size="small">{{ i18n.baseText('runAs.callout.off') }}</N8nText>
		</template>
		<template v-else-if="state === 'you'">
			<N8nText size="small">{{ i18n.baseText('runAs.callout.you') }}</N8nText>
		</template>
		<template v-else>
			<N8nText size="small">{{
				i18n.baseText('runAs.callout.other', { interpolate: { name: holderName } })
			}}</N8nText>
		</template>
		<template v-if="canControl" #trailingContent>
			<ElSwitch
				v-if="state !== 'other'"
				:model-value="state === 'you'"
				:aria-label="i18n.baseText('runAs.callout.switch')"
				data-test-id="run-as-switch"
				@update:model-value="setRunAs(state !== 'you')"
			/>
			<N8nButton
				v-else
				size="small"
				variant="outline"
				data-test-id="run-as-switch-to-me"
				@click="setRunAs(true)"
			>
				{{ i18n.baseText('runAs.callout.switchToMe') }}
			</N8nButton>
		</template>
	</N8nCallout>
</template>
