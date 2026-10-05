<script setup lang="ts">
import { computed, useTemplateRef } from 'vue';
import { N8nIcon, N8nIconButton, N8nNodeIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import ToolCredentialPicker from './ToolCredentialPicker.vue';
import { resolveToolItemIcon } from './toolItemIcon';
import type { ToolConnectionItem, ToolConnectionSettings } from './types';

const props = defineProps<{
	item: ToolConnectionItem;
	hideBackButton?: boolean;
}>();

const emit = defineEmits<{
	back: [];
	close: [];
	disconnect: [item: ToolConnectionItem];
	save: [item: ToolConnectionItem, settings?: ToolConnectionSettings];
	'select-credential': [item: ToolConnectionItem, authType: string, credentialId: string];
	'credential-dropdown-open': [item: ToolConnectionItem];
	'first-credential-connect': [item: ToolConnectionItem];
	'new-credential-connect': [item: ToolConnectionItem];
}>();

const i18n = useI18n();
const credentialPickerRef = useTemplateRef('credentialPickerRef');

const resolvedIcon = computed(() => resolveToolItemIcon(props.item));

function onSave(settings?: ToolConnectionSettings) {
	emit('save', props.item, settings);
}
function onDisconnect() {
	emit('disconnect', props.item);
}
function onClose() {
	emit('close');
}
function onReconnect() {
	credentialPickerRef.value?.open();
}
</script>

<template>
	<div :class="$style.container" data-test-id="tools-connection-settings">
		<header :class="$style.header">
			<div :class="$style.headerLeft">
				<N8nIconButton
					v-if="!hideBackButton"
					icon="arrow-left"
					variant="ghost"
					size="medium"
					:class="$style.backButton"
					:aria-label="i18n.baseText('tools.connection.detail.back')"
					data-test-id="tools-connection-settings-back"
					@click="emit('back')"
				/>
				<div :class="$style.iconWrapper" aria-hidden="true">
					<N8nNodeIcon
						v-if="resolvedIcon"
						:type="resolvedIcon.type"
						:src="resolvedIcon.type === 'file' ? resolvedIcon.src : undefined"
						:name="resolvedIcon.type === 'icon' ? resolvedIcon.name : undefined"
						:color="resolvedIcon.type === 'icon' ? resolvedIcon.color : undefined"
						:size="20"
					/>
					<N8nIcon v-else icon="plug" :size="20" :class="$style.iconFallback" />
				</div>
				<N8nText :class="$style.title" tag="h2" bold>{{ item.title }}</N8nText>
			</div>
			<div :class="$style.headerActions">
				<ToolCredentialPicker
					v-if="item.credentials?.length"
					ref="credentialPickerRef"
					:item="item"
					:credentials="item.credentials"
					@select-credential="
						(toolItem, authType, credentialId) =>
							emit('select-credential', toolItem, authType, credentialId)
					"
					@credential-dropdown-open="emit('credential-dropdown-open', $event)"
					@first-credential-connect="emit('first-credential-connect', $event)"
					@new-credential-connect="emit('new-credential-connect', $event)"
				/>
				<N8nIconButton
					icon="x"
					variant="ghost"
					size="medium"
					:aria-label="i18n.baseText('tools.connection.action.close')"
					data-test-id="tools-connection-settings-close"
					@click="onClose"
				/>
			</div>
		</header>

		<div :class="$style.bodyWrapper">
			<slot
				name="body"
				:item="item"
				:on-save="onSave"
				:on-disconnect="onDisconnect"
				:on-close="onClose"
				:on-reconnect="onReconnect"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xl);
	min-height: 100%;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
}

.headerLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	flex: 1 1 auto;
}

.headerActions {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.iconWrapper {
	flex-shrink: 0;
	width: 24px;
	height: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
	overflow: hidden;
}

.iconFallback {
	color: var(--color--text--tint-1);
}

.title {
	margin: 0;
	font-size: var(--font-size--md);
	font-weight: var(--font-weight--medium);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.bodyWrapper {
	flex: 1 1 auto;
	display: flex;
	flex-direction: column;
	min-height: 0;
	overflow-y: auto;
}
</style>
