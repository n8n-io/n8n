<script setup lang="ts">
import { computed, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nCallout, N8nButton, N8nText } from '@n8n/design-system';
import { ElSwitch } from 'element-plus';
import { getResourcePermissions } from '@n8n/permissions';
import { useUsersStore } from '@n8n/stores/users.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useEnvFeatureFlag } from '@/features/shared/envFeatureFlag/useEnvFeatureFlag';

const i18n = useI18n();
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

const state = computed<'off' | 'you' | 'other'>(() => {
	if (!runAsUserId.value) return 'off';
	return runAsUserId.value === usersStore.currentUser?.id ? 'you' : 'other';
});

const holderName = computed(() => {
	const id = runAsUserId.value;
	if (!id) return '';
	const user = usersStore.usersById[id];
	return user?.fullName ?? user?.email ?? i18n.baseText('runAs.callout.unknownUser');
});

// The name is decorative: fetch it when the holder isn't cached yet, but never
// let a failed lookup break the NDV.
watch(
	runAsUserId,
	async (id) => {
		if (id && !usersStore.usersById[id]) {
			try {
				await usersStore.fetchUsers({ filter: { ids: [id] } });
			} catch {
				// Ignored: holderName already falls back to "another user".
			}
		}
	},
	{ immediate: true },
);

async function setRunAs(on: boolean) {
	const value = on ? usersStore.currentUser?.id : undefined;
	await workflowsStore.updateWorkflowSetting(
		workflowDocumentStore.value.workflowId,
		'runAsUserId',
		value,
	);
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
		<template v-if="canPublish" #trailingContent>
			<ElSwitch
				v-if="state !== 'other'"
				:model-value="state === 'you'"
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
