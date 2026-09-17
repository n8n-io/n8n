<script setup lang="ts">
import { N8nAlert, N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';
import { onBeforeUnmount, ref } from 'vue';

import { useUIStore } from '@/app/stores/ui.store';
import { OEM_PROTOTYPE_WARNING_REAPPEAR_DELAY } from '@/features/oemPrototype/oemPrototype.constants';

const i18n = useI18n();
const uiStore = useUIStore();
const { appliedTheme } = storeToRefs(uiStore);
const visible = ref(true);
let reappearTimer: ReturnType<typeof setTimeout> | undefined;

function dismiss() {
	visible.value = false;
	reappearTimer = setTimeout(() => {
		visible.value = true;
	}, OEM_PROTOTYPE_WARNING_REAPPEAR_DELAY);
}

onBeforeUnmount(() => {
	if (reappearTimer) clearTimeout(reappearTimer);
});
</script>

<template>
	<N8nAlert
		v-if="visible"
		data-test-id="oem-prototype-warning"
		type="warning"
		:effect="appliedTheme"
		:title="i18n.baseText('oemPrototype.api305.warning.title')"
		:description="
			i18n.baseText('oemPrototype.api305.warning.description', {
				interpolate: { date: '{date}' },
			})
		"
	>
		<template #aside>
			<N8nButton size="xsmall" variant="ghost" @click="dismiss">
				{{ i18n.baseText('generic.dismiss') }}
			</N8nButton>
		</template>
	</N8nAlert>
</template>
