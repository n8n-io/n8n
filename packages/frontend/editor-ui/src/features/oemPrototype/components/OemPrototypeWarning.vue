<script setup lang="ts">
import { N8nAlert, N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { onBeforeUnmount, ref } from 'vue';

import { OEM_PROTOTYPE_WARNING_REAPPEAR_DELAY } from '@/features/oemPrototype/oemPrototype.constants';

const i18n = useI18n();
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
		:title="i18n.baseText('oemPrototype.api305.warning.title')"
		:description="
			i18n.baseText('oemPrototype.api305.warning.description', {
				interpolate: { date: '{date}' },
			})
		"
	>
		<template #aside>
			<N8nButton size="xsmall" variant="subtle" @click="dismiss">
				{{ i18n.baseText('generic.dismiss') }}
			</N8nButton>
		</template>
	</N8nAlert>
</template>
