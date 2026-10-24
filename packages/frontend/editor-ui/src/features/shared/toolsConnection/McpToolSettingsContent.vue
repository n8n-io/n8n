<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { N8nButton, N8nDialogBody, N8nDialogFooter, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { DEFAULT_MCP_TOOL_PERMISSIONS, type McpToolPermissions } from '@n8n/api-types';

import McpConnectionStatusCallout from './McpConnectionStatusCallout.vue';
import McpDetailBody from './McpDetailBody.vue';
import McpToolPermissionsEditor from './McpToolPermissionsEditor.vue';
import type { McpServerConnectionItem, McpToolSettings } from './types';

const props = withDefaults(
	defineProps<{
		item: McpServerConnectionItem;
		actor?: 'assistant' | 'agent';
		supportsApproval?: boolean;
		showRemove?: boolean;
		saveLabel?: string;
	}>(),
	{
		actor: 'assistant',
		supportsApproval: true,
		showRemove: true,
	},
);

const emit = defineEmits<{
	save: [settings: McpToolSettings];
	disconnect: [];
	cancel: [];
	reconnect: [];
	retry: [];
}>();

const FORM_ID = 'mcp-tool-settings-form';

const i18n = useI18n();
const isConnectionUnhealthy = computed(() => props.item.status === 'disconnected');
const arePermissionsDisabled = computed(() => props.item.status !== 'connected');

const initialSettings = (): McpToolSettings =>
	props.item.settings ?? structuredClone(DEFAULT_MCP_TOOL_PERMISSIONS);

const draftSettings = ref<McpToolSettings>(initialSettings());
const draftPermissions = computed<McpToolPermissions>({
	get: () => draftSettings.value,
	set: (permissions) => {
		draftSettings.value = {
			...permissions,
			...(draftSettings.value.connectionTimeoutMs === undefined
				? {}
				: { connectionTimeoutMs: draftSettings.value.connectionTimeoutMs }),
		};
	},
});
const hasSavedBefore = ref(false);

watch(
	() => props.item.id,
	() => {
		hasSavedBefore.value = false;
		draftSettings.value = initialSettings();
	},
);

const hasChanges = computed(() => {
	if (!hasSavedBefore.value) return true;
	return JSON.stringify(draftSettings.value) !== JSON.stringify(initialSettings());
});

function handleSave() {
	if (!hasChanges.value) return;
	hasSavedBefore.value = true;
	emit('save', draftSettings.value);
}
</script>

<template>
	<div :class="$style.layout">
		<N8nDialogBody>
			<form :id="FORM_ID" @submit.prevent="handleSave">
				<McpDetailBody :item="item" />

				<McpConnectionStatusCallout
					v-if="isConnectionUnhealthy"
					:class="$style.failureCallout"
					:failure-reason="item.connectionFailureReason"
					@reconnect="emit('reconnect')"
					@retry="emit('retry')"
				/>

				<McpToolPermissionsEditor
					v-model="draftPermissions"
					:class="$style.permissions"
					:actor="actor"
					:available-tools="item.availableTools"
					:server-title="item.title"
					:status="item.status"
					:exclude-permissions="supportsApproval ? [] : ['require_approval']"
				/>
			</form>
		</N8nDialogBody>

		<N8nDialogFooter>
			<N8nButton
				v-if="showRemove"
				:class="$style.removeButton"
				variant="destructive"
				size="small"
				type="button"
				data-test-id="tools-connection-settings-remove"
				@click="emit('disconnect')"
			>
				<N8nIcon icon="trash-2" :size="14" :class="$style.footerIcon" />
				<span>{{ i18n.baseText('tools.connection.settings.remove') }}</span>
			</N8nButton>
			<N8nButton
				variant="outline"
				size="small"
				type="button"
				:label="i18n.baseText('generic.cancel')"
				data-test-id="tools-connection-settings-cancel"
				@click="emit('cancel')"
			/>
			<N8nButton
				variant="solid"
				size="small"
				type="submit"
				:form="FORM_ID"
				:label="saveLabel ?? i18n.baseText('generic.save')"
				:disabled="!hasChanges || arePermissionsDisabled"
				data-test-id="tools-connection-settings-save"
			/>
		</N8nDialogFooter>
	</div>
</template>

<style lang="scss" module>
.layout {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	min-height: 0;
	height: 100%;
}

.failureCallout {
	margin-top: var(--spacing--sm);
}

.permissions {
	margin-top: var(--spacing--xl);
}

.removeButton {
	margin-right: auto;
}

.footerIcon {
	margin-right: var(--spacing--5xs);
}
</style>
