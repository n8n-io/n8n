<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useDebounceFn } from '@vueuse/core';
import { ref } from 'vue';

import { DEBOUNCE_TIME } from '@/app/constants';
import { getDebounceTime } from '@n8n/composables/useDebounce';
import { useAppsStore } from '@/features/apps/apps.store';
import type { App } from '@/features/apps/apps.types';
import AppCodeEditor from '@/features/apps/components/AppCodeEditor.vue';

const props = defineProps<{
	projectId: string;
	appId: string;
	components: string | null;
}>();

const emit = defineEmits<{
	saved: [app: App];
}>();

const i18n = useI18n();
const toast = useToast();
const appsStore = useAppsStore();

const source = ref(props.components ?? '');
const saving = ref(false);
const saved = ref(false);

const save = async () => {
	saving.value = true;
	try {
		const updated = await appsStore.updateApp(props.projectId, props.appId, {
			components: source.value.trim() === '' ? null : source.value,
		});
		saved.value = true;
		emit('saved', updated);
	} catch (error) {
		toast.showError(error, i18n.baseText('apps.components.save.error'));
	} finally {
		saving.value = false;
	}
};

const debouncedSave = useDebounceFn(save, getDebounceTime(DEBOUNCE_TIME.API.AUTOSAVE));

const onChange = (next: string) => {
	source.value = next;
	saved.value = false;
	void debouncedSave();
};
</script>

<template>
	<div :class="$style.container" data-test-id="app-components-form">
		<N8nText size="small" color="text-light" tag="p">
			{{ i18n.baseText('apps.components.hint') }}
		</N8nText>
		<AppCodeEditor :model-value="source" @update:model-value="onChange" />
		<N8nText
			v-if="saving || saved"
			size="small"
			color="text-light"
			data-test-id="app-components-saved-indicator"
		>
			{{ saving ? i18n.baseText('generic.saving') : i18n.baseText('apps.components.saved') }}
		</N8nText>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	min-height: 0;
}
</style>
