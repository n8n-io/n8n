<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { N8nButton, N8nDialogFooter, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { DEFAULT_INSTANCE_AI_PERMISSIONS, type McpToolPermissions } from '@n8n/api-types';

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

const i18n = useI18n();
const isConnectionUnhealthy = computed(() => props.item.status === 'disconnected');
const arePermissionsDisabled = computed(() => props.item.status !== 'connected');

const initialSettings = (): McpToolSettings =>
	props.item.settings ?? {
		categories: {
			read: DEFAULT_INSTANCE_AI_PERMISSIONS.mcpRead,
			write: DEFAULT_INSTANCE_AI_PERMISSIONS.mcpWrite,
		},
	};

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
	<div :class="$style.container">
		<div :class="$style.body">
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
				:supports-approval="supportsApproval"
			/>
		</div>

		<N8nDialogFooter :class="$style.footer">
			<N8nButton
				v-if="showRemove"
				:class="$style.removeButton"
				variant="outline"
				size="small"
				data-test-id="tools-connection-settings-remove"
				@click="emit('disconnect')"
			>
				<N8nIcon icon="trash-2" :size="14" :class="$style.footerIcon" />
				<span>{{ i18n.baseText('tools.connection.settings.remove') }}</span>
			</N8nButton>
			<N8nButton
				variant="subtle"
				size="small"
				:label="i18n.baseText('generic.cancel')"
				data-test-id="tools-connection-settings-cancel"
				@click="emit('cancel')"
			/>
			<N8nButton
				variant="solid"
				size="small"
				:label="saveLabel ?? i18n.baseText('generic.save')"
				:disabled="!hasChanges || arePermissionsDisabled"
				data-test-id="tools-connection-settings-save"
				@click="handleSave"
			/>
		</N8nDialogFooter>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	overflow: hidden;
}

.body {
	flex: 1 1 auto;
	display: flex;
	flex-direction: column;
	min-height: 0;
	overflow-y: auto;
	scrollbar-gutter: stable;
}

.failureCallout {
	margin-top: var(--spacing--sm);
}

.permissions {
	margin-top: var(--spacing--xl);
}
.footer {
	flex-shrink: 0;
	padding-top: var(--spacing--md);
	border-top: var(--border);
}

.removeButton {
	margin-right: auto;
}

.footerIcon {
	margin-right: var(--spacing--5xs);
}
</style>
