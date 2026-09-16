<script setup lang="ts">
import { computed, ref } from 'vue';
import N8nIcon from '../N8nIcon';
import N8nIconButton from '../N8nIconButton';
import N8nNodeIcon from '../N8nNodeIcon';
import N8nTabs from '../N8nTabs';
import N8nText from '../N8nText';
import type { TabOptions } from '../N8nTabs';
import { useI18n } from '@n8n/i18n';
import DefaultDetailBody from './DefaultDetailBody.vue';
import McpDetailBody from './McpDetailBody.vue';
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

const resolvedIcon = computed(() => resolveToolItemIcon(props.item));

type InternalTab = 'settings' | 'details';
const activeTab = ref<InternalTab>('settings');
const tabOptions = computed<Array<TabOptions<InternalTab>>>(() => [
	{
		value: 'settings',
		label: i18n.baseText('tools.connection.tabs.settings'),
	},
	{
		value: 'details',
		label: i18n.baseText('tools.connection.tabs.details'),
	},
]);

function onSave(settings?: ToolConnectionSettings) {
	emit('save', props.item, settings);
}
function onDisconnect() {
	emit('disconnect', props.item);
}
function onClose() {
	emit('close');
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
					size="large"
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
					size="large"
					:aria-label="i18n.baseText('tools.connection.action.close')"
					data-test-id="tools-connection-settings-close"
					@click="onClose"
				/>
			</div>
		</header>

		<N8nTabs
			v-model="activeTab"
			:options="tabOptions"
			size="small"
			variant="modern"
			justified
			:class="$style.tabs"
			data-test-id="tools-connection-settings-tabs"
		/>

		<div :class="$style.bodyWrapper">
			<slot
				v-if="activeTab === 'settings'"
				name="body"
				:item="item"
				:on-save="onSave"
				:on-disconnect="onDisconnect"
				:on-close="onClose"
			/>
			<template v-else>
				<McpDetailBody v-if="item.kind === 'mcp-server'" :item="item" />
				<DefaultDetailBody v-else :item="item" />
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	min-height: 100%;
}

.backButton {
	margin-inline-start: calc(var(--spacing--2xs) * -1);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--md);

	button:last-child {
		flex-shrink: 0;
		margin-inline-end: calc(var(--spacing--2xs) * -1);
	}
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

.tabs {
	border-bottom: 1px solid var(--border-color);
	flex-shrink: 0;
}

.bodyWrapper {
	flex: 1 1 auto;
	display: flex;
	flex-direction: column;
	min-height: 0;
	overflow-y: auto;
	padding: var(--spacing--md);

	& footer {
		margin-inline: calc(var(--spacing--md) * -1);
		padding-inline: var(--spacing--md);
	}
}
</style>
