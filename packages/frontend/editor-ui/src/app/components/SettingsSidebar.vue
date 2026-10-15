<script lang="ts" setup>
import { onMounted } from 'vue';
import { ABOUT_MODAL_KEY } from '@/app/constants';

import { N8nIcon, N8nLink, N8nMenuItem, N8nText } from '@n8n/design-system';
import { useSettingsItems } from '../composables/useSettingsItems';
import { useAiGateway } from '../composables/useAiGateway';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUIStore } from '../stores/ui.store';

const emit = defineEmits<{
	return: [];
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const uiStore = useUIStore();

const { settingsSections, handleSettingsItemSelect } = useSettingsItems();
const { fetchWallet, isEnabled } = useAiGateway();

onMounted(() => {
	if (isEnabled.value) void fetchWallet();
});
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.returnButton" data-test-id="settings-back" @click="emit('return')">
			<div :class="$style.arrowIcon">
				<N8nIcon icon="arrow-left" size="small" />
			</div>
			<N8nText bold>{{ i18n.baseText('settings') }}</N8nText>
		</div>
		<div :class="$style.items">
			<div
				v-for="section in settingsSections"
				:key="section.id"
				:class="$style.section"
				:data-test-id="`settings-section-${section.id}`"
			>
				<N8nText
					v-if="section.title"
					tag="div"
					size="small"
					bold
					color="text-light"
					:class="$style.sectionTitle"
				>
					{{ section.title }}
				</N8nText>
				<N8nMenuItem
					v-for="item in section.items"
					:key="item.id"
					:item="item"
					@click="handleSettingsItemSelect(item.id)"
				/>
			</div>
		</div>
		<div :class="$style.versionContainer">
			<N8nLink size="small" @click="uiStore.openModal(ABOUT_MODAL_KEY)">
				{{ i18n.baseText('settings.version') }} {{ rootStore.versionCli }}
			</N8nLink>
		</div>
	</div>
</template>

<style lang="scss" module>
@use '@/app/css/variables' as *;

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
	gap: var(--spacing--4xs);
	align-items: center;

	.arrowIcon {
		display: grid;
		place-items: center;
		width: var(--spacing--lg);
		height: var(--spacing--lg);
	}

	&:hover {
		color: var(--color--primary);
	}
}

.items {
	display: flex;
	flex-direction: column;

	padding: 0 var(--spacing--3xs);
}

.section {
	display: flex;
	flex-direction: column;

	& + & {
		margin-top: var(--spacing--xs);
	}
}

.sectionTitle {
	padding: var(--spacing--4xs) var(--spacing--3xs);
	margin-bottom: var(--spacing--5xs);
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
