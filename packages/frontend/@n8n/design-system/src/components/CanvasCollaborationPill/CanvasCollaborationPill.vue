<script setup lang="ts">
import { computed } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nCanvasPill from '../CanvasPill';
import N8nAvatar from '../N8nAvatar';
import N8nButton from '../N8nButton';

defineOptions({
	name: 'N8nCanvasCollaborationPill',
});

const props = defineProps<{
	firstName: string;
	lastName?: string;
	isAnotherTab?: boolean;
}>();

const emit = defineEmits<{
	buttonClick: [];
}>();

const { t } = useI18n();

const userName = computed(() => {
	return props.lastName ? `${props.firstName} ${props.lastName}` : props.firstName;
});

const message = computed(() => {
	return props.isAnotherTab
		? t('collaboration.canvas.editingAnotherTab')
		: t('collaboration.canvas.editing', { user: userName.value });
});

const handleButtonClick = () => {
	emit('buttonClick');
};
</script>

<template>
	<N8nCanvasPill>
		<template #icon>
			<N8nAvatar v-if="!isAnotherTab" :first-name="firstName" :last-name="lastName" size="small" />
		</template>
		<span :class="$style.content">
			{{ message }}
			<N8nButton v-if="isAnotherTab" variant="subtle" size="xsmall" @click="handleButtonClick">
				{{ t('collaboration.canvas.acquireEditing') }}
			</N8nButton>
		</span>
	</N8nCanvasPill>
</template>

<style lang="scss" module>
.content {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
