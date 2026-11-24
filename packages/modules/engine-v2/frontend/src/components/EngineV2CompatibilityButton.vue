<script setup lang="ts">
import { N8nButton, N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import EngineV2CompatibilityDialog from './EngineV2CompatibilityDialog.vue';
import { severityIcon, worstSeverity } from './severityIcon';
import type { EngineCompatibilityReason } from '../engineV2Check';

const { reasons } = defineProps<{
	reasons: EngineCompatibilityReason[];
}>();

const i18n = useI18n();

// The dialog is a sibling of the button, so a change to the reasons never closes it.
const isDialogOpen = ref(false);

const icon = computed(() => severityIcon(worstSeverity(reasons)));

const label = computed(() =>
	i18n.baseText('engineV2Compatibility.button.label', {
		adjustToNumber: reasons.length,
		interpolate: { count: reasons.length },
	}),
);
</script>

<template>
	<div>
		<N8nButton
			variant="outline"
			size="small"
			:class="$style.button"
			data-test-id="engine-v2-compatibility-button"
			data-attr="engine-v2-compatibility-button"
			@click="isDialogOpen = true"
		>
			<template #icon>
				<N8nIcon :icon="icon.icon" :color="icon.color" />
			</template>
			{{ label }}
		</N8nButton>
		<EngineV2CompatibilityDialog v-model:open="isDialogOpen" :reasons="reasons" />
	</div>
</template>

<style lang="scss" module>
.button {
	box-shadow: var(--shadow--xs);
	pointer-events: auto;
}
</style>
