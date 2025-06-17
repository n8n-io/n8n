<script lang="ts" setup>
import { onMounted, computed, watch, ref } from 'vue';
import { useSettingsStore } from '@/stores/settings.store';
import { useI18n, loadLanguage } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { locale } from '@n8n/design-system';
import axios from 'axios';

const i18n = useI18n();
const settingsStore = useSettingsStore();

const rootStore = useRootStore();
const languages = ref([
	{ label: 'english', value: 'en' },
	{ label: '中文简体', value: 'zh' },
]);

// i18nInstance.global.locale
// const local = ref(i18n.locale);
const localLanguage = computed(() => rootStore.defaultLocale);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function onSelectChange(value: string) {
	try {
		// TODO Change local
		rootStore.setDefaultLocale(value);
		void loadLanguage(value);
		void locale.use(value);
	} catch (e) {
		// showError(e, i18n.baseText('settings.users.userReinviteError'));
	}
}

// watch(
// 	localLanguage,
// 	(newLocale) => {
// 		void loadLanguage(newLocale);
// 		void locale.use(newLocale);
// 		axios.defaults.headers.common['Accept-Language'] = newLocale;
// 	},
// 	{ immediate: true },
// );
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.headingContainer">
			<n8n-heading size="2xlarge">{{ i18n.baseText('settings.language') }}</n8n-heading>
		</div>
		<div class="pb-2 flex justify-center items-center flex-col w-full">
			<div>当前语言: {{ localLanguage }}</div>
			<div>
				<n8n-select :model-value="localLanguage" @update:model-value="onSelectChange">
					<n8n-option
						v-for="language in languages"
						:key="language.value"
						:value="language.value"
						:label="language.label"
					/>
				</n8n-select>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	height: 100%;
	padding-right: var(--spacing-2xs);

	> * {
		margin-bottom: var(--spacing-2xl);
	}
}

.headingContainer {
	display: flex;
	justify-content: space-between;
}

.loadingContainer {
	display: flex;
	gap: var(--spacing-xs);
}

.actionBoxContainer {
	text-align: center;
}

.cardsContainer {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-2xs);
}
</style>
