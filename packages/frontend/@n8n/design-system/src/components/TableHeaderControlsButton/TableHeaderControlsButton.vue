<script setup lang="ts">
import { useI18n } from '@n8n/design-system/composables/useI18n';

import N8nButton from '../N8nButton';
import N8nPopoverReka from '../N8nPopoverReka/N8nPopoverReka.vue';

interface ColumnHeader {
	key: string;
	label: string;
	visible: boolean;
}

interface Props {
	columns: ColumnHeader[];
}

defineProps<Props>();

const { t } = useI18n();
</script>

<template>
	<N8nPopoverReka>
		<template #trigger>
			<N8nButton icon="sliders-horizontal">
				{{ t('tableControlsButton.display') }}
			</N8nButton>
		</template>
		<template #content>
			<div :style="{ display: 'flex', flexDirection: 'column', gap: 10 }">
				<p class="Text">
					{{ t('tableControlsButton.shown') }}
				</p>
				<fieldset class="Fieldset">
					<label class="Label" for="width"> Width </label>
					<input id="width" class="Input" defaultValue="100%" />
				</fieldset>
			</div>
		</template>
	</N8nPopoverReka>
</template>
