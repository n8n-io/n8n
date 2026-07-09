<script setup lang="ts">
import KeyboardShortcutTooltip from '@/app/components/KeyboardShortcutTooltip.vue';
import { PopOutWindowKey } from '@/app/constants';
import { useI18n } from '@n8n/i18n';
import { computed, inject, ref } from 'vue';

import { N8nActionDropdown, N8nIconButton, N8nTooltip } from '@n8n/design-system';
const {
	isOpen,
	isSyncSelectionEnabled: isSyncEnabled,
	showToggleButton,
	showPopOutButton,
} = defineProps<{
	isOpen: boolean;
	isSyncSelectionEnabled: boolean;
	showToggleButton: boolean;
	showPopOutButton: boolean;
}>();

const emit = defineEmits<{ popOut: []; toggleOpen: []; toggleSyncSelection: [] }>();

const locales = useI18n();

// In the pop-out window modal mode must be off: reka-ui's pointer-events lock
// restores against the wrong document on close, jamming the panel after one open.
const popOutWindow = inject(PopOutWindowKey, ref<Window | undefined>());
const isInPopOut = computed(() => !!popOutWindow.value);

const popOutButtonText = computed(() => locales.baseText('runData.panel.actions.popOut'));
const toggleButtonText = computed(() =>
	locales.baseText(isOpen ? 'runData.panel.actions.collapse' : 'runData.panel.actions.open'),
);
const menuItems = computed(() => [
	{
		id: 'toggleSyncSelection' as const,
		label: locales.baseText('runData.panel.actions.sync'),
		checked: isSyncEnabled,
	},
	...(showPopOutButton ? [{ id: 'popOut' as const, label: popOutButtonText.value }] : []),
]);

function handleSelectMenuItem(selected: string) {
	// This switch looks redundant, but needed to pass type checker
	switch (selected) {
		case 'popOut':
			emit(selected);
			return;
		case 'toggleSyncSelection':
			emit(selected);
			return;
	}
}
</script>

<template>
	<div :class="$style.container">
		<N8nTooltip v-if="!isOpen && showPopOutButton" :content="popOutButtonText">
			<N8nIconButton
				variant="ghost"
				icon="pop-out"
				size="small"
				icon-size="medium"
				:aria-label="popOutButtonText"
				@click.stop="emit('popOut')"
			/>
		</N8nTooltip>
		<N8nActionDropdown
			v-if="isOpen"
			data-test-id="logs-panel-actions"
			icon-size="small"
			activator-icon="ellipsis"
			activator-size="small"
			:items="menuItems"
			:teleported="false /* for pop-out window */"
			:modal="!isInPopOut"
			@select="handleSelectMenuItem"
			@click.stop
		/>
		<KeyboardShortcutTooltip
			v-if="showToggleButton"
			:key="`tooltip-${isOpen}`"
			:label="locales.baseText('generic.shortcutHint')"
			:shortcut="{ keys: ['l'] }"
		>
			<N8nIconButton
				variant="ghost"
				size="small"
				icon-size="medium"
				:icon="isOpen ? 'chevron-down' : 'chevron-up'"
				:aria-label="toggleButtonText"
				@click.stop="emit('toggleOpen')"
			/>
		</KeyboardShortcutTooltip>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
}

.container button:hover {
	background-color: var(--color--background);
}
</style>
