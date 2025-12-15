<script lang="ts" setup>
import { ABOUT_MODAL_KEY } from '@/app/constants';

import { N8nIcon, N8nLink, N8nMenuItem, N8nText } from '@n8n/design-system';
import { useSettingsItems } from '../composables/useSettingsItems';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUIStore } from '../stores/ui.store';

const emit = defineEmits<{
	return: [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const uiStore = useUIStore();

const { settingsItems } = useSettingsItems();
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.returnButton" data-test-id="settings-back" @click="emit('return')">
			<i>
				<N8nIcon icon="arrow-left" />
			</i>
			<N8nText bold>{{ i18n.baseText('settings') }}</N8nText>
		</div>
		<div :class="$style.items">
			<N8nMenuItem v-for="item in settingsItems" :key="item.id" :item="item" />
		</div>
		<div :class="$style.versionContainer">
			<N8nLink size="small" @click="uiStore.openModal(ABOUT_MODAL_KEY)">
				{{ i18n.baseText('settings.version') }} {{ rootStore.versionCli }}
			</N8nLink>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	min-width: $sidebar-expanded-width;
	height: 100%;
	background-color: var(--color--background--light-3);
	border-right: var(--border);
	position: relative;
	overflow: auto;
}

.returnButton {
	padding: var(--spacing--xs);
	cursor: pointer;
	display: flex;
	gap: var(--spacing--3xs);
	align-items: center;

	&:hover {
		color: var(--color--primary);
	}
}

.items {
	display: flex;
	flex-direction: column;

	padding: 0 var(--spacing--3xs);
}

.versionContainer {
	padding: var(--spacing--xs);
}

@media screen and (max-height: 420px) {
	.versionContainer {
		display: none;
	}
}
</style>
