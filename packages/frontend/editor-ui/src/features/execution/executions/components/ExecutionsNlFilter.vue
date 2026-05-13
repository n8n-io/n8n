<script lang="ts" setup>
import { ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nInput, N8nTooltip } from '@n8n/design-system';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useToast } from '@/app/composables/useToast';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useNlExecutionsFilter } from '../composables/useNlExecutionsFilter';

const i18n = useI18n();
const settingsStore = useSettingsStore();
const toast = useToast();
const telemetry = useTelemetry();
const { translate, isTranslating } = useNlExecutionsFilter();

const userText = ref('');

async function onSubmit() {
	if (!userText.value.trim()) return;
	telemetry.track('User submitted NL executions filter', { length: userText.value.length });
	const result = await translate(userText.value);
	if (result.ok) {
		toast.showMessage({
			type: 'success',
			title: i18n.baseText('executionsList.nlFilter.applied'),
		});
	} else {
		const key = `executionsList.nlFilter.error.${result.reason}` as const;
		toast.showMessage({
			type: 'warning',
			title: i18n.baseText(key),
		});
	}
}
</script>

<template>
	<div v-if="settingsStore.isAskAiEnabled" :class="$style.wrapper">
		<N8nTooltip :content="i18n.baseText('executionsList.nlFilter.tooltip')" placement="top">
			<div :class="$style.inputGroup">
				<N8nIcon icon="sparkles" :class="$style.icon" />
				<N8nInput
					v-model="userText"
					data-test-id="executions-nl-filter-input"
					:placeholder="i18n.baseText('executionsList.nlFilter.placeholder')"
					:disabled="isTranslating"
					size="medium"
					@keyup.enter="onSubmit"
				/>
			</div>
		</N8nTooltip>
		<N8nButton
			data-test-id="executions-nl-filter-submit"
			:label="i18n.baseText('executionsList.nlFilter.submit')"
			:loading="isTranslating"
			:disabled="!userText.trim()"
			size="medium"
			type="secondary"
			@click="onSubmit"
		/>
	</div>
</template>

<style lang="scss" module>
.wrapper {
	display: flex;
	align-items: center;
	gap: var(--spacing-2xs);
	flex: 1 1 auto;
	min-width: 0;
	max-width: 520px;
}

.inputGroup {
	position: relative;
	flex: 1 1 auto;
	min-width: 0;
	display: flex;
	align-items: center;
}

.icon {
	position: absolute;
	left: var(--spacing-2xs);
	color: var(--color-text-light);
	pointer-events: none;
}
</style>
