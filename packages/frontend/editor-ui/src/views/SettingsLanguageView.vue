<script lang="ts" setup>
import { onMounted, computed, watch, ref } from 'vue';
import { useI18n, loadLanguage } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { locale } from '@n8n/design-system';

const i18n = useI18n();

const rootStore = useRootStore();
const languages = ref([
	{ label: 'english', value: 'en' },
	{ label: '中文简体', value: 'zh' },
]);

const localLanguage = computed(() => rootStore.defaultLocale);

async function onSelectChange(value: string) {
	try {
		// TODO Change local
		rootStore.setDefaultLocale(value);
		void loadLanguage(value);
		void locale.use(value);
	} catch (e) {}
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.headingContainer">
			<n8n-heading size="2xlarge">{{ i18n.baseText('settings.language') }}</n8n-heading>
		</div>
		<div :class="$style.headingContainer">
			<div>{{ i18n.baseText('settings.language.locale') }}:</div>
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

.selectContainer {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	align-items: center;
}
</style>
