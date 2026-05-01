<script lang="ts" setup>
import { useI18n } from '@n8n/i18n';
import { N8nButton } from '@n8n/design-system';

const props = defineProps<{
	hasUnsavedChanges: boolean;
	isSaving?: boolean;
}>();

const emit = defineEmits<{
	save: [];
}>();

const i18n = useI18n();
</script>

<template>
	<N8nButton
		variant="solid"
		:disabled="!hasUnsavedChanges"
		:loading="isSaving"
		@click="emit('save')"
	>
		<span :class="$style.content">
			<span :class="$style.dotSlot">
				<span v-if="hasUnsavedChanges" :class="$style.dot" />
			</span>
			<span>{{ i18n.baseText('formStep.appearance.save') }}</span>
		</span>
	</N8nButton>
</template>

<style lang="scss" module>
.content {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--3xs);
}

.dotSlot {
	width: 6px;
	height: 6px;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	justify-content: center;
}

.dot {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: currentColor;
	opacity: 0.8;
}
</style>
