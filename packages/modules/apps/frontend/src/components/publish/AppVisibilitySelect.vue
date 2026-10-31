<script setup lang="ts">
import type { AppVisibility } from '@n8n/api-types';
import {
	N8nCallout,
	N8nIcon,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	type IconName,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

const OPTIONS: Array<{ value: AppVisibility; icon: IconName }> = [
	{ value: 'project', icon: 'users' },
	{ value: 'instance', icon: 'shield' },
	{ value: 'public', icon: 'globe' },
];

defineProps<{ disabled?: boolean }>();

const visibility = defineModel<AppVisibility>({ required: true });

const i18n = useI18n();

const selectedIcon = computed(
	() => OPTIONS.find(({ value }) => value === visibility.value)?.icon ?? 'users',
);
</script>

<template>
	<div :class="$style.visibility">
		<N8nInputLabel :label="i18n.baseText('apps.visibility.label')" size="small" color="text-dark">
			<N8nSelect v-model="visibility" :disabled="disabled" data-test-id="app-visibility-select">
				<template #prefix>
					<N8nIcon :icon="selectedIcon" />
				</template>
				<N8nOption
					v-for="option in OPTIONS"
					:key="option.value"
					:value="option.value"
					:label="i18n.baseText(`apps.visibility.${option.value}`)"
					:data-test-id="`app-visibility-option-${option.value}`"
				>
					<span :class="$style.option">
						<N8nIcon :icon="option.icon" />
						{{ i18n.baseText(`apps.visibility.${option.value}`) }}
					</span>
				</N8nOption>
			</N8nSelect>
		</N8nInputLabel>
		<slot />
		<N8nCallout v-if="visibility === 'public'" theme="warning" data-test-id="app-visibility-public">
			{{ i18n.baseText('apps.visibility.publicWarning') }}
		</N8nCallout>
	</div>
</template>

<style lang="scss" module>
.visibility {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.option {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
