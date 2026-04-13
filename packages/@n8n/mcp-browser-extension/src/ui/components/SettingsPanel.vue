<script setup lang="ts">
import { ref } from 'vue';
import { N8nIcon, N8nSwitch2 } from '@n8n/design-system';
import type { TabManagementSettings } from '../../types';

defineProps<{
	settings: TabManagementSettings;
}>();

const emit = defineEmits<{
	updateSettings: [partial: Partial<TabManagementSettings>];
}>();

const showSettings = ref(false);
</script>

<template>
	<div class="settings">
		<button class="settings-toggle" @click="showSettings = !showSettings">
			<N8nIcon icon="settings" :size="14" />
			<span>Settings</span>
			<N8nIcon
				icon="chevron-down"
				:size="12"
				:class="['chevron', { 'chevron--open': showSettings }]"
			/>
		</button>

		<div v-if="showSettings" class="settings-panel">
			<label
				class="setting-row"
				@click.prevent="emit('updateSettings', { allowTabCreation: !settings.allowTabCreation })"
			>
				<span class="setting-label">
					<span class="setting-name">Allow tab creation</span>
					<span class="setting-desc">AI agent can open new browser tabs</span>
				</span>
				<N8nSwitch2
					:model-value="settings.allowTabCreation"
					@update:model-value="emit('updateSettings', { allowTabCreation: $event })"
				/>
			</label>

			<label
				class="setting-row"
				@click.prevent="emit('updateSettings', { allowTabClosing: !settings.allowTabClosing })"
			>
				<span class="setting-label">
					<span class="setting-name">Allow tab closing</span>
					<span class="setting-desc">AI agent can close controlled tabs</span>
				</span>
				<N8nSwitch2
					:model-value="settings.allowTabClosing"
					@update:model-value="emit('updateSettings', { allowTabClosing: $event })"
				/>
			</label>
		</div>
	</div>
</template>

<style scoped lang="scss">
.settings {
	margin-top: var(--spacing--md);
	border-top: var(--border-width) var(--border-style) var(--color--foreground--tint-1);
	padding-top: var(--spacing--sm);
}

.settings-toggle {
	appearance: none;
	background: none;
	border: none;
	padding: var(--spacing--2xs) 0;
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	cursor: pointer;
	font-size: var(--font-size--xs);
	color: var(--color--text--tint-1);
	width: 100%;

	&:hover {
		color: var(--color--text);
	}
}

.chevron {
	margin-left: auto;
	transition: transform var(--duration--snappy);
}

.chevron--open {
	transform: rotate(180deg);
}

.settings-panel {
	padding: var(--spacing--xs) 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.setting-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-radius: var(--radius);
	cursor: pointer;

	&:hover {
		background: var(--background--surface--hover);
	}
}

.setting-label {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.setting-name {
	font-size: var(--font-size--sm);
	color: var(--color--text);
}

.setting-desc {
	font-size: var(--font-size--2xs);
	color: var(--text-color--subtler);
}
</style>
